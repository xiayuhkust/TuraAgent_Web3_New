import { ethers } from 'ethers';
import { CHAIN_CONFIG } from './config';
import { KeyManager } from './keyManager';

type RequestArguments = {
  method: string;
  params?: any[];
};

type EventHandler = (params: any) => void;

/**
 * CustomProvider implements the EIP-1193 interface for Ethereum provider
 * This allows us to handle transactions without relying on MetaMask
 */
declare global {
  interface Window {
    turaProvider?: CustomProvider;
  }
}

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
   * Disconnect the provider and clear state
   */
  disconnect(): void {
    // Clear account state
    this.accounts = [];
    this.connected = false;
    
    // Clear stored keys
    try {
      KeyManager.clearStoredKey();
    } catch (error) {
      console.error('Failed to clear stored key:', error);
    }
    
    // Reset provider state
    this.provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
    
    // Emit events
    this.emit('accountsChanged', []);
    this.emit('disconnect', { chainId: CHAIN_CONFIG.chainId });
    
    console.log('Provider disconnected and state cleared');
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
  // Made protected for testing purposes
  protected emit(eventName: string, data: any): void {
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
    try {
      // Check if we have a stored encrypted key
      const encryptedData = KeyManager.getStoredKey();
      if (encryptedData) {
        // Request password from user to decrypt key
        // This would typically be handled by a UI component
        // For now, we'll throw an error that the UI can catch and handle
        throw new Error('NEEDS_PASSWORD_UNLOCK');
      }

      // If no account exists, we'll create a new one
      const privateKey = KeyManager.generatePrivateKey();
      // Validate key by attempting to create a wallet
      new ethers.Wallet(privateKey);
      
      // Request password from user to encrypt key
      // This would typically be handled by a UI component
      // For now, we'll throw an error that the UI can catch and handle
      throw new Error('NEEDS_PASSWORD_SETUP');
    } catch (error) {
      if (error instanceof Error && 
          (error.message === 'NEEDS_PASSWORD_UNLOCK' || 
           error.message === 'NEEDS_PASSWORD_SETUP')) {
        throw error;
      }
      console.error('Failed to handle account request:', error);
      throw new Error('Failed to access account');
    }
  }
  
  /**
   * Unlock an existing account with password
   */
  async unlockAccount(password: string): Promise<string> {
    const encryptedData = KeyManager.getStoredKey();
    if (!encryptedData) {
      throw new Error('No stored account found');
    }
    
    const privateKey = await KeyManager.decryptKey(encryptedData, password);
    const wallet = new ethers.Wallet(privateKey);
    this.accounts = [wallet.address];
    this.connected = true;
    this.emit('connect', { chainId: CHAIN_CONFIG.chainId });
    return wallet.address;
  }
  
  /**
   * Create and encrypt a new account
   */
  async createAccount(password: string): Promise<string> {
    try {
      console.log('Starting account creation process');
      
      // Check if account already exists
      const existingKey = KeyManager.getStoredKey();
      if (existingKey) {
        console.error('Account already exists');
        throw new Error('Account already exists');
      }
      
      // Generate and validate private key
      const privateKey = KeyManager.generatePrivateKey();
      console.log('Generated new private key');
      
      if (!KeyManager.validatePrivateKey(privateKey)) {
        console.error('Generated key failed validation');
        throw new Error('Invalid private key generated');
      }
      console.log('Private key validation passed');

      // Encrypt the private key
      const encryptedData = await KeyManager.encryptKey(privateKey, password);
      if (!encryptedData || !encryptedData.encryptedKey || !encryptedData.salt || !encryptedData.iv) {
        console.error('Encryption failed or returned invalid data:', encryptedData);
        throw new Error('Failed to encrypt private key');
      }
      console.log('Private key encrypted successfully');

      // Store the encrypted key data
      try {
        KeyManager.storeEncryptedKey(encryptedData);
        // Verify storage was successful
        const storedKey = KeyManager.getStoredKey();
        if (!storedKey) {
          throw new Error('Storage verification failed');
        }
        console.log('Encrypted key stored and verified successfully');
      } catch (storageError) {
        console.error('Failed to store encrypted key:', storageError);
        throw new Error('Failed to store encrypted key');
      }
      
      // Create wallet and update state
      const wallet = new ethers.Wallet(privateKey);
      this.accounts = [wallet.address];
      this.connected = true;
      
      // Emit connection event
      this.emit('accountsChanged', [wallet.address]);
      this.emit('connect', { chainId: CHAIN_CONFIG.chainId });
      
      console.log('Account creation completed successfully');
      return wallet.address;
    } catch (error) {
      console.error('Failed to create account:', error);
      // Reset state on failure
      this.accounts = [];
      this.connected = false;
      this.emit('accountsChanged', []);
      this.emit('disconnect', { chainId: CHAIN_CONFIG.chainId });
      
      // Clean up any partial storage
      try {
        KeyManager.clearStoredKey();
      } catch (cleanupError) {
        console.error('Failed to clean up after error:', cleanupError);
      }
      
      if (error instanceof Error) {
        throw new Error(`Failed to create account: ${error.message}`);
      }
      throw new Error('Failed to create account: Unknown error');
    }
  }

  /**
   * Handle transaction sending
   */
  private async handleSendTransaction(_transaction: any): Promise<string> {
    // Ensure we have an account
    if (this.accounts.length === 0) {
      throw new Error('No account selected');
    }

    // Get the stored encrypted key data
    const encryptedData = KeyManager.getStoredKey();
    if (!encryptedData) {
      throw new Error('No account data found');
    }

    // Request password from user to decrypt key
    // This would typically be handled by a UI component
    throw new Error('NEEDS_PASSWORD_UNLOCK');

    // Note: The UI should catch this error and prompt for password
    // Then call unlockAndSendTransaction with the password
  }

  /**
   * Unlock wallet with password and send transaction
   */
  async unlockAndSendTransaction(txParams: any, password: string): Promise<string> {
    try {
      const encryptedData = KeyManager.getStoredKey();
      if (!encryptedData) {
        throw new Error('No account data found');
      }

      // Decrypt private key
      const privateKey = await KeyManager.decryptKey(encryptedData, password);
      
      // Create wallet instance
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      // Verify the wallet address matches
      if (wallet.address.toLowerCase() !== this.accounts[0].toLowerCase()) {
        throw new Error('Wallet address mismatch');
      }
      
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
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw new Error('Failed to send transaction');
    }
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
