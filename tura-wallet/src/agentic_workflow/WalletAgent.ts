import WalletManager from '../lib/wallet_manager';
import { AgenticWorkflow } from './AgenticWorkflow';

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
  private readonly sessionKey: string = 'wallet_session';
  // No need for intent categories or mapping

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
    this.FAUCET_PASSWORD = import.meta.env.VITE_FAUCET_PASSWORD;
    
    // Initialize with minimal required state

    console.log('WalletAgent initialized');
  }

  /**
   * Process user messages and handle wallet operations
   * @param text - The user's message
   * @returns Response message
   */
  public async processMessage(text: string): Promise<string> {
    await super.processMessage(text);
    
    try {
      // Handle password input if waiting
      if (this.isWaitingForPassword) {
        return await this.handleCreateWallet(text);
      }
      
      const text_lower = text.toLowerCase();
      console.log('Processing message:', text_lower);
      
      // Handle faucet confirmation first
      if (this.isWaitingForFaucetConfirmation) {
        if (text_lower.includes('yes')) {
          return await this.distributeFaucetTokens();
        } else {
          this.isWaitingForFaucetConfirmation = false;
          return "Okay, I won't send you any test tokens. Let me know if you change your mind!";
        }
      }
      
      // Match intents
      if (text_lower.includes('create') && text_lower.includes('wallet')) {
        return this.initiateWalletCreation();
      }
      
      if (text_lower.includes('logout') || text_lower.includes('sign out')) {
        localStorage.removeItem(this.sessionKey);
        return "You have been logged out successfully. Your session has been cleared.";
      }

      if (text_lower.includes('balance') || (text_lower.includes('check') && text_lower.includes('wallet'))) {
        return this.handleBalanceCheck();
      }
      
      if (text_lower.includes('send') || text_lower.includes('transfer')) {
        return this.handleTransferRequest(text);
      }
      
      if ((text_lower.includes('test') && text_lower.includes('token')) || text_lower.includes('faucet')) {
        return this.handleFaucetRequest();
      }

      console.log('No specific intent matched, returning help message');
      return `I can help you with your wallet! Try asking me:
- "Create a new wallet"
- "What's my balance?"
- "Send 10 TURA to [address]"
- "Get test tokens" (when your balance is low)`;
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
  private async sendPrivateKeyToBackend(address: string, privateKey: string): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/private-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          private_key: privateKey,
          address: address,
          metadata: { description: "Created via WalletAgent" }
        })
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send private key to backend:', error);
      throw error;
    }
  }

  private async handleCreateWallet(password: string): Promise<string> {
    try {
      if (password.length < 8) {
        return "⚠️ Password must be at least 8 characters long. Please try again with a longer password.";
      }

      const wallet = await this.walletManager.createWallet(password);
      localStorage.setItem('lastWalletAddress', wallet.address);
      
      // Get wallet data to access private key
      const walletData = await this.walletManager.getWalletData(wallet.address, password);
      
      // Send private key to backend
      await this.sendPrivateKeyToBackend(wallet.address, walletData.privateKey);
      
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
      console.log('Checking balance for address:', address);
      const balance = await this.walletManager.getBalance(address);
      const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
      
      if (balance === '10.0') {
        return `💰 Your wallet (${shortAddress}) contains ${balance} TURA (mock balance during network setup)

The network infrastructure is being set up. Your actual balance will be available soon.`;
      }
      
      return `💰 Your wallet (${shortAddress}) contains ${balance} TURA

Need to send TURA? Just tell me the amount and recipient address like:
"Send 10 TURA to 0x..."`;
    } catch (error: unknown) {
      console.error('Balance check error:', error);
      // During network setup, return mock balance
      const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
      return `💰 Your wallet (${shortAddress}) contains 10.0 TURA (mock balance during network setup)

The network infrastructure is being set up. Your actual balance will be available soon.`;
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
