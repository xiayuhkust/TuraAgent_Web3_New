import { AgenticWorkflow } from './AgenticWorkflow';
import { VirtualWalletSystem } from '../lib/virtual-wallet-system';
import { addWorkflowRecord, startWorkflowRun, completeWorkflowRun, getAgentFee } from '../stores/store-econ';
import { MockWalletAgent } from './MockWalletAgent';
import { MockAgentManager } from './MockAgentManager';

export class TuraWorkflow extends AgenticWorkflow {
  private currentRunId: string | null = null;
  protected walletSystem: VirtualWalletSystem;

  constructor(
    protected mockWalletAgent: MockWalletAgent,
    protected mockAgentManager: MockAgentManager
  ) {
    super('TuraWorkflow', 'Automated workflow for wallet setup and agent registration');
    this.walletSystem = new VirtualWalletSystem();
  }

  private async delegateToWalletAgent(text: string): Promise<string> {
    const response = await this.mockWalletAgent.processMessage(text);
    return `[Via WalletAgent] ${response}`;
  }

  private async delegateToAgentManager(text: string): Promise<string> {
    const response = await this.mockAgentManager.processMessage(text);
    return `[Via AgentManager] ${response}`;
  }

  protected async handleIntent(_intent: any, text: string): Promise<string> {
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
    if (this.currentRunId) {
      return 'A workflow is already running. Please wait for it to complete.';
    }

    // Step 1: Check/Create Wallet
    const address = this.walletSystem.getCurrentAddress();
    if (!address) {
      this.currentRunId = startWorkflowRun('guest');
      addWorkflowRecord(this.currentRunId, {
        agentName: 'WalletAgent',
        fee: getAgentFee('WalletAgent'),
        callType: 'createWallet',
        address: 'guest',
        success: false,
        details: 'Creating new wallet'
      });
      
      const walletResult = await this.mockWalletAgent.processMessage('create wallet');
      const newAddress = this.walletSystem.getCurrentAddress();
      
      if (!newAddress) {
        completeWorkflowRun(this.currentRunId, false);
        return walletResult;
      }
      
      addWorkflowRecord(this.currentRunId, {
        agentName: 'WalletAgent',
        fee: 0,
        callType: 'walletCreated',
        address: newAddress,
        success: true,
        details: 'Wallet created successfully'
      });
    }

    // Step 2: Check/Request Balance
    const currentAddress = this.walletSystem.getCurrentAddress()!;
    if (!this.currentRunId) {
      this.currentRunId = startWorkflowRun(currentAddress);
    }
    
    const balance = await this.walletSystem.getBalance(currentAddress);
    addWorkflowRecord(this.currentRunId, {
      agentName: 'WalletAgent',
      fee: getAgentFee('WalletAgent'),
      callType: 'checkBalance',
      address: currentAddress,
      success: true,
      details: `Balance: ${balance} TURA`
    });

    if (balance < 1) {
      const faucetResult = await this.mockWalletAgent.processMessage('get tokens');
      addWorkflowRecord(this.currentRunId, {
        agentName: 'WalletAgent',
        fee: 0,
        callType: 'requestFaucet',
        address: currentAddress,
        success: false,
        details: 'Requesting faucet tokens'
      });
      completeWorkflowRun(this.currentRunId, false);
      return faucetResult;
    }

    // Step 3: Deploy Agent
    try {
      const deployResult = await this.mockAgentManager.processMessage('deploy agent');
      addWorkflowRecord(this.currentRunId, {
        agentName: 'AgentManager',
        fee: getAgentFee('AgentManager'),
        callType: 'deployAgent',
        address: currentAddress,
        success: true,
        details: 'Agent deployment initiated'
      });

      completeWorkflowRun(this.currentRunId, true);
      return deployResult;
    } catch (error) {
      addWorkflowRecord(this.currentRunId, {
        agentName: 'AgentManager',
        fee: getAgentFee('AgentManager'),
        callType: 'deployAgent',
        address: currentAddress,
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      completeWorkflowRun(this.currentRunId, false);
      return `❌ Failed to complete workflow: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }


}
