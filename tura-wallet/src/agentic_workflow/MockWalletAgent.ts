import { AgenticWorkflow, Intent } from './AgenticWorkflow';
import { ethers } from 'ethers';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

if (!import.meta.env.VITE_OPENAI_API_KEY) {
  console.error('OpenAI API key not found in environment variables');
}

interface UserTableEntry {
  balance: number;
  password?: string;
  mnemonic?: string;
}

export class MockWalletAgent extends AgenticWorkflow {
  private state: { type: 'idle' | 'awaiting_password' | 'awaiting_confirmation' | 'awaiting_faucet_confirmation' } = { type: 'idle' };
  private readonly FAUCET_ADDRESS: string;
  private readonly USER_TABLE_KEY = 'mockUserTable';
  private readonly STATE_KEY = 'mock_wallet_state';

  private saveState(): void {
    localStorage.setItem(this.STATE_KEY, JSON.stringify(this.state));
  }

  constructor() {
    super(
      "MockWalletAgent",
      "Your personal wallet assistant - I can help you check balances, send TURA, and manage your wallet."
    );
    
    // Load saved state or initialize defaults
    const savedState = localStorage.getItem(this.STATE_KEY);
    if (savedState) {
      this.state = JSON.parse(savedState);
    } else {
      this.state = { type: 'idle' };
    }
    
    this.FAUCET_ADDRESS = '0x0000000000000000000000000000000000000000';
    
    this.initializeFaucet();
  }

  private loadUserTable(): Record<string, UserTableEntry> {
    const stored = localStorage.getItem(this.USER_TABLE_KEY);
    return stored ? JSON.parse(stored) : {};
  }

  private saveUserTable(table: Record<string, UserTableEntry>): void {
    localStorage.setItem(this.USER_TABLE_KEY, JSON.stringify(table));
  }

  private initializeFaucet(): void {
    const userTable = this.loadUserTable();
    if (!userTable[this.FAUCET_ADDRESS]) {
      userTable[this.FAUCET_ADDRESS] = {
        balance: 1000000,
        password: 'faucet123'
      };
      this.saveUserTable(userTable);
    }
  }

  private getWelcomeMessage(): string {
    return `I can help you manage your wallet! Here's what I can do:

🔑 Create a new wallet
💰 Check your balance
💸 Send TURA tokens to another address
🚰 Get test tokens from our faucet

Just let me know what you'd like to do!`;
  }

