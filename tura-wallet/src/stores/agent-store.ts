import { Agent, OfficialAgent, Workflow } from "../types/agentTypes";
import { WalletAgent } from "../agentic_workflow/WalletAgent";
import { AgentManager } from "../agentic_workflow/AgentManager";
import { TokenAgent } from "../agentic_workflow/TokenAgent";
import { TuraWorkFlow } from "../agentic_workflow/TuraWorkFlow";

// Official agents are managed separately from community agents
export const officialAgents: OfficialAgent[] = [
  {
    name: 'WalletAgent',
    contractAddress: '',
    description: 'Your personal wallet assistant for managing TURA transactions',
    feePerRequest: '0.0 TURA',
    owner: '',
    chainId: 1337,
    status: 'OFFICIAL',
    instance: new WalletAgent()
  },
  {
    name: 'TokenAgent',
    contractAddress: '',
    description: 'Deploy and manage ERC20 token contracts',
    feePerRequest: '0.1 TURA',
    owner: '',
    chainId: 1337,
    status: 'OFFICIAL',
    instance: new TokenAgent()
  },
  {
    name: 'AgentManager',
    contractAddress: '',
    description: 'Deploy and manage TuraAgent contracts with metadata collection',
    feePerRequest: '0.0 TURA',
    owner: '',
    chainId: 1337,
    status: 'OFFICIAL',
    instance: new AgentManager()
  }
];

export const agents: Agent[] = [
  {
    name: 'MarketDataAgent',
    contractAddress: '0x8f8d84B2Fb15e81A3BEAa8144d2Eb1c340ce93FB',
    description: 'Market data provider for cryptocurrency trading',
    feePerRequest: '1.0 TURA',
    owner: '0x009f54E5CcbEFCdCa0dd85ddc85171A76B5c1ef1',
    multiSigAddress: '0x5BC87de68410DBa5c17e4496543dd325f60Ce6e8',
    chainId: 1337,
    status: 'VALID'
  },
  {
    name: 'StrategyAgent',
    contractAddress: '0xF31A3ffc032BbB21661c1b3A87f25D16551f930A',
    description: 'Trading strategy analysis and execution',
    feePerRequest: '0.01 TURA',
    owner: '0x21872525127D3346E92D1477190FDEC15604e337',
    multiSigAddress: '0x08Bb6eA809A2d6c13D57166Fa3ede48C0ae9a70e',
    chainId: 1337,
    status: 'VALID'
  }
];

export const workflows: Workflow[] = [
  {
    name: 'TuraWorkFlow',
    contractAddress: '',
    description: 'Automated workflow for wallet setup and agent registration',
    fee: '0.0 TURA',
    owner: '',
    requiredConfirmations: 1,
    turaToken: '0x0000000000000000000000000000000000000000',
    usdtToken: '',
    status: 'VALID',
    instance: new TuraWorkFlow()
  }
];

// Helper functions for managing agents and workflows
export const getAgent = (address: string): Agent | OfficialAgent | undefined => {
  // First check official agents
  const officialAgent = officialAgents.find(agent => 
    agent.contractAddress && agent.contractAddress.toLowerCase() === address.toLowerCase()
  );
  if (officialAgent) return officialAgent;
  
  // Then check community agents
  return agents.find(agent => agent.contractAddress.toLowerCase() === address.toLowerCase());
};

export const getWorkflow = (address: string): Workflow | undefined => 
  workflows.find(workflow => workflow.contractAddress.toLowerCase() === address.toLowerCase());

// Helper to get all agents including official ones
export const getAllAgents = (): (Agent | OfficialAgent)[] => [...officialAgents, ...agents];

// Function to validate contract addresses
// Storage for deployed MyToken contracts
export interface MyTokenContract {
  name: string;
  symbol: string;
  contractAddress: string;
  owner: string;
  initialSupply: string;
  chainId: number;
  status: 'VALID' | 'PENDING' | 'INVALID';
  deploymentTimestamp: number;
}

export const myTokens: MyTokenContract[] = [];

// Helper functions for MyToken contracts
export const addMyToken = (token: MyTokenContract) => {
  if (!isValidAddress(token.contractAddress)) return false;
  myTokens.push(token);
  return true;
};

export const getMyToken = (address: string): MyTokenContract | undefined =>
  myTokens.find(token => token.contractAddress.toLowerCase() === address.toLowerCase());

export const getMyTokensByOwner = (owner: string): MyTokenContract[] =>
  myTokens.filter(token => token.owner.toLowerCase() === owner.toLowerCase());

export const isValidAddress = (address: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(address);
