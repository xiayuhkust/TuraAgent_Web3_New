import { AgenticWorkflow } from './AgenticWorkflow';
import { WalletAgent, IWalletAgent } from './WalletAgent';
import { AgentManager } from './AgentManager';

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
  private walletAgent: IWalletAgent;
  private agentManager: AgentManager;
  private readonly MIN_BALANCE = 1.0;

  constructor() {
    super('TuraWorkFlow', 'Automated workflow for agent registration');
    this.walletAgent = new WalletAgent();
    this.agentManager = new AgentManager();
  }

  async processMessage(message: string): Promise<string> {
    console.log('TuraWorkFlow processing message:', { message, currentState: this.state });
    
    const normalizedMessage = message.toLowerCase();
    
    // Handle start workflow command
    if (this.state === TuraWorkFlowState.IDLE && 
        (normalizedMessage === 'start workflow' || normalizedMessage === 'start wf')) {
      console.log('Starting workflow from IDLE state');
      return this.startWorkflow();
    }

    // For non-IDLE states, process the message based on current state
    switch (this.state) {
      case TuraWorkFlowState.CHECKING_WALLET:
        console.log('Handling wallet check');
        if (normalizedMessage.startsWith('create wallet')) {
          const result = await this.walletAgent.processMessage(message);
          if (result.includes('created successfully')) {
            this.state = TuraWorkFlowState.CHECKING_BALANCE;
            return result + '\n\nNow checking your balance...';
          }
          return result;
        }
        return this.handleWalletCheck();
        
      case TuraWorkFlowState.CHECKING_BALANCE:
        console.log('Handling balance check');
        return this.handleBalanceCheck();
        
      case TuraWorkFlowState.GETTING_FAUCET:
        console.log('Handling faucet request');
        if (normalizedMessage === 'y' || normalizedMessage === 'yes') {
          const faucetResult = await this.walletAgent.processMessage('request faucet');
          if (faucetResult.includes('received')) {
            // Wait a moment for balance to update
            await new Promise(resolve => setTimeout(resolve, 2000));
            const newBalance = await this.walletAgent.getBalance();
            if (newBalance >= this.MIN_BALANCE) {
              this.state = TuraWorkFlowState.DEPLOYING_CONTRACT;
              return `${faucetResult}\n\nYour new balance is ${newBalance} TURA.\nReady to deploy contract. Type "y" to confirm deployment or "n" to cancel.`;
            }
            return `${faucetResult}\nBalance is still insufficient. Please try requesting tokens again.`;
          }
          return faucetResult;
        }
        return 'Would you like me to request test tokens for you? Type "y" to confirm or "n" to cancel.';
        
      case TuraWorkFlowState.DEPLOYING_CONTRACT:
        console.log('Handling contract deployment');
        return this.handleContractDeployment(message);
        
      case TuraWorkFlowState.REGISTERING_AGENT:
        console.log('Handling agent registration');
        return this.handleAgentRegistration(message);
        
      default:
        console.log('In IDLE state, waiting for start command');
        return 'Please type "Start WF" to begin the registration process.';
    }
  }

  private async startWorkflow(): Promise<string> {
    console.log('Starting workflow, checking wallet...');
    this.state = TuraWorkFlowState.CHECKING_WALLET;
    const hasWallet = await this.walletAgent.hasWallet();
    
    if (!hasWallet) {
      return await this.walletAgent.processMessage('create wallet');
    }
    
    return this.handleWalletCheck();
  }

  private async handleWalletCheck(): Promise<string> {
    try {
      const hasWallet = await this.walletAgent.hasWallet();
      console.log('Wallet check result:', hasWallet);
      
      if (!hasWallet) {
        return 'No wallet found. Please create a new wallet by typing "create wallet".';
      }
      
      this.state = TuraWorkFlowState.CHECKING_BALANCE;
      return this.handleBalanceCheck();
    } catch (error) {
      console.error('Wallet check error:', error);
      this.state = TuraWorkFlowState.IDLE;
      return `Error checking wallet: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleBalanceCheck(): Promise<string> {
    try {
      const balance = await this.walletAgent.getBalance();
      console.log('Balance check result:', balance);
      
      if (balance < this.MIN_BALANCE) {
        this.state = TuraWorkFlowState.GETTING_FAUCET;
        const faucetResult = await this.walletAgent.processMessage('request faucet');
        if (faucetResult.includes('received')) {
          // Wait a moment for balance to update
          await new Promise(resolve => setTimeout(resolve, 2000));
          const newBalance = await this.walletAgent.getBalance();
          if (newBalance >= this.MIN_BALANCE) {
            this.state = TuraWorkFlowState.DEPLOYING_CONTRACT;
            return `${faucetResult}\n\nYour new balance is ${newBalance} TURA.\nReady to deploy contract. Type "y" to confirm deployment or "n" to cancel.`;
          }
        }
        return faucetResult;
      }
      
      this.state = TuraWorkFlowState.DEPLOYING_CONTRACT;
      return 'Ready to deploy contract. Type "y" to confirm deployment or "n" to cancel.';
    } catch (error) {
      console.error('Balance check error:', error);
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
      // Get private key from wallet
      let privateKey: string;
      try {
        privateKey = await this.walletAgent.getDecryptedKey();
      } catch (error) {
        this.state = TuraWorkFlowState.IDLE;
        return `Failed to get wallet key: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }

      // Send deployment request to backend
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
          initial_supply: '1000000000'  // Match backend default
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

  private async handleAgentRegistration(message: string): Promise<string> {
    const result = await this.agentManager.processMessage(message);
    if (result.includes('successfully registered')) {
      this.state = TuraWorkFlowState.IDLE;
    }
    return result;
  }
}
