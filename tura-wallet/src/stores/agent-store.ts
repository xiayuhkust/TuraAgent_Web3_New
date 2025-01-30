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
    description: 'Your personal wallet assistant',
    feePerRequest: '0.0 TURA',
    owner: '',
    chainId: Number(import.meta.env.VITE_CHAIN_ID || 1337),
    status: 'OFFICIAL',
    instance: new WalletAgent()
  },
  {
    name: 'TokenAgent',
    contractAddress: '',
    description: 'Token contract management',
    feePerRequest: '0.0 TURA',
    owner: '',
    chainId: Number(import.meta.env.VITE_CHAIN_ID || 1337),
    status: 'OFFICIAL',
    instance: new TokenAgent()
  },
  {
    name: 'AgentManager',
    contractAddress: '',
    description: 'Agent deployment and management',
    feePerRequest: '0.0 TURA',
    owner: '',
    chainId: Number(import.meta.env.VITE_CHAIN_ID || 1337),
    status: 'OFFICIAL',
    instance: new AgentManager()
  }
];

export const agents: Agent[] = [];

export const workflows: Workflow[] = [
  {
    name: 'TuraWorkFlow',
    contractAddress: '',
    description: 'Automated workflow for wallet setup and agent registration',
    fee: '0.0 TURA',
    owner: '',
    requiredConfirmations: 1,
    turaToken: '',
    usdtToken: '',
    status: 'VALID',
    instance: new TuraWorkFlow()
  }
];

// Helper functions for managing agents and workflows
export const getAgent = (address: string): Agent | OfficialAgent | undefined => {
  if (!address || !isValidAddress(address)) return undefined;
  return [...officialAgents, ...agents].find(
    agent => agent.contractAddress.toLowerCase() === address.toLowerCase()
  );
};

export const getWorkflow = (address: string): Workflow | undefined => {
  if (!address || !isValidAddress(address)) return undefined;
  return workflows.find(workflow => workflow.contractAddress.toLowerCase() === address.toLowerCase());
};

// Helper to get all agents including official ones
export const getAllAgents = (): (Agent | OfficialAgent)[] => [...officialAgents, ...agents];

// Storage for deployed MyToken contracts
export const isValidAddress = (address: string): boolean => /^0x[a-fA-F0-9]{40}$/.test(address);
