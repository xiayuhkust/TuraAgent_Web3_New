import Web3 from 'web3';
import { CHAIN_CONFIG } from './config';

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
  private isMetaMaskConnected: boolean = false;

  constructor() {
    console.log('Initializing Web3 with chain config:', {
      chainId: CHAIN_CONFIG.chainId,
      chainName: CHAIN_CONFIG.chainName,
      rpcUrl: CHAIN_CONFIG.rpcUrl,
      nativeCurrency: CHAIN_CONFIG.nativeCurrency
    });

    // Initialize with HTTP provider for read-only operations
    const provider = new Web3.providers.HttpProvider(CHAIN_CONFIG.rpcUrl);
    this.web3 = new Web3(provider);
    
    // Setup MetaMask if available
    if (typeof window !== 'undefined' && window.ethereum) {
      this.setupMetaMask().catch(error => {
        console.warn('MetaMask setup failed:', error);
      });
    }
  }

  private async setupMetaMask() {
    try {
      console.log('Setting up MetaMask...');
      
      // Switch to MetaMask provider for transaction signing
      this.web3.setProvider(window.ethereum);
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('MetaMask account access granted:', {
        accounts: accounts.map((a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`)
      });

      // Add Tura network if not already added
      const chainIdHex = `0x${CHAIN_CONFIG.chainId.toString(16)}`;
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      } catch (switchError: any) {
        // Add the network if it doesn't exist
        if (switchError.code === 4902 || switchError.code === -32603) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: CHAIN_CONFIG.chainName,
              nativeCurrency: CHAIN_CONFIG.nativeCurrency,
              rpcUrls: [CHAIN_CONFIG.rpcUrl]
            }]
          });
        } else {
          throw switchError;
        }
      }
      
      // Verify network
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (currentChainId !== chainIdHex) {
        throw new Error(`Wrong network. Expected ${chainIdHex}, got ${currentChainId}`);
      }
      
      this.isMetaMaskConnected = true;
      console.log('MetaMask setup successful');
    } catch (error) {
      console.error('Failed to setup MetaMask:', error);
      this.isMetaMaskConnected = false;
      throw error;
    }
  }

  async createAccount() {
    try {
      // Request MetaMask to create a new account
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      await this.setupMetaMask();
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts available');
      }
      
      console.log('Connected to account:', accounts[0]);
      return { address: accounts[0] };
    } catch (error) {
      console.error('Failed to create/connect account:', error);
      if (error instanceof Error) {
        throw new Error('Failed to create/connect wallet account: ' + error.message);
      }
      throw new Error('Failed to create/connect wallet account');
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

  async sendTransaction(fromAddress: string, toAddress: string, amount: string) {
    const TIMEOUT_MS = 10000; // 10 second timeout
    
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Ensure MetaMask is connected
      if (!this.isMetaMaskConnected) {
        await this.setupMetaMask();
      }
      
      // Validate addresses
      if (!this.web3.utils.isAddress(fromAddress) || !this.web3.utils.isAddress(toAddress)) {
        throw new Error('Invalid Ethereum address format');
      }
      
      // Convert amount to Wei and validate
      const value = this.web3.utils.toWei(amount.toString(), 'ether');
      if (Number(value) <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      // Check if account has sufficient balance
      const balance = await this.web3.eth.getBalance(fromAddress);
      const gasPrice = await this.web3.eth.getGasPrice();
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
        chainId: CHAIN_CONFIG.chainId
      };
      
      // Send transaction through MetaMask
      const receipt = await Promise.race([
        this.web3.eth.sendTransaction(tx),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('Transaction timed out')), TIMEOUT_MS)
        )
      ]) as Web3TransactionReceipt;
      
      console.log('Transaction successful:', receipt.transactionHash);
      
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
        throw new Error('Failed to send transaction: ' + error.message);
      }
      throw new Error('Failed to send transaction');
    }
  }
}

export default WalletService;
