import { WalletService } from './wallet';
import { KeyManager } from './keyManager';
import { ethers } from 'ethers';

export interface WalletResponse {
  address: string;
  createdAt: string;
  mnemonic?: string;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  status: boolean;
  // Add other fields that might come from Web3
  from?: string;
  to?: string;
  contractAddress?: string;
  gasUsed?: number;
}

export class WalletManagerImpl {
  public walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  async createWallet(password: string): Promise<WalletResponse> {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    try {
      // Generate wallet with mnemonic
      const wallet = ethers.Wallet.createRandom();
      const account = await this.walletService.createAccount(wallet.privateKey);
      
      // Store encrypted private key
      await KeyManager.storeKey(account.privateKey, password);
      
      return {
        address: account.address,
        createdAt: new Date().toISOString(),
        mnemonic: wallet.mnemonic?.phrase
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create wallet: ${error.message}`);
      }
      throw new Error('Failed to create wallet');
    }
  }

  async getPrivateKey(password: string): Promise<string> {
    const encryptedData = KeyManager.getStoredKey();
    if (!encryptedData) {
      throw new Error('No stored account found');
    }
    return KeyManager.decryptKey(encryptedData, password);
  }

  async getSession(): Promise<{ password: string; expires: string } | null> {
    const session = localStorage.getItem('walletSession');
    if (!session) return null;
    return JSON.parse(session);
  }

  async login(password: string): Promise<void> {
    try {
      // Verify password by attempting to decrypt key
      await this.getPrivateKey(password);
      // Store session
      localStorage.setItem('walletSession', JSON.stringify({
        password,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }));
    } catch (error) {
      throw new Error('Invalid password');
    }
  }

  async importWallet(mnemonic: string, password: string): Promise<WalletResponse> {
    try {
      // Generate private key from mnemonic
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      const account = await this.walletService.createAccount(wallet.privateKey);
      
      // Store encrypted private key
      await KeyManager.storeKey(account.privateKey, password);
      
      return {
        address: account.address,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to import wallet: ${error.message}`);
      }
      throw new Error('Failed to import wallet');
    }
  }
  async sendTransaction(fromAddress: string, toAddress: string, amount: string, password: string): Promise<TransactionReceipt> {
    try {
      const privateKey = await this.getPrivateKey(password);
      if (!privateKey) {
        throw new Error('Invalid password');
      }

      const receipt = await this.walletService.sendTransaction(
        fromAddress,
        toAddress,
        amount,
        privateKey
      );
      return {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        status: Boolean(receipt.status),
        from: receipt.from,
        to: receipt.to || undefined,
        contractAddress: receipt.contractAddress,
        gasUsed: receipt.gasUsed ? Number(receipt.gasUsed) : undefined
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Transaction failed: ${error.message}`);
      }
      throw new Error('Transaction failed');
    }
  }

  async getBalance(address: string): Promise<string> {
    try {
      return await this.walletService.getBalance(address);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get balance: ${error.message}`);
      }
      throw new Error('Failed to get balance');
    }
  }
}

// Export the implementation as the default and type
export type WalletManager = WalletManagerImpl;
export default WalletManagerImpl;
