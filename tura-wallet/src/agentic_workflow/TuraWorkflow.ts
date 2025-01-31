import { AgenticWorkflow, Intent } from './AgenticWorkflow';
import { addWorkflowRecord, startWorkflowRun, completeWorkflowRun, getAgentFee } from '../stores/store-econ';
import { MockWalletAgent } from './MockWalletAgent';
import { MockAgentManager } from './MockAgentManager';

export class TuraWorkflow extends AgenticWorkflow {
  private currentRunId: string | null = null;

  constructor(
    private mockWalletAgent: MockWalletAgent,
    private mockAgentManager: MockAgentManager
  ) {
    super('TuraWorkflow', 'Automated workflow for wallet setup and agent registration');
  }

  private async delegateToWalletAgent(text: string): Promise<string> {
    const response = await this.mockWalletAgent.processMessage(text);
    return `[Via WalletAgent] ${response}`;
  }

  private async delegateToAgentManager(text: string): Promise<string> {
    const response = await this.mockAgentManager.processMessage(text);
    return `[Via AgentManager] ${response}`;
  }

  protected async handleIntent(_intent: Intent, text: string): Promise<string> {
    const lowerText = text.toLowerCase();

    // Wallet operations take precedence
    if (lowerText.includes('wallet') || lowerText.includes('balance') || 
        lowerText.includes('faucet') || lowerText.includes('create') || 
        lowerText.includes('send') || lowerText.includes('transfer')) {
      return await this.delegateToWalletAgent(text);
    }

    // Agent management operations
    if (lowerText.includes('deploy') || lowerText.includes('agent') || 
        lowerText.includes('register') || lowerText.includes('metadata')) {
      return await this.delegateToAgentManager(text);
    }

    // Workflow execution
    if (lowerText === 'start workflow' || lowerText.includes('start automated') || 
        lowerText.includes('run workflow')) {
      return await this.startWorkflow();
    }

    return 'I can help with:\n' +
           '1. Wallet operations (create, check balance, send tokens)\n' +
           '2. Agent management (deploy, register)\n' +
           '3. Workflow execution (start workflow)\n\n' +
           'What would you like to do?';
  }

  public async startWorkflow(): Promise<string> {
    const address = this.walletSystem.getCurrentAddress();
    if (!address) {
      this.currentRunId = startWorkflowRun('guest');
      addWorkflowRecord(this.currentRunId, {
        agentName: 'WalletAgent',
        fee: getAgentFee('WalletAgent'),
        callType: 'checkWallet',
        address: 'guest',
        success: false,
        details: 'No wallet found'
      });
      completeWorkflowRun(this.currentRunId, false);
      return "No wallet found. Please create one using the WalletAgent first.";
    }

    this.currentRunId = startWorkflowRun(address);
    const balance = await this.walletSystem.getBalance(address);

    addWorkflowRecord(this.currentRunId, {
      agentName: 'WalletAgent',
      fee: getAgentFee('WalletAgent'),
      callType: 'checkBalance',
      address,
      success: true,
      details: `Balance: ${balance} TURA`
    });

    if (balance < 1) {
      addWorkflowRecord(this.currentRunId, {
        agentName: 'WalletAgent',
        fee: getAgentFee('WalletAgent'),
        callType: 'requestFaucet',
        address,
        success: false,
        details: 'Insufficient balance'
      });
      completeWorkflowRun(this.currentRunId, false);
      return "Your balance is too low. Please use the WalletAgent's faucet to get test tokens first.";
    }

    try {
      const registrationFee = 0.1;
      addWorkflowRecord(this.currentRunId, {
        agentName: 'AgentManager',
        fee: registrationFee,
        callType: 'deductFee',
        address,
        success: true,
        details: `Deducting ${registrationFee} TURA registration fee`
      });

      const result = await this.walletSystem.deductFee(address, registrationFee);
      if (!result.success) {
        throw new Error('Failed to deduct registration fee');
      }

      const contractAddress = this.generateContractAddress();
      addWorkflowRecord(this.currentRunId, {
        agentName: 'AgentManager',
        fee: getAgentFee('AgentManager'),
        callType: 'deployAgent',
        address,
        success: true,
        details: `Contract deployed at ${contractAddress}`
      });

      completeWorkflowRun(this.currentRunId, true);
      return `✅ Workflow completed successfully!\n\nContract deployed at: ${contractAddress}\nRemaining balance: ${result.newBalance} TURA`;
    } catch (error) {
      addWorkflowRecord(this.currentRunId, {
        agentName: 'AgentManager',
        fee: getAgentFee('AgentManager'),
        callType: 'deployAgent',
        address,
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      completeWorkflowRun(this.currentRunId, false);
      return `❌ Failed to complete workflow: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private generateContractAddress(): string {
    return '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
