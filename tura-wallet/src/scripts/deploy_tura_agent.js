import { Web3 } from 'web3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import solc from 'solc';

async function main() {
  try {
    console.log('Starting TuraAgent contract deployment...');
    
    // Initialize Web3 with HTTP endpoint and timeout
    const web3 = new Web3(new Web3.providers.HttpProvider('http://43.135.26.222:8000', {
      timeout: 30000
    }));
    
    // Initialize account
    const privateKey = '0x7369068cb5d022d11c2fb045dbe577fb03e094de8d10d7e794171af11180152f';
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    
    console.log('Deploying from:', account.address);
    const balance = await web3.eth.getBalance(account.address);
    console.log('Balance:', web3.utils.fromWei(balance, 'ether'), 'TURA');
    
    // Read and compile contract
    console.log('Reading contract source...');
    const contractPath = fileURLToPath(new URL('../contracts/TuraAgent.sol', import.meta.url));
    const source = readFileSync(contractPath, 'utf8');
    
    const input = {
      language: 'Solidity',
      sources: {
        'TuraAgent.sol': {
          content: source
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['*']
          }
        }
      }
    };
    
    console.log('Compiling contract...');
    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    const contract = output.contracts['TuraAgent.sol']['TuraAgent'];
    
    const abi = contract.abi;
    const bytecode = contract.evm.bytecode.object;
    
    // Create contract instance
    const deployContract = new web3.eth.Contract(abi);
    
    // Get current gas price from network
    const gasPrice = '1000000000'; // Fixed at 1 Gwei like Python reference
    console.log('Gas price:', web3.utils.fromWei(gasPrice, 'gwei'), 'Gwei');
    
    // Build deployment transaction
    console.log('Building deployment transaction...');
    
    // Get deployment data - just use bytecode directly
    const deployData = '0x' + bytecode;
    console.log('Contract bytecode length:', deployData.length);
    
    // Get current nonce
    const nonce = await web3.eth.getTransactionCount(account.address);
    console.log('Current nonce:', nonce);
    
    // Build transaction object following Python reference implementation
    const deploymentFee = web3.utils.toWei('0.1', 'ether'); // Required 0.1 TURA deployment fee
    console.log('Deployment fee:', web3.utils.fromWei(deploymentFee, 'ether'), 'TURA');
    
    const transaction = {
      from: account.address,
      data: deployData,
      nonce: nonce,
      gas: 3000000, // Match Python reference gas limit
      gasPrice: gasPrice, // Fixed gas price
      chainId: 1337,
      value: deploymentFee // Include required deployment fee
    };
    
    // Calculate total cost (gas + deployment fee)
    const gasCost = BigInt(transaction.gas) * BigInt(transaction.gasPrice);
    const totalCost = gasCost + BigInt(deploymentFee);
    console.log('Gas cost:', web3.utils.fromWei(gasCost.toString(), 'ether'), 'TURA');
    console.log('Total cost:', web3.utils.fromWei(totalCost.toString(), 'ether'), 'TURA');
    
    console.log('\nTransaction details:');
    console.log('From:', transaction.from);
    console.log('Nonce:', transaction.nonce);
    console.log('Gas:', transaction.gas);
    console.log('Gas Price:', web3.utils.fromWei(gasPrice, 'gwei'), 'Gwei');
    console.log('Chain ID:', transaction.chainId);
    
    // Verify sufficient balance
    if (gasCost > BigInt(balance)) {
      throw new Error(`Insufficient funds. Need ${web3.utils.fromWei(gasCost.toString(), 'ether')} TURA but have ${web3.utils.fromWei(balance, 'ether')} TURA`);
    }
    
    // Sign and send transaction
    console.log('\nSigning transaction...');
    const signedTx = await web3.eth.accounts.signTransaction(transaction, privateKey);
    
    console.log('Sending transaction...');
    console.log('Waiting for transaction receipt...');
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    
    console.log('\nContract deployed successfully!');
    console.log('Contract address:', receipt.contractAddress);
    console.log('Transaction hash:', receipt.transactionHash);
    console.log('Block number:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed);
    
    // Verify contract bytecode
    const code = await web3.eth.getCode(receipt.contractAddress);
    if (code === '0x') {
      throw new Error('Contract verification failed - no bytecode at deployed address');
    }
    
    console.log('\nContract verified - bytecode found at deployed address');
    return receipt.contractAddress;
  } catch (error) {
    console.error('\nDeployment failed:', error);
    console.error('Error details:', error.message);
    if (error.data) {
      console.error('Error data:', error.data);
    }
    if (error.receipt) {
      console.error('Transaction receipt:', error.receipt);
    }
    process.exit(1);
  }
}

main();
