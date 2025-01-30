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
import { TokenDeploymentParams, TokenDeploymentResult, deployMyToken } from '../contracts/MyToken';
import { AgentData } from '../types/agentTypes';
import { addAgent, getAgentsByOwner } from '../lib/agentStorage';
import WalletManagerImpl from '../lib/wallet_manager';
import { CONTRACT_CONFIG } from '../contracts/TuraAgent';

// Initialize DeepSeek client for intent recognition
let openai: OpenAI | undefined;
try {
  if (import.meta.env.VITE_OPENAI_API_KEY) {
    console.log('Initializing OpenAI client for AgentManager');
    openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });
  } else {
    console.warn('OpenAI API key not found - agent registration functionality will be limited');
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
    step: 'idle' | 'collecting_name' | 'collecting_description' | 'collecting_company' | 'collecting_socials' | 'confirming_deployment' |
          'collecting_token_name' | 'collecting_token_symbol' | 'collecting_token_supply' | 'confirming_token_deployment';
    data: Partial<AgentData> & {
      type?: 'token';
      tokenName?: string;
      tokenSymbol?: string;
      tokenSupply?: string;
    };
  } = { step: 'idle', data: {} };

  private intentCache: Record<string, string> = {
    'deploy token': 'DEPLOY_MY_TOKEN',
    'new token': 'DEPLOY_MY_TOKEN',
    'create token': 'DEPLOY_MY_TOKEN',
    'deploy': 'DEPLOY_CONTRACT',
    'create agent': 'DEPLOY_CONTRACT',
    'new agent': 'DEPLOY_CONTRACT',
    'show agents': 'LIST_AGENTS',
    'list agents': 'LIST_AGENTS',
    'my agents': 'LIST_AGENTS',
    'check status': 'CHECK_STATUS',
    'agent status': 'CHECK_STATUS',
    'help': 'GENERAL_HELP'
  };

  private walletManager: WalletManagerImpl;

  constructor() {
    super("AgentManager", "Deploy and register TuraAgent contracts with metadata collection");
    this.walletManager = new WalletManagerImpl();

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
        content: `Classify user messages into exactly one category. Respond with ONLY the category name:

DEPLOY_MY_TOKEN - Deploy new MyToken contract (0.1 TURA)
DEPLOY_CONTRACT - Deploy new TuraAgent contract (0.1 TURA)
REGISTER_AGENT - Register agent metadata
CHECK_STATUS - Check deployment status
LIST_AGENTS - List registered agents
GENERAL_HELP - Other inquiries

Priority: DEPLOY_CONTRACT > REGISTER_AGENT > CHECK_STATUS > LIST_AGENTS > GENERAL_HELP

Example: "deploy agent" -> DEPLOY_CONTRACT

Respond with only the category name in uppercase with underscores.`
      };

      // Prepare conversation context
      const conversationLog = [
        systemMessage,
        { role: 'user' as const, content: text }
      ];

      // Check cache first for common intents
      let userIntent = 'GENERAL_HELP'; // Default fallback
      const lowerText = text.toLowerCase();
      const cachedIntent = Object.entries(this.intentCache).find(([key]) => lowerText.includes(key))?.[1];
      
      if (cachedIntent) {
        console.log('Using cached intent:', cachedIntent);
        userIntent = cachedIntent;
      } else if (openai) {
        try {
          console.log('Calling OpenAI API for intent recognition');
          const result = await openai.chat.completions.create({
            messages: conversationLog,
            model: "gpt-3.5-turbo",
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
          console.warn('OpenAI API error - using fallback response:', error);
          const intentPhrases = {
            DEPLOY_CONTRACT: ['deploy', 'create agent', 'new agent', 'deploy contract'],
            LIST_AGENTS: ['show agents', 'list agents', 'my agents', 'view agents'],
            CHECK_STATUS: ['status', 'check agent', 'deployment status'],
            REGISTER_AGENT: ['register', 'add agent info', 'update agent']
          };
          userIntent = this.matchIntentFromText(text, intentPhrases);
          console.log('Fallback intent detection:', userIntent);
        }
      } else {
        // If no OpenAI client, use basic phrase matching
        const intentPhrases = {
          DEPLOY_MY_TOKEN: ['deploy token', 'new token', 'create token', 'token contract'],
          DEPLOY_CONTRACT: ['deploy agent', 'create agent', 'new agent', 'deploy contract'],
          LIST_AGENTS: ['show agents', 'list agents', 'my agents', 'view agents'],
          CHECK_STATUS: ['status', 'check agent', 'deployment status'],
          REGISTER_AGENT: ['register', 'add agent info', 'update agent']
        };
        userIntent = this.matchIntentFromText(text, intentPhrases);
        console.log('Basic intent detection:', userIntent);
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
        case 'GET_TEST_TOKENS':
          if (text.toLowerCase().includes('get test tokens')) {
            return "Please use the WalletAgent to get test tokens. Type 'switch to WalletAgent' first.";
          }
          return "Please use the WalletAgent to get test tokens.";

        case 'DEPLOY_MY_TOKEN':
          // Parse deployment parameters from message
          const tokenMatch = text.match(/name\s+(\w+),\s*symbol\s+(\w+),\s*and\s*supply\s+(\d+)/i);
          if (tokenMatch) {
            const [_, name, symbol, supply] = tokenMatch;
            try {
              const result = await this.deployMyToken({
                name,
                symbol,
                supply
              });
              return this.formatDeploymentSuccess(result);
            } catch (error) {
              console.error('Token deployment failed:', error);
              return `❌ Failed to deploy token: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          }
          
          return "Please provide the token parameters in the format: Deploy MyToken contract with name TestWF, symbol WF, and supply 1000000000";

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
          return `I can help you deploy and manage contracts. Here's what I can do:

1. Deploy a new MyToken contract (costs 0.1 TURA)
   - Creates an ERC20 token with staking features
   - Customizable name, symbol, and supply
   - Automatically mints initial supply
   Try: "Deploy a new token"

2. Deploy a new TuraAgent contract (costs 0.1 TURA)
   - Creates a new agent contract
   - Collects metadata (name, description, company)
   - Registers on the blockchain
   Try: "Deploy a new agent"

3. List your registered agents
   - Shows all your deployed agents
   - Displays contract addresses and metadata
   Try: "Show my agents"

4. Check deployment status
   - View contract deployment status
   - Verify registration details
   Try: "Check agent status"

Note: You must have a connected wallet with sufficient TURA balance (0.1 TURA) to deploy contracts.
      After deploying a token, you'll need to import it to MetaMask using the contract address.`;
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

  private async handleRegistrationState(text: string): Promise<string> {
    const { step, data } = this.registrationState;

    switch (step) {
      case 'collecting_name':
        this.registrationState.data = { ...data, name: text };
        this.registrationState.step = 'collecting_description';
        return "Great! Now please provide a description of what your agent does.";

      case 'collecting_token_name':
        this.registrationState.data = { ...data, tokenName: text };
        this.registrationState.step = 'collecting_token_symbol';
        return "Please enter the token symbol:";

      case 'collecting_token_symbol':
        this.registrationState.data = { ...data, tokenSymbol: text };
        this.registrationState.step = 'collecting_token_supply';
        return "Please enter the initial token supply:";

      case 'collecting_token_supply':
        this.registrationState.data = { ...data, tokenSupply: text };
        this.registrationState.step = 'confirming_token_deployment';
        return `Please review the token parameters:\nName: ${data.tokenName}\nSymbol: ${data.tokenSymbol}\nInitial Supply: ${data.tokenSupply}\n\nType 'confirm' to deploy or 'cancel' to abort.`;

      case 'confirming_token_deployment':
        if (text.toLowerCase() === 'confirm') {
          const deploymentData = this.registrationState.data;
          this.registrationState = { step: 'idle', data: {} };
          const result = await this.deployMyToken({
            name: deploymentData.tokenName || '',
            symbol: deploymentData.tokenSymbol || '',
            supply: deploymentData.tokenSupply || ''
          });
          return this.formatDeploymentSuccess(result);
        } else if (text.toLowerCase() === 'cancel') {
          this.registrationState = { step: 'idle', data: {} };
          return "Token deployment cancelled. Let me know if you'd like to try again!";
        } else {
          return "Please type 'confirm' to proceed with deployment or 'cancel' to abort.";
        }

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

            // Check if using CustomProvider
            if (provider instanceof ethers.JsonRpcProvider && !window.ethereum) {
              // Get stored encrypted key and verify wallet session
              const encryptedData = KeyManager.getStoredKey();
              const walletManager = new WalletManagerImpl();
              const session = await walletManager.getSession();
              const walletAddress = localStorage.getItem('lastWalletAddress');
              
              if (!encryptedData || !session || !walletAddress) {
                return "No wallet found or session expired. Please create a wallet or log in first.";
              }

              // Verify TURA balance before proceeding
              const balance = await provider.getBalance(walletAddress);
              if (balance < CONTRACT_CONFIG.subscriptionFee) {
                return `Insufficient balance. Contract deployment requires ${ethers.formatEther(CONTRACT_CONFIG.subscriptionFee)} TURA.`;
              }

              // Show password dialog for key decryption and deploy contract
              try {
                const chatPage = (window as any).ChatPage;
                if (!chatPage?.showSignatureDialog) {
                  throw new Error('Chat interface not available');
                }

                deployedAddress = await new Promise<string>((resolve, reject) => {
                  chatPage.showSignatureDialog({
                    title: 'Deploy TuraAgent Contract',
                    description: [
                      '🔐 Contract Deployment Details:',
                      '',
                      '• Cost: 0.1 TURA',
                      '• Network: Tura Testnet',
                      '• Contract: TuraAgent',
                      '',
                      'Please enter your wallet password to sign and deploy the contract.',
                      '',
                      '⚠️ Make sure you have enough TURA to cover the deployment cost.'
                    ].join('\n'),
                    requirePassword: true,
                    onConfirm: async (password: string) => {
                      try {
                        // Decrypt private key
                        const privateKey = await KeyManager.decryptKey(encryptedData, password);
                        if (!KeyManager.validatePrivateKey(privateKey)) {
                          reject(new Error('Invalid wallet password'));
                          return;
                        }

                        // Create wallet from private key
                        const wallet = new ethers.Wallet(privateKey, provider);
                        const walletAddress = wallet.address;

                        // Check TURA balance
                        const hasSufficientBalance = await checkTuraBalance(provider, walletAddress);
                        if (!hasSufficientBalance) {
                          reject(new Error('Insufficient TURA balance'));
                          return;
                        }

                        // Deploy contract
                        deployedAddress = await deployTuraAgent(wallet);
                        resolve(deployedAddress);
                      } catch (error) {
                        reject(error);
                      }
                    }
                  });
                });
              } catch (error) {
                throw error;
              }
            } else {
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
   * Match user intent based on common phrases
   */
  private matchIntentFromText(text: string, intentPhrases: Record<string, string[]>): string {
    const normalizedText = text.toLowerCase();
    
    for (const [intent, phrases] of Object.entries(intentPhrases)) {
      if (phrases.some(phrase => normalizedText.includes(phrase))) {
        console.log('Phrase matching found intent:', intent);
        return intent;
      }
    }
    
    console.log('No matching phrases found, using default intent');
    return 'GENERAL_HELP';
  }

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



  /**
   * Check the status of deployed agents
   */
  private async deployMyToken(params: TokenDeploymentParams): Promise<TokenDeploymentResult> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      throw new Error("Please create a wallet first using 'create wallet'");
    }

    const session = await this.walletManager.getSession();
    if (!session?.password) {
      throw new Error("Please log in to your wallet first");
    }

    const walletData = await this.walletManager.getWalletData(address, session.password);
    if (!walletData?.privateKey) {
      throw new Error("Failed to retrieve wallet private key. Please ensure you're logged in.");
    }

    return await deployMyToken(params, walletData.privateKey);
  }

  private formatDeploymentSuccess(result: TokenDeploymentResult): string {
    return `✅ Token deployment successful!\n\n📋 Contract Details:\nAddress: ${result.contract_address}\nName: ${result.name}\nSymbol: ${result.symbol}\nInitial Supply: ${result.initial_supply}\n\n🔍 Next Steps:\n1. Import token to MetaMask:\n   • Contract: ${result.contract_address}\n   • Symbol: ${result.symbol}\n   • Decimals: 18\n2. Check your wallet balance`;
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

      const statusChecks = await Promise.all(userAgents.map(async (agent) => {
        try {
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
