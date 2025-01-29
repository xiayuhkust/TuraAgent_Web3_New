// Import ethers for contract deployment
import { ethers } from 'ethers';

// TuraAgent contract ABI and bytecode
export const TuraAgentContract = {
  abi: [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "Subscribed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "Withdrawn",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "SUBSCRIPTION_FEE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "addresses",
        "type": "address[]"
      }
    ],
    "name": "batchCheckSubscription",
    "outputs": [
      {
        "internalType": "bool[]",
        "name": "statuses",
        "type": "bool[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isSubscribed",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "subscribe",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "subscribers",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSubscribers",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
    }
  ],
  bytecode: "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610aaf806100606000396000f3fe60806040526004361061007b5760003560e01c80638da5cb5b1161004e5780638da5cb5b146101425780638f72cf771461016d578063d0e30db014610198578063f83d08ba146101a257600080fd5b806305b2c1c31461008057806316e7f171146100bd5780632e4176cf146100f85780633ccfd60b14610123575b600080fd5b34801561008c57600080fd5b506100a760048036038101906100a29190610769565b6101b9565b6040516100b491906107a5565b60405180910390f35b3480156100c957600080fd5b506100e260048036038101906100dd91906107c2565b6101f9565b6040516100ef91906107fe565b60405180910390f35b34801561010457600080fd5b5061010d610219565b60405161011a91906107fe565b60405180910390f35b34801561012f57600080fd5b5061013861023d565b604051610149919061083d565b60405180910390f35b34801561014e57600080fd5b506101576103a1565b60405161016491906107fe565b60405180910390f35b34801561017957600080fd5b506101826103c5565b60405161018f919061083d565b60405180910390f35b6101a06103cf565b005b3480156101ae57600080fd5b506101b76104d2565b005b6002818154811061019957600080fd5b906000526020600020016000915054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60016020528060005260406000206000915054906101000a900460ff1681565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146102cd576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102c490610879565b60405180910390fd5b600047905060008111610314576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161030b906108e5565b60405180910390fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc829081150290604051600060405180830381858888f19350505050158015610379573d6000803e3d6000fd5b507f7084f5476618d8e60b11ef0d7d3f06914655adb8793e28ff7f018d4c76d505d5338260405161039692919061090a565b60405180910390a150565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60025490565b68016345785d8a000034146104175760405162461bcd60e51b815260206004820152601660248201527f496e636f727265637420706179656d656e7420616d6f756e740000000000000060448201526064015b60405180910390fd5b60016000803373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff161561049d5760405162461bcd60e51b815260206004820152601260248201527f416c726561647920737562736372696265640000000000000000000000000000604482015260640161040e565b60018060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff0219169083151502179055506002339080600181540180825580915050600190039060005260206000200160009091909190916101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055507f87831c35e01acf78243b074f9ed0a460c6c680d4dbc6f946e0e2538db107db2533426040516104c692919061090a565b60405180910390a1565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610560576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161055790610879565b60405180910390fd5b565b600080fd5b600080fd5b6000819050919050565b61057f8161056c565b811461058a57600080fd5b50565b60008135905061059c81610576565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006105cd826105a2565b9050919050565b6105dd816105c2565b81146105e857600080fd5b50565b6000813590506105fa816105d4565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f84011261062357600080fd5b8235905067ffffffffffffffff81111561063c57600080fd5b60208301915083600182028301111561065457600080fd5b9250929050565b6000806020838503121561066e57600080fd5b600083013567ffffffffffffffff81111561068857600080fd5b6106948582860161060d565b92509250509250929050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6106f5826106ac565b810181811067ffffffffffffffff82111715610714576107136106bd565b5b80604052505050565b6000610727610563565b9050610733828261070c565b919050565b600067ffffffffffffffff821115610753576107526106bd565b5b61075c826106ac565b9050602081019050919050565b60006020828403121561077f57600080fd5b600061078d8482850161058d565b91505092915050565b6107a0816105c2565b82525050565b60006020820190506107bb6000830184610797565b92915050565b6000602082840312156107d857600080fd5b60006107e6848285016105eb565b91505092915050565b6107f8816105c2565b82525050565b600060208201905061081360008301846107ef565b92915050565b6000819050919050565b61082c81610819565b82525050565b60006020820190506108476000830184610823565b92915050565b60008282526020820190509250505056fea2646970667358221220c2f4f7d0c9c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c564736f6c63430008110033"
};

// Contract configuration for deployment
export const CONTRACT_CONFIG = {
  chainId: 1337,
  chainName: 'Tura Chain',
  rpcUrl: '/rpc',  // Using proxy path
  nativeCurrency: {
    name: 'TURA',
    symbol: 'TURA',
    decimals: 18
  },
  gasLimit: 3000000,
  subscriptionFee: ethers.parseEther('0.1')
};

/**
 * Deploy a new TuraAgent contract
 * @param signer The ethers signer to use for deployment
 * @returns The deployed contract address
 */
export async function deployTuraAgent(signer: ethers.Signer): Promise<string> {
  try {
    console.log('Starting contract deployment...');
    
    // Verify signer is connected
    const address = await signer.getAddress();
    console.log('Deploying from address:', address);
    
    // Create contract factory with proper provider
    const factory = new ethers.ContractFactory(
      TuraAgentContract.abi,
      TuraAgentContract.bytecode,
      signer
    );
    
    // Deploy contract with subscription fee
    console.log('Deploying TuraAgent contract...');
    console.log('Gas limit:', CONTRACT_CONFIG.gasLimit);
    console.log('Subscription fee:', ethers.formatEther(CONTRACT_CONFIG.subscriptionFee), 'TURA');
    
    const contract = await factory.deploy({
      gasLimit: CONTRACT_CONFIG.gasLimit,
      value: CONTRACT_CONFIG.subscriptionFee
    });
    
    // Wait for deployment to complete
    console.log('Waiting for deployment transaction...');
    const tx = contract.deploymentTransaction();
    if (!tx) throw new Error('Deployment transaction failed');
    
    const receipt = await tx.wait();
    if (!receipt) throw new Error('Failed to get deployment receipt');
    
    const contractAddress = receipt.contractAddress;
    if (!contractAddress) throw new Error('Contract address not found in receipt');
    
    console.log('TuraAgent deployed to:', contractAddress);
    return contractAddress;
  } catch (error) {
    console.error('Contract deployment failed:', error);
    throw error;
  }
}

/**
 * Check if an address has sufficient TURA balance
 * @param provider The ethers provider
 * @param address The address to check
 * @returns True if balance is sufficient
 */
export async function checkTuraBalance(
  provider: ethers.Provider,
  address: string
): Promise<boolean> {
  try {
    const balance = await provider.getBalance(address);
    return balance >= CONTRACT_CONFIG.subscriptionFee;
  } catch (error) {
    console.error('Balance check failed:', error);
    return false;
  }
}

/**
 * Get a Web3 provider for the Tura network
 * @returns Configured ethers provider
 */
export function getTuraProvider(): ethers.Provider {
  // Use HTTP provider with proxy
  return new ethers.JsonRpcProvider('/rpc', {
    chainId: CONTRACT_CONFIG.chainId,
    name: 'Tura'
  });
}
