import { AgenticWorkflow } from './AgenticWorkflow';
import WalletManager from '../lib/wallet_manager';
import { OpenAI } from 'openai';

// Initialize DeepSeek client for intent recognition
let openai: OpenAI | null = null;
try {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_DEEPSEEK_API_KEY not found in environment');
  }
  
  console.log('Initializing DeepSeek client');
  openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: apiKey,
    dangerouslyAllowBrowser: true  // Enable browser usage
  });
  
  // Verify client initialization
  console.log('DeepSeek client initialized successfully:', {
    hasClient: !!openai,
    baseURL: openai.baseURL,
    hasApiKey: !!openai.apiKey
  });
} catch (error) {
  console.error('Failed to initialize DeepSeek client:', error);
  console.warn('Chat functionality will use fallback responses');
}

interface AgentRegistrationParams {
  companyName: string;
  subscriptionFee: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
}

export class WalletAgent extends AgenticWorkflow {
  private readonly walletManager: WalletManager;
  private registrationParams: Partial<AgentRegistrationParams>;
  private registrationStep: 'company' | 'fee' | 'description' | 'complete' | null;

  constructor() {
    super("WalletAgent", "Your personal wallet assistant - I can help you check balances, send TURA, and manage your wallet.");
    this.walletManager = new WalletManager();
    this.registrationParams = {};
    this.registrationStep = null;
    console.log('WalletAgent initialized');
  }

  async processMessage(text: string): Promise<string> {
    // Store incoming message
    await super.processMessage(text);
    
    try {
      console.log('Processing message:', text);

      // If we're in the middle of agent registration, handle that flow
      if (this.registrationStep !== null) {
        return this.handleRegistrationStep(text);
      }
      
      // System message defining the assistant's role and capabilities
      const systemMessage: { role: 'system'; content: string } = {
        role: 'system',
        content: `You are a highly intelligent assistant specialized in providing wallet-related services. 
        Analyze user messages and categorize them into one of these intents:
        - Account Information (balance checks, account status)
        - Transfer Services (sending/transferring TURA)
        - Account Security (wallet connection, security status)
        - Agent Registration (registering new agents)
        - Social Media (posting about agents on Twitter)
        - General Help (other inquiries)
        Respond ONLY with the category name, nothing else.
        
        Examples:
        "What's my balance?" -> Account Information
        "Send 10 TURA" -> Transfer Services
        "Is my wallet connected?" -> Account Security
        "I want to register as an agent" -> Agent Registration
        "Post about my agent on Twitter" -> Social Media
        "How does this work?" -> General Help`
      };

      // Prepare conversation context
      const conversationLog: Array<{ role: 'system' | 'user'; content: string }> = [
        systemMessage,
        { role: 'user', content: text }
      ];
      console.log('Conversation context:', conversationLog);

      // Get intent classification from DeepSeek if available
      let userIntent = 'General Help';  // Default fallback
      if (openai) {
        try {
          console.log('Calling DeepSeek API');
          const result = await openai.chat.completions.create({
            messages: conversationLog.map(msg => ({
              role: msg.role,
              content: msg.content
            })) as Array<{
              role: 'system' | 'user' | 'assistant';
              content: string;
            }>,
            model: "deepseek-chat",
          });
          console.log('DeepSeek API response:', {
            choices: result.choices,
            intent: result.choices?.[0]?.message?.content,
            usage: result.usage,
            timestamp: new Date().toISOString()
          });
          userIntent = result.choices?.[0]?.message?.content?.trim() || userIntent;
          console.log('Detected intent:', userIntent);
        } catch (error) {
          console.warn('DeepSeek API error - using fallback response:', error);
        }
      } else {
        console.warn('DeepSeek client not initialized - using fallback response');
      }

      // Check balance first and offer faucet if needed
      const address = localStorage.getItem('lastWalletAddress');
      if (address) {
        try {
          const balance = await this.walletManager.getBalance(address);
          if (parseFloat(balance) === 0) {
            if (text.toLowerCase().includes('yes') || text.toLowerCase().includes('faucet')) {
              return await this.handleFaucetDistribution(address);
            }
            return `I notice your balance is 0 TURA. Would you like to receive 1 TURA from the faucet to get started?`;
          }
        } catch (error) {
          console.warn('Failed to check balance:', error);
        }
      }

      // Map intent to wallet operations
      switch (userIntent) {
        case 'Account Information':
          return await this.handleBalanceCheck();
        
        case 'Transfer Services':
          return await this.handleTransferRequest(text);
        
        case 'Account Security':
          return await this.handleWalletStatus();
        
        case 'Agent Registration':
          return await this.startAgentRegistration();
        
        case 'Social Media':
          if (text.toLowerCase().includes('twitter') || text.toLowerCase().includes('post') || text.toLowerCase().includes('tweet')) {
            return await this.handleTweetPost();
          }
          return "I can help you post about your agent on Twitter (coming soon). Just say 'post on Twitter' when you're ready.";

        default:
          return `I can help you with:
- Checking your balance ("What's my balance?")
- Sending TURA ("Send 10 TURA to [address]")
- Checking wallet status ("Check wallet status")
- Registering as an agent ("I want to register as an agent")
- Getting TURA from faucet ("I need TURA")`;
      }
    } catch (error) {
      console.error('WalletAgent error:', error);
      return `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    }
  }

  private async handleBalanceCheck(): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return "I don't see a connected wallet. Please connect your wallet first.";
    }

    try {
      const balance = await this.walletManager.getBalance(address);
      return `Your wallet (${address.slice(0, 6)}...${address.slice(-4)}) has ${balance} TURA`;
    } catch (error) {
      throw new Error(`Couldn't check balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleTransferRequest(text: string): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return "Please connect your wallet first before trying to send TURA.";
    }

    // Basic pattern matching for amount and address
    const amountMatch = text.match(/\d+(\.\d+)?/);
    const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);

