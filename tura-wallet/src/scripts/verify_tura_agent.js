import { Web3 } from 'web3';

async function main() {
  try {
    // Initialize Web3 with HTTP endpoint
    const web3 = new Web3('http://43.135.26.222:8000');
    
    // Contract address from deployment
    const contractAddress = '0x0f5d013d9f9dd23f80d92bb3c2d40c479c168b72';
    
    // Initialize account
    const privateKey = '0x7369068cb5d022d11c2fb045dbe577fb03e094de8d10d7e794171af11180152f';
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    
    console.log('Verifying TuraAgent contract at:', contractAddress);
    
    // Get contract bytecode
    const code = await web3.eth.getCode(contractAddress);
    console.log('\nContract bytecode length:', code.length);
    console.log('Contract has bytecode:', code !== '0x');
    
    // Contract ABI for owner() function
    const abi = [{
      "inputs": [],
      "name": "owner",
      "outputs": [{"internalType": "address","name": "","type": "address"}],
      "stateMutability": "view",
      "type": "function"
    }];
    
    // Create contract instance
    const contract = new web3.eth.Contract(abi, contractAddress);
    
    // Call owner() function
    console.log('\nChecking contract owner...');
    const owner = await contract.methods.owner().call();
    console.log('Contract owner:', owner);
    console.log('Matches deployer:', owner.toLowerCase() === account.address.toLowerCase());
    
    // Get contract balance
    const balance = await web3.eth.getBalance(contractAddress);
    console.log('\nContract balance:', web3.utils.fromWei(balance, 'ether'), 'TURA');
    console.log('Expected balance: 0.1 TURA');
    
    console.log('\nContract verification complete!');
    return true;
  } catch (error) {
    console.error('\nVerification failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

main();
