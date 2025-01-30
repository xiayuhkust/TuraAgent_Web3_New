import { AgenticWorkflow } from './AgenticWorkflow';
import { WalletAgent, IWalletAgent } from './WalletAgent';

export enum TuraWorkFlowState {
  IDLE = 'idle',
  CHECKING_WALLET = 'checkingWallet',
  CHECKING_BALANCE = 'checkingBalance',
  GETTING_FAUCET = 'gettingFaucet',
  DEPLOYING_CONTRACT = 'deployingContract',
  REGISTERING_AGENT = 'registeringAgent'
}

export class TuraWorkFlow extends AgenticWorkflow {
  private state: TuraWorkFlowState = TuraWorkFlowState.IDLE;
  private walletAgent: IWalletAgent = new WalletAgent();
  private readonly MIN_BALANCE = 1.0;

  constructor() {
    super('TuraWorkFlow', 'Automated workflow for agent registration');
  }

  override async processMessage(message: string): Promise<string> {
    const normalizedMessage = message.toLowerCase().trim();
    
    if (normalizedMessage === 'start workflow' || normalizedMessage === 'start wf') {
      return await this.startWorkflow();
    }

    switch (this.state) {
      case TuraWorkFlowState.CHECKING_WALLET: {
        if (normalizedMessage.startsWith('create wallet')) {
          const result = await this.walletAgent.processMessage(message);
          if (result.includes('created successfully')) {
            this.state = TuraWorkFlowState.CHECKING_BALANCE;
            return result + '\n\nNow checking your balance...';
          }
          return result;
        }
        return await this.handleWalletCheck();
      }

      case TuraWorkFlowState.CHECKING_BALANCE:
        return await this.handleBalanceCheck();

      case TuraWorkFlowState.GETTING_FAUCET: {
        const faucetResult = await this.walletAgent.processMessage('get test tokens');
        if (faucetResult.includes('Would you like to receive')) {
          // Automatically confirm faucet request
          const confirmResult = await this.walletAgent.processMessage('yes');
          if (confirmResult.includes('Success') || confirmResult.includes('received')) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return await this.handleBalanceCheck();
          }
          return confirmResult;
        }
        return faucetResult;
      }

      case TuraWorkFlowState.DEPLOYING_CONTRACT:
        return await this.handleContractDeployment(message);

      case TuraWorkFlowState.REGISTERING_AGENT:
        return await this.handleAgentRegistration(message);

      default:
        // Pass through wallet creation commands to WalletAgent
        if (normalizedMessage.includes('create') && normalizedMessage.includes('wallet')) {
          const result = await this.walletAgent.processMessage(message);
          if (result.includes('created successfully')) {
            this.state = TuraWorkFlowState.CHECKING_BALANCE;
            return result + '\n\nNow checking your balance...';
          }
          return result;
        }
        return 'Please type "Start WF" to begin the registration process.';
    }
  }

  private async startWorkflow(): Promise<string> {
    this.state = TuraWorkFlowState.CHECKING_WALLET;
    const hasWallet = await this.walletAgent.hasWallet();
    
    if (!hasWallet) {
      return await this.walletAgent.processMessage('create wallet');
    }
    
    return await this.handleWalletCheck();
  }

  private async handleWalletCheck(): Promise<string> {
    try {
      const hasWallet = await this.walletAgent.hasWallet();
      if (!hasWallet) {
        return 'No wallet found. Please create a new wallet by typing "create wallet".';
      }
      
      this.state = TuraWorkFlowState.CHECKING_BALANCE;
      return await this.handleBalanceCheck();
    } catch (error) {
      this.state = TuraWorkFlowState.IDLE;
      return `Error checking wallet: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleBalanceCheck(): Promise<string> {
    try {
      const balance = await this.walletAgent.getBalance();
      
      if (balance < this.MIN_BALANCE) {
        this.state = TuraWorkFlowState.GETTING_FAUCET;
        return `Your balance (${balance} TURA) is insufficient for contract deployment.\nRequesting test tokens from faucet...`;
      }
      
      this.state = TuraWorkFlowState.DEPLOYING_CONTRACT;
      return 'Ready to deploy contract. Type "y" to confirm deployment or "n" to cancel.';
    } catch (error) {
      this.state = TuraWorkFlowState.IDLE;
      return `Error checking balance: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleContractDeployment(message: string): Promise<string> {
    if (message.toLowerCase() !== 'y') {
      this.state = TuraWorkFlowState.IDLE;
      return 'Contract deployment cancelled.';
    }

    try {
      const privateKey = await this.walletAgent.getDecryptedKey();
      const response = await fetch('/api/v1/deploy-mytoken', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          private_key: privateKey,
          name: 'TuraWorkFlow',
          symbol: 'TWF',
          initial_supply: '1000000000'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Deployment failed');
      }

      this.state = TuraWorkFlowState.REGISTERING_AGENT;
      return `Contract deployed successfully! 🎉\n\nDetails:\n` +
        `• Contract Address: ${data.contract_address}\n` +
        `• Deployer: ${data.deployer_address}\n` +
        `• Name: ${data.name}\n` +
        `• Symbol: ${data.symbol}\n` +
        `• Initial Supply: ${data.initial_supply}\n` +
        `• Chain ID: ${data.chain_id}\n\n` +
        `Type "register" to proceed with agent registration or "cancel" to exit.`;
    } catch (error) {
      this.state = TuraWorkFlowState.IDLE;
      return `Contract deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleAgentRegistration(_message: string): Promise<string> {
    this.state = TuraWorkFlowState.IDLE;
    return "Agent registration completed successfully.";
  }
}
