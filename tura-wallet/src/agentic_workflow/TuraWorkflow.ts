import { AgenticWorkflow, Intent } from './AgenticWorkflow';
import { VirtualWalletSystem } from '../lib/virtual-wallet-system';
import { addWorkflowRecord, startWorkflowRun, completeWorkflowRun, getAgentFee } from '../stores/store-econ';

type WorkflowState = 'idle' | 'awaiting_wallet_confirmation' | 'awaiting_faucet_confirmation' | 'awaiting_deployment_confirmation';

export class TuraWorkflow extends AgenticWorkflow {
  private currentRunId: string | null = null;
  private state: WorkflowState = 'idle';

  constructor() {
    super('TuraWorkflow', 'Automated workflow for wallet setup and agent registration');
    this.walletSystem = new VirtualWalletSystem();
  }

  protected async handleIntent(intent: Intent, text: string): Promise<string> {
    const lowerText = text.toLowerCase().trim();

    // Log every intent handling attempt
    if (this.currentRunId) {
      addWorkflowRecord(this.currentRunId, {
        agentName: 'TuraWorkflow',
        fee: 0,
        callType: 'handleIntent',
        address: this.walletSystem.getCurrentAddress() || 'guest',
        success: true,
        details: `Processing intent: ${text}`
      });
    }

    // Use language model to generate response based on state
    if (this.state === 'idle') {
      if (lowerText === 'start workflow') {
        return await this.startWorkflow();
      }
      return await this.generateResponse(intent, 'idle', {
        suggestions: ["Type 'Start Workflow' to begin the automated setup process."],
        context: "I can help you set up your wallet and register as an agent. Would you like to start?"
      });
    }

    if (this.state === 'awaiting_wallet_confirmation') {
      if (lowerText === 'yes' || lowerText === 'y') {
        return await this.createWallet();
      }
      if (lowerText === 'no' || lowerText === 'n') {
        addWorkflowRecord(this.currentRunId!, {
          agentName: 'TuraWorkflow',
          fee: 0,
          callType: 'cancelWorkflow',
          address: 'guest',
          success: true,
          details: 'User declined wallet creation'
        });
        this.state = 'idle';
        completeWorkflowRun(this.currentRunId!, false);
        return await this.generateResponse(intent, 'cancelled', {
          context: "You've declined wallet creation. No problem! Let me know when you'd like to try again.",
          suggestions: ["Type 'Start Workflow' when you're ready."]
        });
      }
      return await this.generateResponse(intent, 'awaiting_confirmation', {
        context: "I'm waiting for your confirmation to create a wallet.",
        suggestions: ['Please respond with "yes" or "no"']
      });
    }

    if (this.state === 'awaiting_faucet_confirmation') {
      if (lowerText === 'yes' || lowerText === 'y') {
        return await this.distributeFaucet();
      }
      if (lowerText === 'no' || lowerText === 'n') {
        const address = this.walletSystem.getCurrentAddress()!;
        addWorkflowRecord(this.currentRunId!, {
          agentName: 'TuraWorkflow',
          fee: 0,
          callType: 'cancelWorkflow',
          address,
          success: true,
          details: 'User declined faucet tokens'
        });
        this.state = 'idle';
        completeWorkflowRun(this.currentRunId!, false);
        return await this.generateResponse(intent, 'cancelled', {
          context: "You've declined to receive test tokens. You'll need some TURA tokens to proceed with agent registration.",
          suggestions: ["Type 'Start Workflow' when you're ready to try again."]
        });
      }
      return await this.generateResponse(intent, 'awaiting_confirmation', {
        context: "I'm waiting for your confirmation to send you test tokens.",
        suggestions: ['Please respond with "yes" or "no"']
      });
    }

    if (this.state === 'awaiting_deployment_confirmation') {
      if (lowerText === 'yes' || lowerText === 'y') {
        return await this.deployAgent();
      }
      if (lowerText === 'no' || lowerText === 'n') {
        const address = this.walletSystem.getCurrentAddress()!;
        addWorkflowRecord(this.currentRunId!, {
          agentName: 'TuraWorkflow',
          fee: 0,
          callType: 'cancelWorkflow',
          address,
          success: true,
          details: 'User declined agent deployment'
        });
        this.state = 'idle';
        completeWorkflowRun(this.currentRunId!, false);
        return await this.generateResponse(intent, 'cancelled', {
          context: "You've declined to deploy your agent. Your wallet and tokens will be saved for later use.",
          suggestions: ["Type 'Start Workflow' when you're ready to try agent deployment again."]
        });
      }
      return await this.generateResponse(intent, 'awaiting_confirmation', {
        context: "I'm waiting for your confirmation to deploy your agent. This will cost 0.1 TURA.",
        suggestions: ['Please respond with "yes" or "no"']
      });
    }

    // Handle any other state or input
    return await this.generateResponse(intent, this.state, {
      context: "I'm here to help you set up your wallet and register as an agent.",
      suggestions: ["Type 'Start Workflow' to begin the automated process."]
    });
  }

  private async generateResponse(intent: Intent, state: string, options: {
    context: string;
    suggestions: string[];
  }): Promise<string> {
    // Use the intent and context to generate a natural language response
    const response = await this.llm.chat([
      { role: 'system', content: `You are a helpful assistant guiding users through the TuraAgent workflow. Current state: ${state}` },
      { role: 'user', content: options.context }
    ]);

    return `${response}\n\n💡 ${options.suggestions.join('\n💡 ')}`;
  }

