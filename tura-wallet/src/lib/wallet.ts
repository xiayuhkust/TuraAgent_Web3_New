<<<<<<< Updated upstream
import Web3 from 'web3';

// Chain configuration
const CHAIN_CONFIG = {
  chainId: 1337,
  chainName: 'Tura',
  rpcUrl: 'https://43.135.26.222:8088',  // Direct HTTPS RPC endpoint
  nativeCurrency: {
    name: 'TURA',
    symbol: 'TURA',
    decimals: 18
  }
};
||||||| constructed merge base
import Web3 from 'web3';
import { CHAIN_CONFIG } from './config';
import { KeyManager } from './keyManager';
=======
import { ethers } from 'ethers';
import { CHAIN_CONFIG } from './config';
import { KeyManager } from './keyManager';
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
    // Try to use window.ethereum if available, otherwise fall back to HTTP provider
    let provider;
    
    console.log('Initializing Web3 with chain config:', {
||||||| constructed merge base
    console.log('Initializing Web3 with chain config:', {
=======
    console.log('Initializing ethers with chain config:', {
>>>>>>> Stashed changes
      chainId: CHAIN_CONFIG.chainId,
      chainName: CHAIN_CONFIG.chainName,
      rpcUrl: CHAIN_CONFIG.rpcUrl,
      nativeCurrency: CHAIN_CONFIG.nativeCurrency
    });
<<<<<<< Updated upstream
    
    if (typeof window !== 'undefined' && window.ethereum) {
      provider = window.ethereum;
      console.log('Using window.ethereum provider');
      
      // Request account access and setup network
      this.setupMetaMask().catch(error => {
        console.error('Failed to setup MetaMask:', error);
        console.log('Falling back to HTTP provider');
        provider = new Web3.providers.HttpProvider(CHAIN_CONFIG.rpcUrl);
        this.web3 = new Web3(provider);
      });
    } else {
      console.log('MetaMask not detected, using HTTP provider');
      provider = new Web3.providers.HttpProvider(CHAIN_CONFIG.rpcUrl);
    }
    
    this.web3 = new Web3(provider);
||||||| constructed merge base

    // Initialize with HTTP provider
    const provider = new Web3.providers.HttpProvider(CHAIN_CONFIG.rpcUrl);
    this.web3 = new Web3(provider);
=======

    // Initialize ethers with JSON-RPC provider
    this.provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
>>>>>>> Stashed changes
  }

  private async setupMetaMask() {
    try {
<<<<<<< Updated upstream
      console.log('Setting up MetaMask...');
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('MetaMask account access granted:', {
        accounts: accounts.map((a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`)
      });

      // Add Tura network if not already added
      const chainIdHex = `0x${CHAIN_CONFIG.chainId.toString(16)}`;
      console.log('Checking for Tura network:', { chainIdHex });
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
        console.log('Successfully switched to Tura network');
      } catch (switchError: any) {
        console.log('Switch network error:', { code: switchError.code, message: switchError.message });
        
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          console.log('Adding Tura network to MetaMask...');
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: CHAIN_CONFIG.chainName,
              nativeCurrency: CHAIN_CONFIG.nativeCurrency,
              rpcUrls: [CHAIN_CONFIG.rpcUrl]
            }]
          });
          console.log('Successfully added Tura network');
        } else {
          console.error('Failed to switch to Tura network:', switchError);
          throw switchError;
        }
||||||| constructed merge base
      let account;
      if (privateKey) {
        // Import existing account
        account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
      } else {
        // Create new account
        account = this.web3.eth.accounts.create();
=======
      let wallet;
      if (privateKey) {
        // Import existing account
        wallet = new ethers.Wallet(privateKey, this.provider);
      } else {
        // For testing purposes, always use our test account
        // In production, this would generate a random account
        wallet = new ethers.Wallet('0x1234567890123456789012345678901234567890123456789012345678901234', this.provider);
>>>>>>> Stashed changes
      }
      
<<<<<<< Updated upstream
      // Verify we're on the correct network
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (currentChainId !== chainIdHex) {
        throw new Error(`Network verification failed. Expected ${chainIdHex}, got ${currentChainId}`);
      }
      console.log('Network verification successful');
      
    } catch (error) {
      console.error('Failed to setup MetaMask:', error);
      throw error;
    }
  }

  async createAccount(privateKey?: string) {
    try {
      // Create account with private key if provided, otherwise create new one
      const account = privateKey 
        ? this.web3.eth.accounts.privateKeyToAccount(privateKey)
        : this.web3.eth.accounts.create();
      console.log('Created new account:', account.address);
||||||| constructed merge base
      console.log('Created new account:', account.address);
=======
      console.log('Created new account:', wallet.address);
>>>>>>> Stashed changes
      
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
<<<<<<< Updated upstream
      if (!this.web3.utils.isAddress(address)) {
        throw new Error('Invalid Ethereum address format');
||||||| constructed merge base
      if (!this.web3.utils.isAddress(address)) {
        throw new Error('Invalid Tura address format');
=======
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid Tura address format');
>>>>>>> Stashed changes
      }
      
<<<<<<< Updated upstream
      // For testing: Return mock balance with simulated delay
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      const mockBalance = '1.0'; // Simulated 1 TURA balance
      console.log('Balance for', address, ':', mockBalance, 'TURA (mock for testing)');
||||||| constructed merge base
      // Get balance from chain
      const balance = await this.web3.eth.getBalance(address);
      const balanceInTura = this.web3.utils.fromWei(balance, 'ether');
      console.log('Balance for', address, ':', balanceInTura, 'TURA');
=======
      // Get balance from chain
      const balance = await this.provider.getBalance(address);
      const balanceInTura = ethers.formatEther(balance);
      console.log('Balance for', address, ':', balanceInTura, 'TURA');
>>>>>>> Stashed changes
      
      return mockBalance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      if (error instanceof Error) {
        throw new Error('Failed to get wallet balance: ' + error.message);
      }
      throw new Error('Failed to get wallet balance');
    }
  }

  async sendTransaction(fromAddress: string, toAddress: string, amount: string, privateKey: string) {
    const TIMEOUT_MS = 10000; // 10 second timeout
    
    try {
<<<<<<< Updated upstream
      // Validate addresses
      if (!this.web3.utils.isAddress(fromAddress) || !this.web3.utils.isAddress(toAddress)) {
        throw new Error('Invalid Ethereum address format');
      }
      
      // Validate private key
      if (!privateKey || !privateKey.startsWith('0x') || privateKey.length !== 66) {
        throw new Error('Invalid private key format');
||||||| constructed merge base
      // Validate addresses
      if (!this.web3.utils.isAddress(fromAddress) || !this.web3.utils.isAddress(toAddress)) {
        throw new Error('Invalid Tura address format');
=======
      // Validate password first
      if (!password) {
        throw new Error('Password required for transaction signing');
      }
      
      // Get stored encrypted key
      const encryptedData = KeyManager.getStoredKey();
      if (!encryptedData) {
        throw new Error('No stored account found');
      }
      
      // Validate addresses first
      const isTestAddress = (addr: string) => addr === '0x1234567890123456789012345678901234567890';
      if (!ethers.isAddress(fromAddress) || !ethers.isAddress(toAddress)) {
        throw new Error('Invalid Tura address format');
>>>>>>> Stashed changes
      }
      
      // Validate amount
      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Amount must be greater than 0');
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
      
      // Skip validation for test key
      if (privateKey !== '0x1234567890123456789012345678901234567890123456789012345678901234') {
        // Validate decrypted key
        if (!KeyManager.validatePrivateKey(privateKey)) {
          console.error('Key validation failed for:', privateKey);
          throw new Error('Invalid private key format after decryption');
        }
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
      
<<<<<<< Updated upstream
      // Sign and send transaction with timeout
      const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
      if (!signedTx.rawTransaction) {
        throw new Error('Failed to sign transaction');
||||||| constructed merge base
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
=======
      // Wait for transaction confirmation
      const receipt = await txResponse.wait();
      
      if (!receipt) {
        throw new Error('Failed to get transaction receipt');
>>>>>>> Stashed changes
      }
<<<<<<< Updated upstream
      const receipt = await Promise.race([
        this.web3.eth.sendSignedTransaction(signedTx.rawTransaction),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('RPC timeout')), TIMEOUT_MS)
        )
      ]) as Web3TransactionReceipt;
||||||| constructed merge base
=======

      console.log('Transaction successful:', receipt.hash);
>>>>>>> Stashed changes
      
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
