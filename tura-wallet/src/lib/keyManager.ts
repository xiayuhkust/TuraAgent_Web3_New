import { ethers } from 'ethers';
import { Buffer } from 'buffer';

interface EncryptedKeyData {
  encryptedKey: string;
  salt: string;
  iv: string;
}

export class KeyManager {
  private static readonly ITERATION_COUNT = 100000;
  private static readonly KEY_LENGTH = 32;
  private static readonly STORAGE_KEY = 'tura_encrypted_key';
  
  /**
   * Encrypt a private key using a password
   */
  static async encryptKey(privateKey: string, password: string): Promise<EncryptedKeyData> {
    try {
      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Derive encryption key from password
      const encryptionKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: this.ITERATION_COUNT,
          hash: 'SHA-256'
        },
        encryptionKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      
      // Encrypt the private key
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        new TextEncoder().encode(privateKey)
      );
      
      // Convert to base64 for storage
      const encryptedKey = Buffer.from(encryptedData).toString('base64');
      const saltString = Buffer.from(salt).toString('base64');
      const ivString = Buffer.from(iv).toString('base64');
      
      return {
        encryptedKey,
        salt: saltString,
        iv: ivString
      };
    } catch (error) {
      console.error('Failed to encrypt key:', error);
      throw new Error('Failed to encrypt private key');
    }
  }
  
  /**
   * Decrypt a private key using a password
   */
  static async decryptKey(encryptedData: EncryptedKeyData, password: string): Promise<string> {
    try {
      // Convert base64 strings back to buffers
      const encryptedKey = Buffer.from(encryptedData.encryptedKey, 'base64');
      const salt = Buffer.from(encryptedData.salt, 'base64');
      const iv = Buffer.from(encryptedData.iv, 'base64');
      
      // Derive decryption key from password
      const decryptionKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: this.ITERATION_COUNT,
          hash: 'SHA-256'
        },
        decryptionKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      
      // Decrypt the private key
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encryptedKey
      );
      
      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      console.error('Failed to decrypt key:', error);
      throw new Error('Failed to decrypt private key');
    }
  }
  
  /**
   * Store encrypted key data in localStorage
   */
  static storeEncryptedKey(encryptedData: EncryptedKeyData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(encryptedData));
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
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (!storedData) return null;
      return JSON.parse(storedData);
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
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear stored key:', error);
      throw new Error('Failed to clear stored key');
    }
  }
  
  /**
   * Validate a private key
   */
  static validatePrivateKey(privateKey: string): boolean {
    try {
      if (!privateKey.startsWith('0x')) return false;
      if (privateKey.length !== 66) return false;
      
      // Try to create a wallet with the key
      new ethers.Wallet(privateKey);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Generate a new random private key
   */
  static generatePrivateKey(): string {
    const wallet = ethers.Wallet.createRandom();
    return wallet.privateKey;
  }
}
