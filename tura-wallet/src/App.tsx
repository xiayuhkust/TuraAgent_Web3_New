import { useState, useEffect } from 'react';
import { Wallet, Send, RefreshCw, Lock, Key, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
// Alert components removed as they're unused
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './components/ui/dialog';
import WalletManager from './lib/wallet_manager';

interface WalletError extends Error {
  message: string;
}

function App() {
  const [balance, setBalance] = useState('0');
  const [address, setAddress] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [_error, setError] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [mnemonic, setMnemonic] = useState('');
  const [restoreMnemonic, setRestoreMnemonic] = useState('');
  const [signatureDetails, setSignatureDetails] = useState<{
    from: string;
    to: string;
    amount: string;
    onConfirm: () => Promise<void>;
    onReject: () => void;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const [isSendingTransaction, setIsSendingTransaction] = useState(false);
  const [lastBalanceUpdate, setLastBalanceUpdate] = useState<Date | null>(null);
  const [walletManager] = useState(() => {
    const manager = new WalletManager();
    // Make wallet manager available globally for debugging
    (window as any).walletManager = manager;
    return manager;
  });

  // Effect to check stored wallet on mount
  useEffect(() => {
    const checkStoredWallet = async () => {
      try {
        // Check for stored wallet
        const storedAddress = localStorage.getItem('lastWalletAddress');
        if (storedAddress) {
          setAddress(storedAddress);
          
          // Try to get session
          const session = await walletManager.getSession();
          if (session?.password) {
            // Session exists, try to get wallet data
            const walletData = await walletManager.getWalletData(storedAddress, session.password);
            if (walletData) {
              setIsLoggedIn(true);
              const balance = await walletManager.getBalance(storedAddress);
              setBalance(balance);
              console.log('Restored wallet session:', {
                address: storedAddress,
                hasSession: true,
                sessionExpires: new Date(session.expires).toLocaleString()
              });
            }
          } else {
            // Just get balance for display
            const balance = await walletManager.getBalance(storedAddress);
            setBalance(balance);
            console.log('Found stored wallet (not logged in):', {
              address: storedAddress,
              hasSession: false
            });
          }
        }
      } catch (error) {
        console.error('Failed to check stored wallet:', error);
        setError('Failed to load wallet data');
      }
    };

    checkStoredWallet();
  }, [walletManager]);

  const handleLogin = async () => {
    try {
      setError('');
      setIsCreatingWallet(true);
      const password = prompt('Enter your wallet password:');
      if (!password) {
        setIsCreatingWallet(false);
        return;
      }

      await walletManager.login(address, password);
      setIsLoggedIn(true);
      
      const balance = await walletManager.getBalance(address);
      setBalance(balance);
      setLastBalanceUpdate(new Date());
    } catch (error) {
      const walletError = error as WalletError;
      setError('Login failed: ' + walletError.message);
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleSend = async () => {
    try {
      setError('');
      const toAddress = prompt('Enter recipient address:');
      if (!toAddress) return;

      const amount = prompt('Enter amount to send:');
      if (!amount) return;

      const password = prompt('Enter your wallet password to confirm:');
      if (!password) return;

      // Show signature request dialog with chain details
      setSignatureDetails({
        from: address,
        to: toAddress,
        amount: amount,
        onConfirm: async () => {
          try {
            setIsProcessing(true);
            const receipt = await walletManager.sendTransaction(
              address,
              toAddress,
              amount,
              password
            );
            const newBalance = await walletManager.getBalance(address);
            setBalance(newBalance);
            setShowSignature(false);
            alert('Transaction successful! Hash: ' + receipt.transactionHash);
          } catch (error) {
            console.error('Transaction failed:', error);
            const walletError = error as WalletError;
            setError('Transaction failed: ' + walletError.message);
            setShowSignature(false);
          } finally {
            setIsProcessing(false);
          }
        },
        onReject: () => {
          setError('Transaction rejected by user');
          setShowSignature(false);
        }
      });
      setShowSignature(true);
    } catch (error) {
      console.error('Transaction failed:', error);
      const walletError = error as WalletError;
      setError('Transaction failed: ' + walletError.message);
    }
  };

  useEffect(() => {
    // Check for stored wallet
    const storedAddress = localStorage.getItem('lastWalletAddress');
    if (storedAddress) {
      setAddress(storedAddress);
      walletManager.getBalance(storedAddress)
        .then((balance: string) => setBalance(balance))
        .catch(console.error);
    }
  }, []);

  const handleCreateWallet = async () => {
    try {
      setError('');
      setIsProcessing(true);
      
      const password = prompt('Enter a secure password for your new wallet:');
      if (!password) {
        setIsProcessing(false);
        return;
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        setIsProcessing(false);
        return;
      }

      console.log('Creating new wallet...');
      const wallet = await walletManager.createWallet(password);
      console.log('Wallet created:', {
        address: wallet.address,
        hasMnemonic: !!wallet.mnemonic
      });

      setAddress(wallet.address);
      if (wallet.mnemonic) {
        setMnemonic(wallet.mnemonic);
      }
      setShowMnemonic(true);
      setIsLoggedIn(true);
      
      // Get initial balance
      try {
        const balance = await walletManager.getBalance(wallet.address);
        setBalance(balance);
      } catch (e) {
        console.warn('Failed to get initial balance:', e);
        setBalance('0');
      }

      // Verify storage
      const storedWallet = localStorage.getItem(`wallet_${wallet.address.toLowerCase()}`);
      const storedSession = sessionStorage.getItem('wallet_session');
      console.log('Storage verification:', {
        hasWalletData: !!storedWallet,
        hasSession: !!storedSession,
        walletDataLength: storedWallet?.length,
        sessionDataLength: storedSession?.length
      });

    } catch (error) {
      console.error('Failed to create wallet:', error);
      const walletError = error as WalletError;
      setError('Failed to create wallet: ' + walletError.message);
    } finally {
      setIsCreatingWallet(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            Tura Wallet
          </CardTitle>
          <CardDescription>
            Manage your cryptocurrency securely
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {address ? (
              <>
                <div className="p-4 bg-secondary rounded-lg">
                  <div className="text-sm text-muted-foreground">Account</div>
                  <div className="font-mono text-sm break-all">{address}</div>
                </div>
                
                <div className="p-4 bg-secondary rounded-lg">
                  <div className="text-sm text-muted-foreground">Balance</div>
                  <div className="text-2xl font-bold">{balance} TURA</div>
                  <div className="flex justify-between items-center mt-1">
                    {lastBalanceUpdate && (
                      <div className="text-xs text-muted-foreground">
                        Last updated: {lastBalanceUpdate.toLocaleTimeString()}
                      </div>
                    )}
                    {isRefreshingBalance && (
                      <div className="text-xs text-muted-foreground animate-pulse">
                        Refreshing...
                      </div>
                    )}
                  </div>
                  {_error && _error.includes('balance') && (
                    <div className="text-xs text-destructive mt-1">
                      {_error}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No wallet connected
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-2">
          {!address ? (
            <div className="flex flex-col gap-2 w-full">
              <Button
                className="w-full"
                onClick={handleCreateWallet}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Key className="mr-2 h-4 w-4" />
                )}
                {isProcessing ? 'Creating Wallet...' : 'Create New Wallet'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowRestore(true)}
                disabled={isCreatingWallet}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore Wallet
              </Button>
            </div>
          ) : !isLoggedIn ? (
            <Button
              className="w-full"
              onClick={handleLogin}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {isProcessing ? 'Logging in...' : 'Login to Wallet'}
            </Button>
          ) : (
            <>
              <Button 
                className="w-full" 
                onClick={handleSend}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isProcessing ? 'Sending...' : 'Send TURA'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    setIsRefreshingBalance(true);
                    setError(''); // Clear any previous errors
                    const newBalance = await walletManager.getBalance(address);
                    setBalance(newBalance);
                    setLastBalanceUpdate(new Date());
                    // Show success message briefly
                    setError('Balance updated successfully');
                    setTimeout(() => {
                      setError('');
                    }, 3000);
                  } catch (error) {
                    const walletError = error as WalletError;
                    setError('Failed to refresh balance: ' + walletError.message);
                  } finally {
                    setIsRefreshingBalance(false);
                  }
                }}
                disabled={isRefreshingBalance}
              >
                {isRefreshingBalance ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {isRefreshingBalance ? 'Refreshing...' : 'Refresh Balance'}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      <Dialog open={showMnemonic} onOpenChange={setShowMnemonic}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Important: Backup Your Mnemonic Phrase</DialogTitle>
            <DialogDescription className="space-y-4">
              <p>Please write down these 12 words in order and keep them safe. They are the only way to recover your wallet if you lose access.</p>
              <div className="grid grid-cols-3 gap-2 p-4 bg-muted rounded-lg">
                {mnemonic.split(' ').map((word, index) => (
                  <div key={index} className="flex items-center">
                    <span className="text-muted-foreground mr-2">{index + 1}.</span>
                    <span className="font-mono">{word}</span>
                  </div>
                ))}
              </div>
              <p className="text-destructive font-semibold">Warning: Never share your mnemonic phrase with anyone!</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMnemonic(false)}>Close</Button>
            <Button onClick={() => {
              setShowMnemonic(false);
              localStorage.setItem('lastWalletAddress', address);
            }}>
              I've Backed Up My Phrase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRestore} onOpenChange={setShowRestore}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Wallet from Mnemonic</DialogTitle>
            <DialogDescription className="space-y-4">
              <p>Enter your 12-word mnemonic phrase to restore your wallet.</p>
              <Input
                placeholder="Enter your mnemonic phrase"
                value={restoreMnemonic}
                onChange={(e) => setRestoreMnemonic(e.target.value)}
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">Words should be separated by spaces</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRestore(false);
              setRestoreMnemonic('');
            }}>
              Cancel
            </Button>
            <Button onClick={async () => {
              try {
                setError('');
                if (!restoreMnemonic.trim()) {
                  setError('Please enter your mnemonic phrase');
                  return;
                }

                const password = prompt('Enter a secure password for your restored wallet:');
                if (!password) return;

                const wallet = await walletManager.importWallet(restoreMnemonic.trim(), password);
                setAddress(wallet.address);
                setShowRestore(false);
                setRestoreMnemonic('');

                const balance = await walletManager.getBalance(wallet.address);
                setBalance(balance);
              } catch (error: any) {
                setError('Failed to restore wallet: ' + error.message);
              }
            }}>
              Restore Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSignature} onOpenChange={setShowSignature}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Transaction</DialogTitle>
            <DialogDescription className="space-y-4">
              <p>Please review and confirm this transaction on the Tura network (Chain ID: 1337):</p>
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-[auto,1fr] gap-2">
                  <span className="text-muted-foreground">From:</span>
                  <span className="font-mono text-sm break-all">{signatureDetails?.from}</span>
                  
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-mono text-sm break-all">{signatureDetails?.to}</span>
                  
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold">{signatureDetails?.amount} TURA</span>
                  
                  <span className="text-muted-foreground">Network:</span>
                  <span>Tura (Chain ID: 1337)</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Make sure you trust this site and understand what you're signing.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                signatureDetails?.onReject();
                setShowSignature(false);
              }}
              disabled={isSendingTransaction}
            >
              Reject
            </Button>
            <Button 
              onClick={async () => {
                if (signatureDetails?.onConfirm) {
                  await signatureDetails.onConfirm();
                }
              }}
              disabled={isSendingTransaction}
            >
              {isSendingTransaction ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isSendingTransaction ? 'Signing...' : 'Sign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
