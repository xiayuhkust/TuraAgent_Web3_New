import WalletManagerImpl from '../src/lib/wallet_manager';

async function testWalletCreation() {
  try {
    // Create wallet using existing WalletManagerImpl
    const walletManager = new WalletManagerImpl();
    const password = `test-${Date.now()}`;
    const wallet = await walletManager.createWallet(password);
    console.log('Created wallet:', wallet.address);
    
    // Get wallet data to access private key
    const walletData = await walletManager.getWalletData(wallet.address, password);
    
    // Send private key to backend
    const response = await fetch('https://app-pjdseuaf.fly.dev/api/v1/private-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        private_key: walletData.privateKey,
        address: wallet.address,
        metadata: { description: "Test wallet creation" }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Private key stored in backend with ID:', result.key_id);
    
    // Verify storage
    const verifyResponse = await fetch(`https://app-pjdseuaf.fly.dev/api/v1/private-keys/${result.key_id}`);
    if (!verifyResponse.ok) {
      throw new Error('Failed to verify private key storage');
    }
    
    const storedData = await verifyResponse.json();
    console.log('Successfully verified private key storage for address:', storedData.address);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testWalletCreation();
