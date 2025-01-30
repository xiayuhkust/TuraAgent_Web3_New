import { beforeAll, afterEach, vi } from 'vitest';
import { Buffer } from 'buffer';
import { ethers } from 'ethers';

// Create a new random wallet for testing
const mockWallet = ethers.Wallet.createRandom();
// const TEST_ADDRESS = mockWallet.address; // Unused for now

// Add Buffer to global scope with proper polyfill
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

// Add TextEncoder/TextDecoder to global scope if not present
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Add console logging for debugging
const originalConsoleError = console.error;
console.error = (...args) => {
  originalConsoleError('Test Environment Error:', ...args);
};

// Mock localStorage with a working implementation
class LocalStorageMock implements Storage {
  private store: { [key: string]: string } = {};
  private _length: number = 0;

  clear(): void {
    this.store = {};
    this._length = 0;
  }

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    if (!(key in this.store)) {
      this._length++;
    }
    this.store[key] = value;
  }

  removeItem(key: string): void {
    if (key in this.store) {
      delete this.store[key];
      this._length--;
    }
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] || null;
  }

  get length(): number {
    return this._length;
  }
}

const localStorageMock = new LocalStorageMock();

// Create deterministic random bytes for testing
const mockRandomBytes = new Uint8Array(32);
for (let i = 0; i < 32; i++) {
  mockRandomBytes[i] = i + 1;
}

// Create a more detailed crypto mock with proper implementations
const subtle = {
  importKey: vi.fn().mockImplementation(async (format, keyData, algorithm, _extractable, keyUsages) => {
    console.log('Mock importKey called with:', { format, algorithm: algorithm.name, usages: keyUsages });
    
    if (!keyData || !algorithm || !keyUsages) {
      throw new Error('Invalid key import parameters');
    }

    // Create a deterministic key based on the input
    const inputData = keyData instanceof ArrayBuffer ? new Uint8Array(keyData) : new TextEncoder().encode(keyData);
    const mockKey = new Uint8Array(32);
    let hash = 0;
    for (let i = 0; i < inputData.length; i++) {
      hash = ((hash << 5) - hash) + inputData[i];
      hash = hash & hash;
    }
    
    // Use the hash to generate a deterministic key
    for (let i = 0; i < 32; i++) {
      mockKey[i] = (hash + i) & 0xFF;
    }

    return {
      type: 'secret',
      extractable: false,
      algorithm: { name: algorithm.name },
      usages: keyUsages,
      _rawKey: mockKey.buffer
    };
  }),

  deriveKey: vi.fn().mockImplementation(async (algorithm, baseKey, derivedKeyAlgorithm, _extractable, keyUsages) => {
    console.log('Mock deriveKey called with:', {
      algorithmName: algorithm.name,
      derivedKeyAlgorithm: derivedKeyAlgorithm.name,
      iterations: algorithm.iterations,
      usages: keyUsages
    });

    if (!algorithm || !baseKey || !derivedKeyAlgorithm || !keyUsages) {
      throw new Error('Invalid key derivation parameters');
    }

    // Get base key data and salt
    const baseKeyData = new Uint8Array(baseKey._rawKey);
    const salt = algorithm.salt;
    
    // Create deterministic derived key using PBKDF2-like mixing
    const derivedKey = new Uint8Array(32);
    let lastRound = new Uint8Array(salt);
    
    // Simulate PBKDF2 rounds
    for (let round = 0; round < Math.min(algorithm.iterations, 10); round++) {
      for (let i = 0; i < 32; i++) {
        const keyByte = baseKeyData[i % baseKeyData.length];
        const saltByte = lastRound[i % lastRound.length];
        derivedKey[i] ^= keyByte ^ saltByte;
      }
      lastRound = derivedKey;
    }

    return {
      type: 'secret',
      extractable: false,
      algorithm: { name: derivedKeyAlgorithm.name },
      usages: keyUsages,
      _rawKey: derivedKey.buffer
    };
  }),

  encrypt: vi.fn().mockImplementation(async (algorithm, key, data) => {
    console.log('Mock encrypt called with:', {
      algorithmName: algorithm.name,
      keyType: key.type,
      dataLength: data.byteLength
    });

    if (!algorithm || !key || !data) {
      throw new Error('Invalid encryption parameters');
    }

    const keyData = new Uint8Array(key._rawKey);
    const iv = algorithm.iv;
    if (!iv) {
      throw new Error('Missing IV');
    }

    const dataArray = new Uint8Array(data);
    const encrypted = new Uint8Array(dataArray.length + 16);

    // Simple XOR-based encryption
    for (let i = 0; i < dataArray.length; i++) {
      encrypted[i] = dataArray[i] ^ keyData[i % keyData.length] ^ iv[i % iv.length];
    }

    // Generate a simple authentication tag
    const tag = new Uint8Array(16);
    let hash = 0;
    for (let i = 0; i < encrypted.length; i++) {
      hash = ((hash << 5) - hash) + encrypted[i];
      hash = hash & hash;
    }
    for (let i = 0; i < 16; i++) {
      tag[i] = (hash >> (i % 8)) & 0xFF;
    }

    // Append tag to encrypted data
    encrypted.set(tag, dataArray.length);
    return encrypted.buffer;
  }),

  decrypt: vi.fn().mockImplementation(async (algorithm, key, data) => {
    console.log('Mock decrypt called with:', {
      algorithmName: algorithm.name,
      keyType: key.type,
      dataLength: data.byteLength
    });

    if (!algorithm || !key || !data) {
      throw new Error('Invalid decryption parameters');
    }

    const keyData = new Uint8Array(key._rawKey);
    const iv = algorithm.iv;
    if (!iv) {
      throw new Error('Missing IV');
    }

    const dataArray = new Uint8Array(data);
    if (dataArray.length < 16) {
      throw new Error('Invalid ciphertext length');
    }

    const encryptedData = dataArray.slice(0, -16);
    const receivedTag = dataArray.slice(-16);

    // Verify the authentication tag
    const tag = new Uint8Array(16);
    let hash = 0;
    for (let i = 0; i < encryptedData.length; i++) {
      hash = ((hash << 5) - hash) + encryptedData[i];
      hash = hash & hash;
    }
    for (let i = 0; i < 16; i++) {
      tag[i] = (hash >> (i % 8)) & 0xFF;
    }

    // Compare tags
    for (let i = 0; i < 16; i++) {
      if (tag[i] !== receivedTag[i]) {
        throw new Error('Invalid GCM tag');
      }
    }

    // Decrypt data
    const decrypted = new Uint8Array(encryptedData.length);
    for (let i = 0; i < encryptedData.length; i++) {
      decrypted[i] = encryptedData[i] ^ keyData[i % keyData.length] ^ iv[i % iv.length];
    }

    return decrypted.buffer;
  })
};

