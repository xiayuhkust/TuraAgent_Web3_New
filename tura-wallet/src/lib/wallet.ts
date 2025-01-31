import { VirtualWalletSystem } from './virtual-wallet-system';

export interface TransactionReceipt {
  transactionHash: string;
  status: boolean;
  from?: string;
  to?: string;
}

export class WalletService {
  private walletSystem: VirtualWalletSystem;

  constructor() {
    this.walletSystem = new VirtualWalletSystem();
  }

  async createAccount(): Promise<{ address: string }> {
    return this.walletSystem.createWallet();
  }

  async getBalance(address: string) {
    const balance = await this.walletSystem.getBalance(address);
    return balance.toString();
  }

  async sendTransaction(fromAddress: string, toAddress: string, amount: string) {
    const result = await this.walletSystem.transferTokens(fromAddress, toAddress, Number(amount));
    return {
      transactionHash: 'mock_tx_' + Date.now(),
      status: result.success,
      from: fromAddress,
      to: toAddress
    };
  }
}

export default WalletService;
