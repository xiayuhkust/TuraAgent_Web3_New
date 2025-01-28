import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WalletService, WalletAccount } from '../lib/wallet';
import { KeyManager } from '../lib/keyManager';

// Mock KeyManager
vi.mock('../lib/keyManager', () => ({
  KeyManager: {
    getStoredKey: vi.fn().mockReturnValue({
      encryptedKey: 'mock-encrypted-key',
      salt: 'mock-salt',
      iv: 'mock-iv'
    }),
    decryptKey: vi.fn().mockImplementation(async (_data: any, password: string): Promise<string> => {
      if (password === 'testPassword123!') {
        // Return a valid private key format that matches our test account
        return '0x1234567890123456789012345678901234567890123456789012345678901234';
      }
      throw new Error('Invalid password');
    }),
    validatePrivateKey: vi.fn().mockImplementation((key) => {
      return key === '0x1234567890123456789012345678901234567890123456789012345678901234';
    }),
    clearStoredKey: vi.fn(),
    storeEncryptedKey: vi.fn()
  }
}));

// Mock Web3
vi.mock('web3', () => {
  const mockProvider = {
    send: vi.fn().mockResolvedValue({}),
    on: vi.fn(),
    removeListener: vi.fn()
  };

  class Web3Mock {
    eth: any;
    utils: any;
    static providers: any;

    constructor(_provider: any) {
      // Provider is stored internally but not used in tests
      this.eth = {
        accounts: {
          create: () => ({
            address: '0x1234567890123456789012345678901234567890',
            privateKey: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
          }),
          privateKeyToAccount: (key: string) => ({
            address: '0x1234567890123456789012345678901234567890',
            privateKey: key
          }),
          signTransaction: async (_tx: any, privateKey: string): Promise<{ rawTransaction: string; transactionHash: string }> => {
            if (!privateKey) {
              throw new Error('Password required for transaction signing');
            }
            if (privateKey !== '0x1234567890123456789012345678901234567890123456789012345678901234') {
              throw new Error('Invalid password');
            }
            return {
              rawTransaction: '0xmocktx',
              transactionHash: '0xtxhash'
            };
          }
        },
        getBalance: vi.fn().mockResolvedValue('1000000000000000000'),
        sendSignedTransaction: vi.fn().mockResolvedValue({
          transactionHash: '0xtxhash',
          status: true
        }),
        getTransactionCount: vi.fn().mockResolvedValue(0),
        getGasPrice: vi.fn().mockResolvedValue('20000000000'),
        getFeeData: vi.fn().mockResolvedValue({
          gasPrice: '20000000000'
        })
      };
      
      this.utils = {
        isAddress: (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr),
        fromWei: (_wei: string): string => '1.0',
        toWei: (eth: string) => {
          if (eth === '0' || parseFloat(eth) <= 0) {
            throw new Error('Amount must be greater than 0');
          }
          return '1000000000000000000';
        }
      };
    }
  }

  Web3Mock.providers = {
    HttpProvider: class {
      constructor() {
        return mockProvider;
      }
    }
  };

  return { default: Web3Mock };
});

