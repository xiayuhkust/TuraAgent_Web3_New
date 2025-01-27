import { AgenticWorkflow } from './AgenticWorkflow';
import { OpenAI } from 'openai';
import { ethers } from 'ethers';
import { TuraAgentABI } from '../contracts/TuraAgent';
import { AgentData } from '../types/agentTypes';
import { readLocalAgents, saveLocalAgents, addAgent, getAgentsByOwner } from '../lib/agentStorage';

// Initialize DeepSeek client for intent recognition
let openai: OpenAI | undefined;
try {
  if (import.meta.env.VITE_DEEPSEEK_API_KEY) {
    console.log('Initializing DeepSeek client for AgentManager');
    openai = new OpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
      dangerouslyAllowBrowser: true
    });
  } else {
    console.warn('DeepSeek API key not found - agent registration functionality will be limited');
  }
} catch (error) {
  console.warn('Failed to initialize DeepSeek client:', error);
}

/**
 * AgentManager handles the deployment and registration of TuraAgent contracts.
 * It manages the collection of agent metadata and handles the contract deployment process.
 */
export class AgentManager extends AgenticWorkflow {
  private registrationState: {
    step: 'idle' | 'collecting_name' | 'collecting_description' | 'collecting_company' | 'collecting_socials' | 'confirming_deployment';
    data?: Partial<AgentData>;
  };

  constructor() {
    super("AgentManager", "Deploy and register TuraAgent contracts with metadata collection");
    this.registrationState = { step: 'idle' };
  }

