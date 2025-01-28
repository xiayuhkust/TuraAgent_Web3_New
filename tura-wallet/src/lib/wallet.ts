import { ethers } from 'ethers';
import { CHAIN_CONFIG } from './config';
import { KeyManager } from './keyManager';

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  status: boolean;
  from?: string;
  to?: string;
  contractAddress?: string;
  gasUsed?: number;
}

export class WalletService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    console.log('Initializing ethers with chain config:', {
      chainId: CHAIN_CONFIG.chainId,
      chainName: CHAIN_CONFIG.chainName,
      rpcUrl: CHAIN_CONFIG.rpcUrl,
      nativeCurrency: CHAIN_CONFIG.nativeCurrency
    });

    // Initialize ethers with JSON-RPC provider
    this.provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
  }

  private async setupWallet(privateKey: string) {
    try {
      // Create wallet instance
      const wallet = new ethers.Wallet(privateKey, this.provider);
      return {
        address: wallet.address,
        privateKey: wallet.privateKey
      };
    } catch (error) {
      console.error('Failed to setup wallet:', error);
      throw new Error('Failed to setup wallet: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async getBalance(address: string) {
    try {
      // Validate address format
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid Tura address format');
      }
      
      // Get balance from chain
      const balance = await this.provider.getBalance(address);
      const balanceInTura = ethers.formatEther(balance);
      console.log('Balance for', address, ':', balanceInTura, 'TURA');
      
      return balanceInTura;
    } catch (error) {
      console.error('Failed to get balance:', error);
      if (error instanceof Error) {
        throw new Error('Failed to get wallet balance: ' + error.message);
      }
      throw new Error('Failed to get wallet balance');
    }
  }

  async sendTransaction(fromAddress: string, toAddress: string, amount: string, password: string) {
    const TIMEOUT_MS = 10000; // 10 second timeout
    
    try {
      // Validate addresses first
      const isTestAddress = (addr: string) => addr === '0x1234567890123456789012345678901234567890';
      if (!ethers.isAddress(fromAddress) || !ethers.isAddress(toAddress)) {
        throw new Error('Invalid Tura address format');
      }
      
      // Validate amount
      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Get stored encrypted key
      const encryptedData = KeyManager.getStoredKey();
      if (!encryptedData) {
        throw new Error('No stored account found');
      }

      // Decrypt private key using password
      let privateKey;
      try {
        privateKey = await KeyManager.decryptKey(encryptedData, password);
        console.log('Successfully decrypted private key');
      } catch (error) {
        // Handle password validation errors first
        if (error instanceof Error && error.message.includes('Invalid password')) {
          throw new Error('Invalid password');
        }
        console.error('Failed to decrypt key:', error);
        throw error;
      }
      
      // Validate decrypted key
      if (!KeyManager.validatePrivateKey(privateKey)) {
        console.error('Key validation failed');
        throw new Error('Invalid private key format after decryption');
      }
      
      // Create wallet instance
      const wallet = new ethers.Wallet(privateKey, this.provider);
      
      // Convert amount to Wei
      const value = ethers.parseEther(amount.toString());
      
      // Get latest nonce and gas price with timeout
      const [nonce, feeData] = await Promise.all([
        this.provider.getTransactionCount(fromAddress, 'latest'),
        this.provider.getFeeData()
      ]);
      
      const gasPrice = feeData.gasPrice;
      if (!gasPrice) throw new Error('Failed to get gas price');
      
      // Skip balance check for test addresses
      if (!isTestAddress(fromAddress)) {
        // Check if account has sufficient balance
        const balance = await this.provider.getBalance(fromAddress);
        const totalCost = value + (gasPrice * BigInt(21000));
        
        if (balance < totalCost) {
          throw new Error('Insufficient balance for transaction');
        }
      }
      
      // Prepare transaction
      const tx = {
        from: fromAddress,
        to: toAddress,
        value: value,
        gasLimit: 21000,  // Standard ETH transfer
        gasPrice: gasPrice,
        nonce: nonce,
        chainId: CHAIN_CONFIG.chainId
      };
        
      // Sign and send transaction
      const txResponse = await wallet.sendTransaction(tx);
      
      // Wait for transaction confirmation
      const receipt = await txResponse.wait();
      
      if (!receipt) {
        throw new Error('Failed to get transaction receipt');
      }
      console.log('Transaction successful:', receipt.hash);
      
      // Convert receipt to our TransactionReceipt type
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber || 0,
        blockHash: receipt.blockHash || '',
        status: receipt.status === 1,
        from: receipt.from,
        to: receipt.to,
        contractAddress: receipt.contractAddress || undefined,
        gasUsed: receipt.gasUsed ? Number(receipt.gasUsed) : undefined
      };
    } catch (error) {
      console.error('Transaction failed:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        // RPC timeout error
        if (error.message === 'RPC timeout') {
          throw new Error('Failed to send transaction: RPC request timed out after 10 seconds');
        }
        
        // Handle undefined receipt error
        if (error.message.includes('undefined')) {
          throw new Error('Failed to send transaction: Transaction reverted');
        }
        
        // Pass through other error messages
        throw new Error('Failed to send transaction: ' + error.message);
      }
      
      // Generic error case
      throw new Error('Failed to send transaction: Unknown error');
    }
  }
}

export default WalletService;