describe('Wallet Integration Tests', () => {
  let walletService: WalletService;

  beforeEach(() => {
    walletService = new WalletService();
    localStorage.clear();
    vi.clearAllMocks();
    
    // Reset KeyManager mock implementation
    vi.mocked(KeyManager.getStoredKey).mockReturnValue({
      encryptedKey: 'mock-encrypted-key',
      salt: 'mock-salt',
      iv: 'mock-iv'
    });
    vi.mocked(KeyManager.decryptKey).mockImplementation(async (_data: any, password: string): Promise<string> => {
      if (password === 'testPassword123!') {
        return '0x1234567890123456789012345678901234567890123456789012345678901234';
      }
      throw new Error('Invalid password');
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Account Management', () => {    
    it('should create new account', async () => {
      const account = await walletService.createWallet();
      
      expect(account.address).toBeDefined();
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(account.privateKey).toBeDefined();
      expect(account.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should import existing account', async () => {
      const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
      const account = await walletService.importWallet(privateKey);
      
      expect(account.address).toBeDefined();
      expect(account.privateKey).toBe(privateKey);
    });
  });

  describe('Transaction Management', () => {
    const testPassword = 'testPassword123!';
    let account: WalletAccount;
    
    beforeEach(async () => {
      account = await walletService.createWallet();
    });

    it('should send transaction with password', async () => {
      const toAddress = '0x1234567890123456789012345678901234567890';
      const amount = '0.1';
      
      const receipt = await walletService.sendTransaction(
        account.address,
        toAddress,
        amount,
        testPassword
      );

      expect(receipt.transactionHash).toBe('0xtxhash');
      expect(receipt.status).toBe(true);
    }, 10000);

    it('should fail transaction with wrong password', async () => {
      const toAddress = '0x1234567890123456789012345678901234567890';
      const amount = '0.1';
      
      await expect(walletService.sendTransaction(
        account.address,
        toAddress,
        amount,
        'wrongPassword'
      )).rejects.toThrow('Invalid password');
    });

    it('should validate transaction parameters', async () => {
      // Invalid from address
      await expect(walletService.sendTransaction(
        'invalid',
        '0x1234567890123456789012345678901234567890',
        '0.1',
        testPassword
      )).rejects.toThrow('Invalid Tura address format');

      // Invalid to address
      await expect(walletService.sendTransaction(
        '0x1234567890123456789012345678901234567890',
        'invalid',
        '0.1',
        testPassword
      )).rejects.toThrow('Invalid Tura address format');

      // Invalid amount (negative)
      await expect(walletService.sendTransaction(
        '0x1234567890123456789012345678901234567890',
        '0x1234567890123456789012345678901234567890',
        '-1',
        testPassword
      )).rejects.toThrow('Amount must be greater than 0');

      // Invalid amount (zero)
      await expect(walletService.sendTransaction(
        '0x1234567890123456789012345678901234567890',
        '0x1234567890123456789012345678901234567890',
        '0',
        testPassword
      )).rejects.toThrow('Amount must be greater than 0');
    }, 10000);
  });

  describe('Security and Key Management', () => {
    const testPassword = 'testPassword123!';
    let account: WalletAccount;
    
    beforeEach(async () => {
      account = await walletService.createWallet();
    });

    it('should validate transaction signatures', async () => {
      const toAddress = '0x1234567890123456789012345678901234567890';
      const amount = '0.1';
      
      // First transaction should succeed with correct password
      const receipt1 = await walletService.sendTransaction(
        account.address,
        toAddress,
        amount,
        testPassword
      );
      expect(receipt1.status).toBe(true);
      
      // Second transaction should fail with wrong password
      await expect(walletService.sendTransaction(
        account.address,
        toAddress,
        amount,
        'wrongPassword'
      )).rejects.toThrow('Invalid password');
    });

    it('should prevent unauthorized transactions', async () => {
      const toAddress = '0x1234567890123456789012345678901234567890';
      const amount = '0.1';
      
      // Try transaction without password
      await expect(walletService.sendTransaction(
        account.address,
        toAddress,
        amount,
        ''
      )).rejects.toThrow('Password required for transaction signing');
      
      // Try transaction with null password
      await expect(walletService.sendTransaction(
        account.address,
        toAddress,
        amount,
        null as any
      )).rejects.toThrow('Password required for transaction signing');
    });

    it('should protect private keys', async () => {
      // Verify private key is not stored in localStorage
      const localStorage = Object.keys(window.localStorage)
        .map(key => window.localStorage.getItem(key))
        .join('');
      expect(localStorage).not.toMatch(/^0x[a-f0-9]{64}$/i);
      
      // Verify private key is not accessible on service
      const serviceKeys = Object.keys(walletService);
      expect(serviceKeys).not.toContain('privateKey');
      
      // @ts-ignore - accessing private members for testing
      expect(walletService['privateKey']).toBeUndefined();
    });
  });
});
