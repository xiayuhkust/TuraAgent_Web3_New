import { useState, useEffect } from 'react';
import { WalletManagerImpl as WalletManager } from '../lib/wallet_manager';

export function TopBar() {
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [balance, setBalance] = useState('0');
  const walletManager = new WalletManager();
  const address = localStorage.getItem('lastWalletAddress') || '';

  useEffect(() => {
    const checkSession = async () => {
      const session = await walletManager.getSession();
      setIsLoggedIn(!!session);
      if (session && address) {
        try {
          const balance = await walletManager.getBalance(address);
          setBalance(balance);
        } catch (error) {
          console.error('Failed to fetch balance:', error);
        }
      }
    };
    checkSession();
  }, [address]);

  const handleLogin = async () => {
    try {
      await walletManager.login(address, passwordInput);
      setIsLoggedIn(true);
      setPasswordInput('');
      const balance = await walletManager.getBalance(address);
      setBalance(balance);
    } catch (error) {
      alert('Invalid password or wallet not found');
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('wallet_session');
    setIsLoggedIn(false);
    setBalance('0');
  };

  if (!address) {
    return (
      <div className="bg-primary/10 p-2 text-sm text-primary">
        No wallet found. Please create or restore a wallet.
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-4 p-2 bg-primary/10">
      <div className="text-sm">
        <span className="text-gray-600">Account: </span>
        <span className="font-mono">{`${address.slice(0, 6)}...${address.slice(-4)}`}</span>
      </div>
      <div className="text-sm">
        <span className="text-gray-600">Balance: </span>
        <span className="font-mono">{balance} TURA</span>
      </div>
      {isLoggedIn ? (
        <button
          onClick={handleLogout}
          className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90"
        >
          Logout
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Enter wallet password"
            className="px-2 py-1 text-sm border rounded"
          />
          <button
            onClick={handleLogin}
            className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90"
          >
            Login
          </button>
        </div>
      )}
    </div>
  );
}