  private async startWorkflow(): Promise<string> {
    try {
      const address = this.walletSystem.getCurrentAddress();
      this.currentRunId = startWorkflowRun(address || 'guest');

      // Log workflow start
      addWorkflowRecord(this.currentRunId, {
        agentName: 'TuraWorkflow',
        fee: 0,
        callType: 'startWorkflow',
        address: address || 'guest',
        success: true,
        details: 'Starting automated workflow'
      });

      // Log wallet check
      addWorkflowRecord(this.currentRunId, {
        agentName: 'WalletAgent',
        fee: getAgentFee('WalletAgent'),
        callType: 'checkWallet',
        address: address || 'guest',
        success: true,
        details: address ? 'Wallet found' : 'No wallet found'
      });
    } catch (error) {
      if (this.currentRunId) {
        addWorkflowRecord(this.currentRunId, {
          agentName: 'TuraWorkflow',
          fee: 0,
          callType: 'startWorkflow',
          address: 'guest',
          success: false,
          details: error instanceof Error ? error.message : 'Unknown error'
        });
        completeWorkflowRun(this.currentRunId, false);
      }
      throw error;
    }

    if (!address) {
      this.state = 'awaiting_wallet_confirmation';
      return "You'll need a wallet to proceed. Would you like me to create one for you? (yes/no)";
    }

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
      this.state = 'awaiting_faucet_confirmation';
      return "Your balance is too low. Would you like to receive 100 TURA test tokens? (yes/no)";
    }

    this.state = 'awaiting_deployment_confirmation';
    return "Great! Your wallet is ready. Would you like to proceed with agent deployment? This will cost 0.1 TURA. (yes/no)";
  }

  private async createWallet(): Promise<string> {
    try {
      addWorkflowRecord(this.currentRunId!, {
        agentName: 'TuraWorkflow',
        fee: 0,
        callType: 'initiateWalletCreation',
        address: 'guest',
        success: true,
        details: 'Starting wallet creation'
      });

      const { address } = this.walletSystem.createWallet();
      this.walletSystem.setCurrentAddress(address);
    } catch (error) {
      addWorkflowRecord(this.currentRunId!, {
        agentName: 'TuraWorkflow',
        fee: 0,
        callType: 'createWallet',
        address: 'guest',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      completeWorkflowRun(this.currentRunId!, false);
      throw error;
    }

    addWorkflowRecord(this.currentRunId!, {
      agentName: 'WalletAgent',
      fee: getAgentFee('WalletAgent'),
      callType: 'createWallet',
      address,
      success: true,
      details: 'Wallet created successfully'
    });

    this.state = 'awaiting_faucet_confirmation';
    return `✅ Wallet created successfully!\nYour address: ${address}\n\nWould you like to receive 100 TURA test tokens? (yes/no)`;
  }

  private async distributeFaucet(): Promise<string> {
    try {
      const address = this.walletSystem.getCurrentAddress()!;
      
      addWorkflowRecord(this.currentRunId!, {
        agentName: 'WalletAgent',
        fee: 0,  // Explicitly show this is a 0-fee operation
        callType: 'initiateFaucet',
        address,
        success: true,
        details: 'Initiating faucet distribution'
      });

      const result = await this.walletSystem.distributeFaucet(address);

      addWorkflowRecord(this.currentRunId!, {
        agentName: 'WalletAgent',
        fee: 0,  // Explicitly show this is a 0-fee operation
        callType: 'distributeFaucet',
        address,
        success: true,
        details: `Distributed ${result.amount} TURA tokens`
      });

      this.state = 'awaiting_deployment_confirmation';
      return `✅ Received ${result.amount} TURA tokens!\nYour new balance is ${result.newBalance} TURA\n\nWould you like to proceed with agent deployment? This will cost 0.1 TURA. (yes/no)`;
    } catch (error) {
      addWorkflowRecord(this.currentRunId!, {
        agentName: 'WalletAgent',
        fee: 0,
        callType: 'distributeFaucet',
        address: this.walletSystem.getCurrentAddress() || 'guest',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      completeWorkflowRun(this.currentRunId!, false);
      throw error;
    }
  }

  private async deployAgent(): Promise<string> {
    try {
      const address = this.walletSystem.getCurrentAddress()!;
      const registrationFee = 0.1;

      addWorkflowRecord(this.currentRunId!, {
        agentName: 'TuraWorkflow',
        fee: 0,
        callType: 'initiateDeployment',
        address,
        success: true,
        details: 'Starting agent deployment'
      });

    try {
      addWorkflowRecord(this.currentRunId!, {
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

      const contractAddress = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      addWorkflowRecord(this.currentRunId!, {
        agentName: 'AgentManager',
        fee: getAgentFee('AgentManager'),
        callType: 'deployAgent',
        address,
        success: true,
        details: `Contract deployed at ${contractAddress}`
      });

      this.state = 'idle';
      completeWorkflowRun(this.currentRunId!, true);
      return `✅ Workflow completed successfully!\n\nContract deployed at: ${contractAddress}\nRemaining balance: ${result.newBalance} TURA`;
    } catch (error) {
      addWorkflowRecord(this.currentRunId!, {
        agentName: 'TuraWorkflow',
        fee: 0,
        callType: 'deployAgent',
        address: this.walletSystem.getCurrentAddress() || 'guest',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      completeWorkflowRun(this.currentRunId!, false);
      throw error;
    } catch (error) {
      addWorkflowRecord(this.currentRunId!, {
        agentName: 'AgentManager',
        fee: getAgentFee('AgentManager'),
        callType: 'deployAgent',
        address,
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      });

      this.state = 'idle';
      completeWorkflowRun(this.currentRunId!, false);
      return `❌ Failed to complete workflow: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}
