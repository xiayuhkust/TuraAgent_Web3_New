import { AgenticWorkflow } from './AgenticWorkflow';
import WalletManager from '../lib/wallet_manager';

type WorkflowState = 'idle' | 'checkingWallet' | 'checkingBalance' | 'gettingFaucet' | 'registeringAgent';

export class TuraWorkFlow extends AgenticWorkflow {
  private walletManager: WalletManager;
  private state: WorkflowState;
  private readonly MIN_BALANCE: number = 1.0;

  constructor() {
    super(
      "TuraWorkFlow",
      "Automated workflow for wallet setup and agent registration"
    );
    this.walletManager = new WalletManager();
    this.state = 'idle';
  }

  public async processMessage(text: string): Promise<string> {
    await super.processMessage(text);
    
    try {
      const text_lower = text.toLowerCase();

      switch (this.state) {
        case 'idle':
          if (text_lower.includes('start workflow')) {
            this.state = 'checkingWallet';
            return this.checkWalletStatus();
          }
          return `Welcome to TuraWorkFlow! Type "Start Workflow" to begin the automated setup process.

This workflow will:
1. Check if you have a wallet
2. Help you get TURA tokens if needed
3. Guide you through agent registration`;

        case 'checkingWallet':
          return this.handleWalletCheck();

        case 'checkingBalance':
          return await this.handleBalanceCheck();

        case 'gettingFaucet':
          if (text_lower.includes('yes')) {
            return `Please switch to WalletAgent to get test tokens. Type:
"switch to WalletAgent"

Then ask for test tokens by typing:
"get test tokens"

Once you have the tokens, come back here and type "Start Workflow" again.`;
          }
          this.state = 'idle';
          return "Workflow cancelled. Type 'Start Workflow' when you're ready to try again.";

        case 'registeringAgent':
          return `Please switch to AgentManager to complete the registration process. Type:
"switch to AgentManager"

Then follow the agent registration instructions.`;

        default:
          this.state = 'idle';
          return "An error occurred. Please type 'Start Workflow' to start over.";
      }
    } catch (error) {
      this.state = 'idle';
      return "An error occurred. Please type 'Start Workflow' to try again.";
    }
  }

  private checkWalletStatus(): string {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      return `Please create a wallet to continue. Switch to WalletAgent by typing:
"switch to WalletAgent"

Then create your wallet by typing:
"create wallet"

Once you have created your wallet, come back here and type "Start Workflow" again.`;
    }

    this.state = 'checkingBalance';
    return `Found your wallet: ${address.slice(0, 6)}...${address.slice(-4)}
Checking your balance...`;
  }

  private async handleWalletCheck(): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      this.state = 'idle';
      return "No wallet found. Please type 'Start Workflow' to try again.";
    }

    this.state = 'checkingBalance';
    return await this.handleBalanceCheck();
  }

  private async handleBalanceCheck(): Promise<string> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      this.state = 'idle';
      return "No wallet found. Please type 'Start Workflow' to try again.";
    }

    try {
      const balance = await this.walletManager.getBalance(address);
      const balanceNum = parseFloat(balance);
      
      if (balanceNum >= this.MIN_BALANCE) {
        this.state = 'registeringAgent';
        return `Your wallet has sufficient TURA for agent registration.

To start the registration process:
1. Type "switch to AgentManager"
2. Then type "deploy agent" to begin
3. Follow the prompts to provide agent details

The process will guide you through:
- Setting agent name and description
- Adding company information
- Providing social links (optional)
- Confirming contract deployment`;
      }

      this.state = 'gettingFaucet';
      return `Your wallet requires additional TURA to register an agent.

Would you like to get test tokens from the faucet? Type "yes" to proceed.`;
    } catch (error) {
      this.state = 'idle';
      return "Failed to check balance. Please type 'Start Workflow' to try again.";
    }
  }
}
