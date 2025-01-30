import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CustomProvider } from '../lib/customProvider';
import { KeyManager } from '../lib/keyManager';
import { CHAIN_CONFIG } from '../lib/config';
import { ethers } from 'ethers';

// Create a deterministic private key for testing
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000';
const mockWallet = TEST_PRIVATE_KEY === '0x0000000000000000000000000000000000000000000000000000000000000000' 
  ? ethers.Wallet.createRandom() 
  : new ethers.Wallet(TEST_PRIVATE_KEY);

describe('Wallet Integration Tests', () => {
  let provider: CustomProvider;
  let testPassword: string;
  let testAddress: string;

  beforeEach(() => {
    provider = new CustomProvider();
    testPassword = 'testPassword123!';
    vi.clearAllMocks();
    localStorage.clear();
    
    // Reset mock wallet state
    vi.spyOn(ethers.Wallet, 'createRandom').mockImplementation(() => mockWallet as any);
    
    // Mock JsonRpcProvider methods
    vi.spyOn(ethers.JsonRpcProvider.prototype, 'getTransactionCount')
      .mockResolvedValue(0);
    vi.spyOn(ethers.JsonRpcProvider.prototype, 'getFeeData')
      .mockResolvedValue({ 
        gasPrice: BigInt(1000000000),
        maxFeePerGas: null,
        maxPriorityFeePerGas: null,
        toJSON: () => ({})
      }); // 1 gwei
    vi.spyOn(ethers.JsonRpcProvider.prototype, 'send')
      .mockImplementation((method: string, _params: any[] | Record<string, any>) => {
        switch (method) {
          case 'eth_sendRawTransaction':
            return Promise.resolve('0xtxhash');
          default:
            return Promise.resolve(null);
        }
      });
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Provider Initialization', () => {
    it('should initialize with correct chain configuration', () => {
      expect(provider.isConnected()).toBe(false);
      expect(provider.request({ method: 'eth_chainId' }))
        .resolves.toBe(`0x${CHAIN_CONFIG.chainId.toString(16)}`);
    });

    it('should handle eth_accounts when no account exists', async () => {
      const accounts = await provider.request({ method: 'eth_accounts' });
      expect(accounts).toEqual([]);
    });
  });

  describe('Account Creation and Management', () => {
    it('should create a new wallet with password', async () => {
      const address = await provider.createAccount(testPassword);
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      
      // Verify stored key exists
      const storedKey = KeyManager.getStoredKey();
      expect(storedKey).toBeTruthy();
    });

    it('should unlock existing wallet with correct password', async () => {
      // Create account first
      const originalAddress = await provider.createAccount(testPassword);
      
      // Clear provider state
      provider = new CustomProvider();
      
      // Unlock account
      const unlockedAddress = await provider.unlockAccount(testPassword);
      expect(unlockedAddress).toBe(originalAddress);
    });

    it('should fail to unlock with wrong password', async () => {
      await provider.createAccount(testPassword);
      provider = new CustomProvider();
      
      await expect(provider.unlockAccount('wrongPassword'))
        .rejects
        .toThrow();
    });
  });

  describe('Transaction Signing', () => {
    beforeEach(async () => {
      testAddress = await provider.createAccount(testPassword);
    });

    it('should handle eth_sendTransaction requests', async () => {
      const tx = {
        from: testAddress,
        to: '0x1234567890123456789012345678901234567890',
        value: '0x0',
        data: '0x',
      };

      const mockSend = vi.spyOn(ethers.JsonRpcProvider.prototype, 'send')
        .mockResolvedValue('0xtxhash');

      // First attempt should request password
      await expect(provider.request({
        method: 'eth_sendTransaction',
        params: [tx]
      })).rejects.toThrow('NEEDS_PASSWORD_UNLOCK');

      // Second attempt with password should succeed
      const result = await provider.unlockAndSendTransaction(tx, testPassword);
      expect(result).toBe('0xtxhash');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle contract deployment transactions', async () => {
      const tx = {
        from: testAddress,
        data: '0x608060405234801561001057600080fd5b50610150806100206000396000f3', // Sample contract bytecode
        value: '0x0'
      };

      const mockSend = vi.spyOn(ethers.JsonRpcProvider.prototype, 'send')
        .mockResolvedValue('0xcontracthash');

      // First attempt should request password
      await expect(provider.request({
        method: 'eth_sendTransaction',
        params: [tx]
      })).rejects.toThrow('NEEDS_PASSWORD_UNLOCK');

      // Second attempt with password should succeed
      const result = await provider.unlockAndSendTransaction(tx, testPassword);
      expect(result).toBe('0xcontracthash');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should fail transaction if not connected', async () => {
      provider = new CustomProvider();
      const tx = {
        from: testAddress,
        to: '0x1234567890123456789012345678901234567890',
        value: '0x0'
      };

      await expect(provider.request({
        method: 'eth_sendTransaction',
        params: [tx]
      })).rejects.toThrow('No account selected');
    });

    it('should handle eth_chainId requests', async () => {
      const chainId = await provider.request({ method: 'eth_chainId' });
      expect(chainId).toBe(`0x${CHAIN_CONFIG.chainId.toString(16)}`);
    });
  });

  describe('Event Handling', () => {
    it('should handle event subscriptions', () => {
      const handler = vi.fn();
      provider.on('accountsChanged', handler);
      
      // @ts-ignore - accessing protected method for testing
      provider['emit']('accountsChanged', [testAddress]);
      
      expect(handler).toHaveBeenCalledWith([testAddress]);
    });

    it('should handle event unsubscription', () => {
      const handler = vi.fn();
      provider.on('accountsChanged', handler);
      provider.removeListener('accountsChanged', handler);
      
      // @ts-ignore - accessing protected method for testing
      provider['emit']('accountsChanged', [testAddress]);
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Chain Management', () => {
    it('should reject switching to unsupported chains', async () => {
      await expect(provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }]
      })).rejects.toThrow('Chain 0x1 not supported');
    });

    it('should only allow adding Tura chain', async () => {
      await expect(provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x1',
          rpcUrls: ['https://mainnet.infura.io/v3/']
        }]
      })).rejects.toThrow('Only Tura chain is supported');
    });
  });

  describe('Security and Key Management', () => {
    it('should securely encrypt private keys', async () => {
      await provider.createAccount(testPassword);
      const storedKey = KeyManager.getStoredKey();
      
      expect(storedKey?.encryptedKey).toBeTruthy();
      expect(storedKey?.salt).toBeTruthy();
      expect(storedKey?.iv).toBeTruthy();
      
      const localStorage = Object.keys(window.localStorage)
        .map(key => window.localStorage.getItem(key))
        .join('');
      expect(localStorage).not.toMatch(/^0x[a-f0-9]{64}$/i);
    });

    it('should prevent direct private key access', async () => {
      await provider.createAccount(testPassword);
      
      // Verify private key is not accessible
      const providerKeys = Object.keys(provider);
      expect(providerKeys).not.toContain('privateKey');
      
      // @ts-ignore - accessing private members for testing
      expect(provider['privateKey']).toBeUndefined();
    });

    it('should clear sensitive data on logout', async () => {
      await provider.createAccount(testPassword);
      provider.disconnect();
      
      expect(KeyManager.getStoredKey()).toBeNull();
      expect(provider.isConnected()).toBe(false);
      expect(provider.request({ method: 'eth_accounts' })).resolves.toEqual([]);
    });

    it('should handle failed decryption attempts', async () => {
      await provider.createAccount(testPassword);
      provider = new CustomProvider();
      
      await expect(provider.unlockAccount('wrongpassword'))
        .rejects
        .toThrow();
    });
  });
});
