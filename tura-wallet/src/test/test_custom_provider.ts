import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CustomProvider } from '../lib/customProvider';
import { KeyManager } from '../lib/keyManager';
// Import CHAIN_CONFIG for testing
import { CHAIN_CONFIG } from '../lib/config';

describe('CustomProvider', () => {
  let provider: CustomProvider;

  beforeEach(() => {
    provider = new CustomProvider();
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    // Mock crypto API
    Object.defineProperty(window, 'crypto', {
      value: {
        subtle: {
          importKey: vi.fn(),
          deriveKey: vi.fn(),
          encrypt: vi.fn(),
          decrypt: vi.fn()
        },
        getRandomValues: vi.fn()
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Interface', () => {
    it('should implement required EIP-1193 methods', () => {
      expect(provider.request).toBeDefined();
      expect(provider.on).toBeDefined();
      expect(provider.removeListener).toBeDefined();
      expect(provider.isConnected).toBeDefined();
    });

    it('should return correct chain ID', async () => {
      const chainId = await provider.request({ method: 'eth_chainId' });
      expect(chainId).toBe(`0x${CHAIN_CONFIG.chainId.toString(16)}`);
    });
  });

  describe('Account Management', () => {
    it('should handle eth_requestAccounts', async () => {
      // Mock key generation
      vi.spyOn(KeyManager, 'generatePrivateKey').mockReturnValue('0x1234...');
      
      try {
        await provider.request({ method: 'eth_requestAccounts' });
        // Should not reach here
        expect(false).toBe(true);
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toBe('NEEDS_PASSWORD_SETUP');
        } else {
          throw error;
        }
      }
    });

    it('should create account with password', async () => {
      const password = `test-${Date.now()}`;
      vi.spyOn(KeyManager, 'generatePrivateKey').mockReturnValue('mock-private-key');
      vi.spyOn(KeyManager, 'encryptKey').mockResolvedValue({
        encryptedKey: 'mock-encrypted-key',
        salt: 'mock-salt',
        iv: 'iv'
      });

      const address = await provider.createAccount(password);
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(provider.isConnected()).toBe(true);
    });
  });

  describe('Transaction Handling', () => {
    it('should validate transaction parameters', async () => {
      const tx = {
        from: '0x1234...',
        to: '0x5678...',
        value: '0x0',
        data: '0x'
      };

      await expect(
        provider.request({ 
          method: 'eth_sendTransaction',
          params: [tx]
        })
      ).rejects.toThrow('No account selected');
    });
  });

  describe('Event Handling', () => {
    it('should handle event subscriptions', () => {
      const handler = vi.fn();
      provider.on('accountsChanged', handler);
      
      // Simulate account change
      (provider as any).emit('accountsChanged', ['0x1234...']);
      expect(handler).toHaveBeenCalledWith(['0x1234...']);
    });

    it('should remove event listeners', () => {
      const handler = vi.fn();
      provider.on('accountsChanged', handler);
      provider.removeListener('accountsChanged', handler);
      
      // Simulate account change
      (provider as any).emit('accountsChanged', ['0x1234...']);
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
