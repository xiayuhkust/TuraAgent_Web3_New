import Web3 from 'web3';
import { CHAIN_CONFIG } from './config';
import { CustomProvider } from './customProvider';
import { KeyManager } from './keyManager';

interface Web3TransactionReceipt {
  transactionHash: string;
  blockNumber: number | bigint;
  blockHash: string;
  status: boolean;
  from?: string;
  to?: string;
  contractAddress?: string;
  gasUsed?: number | bigint;
}

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
  private web3: Web3;

  constructor() {
    console.log('Initializing Web3 with chain config:', {
      chainId: CHAIN_CONFIG.chainId,
      chainName: CHAIN_CONFIG.chainName,
      rpcUrl: CHAIN_CONFIG.rpcUrl,
      nativeCurrency: CHAIN_CONFIG.nativeCurrency
    });

    // Initialize with HTTP provider
    const provider = new Web3.providers.HttpProvider(CHAIN_CONFIG.rpcUrl);
    this.web3 = new Web3(provider);
  }

  async createAccount(privateKey?: string) {
    try {
      let account;
      if (privateKey) {
        // Import existing account
        account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      } else {
        // Create new account
        account = this.web3.eth.accounts.create();
      }
      
      console.log('Created new account:', account.address);
      
      return {
        address: account.address,
        privateKey: account.privateKey
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
      if (!this.web3.utils.isAddress(address)) {
        throw new Error('Invalid Ethereum address format');
      }
      
      // For testing: Return mock balance with simulated delay
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      const mockBalance = '1.0'; // Simulated 1 TURA balance
      console.log('Balance for', address, ':', mockBalance, 'TURA (mock for testing)');
      
      return mockBalance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      if (error instanceof Error) {
        throw new Error('Failed to get wallet balance: ' + error.message);
      }
      throw new Error('Failed to get wallet balance');
    }
  }

  async sendTransaction(fromAddress: string, toAddress: string, amount: string, password?: string) {
    const TIMEOUT_MS = 10000; // 10 second timeout
    
    try {
      // Validate addresses
      if (!this.web3.utils.isAddress(fromAddress) || !this.web3.utils.isAddress(toAddress)) {
        throw new Error('Invalid Ethereum address format');
      }
      
      // Convert amount to Wei and validate
      const value = this.web3.utils.toWei(amount.toString(), 'ether');
      if (Number(value) <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      // Get latest nonce and gas price with timeout
      const result = await Promise.race([
        Promise.all([
          this.web3.eth.getTransactionCount(fromAddress, 'latest'),
          this.web3.eth.getGasPrice()
        ]),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('RPC timeout')), TIMEOUT_MS)
        )
      ]) as [number, string];
      
      const [nonce, gasPrice] = result;
      
      // Check if account has sufficient balance with timeout
      const balance = await Promise.race([
        this.web3.eth.getBalance(fromAddress),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('RPC timeout')), TIMEOUT_MS)
        )
      ]) as string | bigint;
      
      const totalCost = BigInt(value) + (BigInt(gasPrice) * BigInt(21000));
      
      if (BigInt(balance) < totalCost) {
        throw new Error('Insufficient balance for transaction');
      }
      
      // Prepare transaction
      const tx = {
        from: fromAddress,
        to: toAddress,
        value: value,
        gas: 21000,  // Standard ETH transfer
        gasPrice: gasPrice,
        nonce: nonce,
        chainId: CHAIN_CONFIG.chainId
      };
      
      let receipt: Web3TransactionReceipt;
      
      if (!password) {
        throw new Error('Password required for transaction signing');
      }
      
      // Get stored encrypted key
      const encryptedData = KeyManager.getStoredKey();
      if (!encryptedData) {
        throw new Error('No stored account found');
      }
      
      try {
        // Decrypt private key using password
        const privateKey = await KeyManager.decryptKey(encryptedData, password);
        
        // Validate decrypted key
        if (!KeyManager.validatePrivateKey(privateKey)) {
          throw new Error('Invalid private key format after decryption');
        }
        
        // Sign and send transaction
        const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
        if (!signedTx.rawTransaction) {
          throw new Error('Failed to sign transaction');
        }
        
        receipt = await Promise.race([
          this.web3.eth.sendSignedTransaction(signedTx.rawTransaction),
          new Promise((_resolve, reject) =>
            setTimeout(() => reject(new Error('RPC timeout')), TIMEOUT_MS)
          )
        ]) as Web3TransactionReceipt;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('password')) {
            throw new Error('Invalid password');
          }
        }
        throw error;
      }
      
      console.log('Transaction successful:', receipt.transactionHash);
      // Convert Web3's receipt to our TransactionReceipt type
      return {
        transactionHash: receipt.transactionHash.toString(),
        blockNumber: Number(receipt.blockNumber),
        blockHash: receipt.blockHash.toString(),
        status: Boolean(receipt.status),
        from: receipt.from?.toString(),
        to: receipt.to?.toString(),
        contractAddress: receipt.contractAddress?.toString(),
        gasUsed: Number(receipt.gasUsed)
      };
    } catch (error) {
      console.error('Transaction failed:', error);
      if (error instanceof Error) {
        // Specific error for timeout
        if (error.message === 'RPC timeout') {
          throw new Error('Failed to send transaction: RPC request timed out after 10 seconds');
        }
        throw new Error('Failed to send transaction: ' + error.message);
      }
      throw new Error('Failed to send transaction');
    }
  }
}

export default WalletService;
