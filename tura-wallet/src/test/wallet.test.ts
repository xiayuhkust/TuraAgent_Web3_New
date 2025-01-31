import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WalletService } from '../lib/wallet';
import { VirtualWalletSystem } from '../lib/virtual-wallet-system';

describe('Wallet Service Tests', () => {
  let walletService: WalletService;

  beforeEach(() => {
    walletService = new WalletService();
    const walletSystem = new VirtualWalletSystem();
    walletSystem.clearAllData();
  });

  afterEach(() => {
    const walletSystem = new VirtualWalletSystem();
    walletSystem.clearAllData();
  });

  describe('Basic Wallet Operations', () => {    
    it('should create new wallet', async () => {
      const account = await walletService.createAccount();
      expect(account.address).toBeDefined();
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('should get wallet balance', async () => {
      const account = await walletService.createAccount();
      const balance = await walletService.getBalance(account.address);
      expect(Number(balance)).toBe(0);
    });

    it('should transfer tokens between wallets', async () => {
      const sender = await walletService.createAccount();
      const receiver = await walletService.createAccount();
      
      const receipt = await walletService.sendTransaction(
        sender.address,
        receiver.address,
        '10'
      );

      expect(receipt.status).toBe(true);
      expect(receipt.from).toBe(sender.address);
      expect(receipt.to).toBe(receiver.address);
      expect(receipt.transactionHash).toMatch(/^mock_tx_\d+$/);
    });
  });
});
