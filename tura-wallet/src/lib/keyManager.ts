export interface EncryptedKeyData {
  encryptedKey: string;
  salt: string;
  iv: string;
}

import { VirtualWalletSystem } from './virtual-wallet-system';

export class KeyManager {
  private static readonly ITERATION_COUNT = 100000;
  private static readonly HASH_ALGORITHM = 'SHA-256';
  
  /**
   * Encrypt a private key using a password
   */
  static async encryptKey(privateKey: string, password: string): Promise<EncryptedKeyData> {
    try {
      console.log('Starting key encryption process');
      
      // Validate inputs
      if (!privateKey || typeof privateKey !== 'string') {
        throw new Error('Invalid private key format');
      }
      if (!password || typeof password !== 'string') {
        throw new Error('Invalid password format');
      }

      // Normalize private key format
      const normalizedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      if (!this.validatePrivateKey(normalizedKey)) {
        throw new Error('Invalid private key');
      }

      console.log('Generating salt and IV');
      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      console.log('Deriving encryption key from password');
      // Derive encryption key from password
      const encryptionKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      
      console.log('Deriving AES key');
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: this.ITERATION_COUNT,
          hash: this.HASH_ALGORITHM
        },
        encryptionKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      
      console.log('Encrypting private key');
      // Encrypt the private key
      const dataToEncrypt = new TextEncoder().encode(normalizedKey);
      console.log('Data prepared for encryption:', {
        byteLength: dataToEncrypt.byteLength,
        format: 'UTF-8'
      });

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        dataToEncrypt
      );
      
      console.log('Converting encrypted data to base64');
      // Convert to base64 for storage
      const encryptedKey = Buffer.from(new Uint8Array(encryptedData)).toString('base64');
      const saltString = Buffer.from(salt).toString('base64');
      const ivString = Buffer.from(iv).toString('base64');
      
      console.log('Encryption complete');
      return {
        encryptedKey,
        salt: saltString,
        iv: ivString
      };
    } catch (error) {
      console.error('Failed to encrypt key:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to encrypt private key: ${error.message}`);
      }
      throw new Error('Failed to encrypt private key: Unknown error');
    }
  }
  
  /**
   * Decrypt a private key using a password
   */
  static async decryptKey(encryptedData: EncryptedKeyData, password: string): Promise<string> {
    try {
      console.log('Starting key decryption process');
      
      // Validate inputs
      if (!encryptedData || !encryptedData.encryptedKey || !encryptedData.salt || !encryptedData.iv) {
        throw new Error('Invalid encrypted data format');
      }
      if (!password || typeof password !== 'string') {
        throw new Error('Invalid password format');
      }

      console.log('Converting base64 data to buffers');
      // Convert base64 strings back to buffers
      const encryptedKey = Buffer.from(encryptedData.encryptedKey, 'base64');
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      
      console.log('Deriving decryption key from password');
      // Derive decryption key from password
      const decryptionKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      
      console.log('Deriving AES key for decryption');
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: this.ITERATION_COUNT,
          hash: this.HASH_ALGORITHM
        },
        decryptionKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      
      console.log('Decrypting private key');
      // Decrypt the private key
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encryptedKey
      );
      
      const decryptedKey = new TextDecoder().decode(decryptedData);
      
      // Normalize and validate decrypted key
      const normalizedKey = decryptedKey.startsWith('0x') ? decryptedKey : `0x${decryptedKey}`;
      if (!this.validatePrivateKey(normalizedKey)) {
        throw new Error('Decrypted key validation failed');
      }
      
      console.log('Decryption complete');
      return normalizedKey;
    } catch (error) {
      console.error('Failed to decrypt key:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to decrypt private key: ${error.message}`);
      }
      throw new Error('Failed to decrypt private key: Unknown error');
    }
  }
  
  /**
   * Store encrypted key data in localStorage
   */
  static storeEncryptedKey(encryptedData: EncryptedKeyData): void {
    try {
      console.log('Storing encrypted key data');
      if (!encryptedData || !encryptedData.encryptedKey || !encryptedData.salt || !encryptedData.iv) {
        console.error('Invalid encrypted data format:', encryptedData);
        throw new Error('Invalid encrypted data format');
      }

      const walletSystem = new VirtualWalletSystem();
      const address = walletSystem.getCurrentAddress();
      if (!address) throw new Error('No wallet address found');

      const serializedData = JSON.stringify(encryptedData);
      walletSystem.setKeyData(address, serializedData);
      console.log('Encrypted key data stored successfully');
    } catch (error) {
      console.error('Failed to store encrypted key:', error);
      throw new Error('Failed to store encrypted key');
    }
  }
  
  /**
   * Retrieve encrypted key data from localStorage
   */
  static getStoredKey(): EncryptedKeyData | null {
    try {
      console.log('Retrieving stored key data');
      const walletSystem = new VirtualWalletSystem();
      const address = walletSystem.getCurrentAddress();
      if (!address) return null;

      const storedData = walletSystem.getKeyData(address);
      if (!storedData) {
        console.log('No stored key data found');
        return null;
      }
      
      const parsedData = JSON.parse(storedData) as EncryptedKeyData;
      if (!parsedData.encryptedKey || !parsedData.salt || !parsedData.iv) {
        console.error('Retrieved data is incomplete:', parsedData);
        return null;
      }
      
      console.log('Successfully retrieved stored key data');
      return parsedData;
    } catch (error) {
      console.error('Failed to retrieve stored key:', error);
      return null;
    }
  }
  
  /**
   * Clear stored key data from localStorage
   */
  static clearStoredKey(): void {
    try {
      const walletSystem = new VirtualWalletSystem();
      const address = walletSystem.getCurrentAddress();
      if (!address) return;
      walletSystem.clearKeyData(address);
    } catch (error) {
      console.error('Failed to clear stored key:', error);
      throw new Error('Failed to clear stored key');
    }
  }
  
  /**
   * Validate a private key
   */
  static validatePrivateKey(privateKey: string): boolean {
    return privateKey.startsWith('0x') && privateKey.length === 66;
  }
  
  /**
   * Generate a new random private key
   */
  static generatePrivateKey(): string {
    try {
      console.log('Generating mock private key');
      const privateKey = '0x' + Date.now().toString(16).padStart(64, '0');
      return privateKey;
    } catch (error) {
      console.error('Failed to generate private key:', error);
      throw new Error('Failed to generate private key');
    }
  }
}
