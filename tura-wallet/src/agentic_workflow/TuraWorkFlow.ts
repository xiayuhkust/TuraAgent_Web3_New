import { AgenticWorkflow } from './AgenticWorkflow';
import { WalletAgent, IWalletAgent } from './WalletAgent';
import { AgentManager, IAgentManager } from './AgentManager';

export enum TuraWorkFlowState {
  IDLE = 'idle',
  CHECKING_WALLET = 'checkingWallet',
  CHECKING_BALANCE = 'checkingBalance',
  GETTING_FAUCET = 'gettingFaucet',
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
    this.state = TuraWorkFlowState.REGISTERING_AGENT;
    return this.agentManager.getRegistrationPrompt();
  }

  private async handleFaucetRequest(): Promise<string> {
    const result = await this.walletAgent.processMessage('request faucet');
    this.state = TuraWorkFlowState.CHECKING_BALANCE;
    return `${result}\nChecking balance again...`;
  }

  private async handleAgentRegistration(message: string): Promise<string> {
    const result = await this.agentManager.processMessage(message);
    if (result.includes('successfully registered')) {
      this.state = TuraWorkFlowState.IDLE;
    }
    return result;
  }
}
