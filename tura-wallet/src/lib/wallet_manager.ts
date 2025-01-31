import { WalletService } from './wallet';
import { ethers } from 'ethers';
import { KeyManager } from './keyManager';

export interface WalletResponse {
  address: string;
  createdAt: string;
  mnemonic?: string;
}

export interface TransactionReceipt {
  transactionHash: string;
  status: boolean;
  from?: string;
  to?: string;
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
      const wallet = ethers.Wallet.createRandom();
      const account = await this.walletService.createAccount(wallet.privateKey);
      if (!account.privateKey) {
        throw new Error('Failed to create wallet: missing private key');
      }
      
      const encryptedData = await KeyManager.encryptKey(account.privateKey, password);
      KeyManager.storeEncryptedKey(encryptedData);
      
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
      await this.getPrivateKey(password);
      localStorage.setItem('walletSession', JSON.stringify({
        password,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));
    } catch {
      throw new Error('Invalid password');
    }
  }

  async importWallet(mnemonic: string, password: string): Promise<WalletResponse> {
    try {
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      const account = await this.walletService.createAccount(wallet.privateKey);
      if (!account.privateKey) {
        throw new Error('Failed to import wallet: missing private key');
      }
      
      const encryptedData = await KeyManager.encryptKey(account.privateKey, password);
      KeyManager.storeEncryptedKey(encryptedData);
      
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

  async sendTransaction(fromAddress: string, toAddress: string, amount: string): Promise<TransactionReceipt> {
    return await this.walletService.sendTransaction(fromAddress, toAddress, amount);
  }

  async getBalance(address: string): Promise<string> {
    try {
      return await this.walletService.getBalance(address);
    } catch {
      console.error('Error getting balance');
      return '0';
    }
  }
}

export type WalletManager = WalletManagerImpl;
export default WalletManagerImpl;
