import { OpenAI } from 'openai';
import type { ChatCompletionCreateParams } from 'openai/resources/chat/completions';
import WalletManager from '../lib/wallet_manager';
import { AgenticWorkflow } from './AgenticWorkflow';

type Role = 'system' | 'user' | 'assistant';
type ChatMessage = ChatCompletionCreateParams['messages'][number];

// Initialize DeepSeek client for intent recognition
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
let openai: OpenAI | undefined;
try {
  console.log('Initializing DeepSeek client');
  openai = new OpenAI({
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: DEEPSEEK_API_KEY,
    dangerouslyAllowBrowser: true,  // Enable browser usage
    defaultHeaders: {
      'Content-Type': 'application/json'
    }
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
  private isWaitingForFaucetConfirmation: boolean;
  private readonly FAUCET_ADDRESS: string;
  private readonly MIN_BALANCE: number;
  private readonly FAUCET_AMOUNT: number;
  private readonly FAUCET_PASSWORD: string;
  private readonly VALID_CATEGORIES: string[];
  private readonly INTENT_MAP: { [key: string]: string };
  private readonly VALID_INTENTS: { [key: string]: string };

  constructor() {
    super(
      "WalletAgent",
      "Your personal wallet assistant - I can help you check balances, send TURA, and manage your wallet."
    );
    this.walletManager = new WalletManager();
    this.isWaitingForPassword = false;
    this.isWaitingForFaucetConfirmation = false;
    this.FAUCET_ADDRESS = '0x08Bb6eA809A2d6c13D57166Fa3ede48C0ae9a70e';
    this.MIN_BALANCE = 0.1;
    this.FAUCET_AMOUNT = 1;
    this.FAUCET_PASSWORD = 'faucet123';
    
    // Define valid categories once
    this.VALID_CATEGORIES = [
      'CREATE_WALLET',
      'ACCOUNT_INFO',
      'TRANSFER_TURA',
      'FAUCET_REQUEST',
      'GENERAL_HELP'
    ];

    // Define intent mapping once - map variations to valid categories
    this.INTENT_MAP = {
      'CREATE_A_WALLET': 'CREATE_WALLET',
      'CREATE_NEW_WALLET': 'CREATE_WALLET',
      'MAKE_WALLET': 'CREATE_WALLET',
      'NEW_WALLET': 'CREATE_WALLET',
      'WALLET_CREATION': 'CREATE_WALLET',
      'SETUP_WALLET': 'CREATE_WALLET',
      'CHECK_BALANCE': 'ACCOUNT_INFO',
      'WALLET_INFO': 'ACCOUNT_INFO',
      'VIEW_BALANCE': 'ACCOUNT_INFO',
      'GET_BALANCE': 'ACCOUNT_INFO',
      'SHOW_BALANCE': 'ACCOUNT_INFO',
      'SEND_TURA': 'TRANSFER_TURA',
      'TRANSFER_TOKENS': 'TRANSFER_TURA',
      'SEND_MONEY': 'TRANSFER_TURA',
      'SEND_TOKENS': 'TRANSFER_TURA',
      'GET_TOKENS': 'FAUCET_REQUEST',
      'REQUEST_TOKENS': 'FAUCET_REQUEST',
      'NEED_TOKENS': 'FAUCET_REQUEST',
      'LOW_BALANCE': 'FAUCET_REQUEST',
      'FAUCET': 'FAUCET_REQUEST',
      'HELP': 'GENERAL_HELP',
      'ASSISTANCE': 'GENERAL_HELP',
      'GUIDE': 'GENERAL_HELP',
      'INFO': 'GENERAL_HELP'
    };

    // Define valid intents mapping - map categories to user-friendly names
    this.VALID_INTENTS = {
      'CREATE_WALLET': 'Create Wallet',
      'ACCOUNT_INFO': 'Account Information',
      'TRANSFER_TURA': 'Transfer Services',
      'FAUCET_REQUEST': 'Faucet Request',
      'GENERAL_HELP': 'General Help'
    };
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
        content: `You are a wallet assistant that classifies user messages into exactly one category. Respond with ONLY the category name in uppercase with underscores, no other text.

Valid categories:
CREATE_WALLET
ACCOUNT_INFO
TRANSFER_TURA
FAUCET_REQUEST
GENERAL_HELP

Example mappings:
"Could you make me a new wallet?" -> CREATE_WALLET
"I want to create a wallet" -> CREATE_WALLET
"Help me set up a wallet" -> CREATE_WALLET
"Need a wallet" -> CREATE_WALLET

"How much TURA do I have?" -> ACCOUNT_INFO
"Check my balance" -> ACCOUNT_INFO
"Show wallet info" -> ACCOUNT_INFO
"What's in my account?" -> ACCOUNT_INFO

"Send 10 TURA to 0x..." -> TRANSFER_TURA
"Transfer tokens" -> TRANSFER_TURA
"Pay TURA" -> TRANSFER_TURA
"Send funds" -> TRANSFER_TURA

"I need test tokens" -> FAUCET_REQUEST
"Get TURA from faucet" -> FAUCET_REQUEST
"My balance is low" -> FAUCET_REQUEST
"Can I get some test TURA?" -> FAUCET_REQUEST

For unclear or multiple intents -> GENERAL_HELP

Priority order (highest to lowest):
CREATE_WALLET > FAUCET_REQUEST > TRANSFER_TURA > ACCOUNT_INFO > GENERAL_HELP

Remember: Always respond with exactly one category name in uppercase with underscores, no other text.`
      };

      // Prepare conversation context - for intent recognition, we only need the current message
      console.log('Processing message:', text);
      const conversationLog: ChatMessage[] = [
        { role: 'system', content: systemMessage.content },
        { role: 'user', content: text }
      ];
      console.log('Processing message:', { text });

      // Get intent classification from DeepSeek with fallback and retry logic
      let userIntent = 'General Help';  // Default fallback
      if (openai) {
        try {
          console.log('Calling DeepSeek API for intent classification');
          // Define confidence threshold
          const CONFIDENCE_THRESHOLD = 0.7;
          const VALID_INTENTS = ['Create Wallet', 'Account Information', 'Transfer Services', 'Faucet Request', 'General Help'];

          console.log('Sending request to DeepSeek API...');
          console.log('Sending to DeepSeek:', { systemMessage: systemMessage.content, userMessage: text });
          const result = await openai.chat.completions.create({
            messages: conversationLog,
            model: "deepseek-chat",
            temperature: 0,  // Use 0 for most deterministic responses
            max_tokens: 15,  // We only need the category name
            presence_penalty: 0,  // No need for penalties since we want exact matches
            frequency_penalty: 0,
            top_p: 1,  // Use full probability mass
            stop: ["\n", "->", "."]  // Stop on newlines, arrows, and periods
          });
          
          console.log('DeepSeek API Response:', {
            completion: result.choices[0]?.message?.content,
            finish_reason: result.choices[0]?.finish_reason,
            logprobs: result.choices[0]?.logprobs
          });
          console.log('DeepSeek response:', result.choices[0]?.message?.content);
          console.log('Received response from DeepSeek API');
          
          const completion = result.choices?.[0]?.message?.content?.trim().toUpperCase();
          const logprobs = result.choices?.[0]?.logprobs;
          
          // Log full API response for debugging
          console.log('Full DeepSeek response:', JSON.stringify(result, null, 2));
          console.log('Raw completion:', completion);
          console.log('Raw logprobs:', JSON.stringify(logprobs, null, 2));
          
          // Use class-level intent map for consistency
          
          // Normalize the completion and handle common variations
          const normalizedCompletion = completion?.trim().toUpperCase().replace(/\s+/g, '_');
          
          // Calculate confidence based on exact category match with normalization
          const calculateConfidence = (completion: string): number => {
            if (!completion) return 0;
            
            // Normalize the completion by:
            // 1. Trim whitespace
            // 2. Convert to uppercase
            // 3. Replace spaces with underscores
            // 4. Remove any punctuation
            const normalized = completion
              .trim()
              .toUpperCase()
              .replace(/\s+/g, '_')
              .replace(/[.,!?]/g, '');
            
            console.log('Normalized intent:', normalized);
            
            // Use class-level valid categories
            
            // Check for exact match after normalization
            if (this.VALID_CATEGORIES.includes(normalized)) {
              console.log('Found exact match for intent:', normalized);
              return 1.0;
            }
            
            // Use class-level intent map for partial matches
            
            // Check if we have a mapping for this intent
            if (this.INTENT_MAP[normalized]) {
              console.log('Found mapped intent:', normalized, '->', this.INTENT_MAP[normalized]);
              return 1.0;
            }
            
            console.warn('Unexpected intent from DeepSeek:', normalized);
            return 0;
          };
          
          const confidence = calculateConfidence(normalizedCompletion);
          console.log('Intent confidence calculation:', {
            input: completion,
            normalized: normalizedCompletion,
            confidence,
            matchType: confidence === 1 ? 'exact' : 
                      confidence >= 0.9 ? 'strong partial' :
                      confidence >= 0.8 ? 'compound' : 'none'
          });
          
          console.log('Intent recognition:', { 
            original: completion,
            normalized: normalizedCompletion,
            confidence,
            isValid: this.VALID_CATEGORIES.includes(normalizedCompletion)
          });
          
          // Validate intent and check confidence
          if (completion && confidence >= CONFIDENCE_THRESHOLD) {
            // Use class-level valid intents mapping
            
            if (this.VALID_INTENTS[normalizedCompletion]) {
              userIntent = this.VALID_INTENTS[normalizedCompletion];
              console.log(`Valid intent "${normalizedCompletion}" mapped to "${userIntent}" with confidence ${confidence.toFixed(3)}`);
            } else {
              console.warn('Unexpected normalized intent:', normalizedCompletion);
              userIntent = 'General Help';
            }
          } else {
            if (!completion) {
              console.warn('No intent detected from DeepSeek');
            } else if (confidence < CONFIDENCE_THRESHOLD) {
              console.warn(`Low confidence (${confidence.toFixed(3)}) for intent: ${completion}`);
            }
            // Fall back to General Help with detailed message
            userIntent = 'General Help';
          }
        } catch (error: unknown) {
          console.warn('DeepSeek API error:', error);
          // Log the error and fall back to General Help
          console.warn('DeepSeek API error:', error);
          userIntent = 'General Help';
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
        
        case 'Faucet Request':
          if (this.isWaitingForFaucetConfirmation) {
            if (text.toLowerCase().includes('yes')) {
              return await this.distributeFaucetTokens();
            } else {
              this.isWaitingForFaucetConfirmation = false;
              return "Okay, I won't send you any test tokens. Let me know if you change your mind!";
            }
          }
          return await this.handleFaucetRequest();
        
        default:
          return `I can help you with your wallet! Try asking me:
- "Create a new wallet"
- "What's my balance?"
- "Send 10 TURA to [address]"
- "Get test tokens" (when your balance is low)`;
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

  /**
   * Handle faucet token request
   */
  private async handleFaucetRequest(): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return "You'll need a wallet first before you can receive test tokens. Would you like me to help you create one? Just say 'create wallet' to get started.";
    }

    try {
      const balance = await this.walletManager.getBalance(address);
      const balanceNum = parseFloat(balance);
      
      if (balanceNum >= this.MIN_BALANCE) {
        return `Your current balance (${balance} TURA) is sufficient. The faucet is only available for wallets with less than ${this.MIN_BALANCE} TURA.`;
      }

      this.isWaitingForFaucetConfirmation = true;
      return `Would you like to receive ${this.FAUCET_AMOUNT} TURA from our test faucet? This will help you test the wallet features.

Just say "yes" to confirm.`;
    } catch (error: unknown) {
      console.error('Faucet request error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ Couldn't process faucet request: ${message}. Please try again in a moment.`;
    }
  }

  /**
   * Distribute tokens from faucet wallet
   */
  private async distributeFaucetTokens(): Promise<string> {
    const recipientAddress = localStorage.getItem('lastWalletAddress');
    if (!recipientAddress) {
      this.isWaitingForFaucetConfirmation = false;
      return "❌ Error: Couldn't find your wallet address. Please try creating a wallet first.";
    }

    try {
      // Check faucet balance
      const faucetBalance = await this.walletManager.getBalance(this.FAUCET_ADDRESS);
      if (parseFloat(faucetBalance) < this.FAUCET_AMOUNT) {
        this.isWaitingForFaucetConfirmation = false;
        return "❌ Sorry, the faucet is currently out of funds. Please try again later.";
      }

      // Send tokens using the faucet wallet
      await this.walletManager.sendTransaction(
        this.FAUCET_ADDRESS,
        recipientAddress,
        this.FAUCET_AMOUNT.toString(),
        this.FAUCET_PASSWORD
      );

      this.isWaitingForFaucetConfirmation = false;
      return `🎉 Success! ${this.FAUCET_AMOUNT} TURA has been sent to your wallet.
      
Transaction is being processed. Your balance will update automatically once confirmed.`;
    } catch (error: unknown) {
      console.error('Faucet distribution error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      this.isWaitingForFaucetConfirmation = false;
      return `❌ Failed to send test tokens: ${message}. Please try again in a moment.`;
    }
  }
}
