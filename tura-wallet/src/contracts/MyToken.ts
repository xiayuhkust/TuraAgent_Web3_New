export interface TokenDeploymentParams {
  name: string;
  symbol: string;
  supply: string;
}

export interface TokenDeploymentResult {
  status: string;
  contract_address: string;
  name: string;
  symbol: string;
  initial_supply: string;
  deployer_address: string;
  chain_id: number;
}

export async function deployMyToken(
  params: TokenDeploymentParams,
  privateKey: string
): Promise<TokenDeploymentResult> {
  const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/v1/deploy-mytoken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: params.name,
      symbol: params.symbol,
      initial_supply: params.supply,
      private_key: privateKey
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to deploy contract: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.contract_address || !result.name || !result.symbol || !result.initial_supply) {
    throw new Error('Contract deployment failed: Invalid response from server');
  }
  return result;
}
