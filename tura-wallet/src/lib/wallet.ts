import { ethers } from 'ethers';
import { CHAIN_CONFIG } from './config';
export interface TransactionReceipt {
  transactionHash: string;
  status: boolean;
  from?: string;
  to?: string;
}

export class WalletService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    console.log('Initializing ethers with chain config:', {
      chainId: CHAIN_CONFIG.chainId,
      chainName: CHAIN_CONFIG.chainName,
      rpcUrl: CHAIN_CONFIG.rpcUrl,
      nativeCurrency: CHAIN_CONFIG.nativeCurrency
    });

    this.provider = new ethers.JsonRpcProvider(CHAIN_CONFIG.rpcUrl);
  }

  async createAccount(privateKey?: string): Promise<{ address: string; privateKey?: string }> {
    const wallet = privateKey ? new ethers.Wallet(privateKey) : ethers.Wallet.createRandom();
    return { 
      address: wallet.address,
      privateKey: wallet.privateKey
    };
  }

  async getBalance(address: string) {
    const balance = await this.provider.getBalance(address);
    return balance.toString();
  }

  async sendTransaction(fromAddress: string, toAddress: string, amount: string) {
    const tx = await this.provider.send("eth_sendTransaction", [
      {
        from: fromAddress,
        to: toAddress,
        value: ethers.parseEther(amount).toString()
      }
    ]);
    return {
      transactionHash: tx,
      status: true,
      from: fromAddress,
      to: toAddress
    };
  }
}

export default WalletService;
