import { useState, useEffect, useCallback } from 'react';
import { Wallet, Send, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { WalletManagerImpl } from '../../lib/wallet_manager';
import { ethers } from 'ethers';

interface WalletError extends Error {
  message: string;
}

interface UserTableEntry {
  balance: number;
}

interface UserTable {
  [address: string]: UserTableEntry;
}

export default function WalletContent() {
  const [balance, setBalance] = useState('0');
  const [address, setAddress] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [_error, setError] = useState('');
  const [showSignature, setShowSignature] = useState(false);
  const [signatureDetails, setSignatureDetails] = useState<{
    from: string;
    to: string;
    amount: string;
    onConfirm: () => Promise<void>;
    onReject: () => void;
  } | null>(null);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isSigningTransaction, setIsSigningTransaction] = useState(false);
  const [lastBalanceUpdate, setLastBalanceUpdate] = useState<Date | null>(null);
  const [walletManager] = useState(() => new WalletManagerImpl());

  const updateBalance = useCallback((address: string) => {
    const userTableStr = localStorage.getItem('mockUserTable') || '{}';
    const userTable: UserTable = JSON.parse(userTableStr);
    const newBalance = userTable[address]?.balance ?? 0;
    setBalance(newBalance.toString());
    setLastBalanceUpdate(new Date());
  }, []);
  
  // Listen for storage changes to update balance
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mockUserTable' && address) {
        updateBalance(address);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [address]);

  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        const storedAddress = localStorage.getItem('lastWalletAddress');
        if (!storedAddress) return;

        setAddress(storedAddress);
        
        const session = await walletManager.getSession();
        if (session?.password) {
          await walletManager.getPrivateKey(session.password);
          setIsLoggedIn(true);
        }
        
        updateBalance(storedAddress);
        
        console.log('Restored wallet session:', {
          address: storedAddress,
          hasSession: !!session?.password,
          sessionExpires: session?.expires ? new Date(session.expires).toLocaleString() : null
        });
      } catch (error) {
        console.error('Failed to check wallet connection:', error);
        setError('Failed to load wallet data');
      }
    };

    checkWalletConnection();
  }, [walletManager]);

  const handleSend = async () => {
    if (isSigningTransaction) return;
    
    try {
      setError('');
      const toAddress = prompt('Enter recipient address:');
      if (!toAddress) return;

      const amount = prompt('Enter amount to send:');
      if (!amount) return;

      setSignatureDetails({
        from: address,
        to: toAddress,
        amount: amount,
        onConfirm: async () => {
          try {
            setIsSigningTransaction(true);
            const session = await walletManager.getSession();
            if (!session?.password) {
              throw new Error('Please log in to send transactions');
            }
            await walletManager.getPrivateKey(session.password); // Verify password
            const userTableStr = localStorage.getItem('mockUserTable') || '{}';
            const userTable = JSON.parse(userTableStr);
            
            // Update balances in virtual table
            const senderBalance = userTable[address]?.balance ?? 0;
            const amountNum = parseFloat(amount);
            
            if (senderBalance < amountNum) {
              throw new Error('Insufficient balance');
            }
            
            userTable[address] = {
              ...userTable[address],
              balance: senderBalance - amountNum
            };
            
            if (!userTable[toAddress]) {
              userTable[toAddress] = { balance: 0 };
            }
            userTable[toAddress].balance = (userTable[toAddress].balance ?? 0) + amountNum;
            
            localStorage.setItem('mockUserTable', JSON.stringify(userTable));
            setBalance((userTable[address].balance).toString());
            setShowSignature(false);
            alert('Transaction successful!');
          } catch (error) {
            console.error('Transaction failed:', error);
            const walletError = error as WalletError;
            setError('Transaction failed: ' + walletError.message);
            setShowSignature(false);
          } finally {
            setIsSigningTransaction(false);
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
                  <div className="text-2xl font-bold" data-balance-display>{balance} TURA</div>
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
                className="w-full relative"
                onClick={async () => {
                  if (isConnectingWallet) return;
                  try {
                    setError('');
                    setIsConnectingWallet(true);
                    
                    console.log('Creating new wallet...');
                    const wallet = ethers.Wallet.createRandom();
                    const account = { address: wallet.address };
                    localStorage.setItem('lastWalletAddress', account.address);
                    console.log('Created wallet:', account.address);

                    setAddress(account.address);
                    setIsLoggedIn(true);
                    
                    updateBalance(account.address);
                  } catch (error) {
                    console.error('Failed to connect wallet:', error);
                    const walletError = error as WalletError;
                    setError('Failed to connect wallet: ' + walletError.message);
                  } finally {
                    setIsConnectingWallet(false);
                  }
                }}
                disabled={isConnectingWallet}
                aria-disabled={isConnectingWallet}
              >
                <div className="flex items-center justify-center w-full">
                  {isConnectingWallet ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="mr-2 h-4 w-4" />
                  )}
                  <span>{isConnectingWallet ? 'Connecting...' : 'Connect MetaMask'}</span>
                </div>
              </Button>
            </div>
          ) : !isLoggedIn ? (
            <Button
              className="w-full relative"
              onClick={async () => {
                if (isConnectingWallet) return;
                try {
                  setError('');
                  const password = prompt('Enter your wallet password:');
                  if (!password) {
                    return;
                  }
                  await walletManager.getPrivateKey(password); // Verify password
                  localStorage.setItem('walletSession', JSON.stringify({
                    password,
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                  }));
                  setIsLoggedIn(true);
                  const userTableStr = localStorage.getItem('mockUserTable') || '{}';
                  const userTable = JSON.parse(userTableStr);
                  setBalance((userTable[address]?.balance ?? 0).toString());
                  setLastBalanceUpdate(new Date());
                } catch (error) {
                  const walletError = error as WalletError;
                  setError('Connection failed: ' + walletError.message);
                } finally {
                  setIsConnectingWallet(false);
                }
              }}
              disabled={isConnectingWallet}
              aria-disabled={isConnectingWallet}
            >
              <div className="flex items-center justify-center w-full">
                {isConnectingWallet ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="mr-2 h-4 w-4" />
                )}
                <span>{isConnectingWallet ? 'Connecting...' : 'Connect MetaMask'}</span>
              </div>
            </Button>
          ) : (
            <>
              <Button 
                className="w-full" 
                onClick={handleSend}
                disabled={isSigningTransaction}
                aria-disabled={isSigningTransaction}
              >
                {isSigningTransaction ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                <span>{isSigningTransaction ? 'Sending...' : 'Send TURA'}</span>
              </Button>
              <Button
                variant="outline"
                className="w-full relative"
                onClick={async () => {
                  if (isRefreshingBalance) return;
                  try {
                    setIsRefreshingBalance(true);
                    setError('');
                    
                    const userTableStr = localStorage.getItem('mockUserTable') || '{}';
                    const userTable = JSON.parse(userTableStr);
                    setBalance((userTable[address]?.balance ?? 0).toString());
                    setLastBalanceUpdate(new Date());
                    
                    const successMessage = 'Balance updated successfully';
                    setError(successMessage);
                    setTimeout(() => {
                      setError((current) => current === successMessage ? '' : current);
                    }, 3000);
                  } catch (error) {
                    const walletError = error as WalletError;
                    setError('Failed to refresh balance: ' + walletError.message);
                    console.error('Balance refresh failed:', error);
                  } finally {
                    setIsRefreshingBalance(false);
                  }
                }}
                disabled={isRefreshingBalance}
                aria-disabled={isRefreshingBalance}
              >
                <div className="flex items-center justify-center w-full">
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshingBalance ? 'animate-spin' : ''}`} />
                  <span>{isRefreshingBalance ? 'Refreshing...' : 'Refresh Balance'}</span>
                </div>
              </Button>
            </>
          )}
        </CardFooter>
      </Card>




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
              disabled={isSigningTransaction}
            >
              Reject
            </Button>
            <Button 
              onClick={async () => {
                if (signatureDetails?.onConfirm) {
                  try {
                    setIsSigningTransaction(true);
                    await signatureDetails.onConfirm();
                  } finally {
                    setIsSigningTransaction(false);
                  }
                }
              }}
              disabled={isSigningTransaction}
            >
              {isSigningTransaction ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isSigningTransaction ? 'Signing...' : 'Sign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
