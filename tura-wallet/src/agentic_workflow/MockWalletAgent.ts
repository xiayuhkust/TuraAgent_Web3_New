import { AgenticWorkflow, Intent } from './AgenticWorkflow';

interface UserTableEntry {
  balance: number;
  password?: string;
  mnemonic?: string;
}

export class MockWalletAgent extends AgenticWorkflow {
  private isWaitingForPassword: boolean;
  private isWaitingForFaucetConfirmation: boolean;
  private readonly FAUCET_ADDRESS: string;
  private readonly MIN_BALANCE: number;
  private readonly FAUCET_AMOUNT: number;
  private readonly USER_TABLE_KEY = 'mockUserTable';
  constructor() {
    super(
      "MockWalletAgent",
      "Your personal wallet assistant - I can help you check balances, send TURA, and manage your wallet."
    );
    this.isWaitingForPassword = false;
    this.isWaitingForFaucetConfirmation = false;
    this.FAUCET_ADDRESS = '0xM0CK_FAUCET_ADDRESS';
    this.MIN_BALANCE = 0.1;
    this.FAUCET_AMOUNT = 1;
    
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

  private async handleFaucetRequest(): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return "You'll need a wallet first before you can receive test tokens. Would you like me to help you create one? Just say 'create wallet' to get started.";
    }

    try {
      const userTable = this.loadUserTable();
      const balance = userTable[address]?.balance ?? 0;
      
      if (balance >= this.MIN_BALANCE) {
        return `Your current balance (${balance} TURA) is sufficient. The faucet is only available for wallets with less than ${this.MIN_BALANCE} TURA.`;
      }

      this.isWaitingForFaucetConfirmation = true;
      return `Would you like to receive ${this.FAUCET_AMOUNT} TURA from our test faucet? This will help you test the wallet features.

Just say "yes" to confirm.`;
    } catch (error) {
      console.error('Faucet request error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ Couldn't process faucet request: ${message}. Please try again in a moment.`;
    }
  }

  private async handleTransferRequest(text: string): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return "You'll need a wallet first before you can send TURA. Would you like me to help you create one? Just say 'create wallet' to get started.";
    }

    try {
      // Parse amount and recipient from text
      const match = text.match(/send\s+(\d+(?:\.\d+)?)\s+tura\s+to\s+(0x[a-fA-F0-9]{40})/i);
      if (!match) {
        return `To send TURA, please use the format: "Send X TURA to 0x..."
For example: "Send 10 TURA to 0xM0CK1234..."`;
      }

      const amount = parseFloat(match[1]);
      const recipient = match[2];

      // Validate amount
      if (amount <= 0) {
        return "❌ Amount must be greater than 0 TURA.";
      }

      // Check sender's balance
      const userTable = this.loadUserTable();
      const senderBalance = userTable[address]?.balance ?? 0;
      
      if (senderBalance < amount) {
        return `❌ Insufficient balance. You have ${senderBalance} TURA but tried to send ${amount} TURA.`;
      }

      // Initialize recipient if not exists
      if (!userTable[recipient]) {
        userTable[recipient] = { balance: 0 };
      }

      // Update balances
      userTable[address] = {
        ...userTable[address],
        balance: senderBalance - amount
      };
      
      userTable[recipient] = {
        ...userTable[recipient],
        balance: (userTable[recipient].balance ?? 0) + amount
      };

      this.saveUserTable(userTable);

      return `✅ Successfully sent ${amount} TURA to ${recipient.slice(0, 6)}...${recipient.slice(-4)}
Your new balance is ${userTable[address].balance} TURA.`;
    } catch (error) {
      console.error('Transfer error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ Transfer failed: ${message}. Please try again in a moment.`;
    }
  }

