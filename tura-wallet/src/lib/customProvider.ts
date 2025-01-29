import { ethers } from 'ethers';

export class CustomProvider extends ethers.JsonRpcProvider {
  constructor(url: string) {
    super(url);
  }

  async createAccount(password: string): Promise<string> {
    const wallet = ethers.Wallet.createRandom();
    return wallet.address;
  }

  async getBalance(address: string): Promise<bigint> {
    return await this.getBalance(address);
  }

  async sendTransaction(transaction: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
    return await this.broadcastTransaction(await transaction.signedTransaction);
  }
}
