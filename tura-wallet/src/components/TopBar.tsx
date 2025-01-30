import { useState, useEffect } from 'react';
import { WalletManagerImpl as WalletManager } from '../lib/wallet_manager';

export function TopBar() {
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const walletManager = new WalletManager();
  const address = localStorage.getItem('lastWalletAddress') || '';

  useEffect(() => {
    const checkSession = async () => {
      const session = await walletManager.getSession();
      setIsLoggedIn(!!session);
    };
    checkSession();
  }, [address]);

  const handleLogin = async () => {
    try {
      await walletManager.login(address, passwordInput);
      setIsLoggedIn(true);
      setPasswordInput('');
    } catch (error) {
      alert('Invalid password or wallet not found');
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('wallet_session');
    setIsLoggedIn(false);
  };

  if (!address) {
    return (
      <div className="bg-primary/10 p-2 text-sm text-primary">
        No wallet found. Please create or restore a wallet.
      </div>
    );
  }

  // Securely display account info with minimal exposure
  return (
    <div className="flex items-center justify-end p-2 bg-primary/10">
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