  private async distributeFaucetTokens(): Promise<string> {
    try {
      const address = localStorage.getItem('lastWalletAddress');
      if (!address) {
        this.isWaitingForFaucetConfirmation = false;
        return "❌ No wallet found. Please create a wallet first.";
      }

      const userTable = this.loadUserTable();
      const currentBalance = userTable[address]?.balance ?? 0;
      
      // Update balances
      userTable[address] = {
        ...userTable[address],
        balance: currentBalance + this.FAUCET_AMOUNT
      };
      
      // Deduct from faucet
      const faucetBalance = userTable[this.FAUCET_ADDRESS]?.balance ?? 0;
      userTable[this.FAUCET_ADDRESS] = {
        ...userTable[this.FAUCET_ADDRESS],
        balance: faucetBalance - this.FAUCET_AMOUNT
      };

      this.saveUserTable(userTable);
      this.isWaitingForFaucetConfirmation = false;

      return `✅ Success! ${this.FAUCET_AMOUNT} TURA has been sent to your wallet.
Your new balance is ${currentBalance + this.FAUCET_AMOUNT} TURA.`;
    } catch (error) {
      this.isWaitingForFaucetConfirmation = false;
      console.error('Faucet distribution error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ Failed to distribute tokens: ${message}. Please try again in a moment.`;
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
        return "⚠️ Password must be at least 8 characters long. Please try again with a longer password.";
      }

      // Generate mock address with M0CK prefix
      const address = '0xM0CK' + Math.random().toString(16).slice(2, 10).padEnd(38, '0');
      
      // Generate mock mnemonic
      const mockWords = ['mock', 'test', 'wallet', 'local', 'development', 'only', 
                        'not', 'real', 'blockchain', 'virtual', 'environment', 'testing'];
      const mnemonic = mockWords.join(' ');

      // Save to user table with 0 balance
      const userTable = this.loadUserTable();
      userTable[address] = {
        balance: 0,
        password,
        mnemonic
      };
      this.saveUserTable(userTable);

      // Store session and address
      localStorage.setItem('walletSession', JSON.stringify({
        password,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));
      localStorage.setItem('lastWalletAddress', address);
      
      // Reset password waiting state
      this.isWaitingForPassword = false;

      return `🎉 Wallet created successfully!

Your wallet address: ${address}

⚠️ IMPORTANT: Below is your mnemonic phrase. Write it down and keep it safe - you'll need it to recover your wallet if you forget your password:

${mnemonic}

Never share your mnemonic phrase with anyone! I'll help you check your balance and send TURA when you need to.`;
    } catch (error) {
      this.isWaitingForPassword = false;
      console.error('Wallet creation error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ Failed to create wallet: ${message}. Please try again or contact support if the issue persists.`;
    }
  }

  protected async handleIntent(intent: Intent, text: string): Promise<string> {
    try {
      // Handle ongoing interactions first
      if (this.isWaitingForFaucetConfirmation) {
        const normalizedResponse = text.toLowerCase().trim();
        if (normalizedResponse === 'yes' || normalizedResponse === 'y') {
          return await this.distributeFaucetTokens();
        } else {
          this.isWaitingForFaucetConfirmation = false;
          return "Okay, I won't send you any test tokens. Let me know if you change your mind!";
        }
      }

      if (this.isWaitingForPassword) {
        return await this.handleCreateWallet(text);
      }

      // Route based on recognized intent
      switch (intent.name) {
        case 'create_wallet':
          return this.initiateWalletCreation();
        
        case 'check_balance':
          return await this.handleBalanceCheck();
        
        case 'send_tokens':
          return await this.handleTransferRequest(text);
        
        case 'get_test_tokens':
          return await this.handleFaucetRequest();
        
        default:
          return `I can help you manage your wallet! Here's what I can do:

🔑 Create a new wallet
💰 Check your balance
💸 Send TURA tokens to another address
🚰 Get test tokens from our faucet

Just let me know what you'd like to do!`;
      }
    } catch (error) {
      console.error('MockWalletAgent error:', error);
      throw error; // Let base class handle error formatting
    }
  }
}
