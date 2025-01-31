import { AgenticWorkflow, Intent } from './AgenticWorkflow';
import { addWorkflowRecord, startWorkflowRun, completeWorkflowRun, getAgentFee } from '../stores/store-econ';

export class TuraWorkflow extends AgenticWorkflow {
  private currentRunId: string | null = null;

  constructor() {
    super('TuraWorkflow', 'Automated workflow for wallet setup and agent registration');
  }

  protected async handleIntent(_intent: Intent, text: string): Promise<string> {
    if (text.toLowerCase() === 'start workflow') {
      return await this.startWorkflow();
    }
    return 'Type "Start Workflow" or use the long-press button to begin the automated workflow.';
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
