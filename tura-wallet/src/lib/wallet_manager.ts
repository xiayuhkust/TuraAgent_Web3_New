import { WalletService } from './wallet';

export interface WalletResponse {
  address: string;
  createdAt: string;
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

  async createWallet(): Promise<WalletResponse> {
    const account = await this.walletService.createAccount();
    return {
      address: account.address,
      createdAt: new Date().toISOString()
    };
  }

  async sendTransaction(fromAddress: string, toAddress: string, amount: string): Promise<TransactionReceipt> {
    return await this.walletService.sendTransaction(fromAddress, toAddress, amount);
  }

  async getBalance(address: string): Promise<string> {
    return await this.walletService.getBalance(address);
  }
}

export type WalletManager = WalletManagerImpl;
export default WalletManagerImpl;
