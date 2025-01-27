import { OpenAI } from 'openai';
import type { ChatCompletionCreateParams } from 'openai/resources/chat/completions';
import WalletManager from '../lib/wallet_manager';
import { AgenticWorkflow } from './AgenticWorkflow';

type Role = 'system' | 'user' | 'assistant';
type ChatMessage = ChatCompletionCreateParams['messages'][number];

// Initialize DeepSeek client for intent recognition
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
let openai: OpenAI | undefined;
try {
  console.log('Initializing DeepSeek client');
  openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: DEEPSEEK_API_KEY,
    dangerouslyAllowBrowser: true  // Enable browser usage
  });
} catch (error) {
  console.warn('Failed to initialize DeepSeek client:', error);
}

/**
 * WalletAgent provides a chat interface for wallet operations.
 * It wraps the existing wallet functionality in a more user-friendly way.
 */
export class WalletAgent extends AgenticWorkflow {
  private walletManager: WalletManager;
  private isWaitingForPassword: boolean;

  constructor() {
    super(
      "WalletAgent",
      "Your personal wallet assistant - I can help you check balances, send TURA, and manage your wallet."
    );
    this.walletManager = new WalletManager();
    this.isWaitingForPassword = false;
    console.log('WalletAgent constructor called with:', {
      name: this.name,
      description: this.description,
      walletManager: this.walletManager
    });
  }

  /**
   * Process user messages and handle wallet operations
   * @param text - The user's message
   * @returns Response message
   */
  public async processMessage(text: string): Promise<string> {
    // Store incoming message
    await super.processMessage(text);
    
    try {
      console.log('Processing message:', text);

      // Handle password input if waiting
      if (this.isWaitingForPassword) {
        return await this.handleCreateWallet(text);
      }
      
      // System message defining the assistant's role and capabilities
      const systemMessage = {
        role: 'system',
        content: `You are a wallet assistant specialized in managing cryptocurrency wallets and transactions.
        Your task is to analyze user messages and categorize them into exactly one of these intents:
        - Create Wallet: When users want to create a new wallet or ask about wallet creation
        - Account Information: When users ask about their balance, address, or wallet status
        - Transfer Services: When users want to send TURA or ask about transfers
        - General Help: For any other wallet-related questions or unclear intents
        
        Examples:
        "I want to make a new wallet" -> Create Wallet
        "What's my balance?" -> Account Information
        "Can you send 10 TURA to 0x123" -> Transfer Services
        "How do I use this?" -> General Help
        
        Respond ONLY with one of the exact category names listed above, nothing else.`
      };

      // Prepare conversation context with limited history
      const recentMessages = this.messages.slice(-5); // Keep last 5 messages for context
      const conversationLog: ChatMessage[] = [
        { role: 'system', content: systemMessage.content },
        ...recentMessages.map(msg => ({
          role: (msg.sender === 'user' ? 'user' : 'assistant') as Role,
          content: msg.text
        })),
        { role: 'user', content: text }
      ];
      console.log('Processing message with context:', { text, recentMessages: recentMessages.length });

      // Get intent classification from DeepSeek with fallback and retry logic
      let userIntent = 'General Help';  // Default fallback
      if (openai) {
        try {
          console.log('Calling DeepSeek API for intent classification');
          const result = await Promise.race([
            openai.chat.completions.create({
              messages: conversationLog,
              model: "deepseek-chat",
              temperature: 0.1, // Lower temperature for more consistent categorization
              max_tokens: 50
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('DeepSeek API timeout')), 10000)
            )
          ]) as OpenAI.Chat.ChatCompletion;
          
          const intent = result.choices?.[0]?.message?.content?.trim();
          console.log('Raw intent from DeepSeek:', intent);
          
          // Validate that we got one of our expected intents
          if (intent && ['Create Wallet', 'Account Information', 'Transfer Services', 'General Help'].includes(intent)) {
            userIntent = intent;
            console.log('Valid intent detected:', userIntent);
          } else {
            console.warn('Unexpected intent from DeepSeek:', intent);
          }
        } catch (error: unknown) {
          console.warn('DeepSeek API error:', error);
          // If it's a timeout, we might want to retry once
          if (error instanceof Error && error.message === 'DeepSeek API timeout') {
            console.log('Retrying after timeout...');
            try {
              const result = await openai.chat.completions.create({
                messages: conversationLog,
                model: "deepseek-chat",
                temperature: 0.1,
                max_tokens: 50,
              });
              const intent = result.choices?.[0]?.message?.content?.trim();
              if (intent && ['Create Wallet', 'Account Information', 'Transfer Services', 'General Help'].includes(intent)) {
                userIntent = intent;
                console.log('Valid intent detected on retry:', userIntent);
              }
            } catch (retryError) {
              console.warn('Retry also failed:', retryError);
            }
          }
        }
      } else {
        console.warn('DeepSeek client not initialized - using fallback response');
      }

      // Map intent to wallet operations
      switch (userIntent) {
        case 'Create Wallet':
          return this.initiateWalletCreation();
        
        case 'Account Information':
          return await this.handleBalanceCheck();
        
        case 'Transfer Services':
          return await this.handleTransferRequest(text);
        
        default:
          return `I can help you with your wallet! Try asking me:
- "Create a new wallet"
- "What's my balance?"
- "Send 10 TURA to [address]"`;
      }
    } catch (error: unknown) {
      console.error('WalletAgent error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `Sorry, I encountered an error: ${message}. Please try again.`;
    }
  }