    if (!amountMatch || !addressMatch) {
      return `To send TURA, please specify an amount and address like this:
"Send 10 TURA to 0x..."`;
    }

    const amount = amountMatch[0];
    const toAddress = addressMatch[0];

    return `To send ${amount} TURA to ${toAddress}, please use the send button in the wallet interface. 
For your security, I can't directly execute transactions.`;
  }

  private async handleWalletStatus(): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return "No wallet is currently connected. Use the wallet interface to connect or create a wallet.";
    }

    try {
      const balance = await this.walletManager.getBalance(address);
      return `Wallet Status:
- Address: ${address.slice(0, 6)}...${address.slice(-4)}
- Balance: ${balance} TURA
- Connection: Active`;
    } catch (error) {
      return `Wallet Status:
- Address: ${address.slice(0, 6)}...${address.slice(-4)}
- Connection: Error (${error instanceof Error ? error.message : 'Unknown error'})`;
    }
  }

  private async startAgentRegistration(): Promise<string> {
    this.registrationStep = 'company';
    this.registrationParams = {};
    return "Let's register you as an agent. First, what's your company name?";
  }

  private async handleRegistrationStep(text: string): Promise<string> {
    switch (this.registrationStep) {
      case 'company':
        this.registrationParams.companyName = text;
        this.registrationStep = 'fee';
        return "Great! Now, what subscription fee would you like to charge per request? (in TURA)";

      case 'fee':
        if (!text.match(/^\d*\.?\d+$/)) {
          return "Please enter a valid number for the subscription fee (e.g., '1.5' or '10').";
        }
        this.registrationParams.subscriptionFee = text;
        this.registrationStep = 'description';
        return "Perfect! Finally, please provide a description of your agent's services.";

      case 'description': {
        this.registrationParams.description = text;
        this.registrationStep = 'complete';
        
        // Store registration data in localStorage for now
        const registrations = JSON.parse(localStorage.getItem('agentRegistrations') || '[]');
        const registration = {
          ...this.registrationParams,
          status: 'pending' as const,
          timestamp: new Date().toISOString()
        };
        
        registrations.push(registration);
        localStorage.setItem('agentRegistrations', JSON.stringify(registrations));
        
        // Reset registration state
        this.registrationStep = null;
        this.registrationParams = {};

        // Log registration for debugging
        console.log('New agent registration:', registration);
        
        return `Great! I've recorded your agent registration:
- Company: ${registration.companyName}
- Fee: ${registration.subscriptionFee} TURA
- Description: ${registration.description}
- Status: Pending approval

Your registration is pending approval. Once approved:
1. Your agent contract will be deployed
2. You'll be able to receive TURA for your services
3. Users can interact with your agent through the chat interface

Would you like me to help you post about your new agent on Twitter? Just say 'yes' or 'post on Twitter' to proceed.`;
      }

      default:
        this.registrationStep = null;
        return "I'm not sure what happened. Let's start over. How can I help you?";
    }
  }

  private async handleTweetPost(): Promise<string> {
    // This is a placeholder for Twitter integration
    return `I've prepared a tweet about your agent (placeholder):

"🤖 Excited to announce my new agent on TuraAgent! Offering specialized services for the Web3 community. Check it out at https://turaagent.com"

Note: Twitter integration is coming soon. In production, you'll be able to customize and post this message directly to Twitter.`;
  }

  private async handleFaucetDistribution(targetAddress: string): Promise<string> {
    const faucetAddress = '0x08Bb6eA809A2d6c13D57166Fa3ede48C0ae9a70e';
    const faucetPrivateKey = 'ad6fb1ceb0b9dc598641ac1cef545a7882b52f5a12d7204d6074762d96a8a474';
    
    try {
      await this.walletManager.sendTransaction(
        faucetAddress,
        targetAddress,
        '1',  // Send 1 TURA
        faucetPrivateKey
      );
      return `Successfully sent 1 TURA to your wallet. Please refresh your balance to see the update.`;
    } catch (error) {
      throw new Error(`Failed to distribute TURA: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default WalletAgent;
