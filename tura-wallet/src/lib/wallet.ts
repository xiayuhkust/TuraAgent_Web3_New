import Web3 from 'web3';

// Chain configuration
const CHAIN_CONFIG = {
  chainId: 1337,
  chainName: 'Tura',
  rpcUrl: 'https://43.135.26.222:8088',
  nativeCurrency: {
    name: 'TURA',
    symbol: 'TURA',
    decimals: 18
  }
};

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
    // Try to use window.ethereum if available, otherwise fall back to HTTP provider
    let provider;
    
    console.log('Initializing Web3 with chain config:', {
      chainId: CHAIN_CONFIG.chainId,
      chainName: CHAIN_CONFIG.chainName,
      rpcUrl: CHAIN_CONFIG.rpcUrl,
      nativeCurrency: CHAIN_CONFIG.nativeCurrency
    });
    
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
  }

  private async setupMetaMask() {
    try {
      console.log('Setting up MetaMask...');
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      console.log('MetaMask account access granted:', {
        accounts: accounts.map(a => `${a.slice(0, 6)}...${a.slice(-4)}`)
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
      } catch (error) {
        const switchError = error as { code: number; message: string };
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
      }
      
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

  async sendTransaction(fromAddress: string, toAddress: string, amount: string, privateKey: string) {
    const TIMEOUT_MS = 10000; // 10 second timeout
    
    try {
      // Validate addresses
      if (!this.web3.utils.isAddress(fromAddress) || !this.web3.utils.isAddress(toAddress)) {
        throw new Error('Invalid Ethereum address format');
      }
      
      // Validate private key
      if (!privateKey || !privateKey.startsWith('0x') || privateKey.length !== 66) {
        throw new Error('Invalid private key format');
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
      
      // Sign and send transaction with timeout
      const signedTx = await this.web3.eth.accounts.signTransaction(tx, privateKey);
      if (!signedTx.rawTransaction) {
        throw new Error('Failed to sign transaction');
      }
      const receipt = await Promise.race([
        this.web3.eth.sendSignedTransaction(signedTx.rawTransaction),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('RPC timeout')), TIMEOUT_MS)
        )
      ]) as Web3TransactionReceipt;
      
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
