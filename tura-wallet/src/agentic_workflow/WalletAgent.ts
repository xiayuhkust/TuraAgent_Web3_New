import WalletManager from '../lib/wallet_manager';
import { AgenticWorkflow } from './AgenticWorkflow';
import { AgentManager } from './AgentManager';

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
  constructor() {
    super(
      "WalletAgent",
      "Your personal wallet assistant for managing TURA tokens and smart contracts."
    );
    this.walletManager = new WalletManager();
    this.isWaitingForPassword = false;
    this.isWaitingForFaucetConfirmation = false;
    this.FAUCET_ADDRESS = '0x08Bb6eA809A2d6c13D57166Fa3ede48C0ae9a70e';
    this.MIN_BALANCE = 0.1;
    this.FAUCET_AMOUNT = 1;
    this.FAUCET_PASSWORD = 'faucet123';

    // No need for VALID_INTENTS mapping since we use normalized categories directly
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
      console.log('WalletAgent processing message:', { 
        text, 
        isWaitingForPassword: this.isWaitingForPassword,
        isWaitingForFaucetConfirmation: this.isWaitingForFaucetConfirmation
      });

      // Handle password input if waiting
      if (this.isWaitingForPassword) {
        return await this.handleCreateWallet(text);
      }

      // Handle faucet confirmation if waiting
      if (this.isWaitingForFaucetConfirmation) {
        console.log('Processing faucet confirmation response:', text);
        const normalizedResponse = text.toLowerCase().trim();
        if (normalizedResponse === 'yes' || normalizedResponse === 'y') {
          console.log('Faucet confirmation received, distributing tokens...');
          return await this.distributeFaucetTokens();
        } else {
          console.log('Faucet request declined');
          this.isWaitingForFaucetConfirmation = false;
          return "Faucet request cancelled.";
        }
      }
      
      // Get intent classification from backend endpoint
      let normalizedCompletion = 'GENERAL_HELP';  // Default fallback
      let responseText: string;

      try {
        console.log('Calling backend for intent classification');
        const apiResponse = await fetch('/api/process-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });

        if (!apiResponse.ok) {
          throw new Error(`Backend error: ${apiResponse.status}`);
        }

        const { intent, confidence, error } = await apiResponse.json() as {
          intent: string;
          confidence: number;
          error: string | null;
        };

        if (error) {
          throw new Error(`Intent classification error: ${error}`);
        }

        if (!intent || confidence < 0.7) {
          console.warn('Low confidence or missing intent:', { intent, confidence });
          return `❌ Intent unclear`;
        }

        console.log('Intent classification:', { intent, confidence });
        normalizedCompletion = intent;

        // Direct command checks
        const normalizedText = text.toLowerCase();
        
        if (normalizedText.includes('create') && normalizedText.includes('wallet')) {
          console.log('Direct wallet creation command detected');
          responseText = this.initiateWalletCreation();
        }
        else if (normalizedText.includes('test token') ||
                 normalizedText.includes('get token') ||
                 normalizedText.includes('faucet') ||
                 normalizedText.includes('need tura')) {
          console.log('Direct faucet request detected');
          responseText = await this.handleFaucetRequest();
        }
        else {
          // Check for agent deployment intent or ongoing registration
          const agentManager = new AgentManager();
          const registrationState = agentManager.getRegistrationState();
          if (registrationState.step !== 'idle' || 
              (normalizedText.includes('deploy') && normalizedText.includes('agent'))) {
            console.log('Delegating to AgentManager - registration state:', registrationState);
            responseText = await agentManager.processMessage(text);
          }
          else {
            // Process based on intent recognition
            switch (normalizedCompletion) {
              case 'CREATE_WALLET':
              case 'CREATE_A_WALLET':
              case 'NEW_WALLET':
              case 'SETUP_WALLET':
              case 'MAKE_WALLET':
              case 'WALLET_CREATION':
                responseText = this.initiateWalletCreation();
                break;
              
              case 'ACCOUNT_INFO':
              case 'CHECK_BALANCE':
              case 'VIEW_BALANCE':
              case 'GET_BALANCE':
              case 'SHOW_BALANCE':
              case 'WALLET_INFO':
                responseText = await this.handleBalanceCheck();
                break;
              
              case 'TRANSFER_TURA':
              case 'SEND_TURA':
              case 'TRANSFER_TOKENS':
              case 'SEND_MONEY':
              case 'SEND_TOKENS':
                responseText = await this.handleTransferRequest(text);
                break;
              
              case 'FAUCET_REQUEST':
              case 'GET_TOKENS':
              case 'REQUEST_TOKENS':
              case 'NEED_TOKENS':
              case 'LOW_BALANCE':
              case 'FAUCET':
                responseText = await this.handleFaucetRequest();
                break;
              
              default:
                responseText = await this.handleGeneralHelp();
            }
          }
        }
        
        return responseText;
      } catch (error: unknown) {
        console.error('WalletAgent error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        if (message.includes('Both DeepSeek and OpenAI failed')) {
          console.error('Both intent recognition services failed');
          return `❌ I'm having trouble understanding requests right now. Please try again in a moment.`;
        }
        return `❌ ${message}`;
      }
    } catch (error: unknown) {
      console.error('WalletAgent error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ ${message}`;
    } finally {
      // Reset any pending states if an error occurred
      if (this.isWaitingForPassword || this.isWaitingForFaucetConfirmation) {
        this.isWaitingForPassword = false;
        this.isWaitingForFaucetConfirmation = false;
      }
    }
  }

  /**
   * Initiate wallet creation process
   */
  private initiateWalletCreation(): string {
    const address = localStorage.getItem('lastWalletAddress');
    if (address) {
      return `✅ Wallet exists`;
    }
    
    this.isWaitingForPassword = true;
    return `Enter password (min 8 chars):`;
  }

  /**
   * Handle wallet creation with password
   */
  private async handleCreateWallet(password: string): Promise<string> {
    try {
      if (password.length < 8) {
        return "❌ Password too short";
      }

      const wallet = await this.walletManager.createWallet(password);
      // Store session
      localStorage.setItem('walletSession', JSON.stringify({
        password,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));
      localStorage.setItem('lastWalletAddress', wallet.address);
      
      // Reset password waiting state
      this.isWaitingForPassword = false;

      return `✅ ${wallet.address}
⚠️ ${wallet.mnemonic}`;
    } catch (error: unknown) {
      this.isWaitingForPassword = false;
      console.error('Wallet creation error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ Failed to create wallet: ${message}`;
    }
  }

  /**
   * Handle balance check requests
   */
  private async handleBalanceCheck(): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return "❌ No wallet found";
    }

    try {
      const balance = await this.walletManager.getBalance(address);
      return `✅ ${balance} TURA`;
    } catch (error: unknown) {
      console.error('Balance check error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ ${message}`;
    }
  }

  /**
   * Handle transfer/send requests
   */
  private async handleTransferRequest(text: string): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return "❌ No wallet found";
    }

    // Enhanced pattern matching for amount and address
    const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:TURA)?/i);
    const addressMatch = text.match(/(?:to\s+)?(0x[a-fA-F0-9]{40})/i);

    if (!amountMatch || !addressMatch) {
      return `❌ Invalid format`;
    }

    const amount = amountMatch[1];
    try {
      const balance = await this.walletManager.getBalance(address);
      if (parseFloat(balance) < parseFloat(amount)) {
        return `❌ Insufficient balance`;
      }

      return `✅ Ready to send ${amount} TURA`;
    } catch (error: unknown) {
      console.error('Transfer request error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ ${message}`;
    }
  }

  /**
   * Handle faucet token request
   */
  private async handleFaucetRequest(): Promise<string> {
    console.log('Handling faucet request');
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      console.log('No wallet address found');
      return "❌ No wallet found";
    }

    try {
      console.log('Checking balance for address:', address);
      const balance = await this.walletManager.getBalance(address);
      console.log('Current balance:', balance);
      const balanceNum = parseFloat(balance);
      
      if (balanceNum >= this.MIN_BALANCE) {
        console.log('Balance sufficient, no faucet needed');
        return `❌ Balance sufficient`;
      }

      console.log('Setting faucet confirmation flag');
      this.isWaitingForFaucetConfirmation = true;
      return `✅ Balance: ${balance} TURA\nGet ${this.FAUCET_AMOUNT} TURA? (y/n)`;
    } catch (error: unknown) {
      console.error('Faucet request error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return `❌ ${message}`;
    }
  }

  /**
   * Distribute tokens from faucet wallet
   */
  /**
   * Handle general help request
   */
  private async handleGeneralHelp(): Promise<string> {
    try {
      const response = await fetch('/api/process-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'help', context: 'wallet' })
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const { message } = await response.json();
      return message || `Commands:
- create wallet
- check balance
- get tokens
- send TURA`;
    } catch (error) {
      console.error('Help request error:', error);
      return `❌ Service unavailable`;
    }
  }

  private async distributeFaucetTokens(): Promise<string> {
    const recipientAddress = localStorage.getItem('lastWalletAddress');
    if (!recipientAddress) {
      this.isWaitingForFaucetConfirmation = false;
      return "❌ No wallet found";
    }

    try {
      // Check faucet balance
      const faucetBalance = await this.walletManager.getBalance(this.FAUCET_ADDRESS);
      if (parseFloat(faucetBalance) < this.FAUCET_AMOUNT) {
        this.isWaitingForFaucetConfirmation = false;
        return "❌ No faucet funds";
      }

      // Send tokens using the faucet wallet
      await this.walletManager.sendTransaction(
        this.FAUCET_ADDRESS,
        recipientAddress,
        this.FAUCET_AMOUNT.toString(),
        this.FAUCET_PASSWORD
      );

      this.isWaitingForFaucetConfirmation = false;
      return `✅ Sent ${this.FAUCET_AMOUNT} TURA`;
    } catch (error: unknown) {
      console.error('Faucet distribution error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      this.isWaitingForFaucetConfirmation = false;
      return `❌ ${message}`;
    }
  }
}