  private async handleFaucetRequest(): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return "You'll need a wallet first before you can receive test tokens. Would you like me to help you create one? Just say 'create wallet' to get started.";
    }

    try {
      const userTable = this.loadUserTable();
      if (!userTable[address]) {
        userTable[address] = { balance: 0 };
      }

      this.state = { type: 'awaiting_confirmation' };
      return `Would you like to receive 100 TURA test tokens? Please confirm with 'yes'.`;
    } catch (error) {
      console.error('Faucet request error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ Couldn't process faucet request: ${message}. Please try again in a moment.`;
    }
  }

  private async processFaucetDistribution(): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      this.state = { type: 'idle' };
      this.saveState();
      return "Error: No wallet address found. Please create a wallet first.";
    }

    try {
      const userTable = this.loadUserTable();
      if (!userTable[address]) {
        userTable[address] = { balance: 0 };
      }

      // Process faucet distribution
      userTable[address].balance = (userTable[address].balance || 0) + 100;
      this.saveUserTable(userTable);
      
      // Reset state to idle
      this.state = { type: 'idle' };

      // Trigger storage event for balance update
      window.dispatchEvent(new StorageEvent('storage', {
        key: this.USER_TABLE_KEY,
        newValue: JSON.stringify(userTable)
      }));

      return `✅ Successfully received 100 TURA from the faucet!
Your new balance is ${userTable[address].balance} TURA.`;
    } catch (error) {
      this.state = { type: 'idle' };
      this.saveState();
      console.error('Faucet distribution error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ Couldn't process faucet distribution: ${message}. Please try again in a moment.`;
    }
  }



  private async handleBalanceCheck(): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return "You don't have a wallet yet. Would you like me to help you create one? Just say 'create wallet' to get started.";
    }

    try {
      const userTable = this.loadUserTable();
      const balance = userTable[address]?.balance ?? 0;
      const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
      return `💰 Your wallet (${shortAddress}) contains ${balance} TURA

Need to send TURA? Just tell me the amount and recipient address like:
"Send 10 TURA to 0x..."`;
    } catch (error) {
      console.error('Balance check error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ Couldn't check your balance: ${message}. Please try again in a moment.`;
    }
  }

  private async handleCreateWallet(password: string): Promise<string> {
    try {
      if (password.length < 8) {
        this.state = { type: 'idle' };
        this.saveState();
        return "⚠️ Password must be at least 8 characters long. Please try again with a longer password.";
      }

      const existingAddress = localStorage.getItem('lastWalletAddress');
      const userTable = this.loadUserTable();
      if (existingAddress && userTable[existingAddress]) {
        this.state = { type: 'idle' };
        this.saveState();
        return `You already have a wallet! Your address is: ${existingAddress}. You can ask me to check your balance or send TURA.`;
      }

      // Generate real Ethereum wallet
      const wallet = ethers.Wallet.createRandom();
      if (!wallet.mnemonic?.phrase) {
        throw new Error('Failed to generate mnemonic phrase');
      }

      // Save to user table with 0 balance
      userTable[wallet.address] = {
        balance: 0,
        password,
        mnemonic: wallet.mnemonic.phrase
      };
      this.saveUserTable(userTable);

      // Store session and address
      localStorage.setItem('walletSession', JSON.stringify({
        password,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));
      localStorage.setItem('lastWalletAddress', wallet.address);
      
      // Reset state to idle
      this.state = { type: 'idle' };
      this.saveState();

      // Trigger storage event for balance update
      window.dispatchEvent(new StorageEvent('storage', {
        key: this.USER_TABLE_KEY,
        newValue: JSON.stringify(userTable)
      }));

      return `🎉 Wallet created successfully!

Your wallet address: ${wallet.address}

⚠️ IMPORTANT: Below is your mnemonic phrase. Write it down and keep it safe - you'll need it to recover your wallet if you forget your password:

${wallet.mnemonic.phrase}

Your initial balance is 0 TURA. You can request test tokens using the faucet.`;
    } catch (error) {
      this.state = { type: 'idle' };
      this.saveState();
      console.error('Wallet creation error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ Failed to create wallet: ${message}. Please try again or contact support if the issue persists.`;
    }
  }

  private async recognizeIntent(text: string): Promise<Intent> {
    try {
      const result = await openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a wallet assistant. Classify user messages into exactly one of these categories:
CREATE_WALLET - When user wants to create a new wallet
CHECK_BALANCE - When user wants to check their balance
SEND_TOKENS - When user wants to send/transfer TURA tokens
GET_TOKENS - When user wants to get test tokens from faucet
UNKNOWN - When the intent doesn't match any of the above

Respond with a JSON object containing 'intent' and 'confidence' fields.
Example: {"intent": "CREATE_WALLET", "confidence": 0.95}`
          },
          { role: 'user', content: text }
        ],
        model: "gpt-3.5-turbo",
        temperature: 0,
        max_tokens: 50,
        response_format: { type: "json_object" }
      });

      const content = result.choices[0].message?.content;
      if (!content) {
        return { name: 'unknown', confidence: 0.0 };
      }
      const completion = JSON.parse(content);
      return {
        name: completion.intent.toLowerCase(),
        confidence: completion.confidence
      };
    } catch (error) {
      console.error('Intent recognition error:', error);
      return { name: 'unknown', confidence: 0.0 };
    }
  }

  protected async handleIntent(_intent: Intent, text: string): Promise<string> {
    try {
      const lowerText = text.toLowerCase().trim();
      
      // Handle state-specific responses first
      switch (this.state.type) {
        case 'awaiting_password':
          return await this.handleCreateWallet(text);
          
        case 'awaiting_confirmation':
        case 'awaiting_faucet_confirmation':
          if (lowerText === 'yes') {
            return await this.processFaucetDistribution();
          } else if (lowerText === 'no') {
            this.state = { type: 'idle' };
            return "Okay, I won't send you any test tokens. Let me know if you change your mind!";
          } else {
            return "Please respond with 'yes' or 'no' to confirm if you want to receive test tokens.";
          }
      }
      
      // Only use GPT for intent recognition in idle state
      if (this.state.type !== 'idle') {
        return this.getWelcomeMessage();
      }
      
      const recognizedIntent = await this.recognizeIntent(text);
      
      // Handle recognized intent with confidence threshold
      if (recognizedIntent.confidence >= 0.7) {
        switch (recognizedIntent.name) {
          case 'create_wallet':
            this.state = { type: 'awaiting_password' };
            return `To create your wallet, I need a secure password. Please enter a password that:
- Is at least 8 characters long
- Will be used to encrypt your wallet
Note: Make sure to remember this password as you'll need it to access your wallet!`;

          case 'check_balance':
            return await this.handleBalanceCheck();

          case 'send_tokens':
            return `Transfer functionality is currently under maintenance. Please try again later.`;

          case 'get_tokens':
            return await this.handleFaucetRequest();

          default:
            return this.getWelcomeMessage();
        }
      }
      
      // For low confidence, provide help message with available commands
      return `I'm not quite sure what you want to do. Here are the commands I understand:
🔑 "Create a new wallet"
💰 "Check my balance"
🚰 "Get test tokens from faucet"

Just let me know which one you'd like to try!`;
    } catch (error: unknown) {
      console.error('MockWalletAgent error:', error);
      return "I encountered an error processing your request. Please try again.";
    }
  }
}
