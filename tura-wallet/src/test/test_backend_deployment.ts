import axios from 'axios';
import { describe, it, expect, beforeAll } from 'vitest';
import { Web3Service } from '../lib/web3_service';
import { KeyManager } from '../lib/keyManager';

describe('Backend Contract Deployment', () => {
  const TEST_PASSWORD = 'testPassword123';
  let encryptedKey: string;
  let web3Service: Web3Service;
  let keyManager: KeyManager;

  beforeAll(async () => {
    // Initialize services
    web3Service = new Web3Service();
    keyManager = new KeyManager();

    // Create test wallet
    const wallet = await web3Service.createWallet(TEST_PASSWORD);
    encryptedKey = wallet.encrypted_key;
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
      encrypted_key: encryptedKey,
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
        encrypted_key: encryptedKey,
        password: 'wrongPassword',
        constructorParams: {}
      });
      throw new Error('Should have failed with invalid password');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toContain('Failed to decrypt private key');
    }
  });

  it('should handle missing parameters gracefully', async () => {
    try {
      await axios.post('http://localhost:5000/api/deploy', {
        // Missing required parameters
      });
      throw new Error('Should have failed with missing parameters');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.error).toContain('Missing required parameters');
    }
  });

  it('should handle constructor parameter variations', async () => {
    // Test with minimal constructor parameters
    const response = await axios.post('http://localhost:5000/api/deploy', {
      encrypted_key: encryptedKey,
      password: TEST_PASSWORD,
      constructorParams: {} // Empty params should use defaults
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('contractAddress');
    console.log('Contract deployed with default parameters:', response.data.contractAddress);
  });
});
