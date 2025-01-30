// MyToken contract deployment interface

// Contract deployment is handled by the backend API
// See /tura-backend/contracts/deploy_my_token.py for implementation

export async function deployMyToken(
  name: string,
  symbol: string,
  initialSupply: string,
  privateKey: string
): Promise<string> {
  const response = await fetch('https://web-agent-app-si4sxq3l.devinapps.com/api/v1/deploy-mytoken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      symbol,
      initial_supply: initialSupply,
      private_key: privateKey
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to deploy contract: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.contract_address) {
    throw new Error('Contract deployment failed: No contract address returned');
  }
  return result.contract_address;
}
