import { WalletManagerImpl } from '../lib/wallet_manager';
import { WalletService } from '../lib/wallet';

async function testWalletKeyRetrieval() {
  try {
    console.log('Starting wallet key retrieval test...');
    
    // Create test password
    const testPassword = 'testPassword123!';
    
    // Initialize wallet manager
    const walletManager = new WalletManagerImpl();
    console.log('WalletManager initialized');
    
    // Create new wallet
    const walletResponse = await walletManager.createWallet(testPassword);
    console.log('Created new wallet with address:', walletResponse.address);
    
    // Try to retrieve wallet data
    const walletData = await walletManager.getWalletData(walletResponse.address, testPassword);
    console.log('Successfully retrieved wallet data');
    console.log('Address matches:', walletData.address === walletResponse.address);
    console.log('Has private key:', !!walletData.privateKey);
    console.log('Has mnemonic:', !!walletData.mnemonic);
    
    // Verify private key format
    if (!walletData.privateKey?.startsWith('0x') || walletData.privateKey?.length !== 66) {
      throw new Error('Invalid private key format');
    }
    console.log('Private key format is valid');
    
    // Try to create a signer (this validates the private key)
    const provider = new WalletService();
    const account = await provider.createAccount(walletData.privateKey);
    console.log('Successfully created account from private key');
    console.log('Address matches:', account.address.toLowerCase() === walletResponse.address.toLowerCase());
    
    console.log('All tests passed successfully!');
    return true;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Export for use in browser console
(window as any).testWalletKeyRetrieval = testWalletKeyRetrieval;