const cryptoMock = {
  subtle,
  getRandomValues: (buffer: Uint8Array) => {
    // Use deterministic bytes for testing
    const deterministicBytes = new Uint8Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      deterministicBytes[i] = (i + 1) % 256;
    }
    buffer.set(deterministicBytes);
    return buffer;
  },
};

beforeAll(() => {
  // Setup localStorage mock with proper Storage interface
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  
  // Setup crypto mock with proper PBKDF2 and AES-GCM support
  const cryptoWithFullSupport = {
    ...cryptoMock,
    subtle: {
      ...cryptoMock.subtle,
      importKey: async (format: string, keyData: ArrayBuffer | string, algorithm: any, _extractable: boolean, keyUsages: string[]) => {
        console.log('Mock importKey called with:', { format, algorithm: algorithm.name, usages: keyUsages });
        
        const inputData = keyData instanceof ArrayBuffer ? new Uint8Array(keyData) : new TextEncoder().encode(keyData);
        
        return {
          type: 'secret',
          extractable: false,
          algorithm: { name: algorithm.name },
          usages: keyUsages,
          _rawKey: inputData.buffer
        };
      },
      
      deriveKey: async (algorithm: any, baseKey: any, derivedKeyAlgorithm: any, _extractable: boolean, keyUsages: string[]) => {
        console.log('Mock deriveKey called with:', {
          algorithmName: algorithm.name,
          derivedKeyAlgorithm: derivedKeyAlgorithm.name,
          iterations: algorithm.iterations,
          usages: keyUsages
        });
        
        const baseKeyData = new Uint8Array(baseKey._rawKey);
        const salt = algorithm.salt;
        
        // Create deterministic derived key
        const derivedKey = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          const saltByte = salt[i % salt.length];
          const keyByte = baseKeyData[i % baseKeyData.length];
          derivedKey[i] = (keyByte ^ saltByte ^ (i + 1)) & 0xFF;
        }
        
        return {
          type: 'secret',
          extractable: false,
          algorithm: { name: derivedKeyAlgorithm.name },
          usages: keyUsages,
          _rawKey: derivedKey.buffer
        };
      },
      
      encrypt: async (algorithm: any, key: any, data: ArrayBuffer) => {
        console.log('Mock encrypt called with:', {
          algorithmName: algorithm.name,
          keyType: key.type,
          dataLength: data.byteLength
        });
        
        const keyData = new Uint8Array(key._rawKey);
        const dataArray = new Uint8Array(data);
        const iv = algorithm.iv;
        
        // Create encrypted data with space for GCM tag
        const encryptedData = new Uint8Array(dataArray.length + 16);
        
        // Simple XOR-based encryption for testing
        for (let i = 0; i < dataArray.length; i++) {
          const keyByte = keyData[i % keyData.length];
          const ivByte = iv[i % iv.length];
          encryptedData[i] = dataArray[i] ^ keyByte ^ ivByte;
        }
        
        // Generate mock GCM tag
        for (let i = 0; i < 16; i++) {
          encryptedData[dataArray.length + i] = (keyData[i % keyData.length] ^ iv[i % iv.length]) & 0xFF;
        }
        
        return encryptedData.buffer;
      },
      
      decrypt: async (algorithm: any, key: any, data: ArrayBuffer) => {
        console.log('Mock decrypt called with:', {
          algorithmName: algorithm.name,
          keyType: key.type,
          dataLength: data.byteLength
        });
        
        const keyData = new Uint8Array(key._rawKey);
        const encryptedData = new Uint8Array(data);
        const iv = algorithm.iv;
        
        // Split data into encrypted part and tag
        const actualData = encryptedData.slice(0, -16);
        const tag = encryptedData.slice(-16);
        
        // Verify mock GCM tag
        for (let i = 0; i < 16; i++) {
          const expectedTag = (keyData[i % keyData.length] ^ iv[i % iv.length]) & 0xFF;
          if (tag[i] !== expectedTag) {
            throw new Error('Decryption failed - invalid tag');
          }
        }
        
        // Decrypt data
        const decryptedData = new Uint8Array(actualData.length);
        for (let i = 0; i < actualData.length; i++) {
          const keyByte = keyData[i % keyData.length];
          const ivByte = iv[i % iv.length];
          decryptedData[i] = actualData[i] ^ keyByte ^ ivByte;
        }
        
        return decryptedData.buffer;
      }
    }
  };
  
  vi.stubGlobal('crypto', cryptoWithFullSupport);
  
  // Mock ethers random wallet creation
  vi.spyOn(ethers.Wallet, 'createRandom').mockImplementation(() => mockWallet as any);
});

afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  // Reset localStorage
  localStorageMock.clear();
  vi.restoreAllMocks();
});
