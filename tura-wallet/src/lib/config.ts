export const CHAIN_CONFIG = {
  chainId: 1337,
  chainName: 'Tura Chain',
  rpcUrl: import.meta.env.VITE_RPC_URL || '/rpc',
  nativeCurrency: {
    name: 'TURA',
    symbol: 'TURA',
    decimals: 18
  }
};
