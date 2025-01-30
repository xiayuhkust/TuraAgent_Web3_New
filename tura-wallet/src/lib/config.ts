export const CHAIN_CONFIG = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID) || 1337,
  chainName: import.meta.env.VITE_CHAIN_NAME || 'Tura Chain',
  rpcUrl: 'https://43.135.26.222:8088',
  nativeCurrency: {
    name: 'TURA',
    symbol: 'TURA',
    decimals: 18
  }
};
