import { ethers } from 'ethers';

export class CustomProvider extends ethers.JsonRpcProvider {
  constructor(url: string) {
    super(url);
  }

  async createAccount(): Promise<string> {
    const wallet = ethers.Wallet.createRandom();
    return wallet.address;
  }

  async getBalance(address: string): Promise<bigint> {
    return await super.getBalance(address);
  }

  async sendTransaction(transaction: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
    const signer = ethers.Wallet.createRandom().connect(this);
    return await signer.sendTransaction(transaction);
  }
}
