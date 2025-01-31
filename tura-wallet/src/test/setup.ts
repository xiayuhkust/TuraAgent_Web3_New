import { afterEach, vi } from 'vitest';
import type { Provider } from 'ethers';
import { VirtualWalletSystem } from '../lib/virtual-wallet-system';

// Mock localStorage
vi.stubGlobal('localStorage', {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
});

// Mock crypto for key generation
vi.stubGlobal('crypto', {
  getRandomValues: vi.fn((buffer) => buffer),
  subtle: {
    importKey: vi.fn().mockResolvedValue({ type: 'secret' }),
    deriveKey: vi.fn().mockResolvedValue({ type: 'secret' }),
    encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    decrypt: vi.fn().mockResolvedValue(new ArrayBuffer(32))
  }
});

// Mock ethers
const mockProvider = {
  getBalance: vi.fn().mockResolvedValue('1000000000000000000'),
  getTransactionCount: vi.fn().mockResolvedValue(0),
  sendTransaction: vi.fn().mockResolvedValue({
    hash: '0xmocktx',
    wait: async () => ({
      status: true,
      transactionHash: '0xmocktx'
    })
  })
};

// Generate deterministic but valid-looking addresses and keys
const mockWallet = {
  address: '0x1234567890123456789012345678901234567890',
  privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
  mnemonic: { phrase: 'test mock mock mock mock mock mock mock mock mock mock mock' }
};

const WalletClass = vi.fn().mockImplementation((privateKey: string, provider?: Provider) => {
  const wallet = {
    address: mockWallet.address,
    privateKey: privateKey || mockWallet.privateKey,
    provider,
    connect: (provider: Provider) => ({
      ...wallet,
      provider
    }),
    signTransaction: vi.fn().mockResolvedValue('0xsignedtx'),
    getAddress: vi.fn().mockReturnValue(mockWallet.address),
    sendTransaction: vi.fn().mockImplementation(async (tx: { value?: string | number; to?: string }) => {
      // Convert amount to BigInt, handling both number and string inputs
      if (tx.value) {
        const amount = typeof tx.value === 'string' ? parseFloat(tx.value) : tx.value;
        if (isNaN(amount) || amount <= 0) throw new Error('Amount must be greater than 0');
        tx.value = Math.floor(amount * 10 ** 18).toString();
      }
      return {
        hash: '0xmocktx',
        wait: async () => ({
          status: 1,
          transactionHash: '0xmocktx',
          blockNumber: 1,
          blockHash: '0xmockblockhash',
          from: mockWallet.address,
          to: tx.to || '0xmockto',
          gasUsed: BigInt(21000)
        })
      };
    })
  };
  return wallet;
});

// Mock createRandom for wallet creation
(WalletClass as { createRandom?: () => typeof mockWallet }).createRandom = vi.fn().mockReturnValue({
  ...mockWallet,
  connect: vi.fn().mockReturnValue(mockWallet)
});

vi.mock('ethers', () => {
  const ethers = {
    Wallet: Object.assign(WalletClass, {
      createRandom: vi.fn().mockReturnValue({
        ...mockWallet,
        connect: vi.fn().mockReturnValue(mockWallet)
      })
    }),
    JsonRpcProvider: vi.fn().mockImplementation(() => ({
      ...mockProvider,
      getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
      getTransactionCount: vi.fn().mockResolvedValue(0),
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1337, name: 'Tura Chain' })
    })),
    parseEther: (value: string) => {
      const match = value.match(/^[0-9]+\.?[0-9]*$/);
      if (!match || parseFloat(value) <= 0) {
        throw new Error('Invalid amount format');
      }
      const [whole, decimal = ''] = value.split('.');
      const paddedDecimal = decimal.padEnd(18, '0');
      return BigInt(whole + paddedDecimal);
    },
    formatEther: (value: bigint) => value.toString(),
    isAddress: (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value)
  };
  return { ethers };
});

afterEach(() => {
  vi.clearAllMocks();
  const walletSystem = new VirtualWalletSystem();
  walletSystem.clearAllData();
});
