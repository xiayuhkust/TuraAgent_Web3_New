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
  private walletAgent: IWalletAgent;
  private readonly MIN_BALANCE = 1.0;

  constructor() {
    super('TuraWorkFlow', 'Automated workflow for agent registration');
    this.walletAgent = new WalletAgent();
  }

  async processMessage(message: string): Promise<string> {
    console.log('TuraWorkFlow processing message:', { message, currentState: this.state });
    
    const normalizedMessage = message.toLowerCase();
    
    // Handle wallet creation requests in any state
    if (normalizedMessage.includes('create') && normalizedMessage.includes('wallet')) {
      console.log('Delegating wallet creation to WalletAgent');
      this.state = TuraWorkFlowState.CHECKING_WALLET;
      return await this.walletAgent.processMessage(message);
    }
    
    // Handle password input for wallet creation
    if (this.state === TuraWorkFlowState.CHECKING_WALLET) {
      const result = await this.walletAgent.processMessage(message);
      if (result.includes('created successfully')) {
        this.state = TuraWorkFlowState.CHECKING_BALANCE;
        return result + '\n\nNow checking your balance...';
      }
      return result;
    }
    
    // Handle start workflow command
    if (this.state === TuraWorkFlowState.IDLE && 
        (normalizedMessage === 'start workflow' || normalizedMessage === 'start wf')) {
      console.log('Starting workflow from IDLE state');
      return this.startWorkflow();
    }

    // Process the message based on current state
    switch (this.state) {
      case TuraWorkFlowState.IDLE:
      case TuraWorkFlowState.CHECKING_BALANCE:
      case TuraWorkFlowState.GETTING_FAUCET:
      case TuraWorkFlowState.DEPLOYING_CONTRACT:
      case TuraWorkFlowState.REGISTERING_AGENT:
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
        // Directly request faucet tokens without confirmation
        const faucetResult = await this.walletAgent.processMessage('request faucet');
        console.log('Faucet request result:', faucetResult);
        
        if (faucetResult.includes('Would you like to receive')) {
          // Automatically confirm faucet request
          const confirmResult = await this.walletAgent.processMessage('yes');
          console.log('Faucet confirmation result:', confirmResult);
          
          if (confirmResult.includes('Success')) {
            // Wait a moment for balance to update
            await new Promise(resolve => setTimeout(resolve, 2000));
            const newBalance = await this.walletAgent.getBalance();
            console.log('New balance after faucet:', newBalance);
            
            if (newBalance >= this.MIN_BALANCE) {
              this.state = TuraWorkFlowState.DEPLOYING_CONTRACT;
              return `${confirmResult}\n\nYour new balance is ${newBalance} TURA.\nReady to deploy contract. Type "y" to confirm deployment or "n" to cancel.`;
            }
            return `${confirmResult}\nBalance is still insufficient. Please try requesting tokens again.`;
          }
          return confirmResult;
        }
        return faucetResult;
        
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
        return `Your balance (${balance} TURA) is insufficient for contract deployment.\nRequesting test tokens from faucet...`;
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

  private async handleAgentRegistration(_message: string): Promise<string> {
    this.state = TuraWorkFlowState.IDLE;
    return "Agent registration completed successfully.";
  }
}
