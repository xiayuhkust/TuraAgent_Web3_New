// Base interface for common properties
interface BaseAgent {
  name: string;
  contractAddress: string;
  description: string;
  owner: string;
}

export interface OfficialAgent extends BaseAgent {
  feePerRequest: string;
  chainId: number;
  status: 'OFFICIAL';
}

export interface Agent extends BaseAgent {
  feePerRequest: string;
  multiSigAddress: string;
  chainId: number;
  status: 'VALID' | 'DEPRECATED';
}

export interface Workflow extends BaseAgent {
  fee: string;
  requiredConfirmations: number;
  turaToken: string;
  usdtToken: string;
  status: 'VALID' | 'DEPRECATED';
}
