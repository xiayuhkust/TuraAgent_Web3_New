import { AgenticWorkflow } from './AgenticWorkflow';
import { OpenAI } from 'openai';
import { ethers } from 'ethers';
import { 
  TuraAgentABI,
  deployTuraAgent,
  checkTuraBalance,
  getTuraProvider
} from '../contracts/TuraAgent';
import { KeyManager } from '../lib/keyManager';
import { AgentData } from '../types/agentTypes';
import { addAgent, getAgentsByOwner } from '../lib/agentStorage';

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
    data: Partial<AgentData>;
  } = { step: 'idle', data: {} };

  constructor() {
    super("AgentManager", "Deploy and register TuraAgent contracts with metadata collection");
  }

  /**
   * Process user messages and handle agent registration workflow
   * @param {string} text - The user's message
   * @returns {Promise<string>} Response message
   */
  async processMessage(text: string): Promise<string> {
    try {
      console.log('Processing message:', text);
      
      // Store message in parent class and get base response
      const baseResponse = await super.processMessage(text);
      console.log('Base response:', baseResponse);

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
          // If DeepSeek fails, try to match common deployment phrases
          const deploymentPhrases = ['deploy', 'create agent', 'new agent'];
          if (deploymentPhrases.some(phrase => text.toLowerCase().includes(phrase))) {
            userIntent = 'DEPLOY_CONTRACT';
            console.log('Fallback intent detection:', userIntent);
          }
        }
      } else {
        // If no DeepSeek client, use basic phrase matching
        const deploymentPhrases = ['deploy', 'create agent', 'new agent'];
        if (deploymentPhrases.some(phrase => text.toLowerCase().includes(phrase))) {
          userIntent = 'DEPLOY_CONTRACT';
          console.log('Basic intent detection:', userIntent);
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
        let socialLinks: { github?: string; twitter?: string } = {};
        if (text.toLowerCase() !== 'skip') {
          // Basic URL validation
          const githubMatch = text.match(/github\.com\/[\w-]+/);
          const twitterMatch = text.match(/twitter\.com\/[\w-]+/);
          if (githubMatch) socialLinks.github = githubMatch[0];
          if (twitterMatch) socialLinks.twitter = twitterMatch[0];
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
          this.registrationState = { step: 'idle', data: {} };
          
          try {
            // Get provider
            const provider = getTuraProvider();
            let signer: ethers.Signer;
            let address: string = '';
            let deployedAddress: string;

            // Using MetaMask or other injected provider
            try {
                if (provider instanceof ethers.BrowserProvider) {
                  signer = await provider.getSigner();
                } else {
                  throw new Error('Unsupported provider type');
                }
                address = await signer.getAddress();

                // Check TURA balance
                const hasSufficientBalance = await checkTuraBalance(provider, address);
                if (!hasSufficientBalance) {
                  return "Insufficient TURA balance. You need at least 0.1 TURA to deploy an agent contract.";
                }

                // Show standard signature dialog and deploy contract
                deployedAddress = await new Promise<string>((resolve, reject) => {
                  const chatPage = (window as any).ChatPage;
                  if (!chatPage?.showSignatureDialog) {
                    reject(new Error('Chat interface not available'));
                    return;
                  }

                  chatPage.showSignatureDialog({
                    title: 'Deploy TuraAgent Contract',
                    description: [
                      '🔐 Contract Deployment Details:',
                      '',
                      '• Cost: 0.1 TURA',
                      '• Network: Tura Testnet',
                      '• Contract: TuraAgent',
                      '',
                      'Please confirm this transaction in your wallet to deploy the contract.',
                      '',
                      '⚠️ Make sure you have enough TURA to cover the deployment cost.'
                    ].join('\n'),
                    onConfirm: async () => {
                      try {
                        deployedAddress = await deployTuraAgent(signer);
                        resolve(deployedAddress);
                      } catch (error) {
                        reject(error);
                      }
                    }
                  });
                });
              } catch (error) {
                console.error('Failed to get signer:', error);
                return "Failed to connect to wallet. Please make sure your wallet is connected and try again.";
              }

            // Contract address is now available from the promise above
            // Verify contract deployment
            console.log('Verifying contract deployment...');
            const isVerified = await this.verifyContractDeployment(deployedAddress);
            if (!isVerified) {
              return [
                '❌ Contract Verification Failed',
                '',
                `Contract at ${deployedAddress} could not be verified.`,
                'The contract may not have been deployed correctly.',
                '',
                '🔍 Common solutions:',
                '1. Check your transaction on the block explorer',
                '2. Wait a few minutes for the transaction to be mined',
                '3. Try deploying again if the issue persists',
                '',
                'Technical details have been logged for debugging.'
              ].join('\n');
            }

            // Store agent data
            const agentData: AgentData = {
              name: registrationData?.name || '',
              description: registrationData?.description || '',
              company: registrationData?.company || '',
              socialLinks: registrationData?.socialLinks || {},
              contractAddress: deployedAddress,
              owner: address,
              createdAt: new Date().toISOString()
            };
            
            if (addAgent(agentData)) {
              // Format success message with contract details and next steps
              const successMessage = [
                '✅ Agent successfully deployed and registered!',
                '',
                '📋 Contract Details:',
                `Contract Address: ${deployedAddress}`,
                `Name: ${agentData.name}`,
                `Description: ${agentData.description}`,
                `Company: ${agentData.company}`,
                '',
                '🔍 Next Steps:',
                '1. View your agent details by saying "Show my agents"',
                '2. Check agent status with "Check agent status"',
                '3. Deploy another agent by saying "Deploy a new agent"'
              ].join('\n');
              
              console.log('Agent deployment successful:', {
                contractAddress: deployedAddress,
                owner: address,
                timestamp: new Date().toISOString()
              });
              
              return successMessage;
            } else {
              // Format metadata error with debugging info
              console.error('Metadata storage failed for contract:', deployedAddress);
              return [
                '⚠️ Partial Success - Action Required',
                '',
                `Contract successfully deployed to ${deployedAddress}`,
                'However, there was an error saving the agent metadata.',
                '',
                '📝 To resolve this:',
                '1. Make note of your contract address',
                '2. Try registering again with "Register agent"',
                '3. If the issue persists, please contact support'
              ].join('\n');
            }
          } catch (error) {
            // Format error message with debugging details
            console.error('Contract deployment failed:', error);
            const errorDetails = error instanceof Error 
              ? `${error.message}\n${error.stack}`
              : 'Unknown error occurred';
            
            return [
              '❌ Contract Deployment Failed',
              '',
              'There was an error deploying your agent contract:',
              errorDetails,
              '',
              '🔍 Common solutions:',
              '1. Check your wallet is connected',
              '2. Ensure you have sufficient TURA balance (0.1 TURA required)',
              '3. Try again in a few minutes',
              '',
              'If the issue persists, please contact support with the error details above.'
            ].join('\n');
          }
        } else if (text.toLowerCase() === 'cancel') {
          this.registrationState = { step: 'idle', data: {} };
          return "Registration cancelled. Let me know if you'd like to try again!";
        } else {
          return "Please type 'confirm' to proceed with deployment or 'cancel' to abort.";
        }

      default:
        this.registrationState = { step: 'idle', data: {} };
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
  /**
   * Verify a deployed contract by checking its bytecode and functionality
   * @param contractAddress The address of the deployed contract
   * @returns Promise<boolean> True if contract is valid
   */
  private async verifyContractDeployment(contractAddress: string): Promise<boolean> {
    try {
      console.log('Verifying contract deployment:', contractAddress);
      const provider = getTuraProvider();
      
      // Check if contract exists (has bytecode)
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        console.error('Contract not found at address:', contractAddress);
        return false;
      }
      
      // Verify contract interface by checking key functions
      const contract = new ethers.Contract(contractAddress, TuraAgentABI, provider);
      try {
        // Test required functions
        const owner = await contract.owner();
        const totalSubs = await contract.totalSubscribers();
        console.log('Contract verification successful:', {
          owner,
          totalSubscribers: totalSubs.toString(),
          address: contractAddress
        });
        return true;
      } catch (error) {
        console.error('Contract function verification failed:', error);
        return false;
      }
    } catch (error) {
      console.error('Contract verification error:', error);
      return false;
    }
  }

  private async checkAgentStatus(): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return "Please connect your wallet to check agent status.";
    }

    try {
      const provider = getTuraProvider();
      const userAgents = getAgentsByOwner(address);
      
      if (userAgents.length === 0) {
        return "You haven't deployed any agents yet.";
      }

      // Check contract status for each agent
      const statusChecks = await Promise.all(userAgents.map(async (agent) => {
        try {
          // Verify contract is still valid
          const isValid = await this.verifyContractDeployment(agent.contractAddress);
          if (!isValid) {
            return `${agent.name} (${agent.contractAddress.slice(0,6)}...${agent.contractAddress.slice(-4)})
  Status: Invalid Contract - Verification Failed
  Created: ${new Date(agent.createdAt).toLocaleDateString()}`;
          }
          
          const contract = new ethers.Contract(agent.contractAddress, TuraAgentABI, provider);
          const isSubscribed = await contract.isSubscribed(address);
          return `${agent.name} (${agent.contractAddress.slice(0,6)}...${agent.contractAddress.slice(-4)})
  Status: ${isSubscribed ? 'Active ✅' : 'Inactive ⚠️'}
  Created: ${new Date(agent.createdAt).toLocaleDateString()}`;
        } catch (error) {
          return `${agent.name} (${agent.contractAddress.slice(0,6)}...${agent.contractAddress.slice(-4)})
  Status: Error - Could not verify contract
  Created: ${new Date(agent.createdAt).toLocaleDateString()}`;
        }
      }));

      return `Agent Status Report:\n\n${statusChecks.join('\n\n')}`;
    } catch (error) {
      console.error('Status check failed:', error);
      const errorDetails = error instanceof Error 
        ? `${error.message}\n${error.stack}`
        : 'Unknown error occurred';
      
      return [
        '❌ Status Check Failed',
        '',
        'There was an error checking your agent status:',
        errorDetails,
        '',
        '🔍 Common solutions:',
        '1. Check your wallet connection',
        '2. Verify the contract addresses',
        '3. Try again in a few minutes',
        '',
        'If the issue persists, please contact support with the error details above.'
      ].join('\n');
    }
  }
}
