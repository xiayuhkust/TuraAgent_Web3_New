import { WalletService } from './wallet';

export interface WalletResponse {
  address: string;
  createdAt: string;
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

export class WalletManagerImpl {
  public walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  async createWallet(): Promise<WalletResponse> {
    try {
      const account = await this.walletService.createAccount();
      return {
        address: account.address,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create wallet: ${error.message}`);
      }
      throw new Error('Failed to create wallet');
    }
  }

  async sendTransaction(fromAddress: string, toAddress: string, amount: string, password: string): Promise<TransactionReceipt> {
    try {
      return await this.walletService.sendTransaction(
        fromAddress,
        toAddress,
        amount,
        password
      );
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
