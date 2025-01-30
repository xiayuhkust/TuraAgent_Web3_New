import { AgenticWorkflow } from './AgenticWorkflow';
import { WalletAgent, IWalletAgent } from './WalletAgent';
import { AgentManager, IAgentManager } from './AgentManager';

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
  private agentManager: IAgentManager;
  private readonly MIN_BALANCE = 1.0;

  constructor() {
    super('TuraWorkFlow', 'Automated workflow for agent registration');
    this.walletAgent = new WalletAgent();
    this.agentManager = new AgentManager();
  }

  async processMessage(message: string): Promise<string> {
    const normalizedMessage = message.toLowerCase();
    if (this.state === TuraWorkFlowState.IDLE && 
        (normalizedMessage === 'start workflow' || normalizedMessage === 'start wf')) {
      return this.startWorkflow();
    }

    switch (this.state) {
      case TuraWorkFlowState.CHECKING_WALLET:
        return this.handleWalletCheck();
      case TuraWorkFlowState.CHECKING_BALANCE:
        return this.handleBalanceCheck();
      case TuraWorkFlowState.GETTING_FAUCET:
        return this.handleFaucetRequest();
      case TuraWorkFlowState.DEPLOYING_CONTRACT:
        return this.handleContractDeployment(message);
      case TuraWorkFlowState.REGISTERING_AGENT:
        return this.handleAgentRegistration(message);
      default:
        return 'Please type "Start Workflow" to begin the registration process.';
    }
  }

  private async startWorkflow(): Promise<string> {
    this.state = TuraWorkFlowState.CHECKING_WALLET;
    return this.handleWalletCheck();
  }

  private async handleWalletCheck(): Promise<string> {
    const hasWallet = await this.walletAgent.hasWallet();
    if (!hasWallet) {
      return this.walletAgent.processMessage('create wallet');
    }
    this.state = TuraWorkFlowState.CHECKING_BALANCE;
    return this.handleBalanceCheck();
  }

  private async handleBalanceCheck(): Promise<string> {
    const balance = await this.walletAgent.getBalance();
    if (balance < this.MIN_BALANCE) {
      this.state = TuraWorkFlowState.GETTING_FAUCET;
      return 'Your balance is insufficient. Requesting tokens from faucet...';
    }
    this.state = TuraWorkFlowState.DEPLOYING_CONTRACT;
    return 'Ready to deploy contract. Type "y" to confirm deployment or "n" to cancel.';
  }

  private async handleFaucetRequest(): Promise<string> {
    const result = await this.walletAgent.processMessage('request faucet');
    this.state = TuraWorkFlowState.CHECKING_BALANCE;
    return `${result}\nChecking balance again...`;
  }

  private async handleContractDeployment(message: string): Promise<string> {
    if (message.toLowerCase() !== 'y') {
      this.state = TuraWorkFlowState.IDLE;
      return 'Contract deployment cancelled.';
    }

    try {
      const privateKey = await this.walletAgent.getDecryptedKey();
      const response = await fetch('http://localhost:8000/api/deploy-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ private_key: privateKey })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Contract deployment failed');
      }

      const { contract_address } = await response.json();
      this.state = TuraWorkFlowState.REGISTERING_AGENT;
      return `Contract deployed successfully at: ${contract_address}\n${this.agentManager.getRegistrationPrompt()}`;
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
