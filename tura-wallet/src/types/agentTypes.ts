export interface Agent {
  id: string;
  name: string;
  description: string;
  status: string;
  feePerRequest: string;
  instance: {
    processMessage: (message: string) => Promise<string>;
  };
}

export interface OfficialAgent extends Agent {
  type: 'official';
}

export interface WorkflowAgent extends Agent {
  type: 'workflow';
  contractAddress: string;
  fee: string;
  requiredConfirmations: number;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent' | 'error';
  timestamp: string;
  agentId?: string;
  agentName?: string;
  agentType?: 'official' | 'community' | 'workflow';
}

export interface SignatureDetails {
  title?: string;
  description?: string;
  requirePassword?: boolean;
  onConfirm?: (password?: string) => Promise<void>;
}
