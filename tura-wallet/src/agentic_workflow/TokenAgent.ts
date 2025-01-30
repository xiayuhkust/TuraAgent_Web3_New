import { AgenticWorkflow } from './AgenticWorkflow';
import WalletManagerImpl from '../lib/wallet_manager';
import { TokenDeploymentParams, TokenDeploymentResult, deployMyToken } from '../contracts/MyToken';

export class TokenAgent extends AgenticWorkflow {
  private deploymentState: {
    step: 'idle' | 'collecting_name' | 'collecting_symbol' | 'collecting_supply' | 'confirming';
    data: Partial<TokenDeploymentParams>;
  } = { step: 'idle', data: {} };

  private walletManager: WalletManagerImpl;

  constructor() {
    super("TokenAgent", "Deploy and manage ERC20 token contracts");
    this.walletManager = new WalletManagerImpl();
  }

  async processMessage(text: string): Promise<string> {
    try {
      if (text.toLowerCase().includes('get test tokens')) {
        return "Please use the WalletAgent to get test tokens. Type 'switch to WalletAgent' first.";
      }

      const deployMatch = text.match(/deploy.*token.*name\s+(\w+),\s*symbol\s+(\w+),\s*and\s*supply\s+(\d+)/i);
      if (deployMatch) {
        const [_, name, symbol, supply] = deployMatch;
        try {
          const result = await this.deployToken({
            name,
            symbol,
            supply
          });
          return this.formatDeploymentSuccess(result);
        } catch (error) {
          console.error('Token deployment failed:', error);
          return `❌ Failed to deploy token: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }

      return this.handleDeploymentState(text);
    } catch (error) {
      console.error('TokenAgent error:', error);
      return `❌ An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async handleDeploymentState(text: string): Promise<string> {
    const { step, data } = this.deploymentState;

    switch (step) {
      case 'idle':
        if (text.toLowerCase().includes('deploy') && text.toLowerCase().includes('token')) {
          this.deploymentState.step = 'collecting_name';
          return "Let's deploy a new token! What name would you like to give it?";
        }
        return `I can help you deploy and manage ERC20 tokens. Here's what I can do:

1. Deploy a new token contract (costs 0.1 TURA)
   - Creates an ERC20 token with staking features
   - Customizable name, symbol, and supply
   Try: "Deploy a new token"

2. Quick deploy with parameters
   Try: "Deploy token with name TestWF, symbol WF, and supply 1000000000"

Note: You must have a connected wallet with sufficient TURA balance (0.1 TURA).`;

      case 'collecting_name':
        this.deploymentState.data = { ...data, name: text };
        this.deploymentState.step = 'collecting_symbol';
        return "Great! Now what symbol should the token use?";

      case 'collecting_symbol':
        this.deploymentState.data = { ...data, symbol: text };
        this.deploymentState.step = 'collecting_supply';
        return "What should the initial token supply be?";

      case 'collecting_supply':
        this.deploymentState.data = { ...data, supply: text };
        this.deploymentState.step = 'confirming';
        return `Please review the token parameters:
Name: ${data.name}
Symbol: ${data.symbol}
Initial Supply: ${data.supply}

Type 'confirm' to deploy or 'cancel' to abort.`;

      case 'confirming':
        if (text.toLowerCase() === 'confirm') {
          const deploymentData = this.deploymentState.data;
          this.deploymentState = { step: 'idle', data: {} };
          
          if (!deploymentData.name || !deploymentData.symbol || !deploymentData.supply) {
            return "❌ Missing required token parameters. Please start over.";
          }

          try {
            const result = await this.deployToken(deploymentData as TokenDeploymentParams);
            return this.formatDeploymentSuccess(result);
          } catch (error) {
            console.error('Token deployment failed:', error);
            return `❌ Failed to deploy token: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        } else if (text.toLowerCase() === 'cancel') {
          this.deploymentState = { step: 'idle', data: {} };
          return "Token deployment cancelled. Let me know if you'd like to try again!";
        }
        return "Please type 'confirm' to proceed with deployment or 'cancel' to abort.";

      default:
        return "I'm here to help you deploy and manage tokens. Type 'deploy token' to get started.";
    }
  }

  private async deployToken(params: TokenDeploymentParams): Promise<TokenDeploymentResult> {
    const address = localStorage.getItem('lastWalletAddress');
    if (!address) {
      throw new Error("Please create a wallet first using 'create wallet'");
    }

    const session = await this.walletManager.getSession();
    if (!session?.password) {
      throw new Error("Please log in to your wallet first");
    }

    const walletData = await this.walletManager.getWalletData(address, session.password);
    if (!walletData?.privateKey) {
      throw new Error("Failed to retrieve wallet private key. Please ensure you're logged in.");
    }

    return await deployMyToken(params, walletData.privateKey);
  }

  private formatDeploymentSuccess(result: TokenDeploymentResult): string {
    return `✅ Token deployment successful!

📋 Contract Details:
Address: ${result.contract_address}
Name: ${result.name}
Symbol: ${result.symbol}
Initial Supply: ${result.initial_supply}

🔍 Next Steps:
1. Import token to MetaMask:
   • Contract: ${result.contract_address}
   • Symbol: ${result.symbol}
   • Decimals: 18
2. Check your wallet balance`;
  }
}
