// This file is no longer needed as we're using VirtualWalletSystem
export class CustomProvider {
  constructor() {}
  async createAccount(): Promise<string> { return '0x' + Date.now().toString(16).padStart(40, '0'); }
  async getBalance(): Promise<bigint> { return BigInt(0); }
  async sendTransaction(): Promise<{ hash: string }> { return { hash: 'mock_tx_' + Date.now() }; }
}
