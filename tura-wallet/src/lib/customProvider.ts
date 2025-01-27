import { ethers } from 'ethers';
import { CHAIN_CONFIG } from './config';

type RequestArguments = {
  method: string;
  params?: any[];
};

type EventHandler = (params: any) => void;

/**
 * CustomProvider implements the EIP-1193 interface for Ethereum provider
 * This allows us to handle transactions without relying on MetaMask
 */
export class CustomProvider {
  private eventHandlers: Map<string, Set<EventHandler>>;
  private accounts: string[];
  private connected: boolean;
  private provider: ethers.JsonRpcProvider;
  
  constructor() {
    this.eventHandlers = new Map();
    this.accounts = [];
    this.connected = false;
    this.provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
    
    // Initialize event handler sets
    ['accountsChanged', 'chainChanged', 'connect', 'disconnect'].forEach(event => {
      this.eventHandlers.set(event, new Set());
    });
  }

  /**
   * Check if provider is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Add event listener
   */
  on(eventName: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventName);
    if (handlers) {
      handlers.add(handler);
    }
  }

  /**
   * Remove event listener
   */
  removeListener(eventName: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventName);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event to all registered handlers
   */
  private emit(eventName: string, data: any): void {
    const handlers = this.eventHandlers.get(eventName);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Handle Ethereum JSON-RPC requests
   */
  async request({ method, params = [] }: RequestArguments): Promise<any> {
    switch (method) {
      case 'eth_requestAccounts':
        return this.handleRequestAccounts();
      
      case 'eth_accounts':
        return this.accounts;
      
      case 'eth_chainId':
        return `0x${CHAIN_CONFIG.chainId.toString(16)}`;
      
      case 'eth_sendTransaction':
        return this.handleSendTransaction(params[0]);
      
      case 'wallet_switchEthereumChain':
        return this.handleSwitchChain(params[0]);
      
      case 'wallet_addEthereumChain':
        return this.handleAddChain(params[0]);
      
      default:
        // Forward other requests to the RPC provider
        return this.provider.send(method, params);
    }
  }

  /**
   * Handle account request/creation
   */
  private async handleRequestAccounts(): Promise<string[]> {
    // Check if we have a stored account
    const storedAccount = localStorage.getItem('tura_wallet_account');
    if (storedAccount) {
      const account = JSON.parse(storedAccount);
      this.accounts = [account.address];
      this.connected = true;
      this.emit('connect', { chainId: CHAIN_CONFIG.chainId });
      return this.accounts;
    }

    // If no account exists, we'll need to create one or get it from the user
    // This will be handled by the WalletService's createAccount method
    throw new Error('No account available. Please create one first.');
  }

  /**
   * Handle transaction sending
   */
  private async handleSendTransaction(txParams: any): Promise<string> {
    // Ensure we have an account
    if (this.accounts.length === 0) {
      throw new Error('No account selected');
    }

    // Get the stored account data
    const storedAccount = localStorage.getItem('tura_wallet_account');
    if (!storedAccount) {
      throw new Error('No account data found');
    }

    const account = JSON.parse(storedAccount);
    
    // Create a wallet instance
    const wallet = new ethers.Wallet(account.privateKey, this.provider);
    
    // Prepare transaction
    const tx = {
      from: txParams.from,
      to: txParams.to,
      value: txParams.value || '0x0',
      data: txParams.data || '0x',
      nonce: await this.provider.getTransactionCount(this.accounts[0], 'latest'),
      gasLimit: txParams.gas || '0x5208', // Default: 21000
      gasPrice: await this.provider.getFeeData().then(fees => fees.gasPrice),
      chainId: CHAIN_CONFIG.chainId
    };

    // Sign and send transaction
    const signedTx = await wallet.signTransaction(tx);
    return this.provider.send('eth_sendRawTransaction', [signedTx]);
  }

  /**
   * Handle chain switching
   */
  private async handleSwitchChain(params: { chainId: string }): Promise<null> {
    const targetChainId = parseInt(params.chainId, 16);
    if (targetChainId !== CHAIN_CONFIG.chainId) {
      throw new Error(`Chain ${params.chainId} not supported`);
    }
    return null;
  }

  /**
   * Handle adding new chain
   */
  private async handleAddChain(params: any): Promise<null> {
    // We only support the Tura chain
    if (parseInt(params.chainId, 16) !== CHAIN_CONFIG.chainId) {
      throw new Error('Only Tura chain is supported');
    }
    return null;
  }
}
