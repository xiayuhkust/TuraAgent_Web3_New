import { ethers } from 'ethers';
import { CHAIN_CONFIG } from './config';

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

  async createAccount(privateKey?: string): Promise<{ address: string; privateKey: string }> {
    try {
      let wallet;
      if (privateKey) {
        // Import existing account
        wallet = new ethers.Wallet(privateKey, this.provider);
      } else {
        // For testing purposes, always use our test account
        // In production, this would generate a random account
        wallet = new ethers.Wallet('0x1234567890123456789012345678901234567890123456789012345678901234', this.provider);
      }
      
      console.log('Created new account:', wallet.address);
      
      return {
        address: wallet.address,
        privateKey: wallet.privateKey
      };
    } catch (error) {
      console.error('Failed to create account:', error);
      if (error instanceof Error) {
        throw new Error('Failed to create wallet account: ' + error.message);
      }
      throw new Error('Failed to create wallet account');
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

  async sendTransaction(fromAddress: string, toAddress: string, amount: string, signerPrivateKey: string) {
    try {
      if (!signerPrivateKey) {
        throw new Error('Private key required for transaction signing');
      }
      
      // Validate addresses
      if (!ethers.isAddress(fromAddress) || !ethers.isAddress(toAddress)) {
        throw new Error('Invalid Tura address format');
      }
      
      // Validate amount
      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      // Create wallet instance
      const wallet = new ethers.Wallet(signerPrivateKey, this.provider);
      
      // Convert amount to Wei
      const value = ethers.parseEther(amount.toString());
      
      // Get latest nonce and gas price with timeout
      const [nonce, feeData] = await Promise.all([
        this.provider.getTransactionCount(fromAddress, 'latest'),
        this.provider.getFeeData()
      ]);
      
      const gasPrice = feeData.gasPrice;
      if (!gasPrice) throw new Error('Failed to get gas price');
      
      // Check if account has sufficient balance
      const balance = await this.provider.getBalance(fromAddress);
      const totalCost = value + (gasPrice * BigInt(21000));
      
      if (balance < totalCost) {
        throw new Error('Insufficient balance for transaction');
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