  /**
   * Initiate wallet creation process
   */
  /**
   * Initiate wallet creation process
   */
  private initiateWalletCreation(): string {
    const address = localStorage.getItem('lastWalletAddress');
    if (address) {
      return `You already have a wallet! Your address is: ${address.slice(0, 6)}...${address.slice(-4)}. You can ask me to check your balance or send TURA.`;
    }
    
    this.isWaitingForPassword = true;
    return `To create your wallet, I need a secure password. Please enter a password that:
- Is at least 8 characters long
- Will be used to encrypt your wallet
Note: Make sure to remember this password as you'll need it to access your wallet!`;
  }

  /**
   * Handle wallet creation with password
   */
  private async handleCreateWallet(password: string): Promise<string> {
    try {
      if (password.length < 8) {
        return "⚠️ Password must be at least 8 characters long. Please try again with a longer password.";
      }

      const wallet = await this.walletManager.createWallet(password);
      localStorage.setItem('lastWalletAddress', wallet.address);
      
      // Reset password waiting state
      this.isWaitingForPassword = false;

      return `🎉 Wallet created successfully!

Your wallet address: ${wallet.address}

⚠️ IMPORTANT: Below is your mnemonic phrase. Write it down and keep it safe - you'll need it to recover your wallet if you forget your password:

${wallet.mnemonic}

Never share your mnemonic phrase with anyone! I'll help you check your balance and send TURA when you need to.`;
    } catch (error: unknown) {
      this.isWaitingForPassword = false;
      console.error('Wallet creation error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ Failed to create wallet: ${message}. Please try again or contact support if the issue persists.`;
    }
  }

  /**
   * Handle balance check requests
   */
  private async handleBalanceCheck(): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return "You don't have a wallet yet. Would you like me to help you create one? Just say 'create wallet' to get started.";
    }

    try {
      const balance = await this.walletManager.getBalance(address);
      const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
      return `💰 Your wallet (${shortAddress}) contains ${balance} TURA

Need to send TURA? Just tell me the amount and recipient address like:
"Send 10 TURA to 0x..."`;
    } catch (error: unknown) {
      console.error('Balance check error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ Couldn't check your balance: ${message}. Please try again in a moment.`;
    }
  }

  /**
   * Handle transfer/send requests
   */
  private async handleTransferRequest(text: string): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return "You'll need a wallet first before you can send TURA. Would you like me to help you create one? Just say 'create wallet' to get started.";
    }

    // Enhanced pattern matching for amount and address
    const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:TURA)?/i);
    const addressMatch = text.match(/(?:to\s+)?(0x[a-fA-F0-9]{40})/i);

    if (!amountMatch || !addressMatch) {
      return `To send TURA, please specify the amount and recipient address clearly. For example:
"Send 10 TURA to 0x123..."
or
"Transfer 5.5 TURA to 0x456..."`;
    }

    const amount = amountMatch[1];
    const toAddress = addressMatch[1];

    try {
      const balance = await this.walletManager.getBalance(address);
      if (parseFloat(balance) < parseFloat(amount)) {
        return `❌ Insufficient balance. You have ${balance} TURA but tried to send ${amount} TURA.`;
      }

      return `For security reasons, I can't directly execute transactions. Please use the wallet interface to:

Send ${amount} TURA
To: ${toAddress}

Your current balance is ${balance} TURA.`;
    } catch (error: unknown) {
      console.error('Transfer request error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ Error checking balance for transfer: ${message}. Please try again in a moment.`;
    }
  }
}
