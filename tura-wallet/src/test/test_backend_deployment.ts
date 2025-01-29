import axios from 'axios';
import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import { KeyManager } from '../lib/keyManager';
import { WalletService } from '../lib/wallet';

describe('Backend Contract Deployment', () => {
  const TEST_PASSWORD = 'testPassword123';
  let wallet: ethers.Wallet;
  let walletService: WalletService;

  beforeAll(async () => {
    // Initialize services
    walletService = new WalletService();

    // Create test wallet
    wallet = ethers.Wallet.createRandom();
    await KeyManager.storeKey(wallet.privateKey, TEST_PASSWORD);
  });

  it('should successfully send encrypted key and deploy contract', async () => {
    // Prepare constructor parameters
    const constructorParams = {
      owner: '0x009f54E5CcbEFCdCa0dd85ddc85171A76B5c1ef1',
      multisig: [
        '0x009f54E5CcbEFCdCa0dd85ddc85171A76B5c1ef1',
        '0x08Bb6eA809A2d6c13D57166Fa3ede48C0ae9a70e'
      ],
      native_token: '0x0000000000000000000000000000000000000000'
    };

    // Send deployment request to backend
    const response = await axios.post('http://localhost:5000/api/deploy', {
      encrypted_key: encryptedKeyData.encryptedKey,
      salt: encryptedKeyData.salt,
      iv: encryptedKeyData.iv,
      password: TEST_PASSWORD,
      constructorParams
    });

    // Verify response
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('status', 'success');
    expect(response.data).toHaveProperty('contractAddress');
    expect(response.data).toHaveProperty('transactionHash');

    // Log deployment details
    console.log('Contract deployment successful:');
    console.log('Contract address:', response.data.contractAddress);
    console.log('Transaction hash:', response.data.transactionHash);
  });

  it('should handle invalid password gracefully', async () => {
    try {
      await axios.post('http://localhost:5000/api/deploy', {
        encrypted_key: encryptedKeyData.encryptedKey,
        salt: encryptedKeyData.salt,
        iv: encryptedKeyData.iv,
        password: 'wrongPassword',
        constructorParams: {}
      });
      throw new Error('Should have failed with invalid password');
    } catch (error) {
      expect((error as any).response.status).toBe(400);
      expect((error as any).response.data.error).toContain('Failed to decrypt private key');
    }
  });

  it('should handle missing parameters gracefully', async () => {
    try {
      await axios.post('http://localhost:5000/api/deploy', {
        // Missing required parameters
      });
      throw new Error('Should have failed with missing parameters');
    } catch (error) {
      expect((error as any).response.status).toBe(400);
      expect((error as any).response.data.error).toContain('Missing required parameters');
    }
  });

  it('should handle constructor parameter variations', async () => {
    // Test with minimal constructor parameters
    const response = await axios.post('http://localhost:5000/api/deploy', {
      encrypted_key: encryptedKeyData.encryptedKey,
      salt: encryptedKeyData.salt,
      iv: encryptedKeyData.iv,
      password: TEST_PASSWORD,
      constructorParams: {} // Empty params should use defaults
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('contractAddress');
    console.log('Contract deployed with default parameters:', response.data.contractAddress);
  });
});
