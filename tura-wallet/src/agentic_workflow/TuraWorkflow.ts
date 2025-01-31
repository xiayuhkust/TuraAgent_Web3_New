import { AgenticWorkflow } from './AgenticWorkflow';
import { VirtualWalletSystem } from '../lib/virtual-wallet-system';
import { addWorkflowRecord, startWorkflowRun, completeWorkflowRun, getAgentFee } from '../stores/store-econ';
import { ethers } from 'ethers';

export class TuraWorkflow extends AgenticWorkflow {
  private currentRunId: string | null = null;
  protected walletSystem: VirtualWalletSystem;

  constructor() {
    super('TuraWorkflow', 'Automated workflow for wallet setup and agent registration');
    this.walletSystem = new VirtualWalletSystem();
  }

  protected async handleIntent(_intent: any, text: string): Promise<string> {
    const lowerText = text.toLowerCase();
    if (lowerText === 'start workflow' || lowerText.includes('start automated') || 
        lowerText.includes('run workflow')) {
      return await this.startWorkflow();
    }
    return 'Type "Start Workflow" or use the long-press button to begin the automated workflow.';
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
      
      try {
        const wallet = ethers.Wallet.createRandom();
        if (!wallet.mnemonic?.phrase) {
          throw new Error('Failed to generate mnemonic phrase');
        }
        const { address: newAddress } = this.walletSystem.createWallet(wallet.privateKey);
        this.walletSystem.setCurrentAddress(newAddress);
        
        addWorkflowRecord(this.currentRunId, {
          agentName: 'WalletAgent',
          fee: 0,
          callType: 'walletCreated',
          address: newAddress,
          success: true,
          details: 'Wallet created successfully'
        });

        return `🎉 Wallet created successfully!\nYour wallet address: ${newAddress}\n\n` +
               `🔑 Important: Save your mnemonic phrase:\n${wallet.mnemonic.phrase}\n\n` +
               `Your initial balance is 0 TURA. Let me help you get some test tokens.`;
      } catch (error) {
        completeWorkflowRun(this.currentRunId, false);
        return `Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
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
      try {
        await this.walletSystem.distributeFaucet(currentAddress);
        addWorkflowRecord(this.currentRunId, {
          agentName: 'WalletAgent',
          fee: 0,
          callType: 'requestFaucet',
          address: currentAddress,
          success: true,
          details: 'Faucet tokens requested'
        });
        return '🎉 Faucet tokens requested! Please wait a moment while the transaction confirms, then start the workflow again.';
      } catch (error) {
        completeWorkflowRun(this.currentRunId, false);
        return `Failed to request tokens: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    // Step 3: Deploy Agent
    try {
      const contractAddress = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(20)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const registrationFee = 0.1;
      const result = await this.walletSystem.deductFee(currentAddress, registrationFee);
      if (!result.success) {
        throw new Error('Failed to deduct registration fee');
      }

      addWorkflowRecord(this.currentRunId, {
        agentName: 'AgentManager',
        fee: getAgentFee('AgentManager'),
        callType: 'deployAgent',
        address: currentAddress,
        success: true,
        details: `Contract deployed at ${contractAddress}`
      });

      completeWorkflowRun(this.currentRunId, true);
      return `✅ Agent deployed successfully!\n\nContract address: ${contractAddress}\nRemaining balance: ${result.newBalance} TURA`;
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
      return `Failed to deploy agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }


}