  /**
   * Process user messages and handle agent registration workflow
   * @param {string} text - The user's message
   * @returns {Promise<string>} Response message
   */
  async processMessage(text: string): Promise<string> {
    // Store incoming message in parent class
    await super.processMessage(text);

    try {
      console.log('Processing message:', text);

      // System message for intent recognition
      const systemMessage = {
        role: 'system' as const,
        content: `You are an agent registration assistant that classifies user messages into exactly one category. Respond with ONLY the category name in uppercase with underscores, no other text.

Valid categories:
DEPLOY_CONTRACT - User wants to deploy a new TuraAgent contract (costs 0.1 TURA)
REGISTER_AGENT - User wants to register agent metadata only
CHECK_STATUS - User wants to check deployment/registration status
LIST_AGENTS - User wants to list registered agents
GENERAL_HELP - Other inquiries or unclear intent

Example mappings:
"I want to deploy an agent" -> DEPLOY_CONTRACT
"Create a new agent" -> DEPLOY_CONTRACT
"Deploy contract" -> DEPLOY_CONTRACT
"Set up an agent" -> DEPLOY_CONTRACT

"Register my agent" -> REGISTER_AGENT
"Add agent info" -> REGISTER_AGENT
"Update agent details" -> REGISTER_AGENT
"Save agent metadata" -> REGISTER_AGENT

"Show my agents" -> LIST_AGENTS
"List all agents" -> LIST_AGENTS
"What agents do I have?" -> LIST_AGENTS
"Display registered agents" -> LIST_AGENTS

"Check agent status" -> CHECK_STATUS
"Is my agent deployed?" -> CHECK_STATUS
"Deployment status" -> CHECK_STATUS
"Agent status" -> CHECK_STATUS

For unclear or multiple intents -> GENERAL_HELP

Priority order (highest to lowest):
DEPLOY_CONTRACT > REGISTER_AGENT > CHECK_STATUS > LIST_AGENTS > GENERAL_HELP

Remember: Always respond with exactly one category name in uppercase with underscores, no other text.`
      };

      // Prepare conversation context
      const conversationLog = [
        systemMessage,
        { role: 'user' as const, content: text }
      ];

      // Get intent classification from DeepSeek
      let userIntent = 'GENERAL_HELP'; // Default fallback
      if (openai) {
        try {
          console.log('Calling DeepSeek API for intent recognition');
          const result = await openai.chat.completions.create({
            messages: conversationLog,
            model: "deepseek-chat",
            temperature: 0,
            max_tokens: 15,
            presence_penalty: 0,
            frequency_penalty: 0,
            top_p: 1,
            stop: ["\n", "->", "."]
          });
          userIntent = result.choices[0]?.message?.content?.trim() || userIntent;
          console.log('Detected intent:', userIntent);
        } catch (error) {
          console.warn('DeepSeek API error - using fallback response:', error);
        }
      }

      // Handle registration workflow state
      if (this.registrationState.step !== 'idle') {
        return await this.handleRegistrationState(text);
      }

      // Get current wallet address
      const address = localStorage.getItem('lastWalletAddress');
      if (!address && userIntent !== 'GENERAL_HELP') {
        return "Please connect your wallet first to interact with agents.";
      }

      // Map intent to handler functions
      switch (userIntent) {
        case 'DEPLOY_CONTRACT':
          if (this.registrationState.step !== 'idle') {
            return "You're already in the process of registering an agent. Please complete or cancel the current registration first.";
          }
          return this.startRegistrationFlow();
        
        case 'REGISTER_AGENT':
          if (this.registrationState.step !== 'idle') {
            return "You're already in the process of registering an agent. Please complete or cancel the current registration first.";
          }
          return "Agent-only registration without contract deployment is not supported yet. Please use 'Deploy a new agent' to create and register an agent.";
        
        case 'LIST_AGENTS':
          return this.listRegisteredAgents();
        
        case 'CHECK_STATUS':
          return this.checkAgentStatus();
        
        default:
          return `I can help you deploy and register TuraAgent contracts. Here's what I can do:

1. Deploy a new TuraAgent contract (costs 0.1 TURA)
   - Creates a new agent contract
   - Collects metadata (name, description, company)
   - Registers on the blockchain
   Try: "Deploy a new agent"

2. List your registered agents
   - Shows all your deployed agents
   - Displays contract addresses and metadata
   Try: "Show my agents"

3. Check deployment status
   - View contract deployment status
   - Verify registration details
   Try: "Check agent status"

Note: You must have a connected wallet with sufficient TURA balance (0.1 TURA) to deploy contracts.`;
      }
    } catch (error) {
      console.error('AgentManager error:', error);
      return `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    }
  }

  /**
   * Start the registration flow by asking for the agent name
   */
  private startRegistrationFlow(): string {
    this.registrationState = {
      step: 'collecting_name',
      data: {}
    };
    return "Let's deploy a new TuraAgent contract. First, what would you like to name your agent?";
  }

  /**
   * Handle the current state of the registration flow
   */
  private async handleRegistrationState(text: string): Promise<string> {
    const { step, data } = this.registrationState;

    switch (step) {
      case 'collecting_name':
        this.registrationState.data = { ...data, name: text };
        this.registrationState.step = 'collecting_description';
        return "Great! Now please provide a description of what your agent does.";

      case 'collecting_description':
        this.registrationState.data = { ...data, description: text };
        this.registrationState.step = 'collecting_company';
        return "Thanks! What company or organization is this agent associated with?";

      case 'collecting_company':
        this.registrationState.data = { ...data, company: text };
        this.registrationState.step = 'collecting_socials';
        return "Almost there! Please provide your GitHub and/or Twitter links (or type 'skip' to skip).";

      case 'collecting_socials':
        let socialLinks = {};
        if (text.toLowerCase() !== 'skip') {
          // Basic URL validation
          const githubMatch = text.match(/github\.com\/[\w-]+/);
          const twitterMatch = text.match(/twitter\.com\/[\w-]+/);
          if (githubMatch) socialLinks['github'] = githubMatch[0];
          if (twitterMatch) socialLinks['twitter'] = twitterMatch[0];
        }
        this.registrationState.data = { 
          ...data, 
          socialLinks,
          createdAt: new Date().toISOString()
        };
        this.registrationState.step = 'confirming_deployment';
        return `Great! Here's a summary of your agent:
Name: ${data?.name}
Description: ${data?.description}
Company: ${data?.company}
${Object.entries(socialLinks).map(([k, v]) => `${k}: ${v}`).join('\n')}

Deploying this agent will cost 0.1 TURA. Type 'confirm' to proceed with deployment or 'cancel' to abort.`;

      case 'confirming_deployment':
        if (text.toLowerCase() === 'confirm') {
          // Reset state before deployment
          const registrationData = this.registrationState.data;
          this.registrationState = { step: 'idle' };
          
          // TODO: Implement contract deployment in step 004
          return "Contract deployment will be implemented in the next phase. Registration data collected successfully.";
        } else if (text.toLowerCase() === 'cancel') {
          this.registrationState = { step: 'idle' };
          return "Registration cancelled. Let me know if you'd like to try again!";
        } else {
          return "Please type 'confirm' to proceed with deployment or 'cancel' to abort.";
        }

      default:
        this.registrationState = { step: 'idle' };
        return "Something went wrong. Please start over by saying 'Deploy a new agent'.";
    }
  }

  /**
   * List all registered agents for the current user
   */
  private listRegisteredAgents(): string {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return "Please connect your wallet to view your registered agents.";
    }

    const userAgents = getAgentsByOwner(address);
    if (userAgents.length === 0) {
      return "You haven't registered any agents yet. Try saying 'Deploy a new agent' to get started.";
    }

    return `Your registered agents:\n${userAgents.map(agent => 
      `- ${agent.name} (${agent.contractAddress.slice(0,6)}...${agent.contractAddress.slice(-4)})
        Description: ${agent.description}
        Company: ${agent.company}
        Created: ${new Date(agent.createdAt).toLocaleDateString()}`
    ).join('\n\n')}`;
  }

  /**
   * Check the status of agent deployments
   * TODO: Implement in step 004 with contract deployment
   */
  private checkAgentStatus(): string {
    return "Status checking will be implemented with contract deployment in a later phase.";
  }
}
