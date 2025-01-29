import { ethers } from 'ethers';

export class KeyManager {
  private static readonly keyPrefix = 'encrypted_key_';

  static async getDecryptedKey(address: string, password: string): Promise<string> {
    const key = `${this.keyPrefix}${address.toLowerCase()}`;
    const encrypted = localStorage.getItem(key);
    
    if (!encrypted) {
      throw new Error('No encrypted key found for this address');
    }

    try {
      const data = JSON.parse(atob(encrypted));
      if (!data || !data.key || !data.timestamp) {
        throw new Error('Invalid encrypted data format');
      }

      const derivedKey = await this.deriveKey(password);
      if (derivedKey !== data.key) {
        throw new Error('Invalid password');
      }

      return data.privateKey;
    } catch (error) {
      throw new Error('Failed to decrypt key: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  static async storeKey(privateKey: string, password: string): Promise<void> {
    const derivedKey = await this.deriveKey(password);
    const data = {
      privateKey,
      key: derivedKey,
      timestamp: Date.now()
    };
    
    const encrypted = btoa(JSON.stringify(data));
    const address = this.getAddressFromPrivateKey(privateKey);
    localStorage.setItem(`${this.keyPrefix}${address.toLowerCase()}`, encrypted);
  }

  private static async deriveKey(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private static getAddressFromPrivateKey(privateKey: string): string {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  }

  static async getStoredKey(): Promise<string | null> {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.keyPrefix));
    if (keys.length === 0) return null;
    return keys[0].slice(this.keyPrefix.length);
  }
}
