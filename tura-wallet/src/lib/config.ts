export const CHAIN_CONFIG = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID) || 1337,
  chainName: import.meta.env.VITE_CHAIN_NAME || 'Tura Chain',
  rpcUrl: import.meta.env.VITE_RPC_URL || 'http://43.135.26.222:8000',
  nativeCurrency: {
    name: 'TURA',
    symbol: 'TURA',
    decimals: 18
  }
};
