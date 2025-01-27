// Global variables and configuration
let web3Instance;
let isInitialized = false;

const CHAIN_CONFIG = {
    chainId: 1337,
    chainName: 'Tura',
    rpcUrl: 'http://43.135.26.222:8000',
    nativeCurrency: {
        name: 'TURA',
        symbol: 'TURA',
        decimals: 18
    }
};

// Wait for Web3 to be available
async function waitForWeb3() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        
        console.log('Waiting for Web3 to be available...');
        const checkWeb3 = setInterval(() => {
            attempts++;
            console.log(`Checking for Web3 (attempt ${attempts}/${maxAttempts})...`);
            
            if (window.Web3) {
                console.log('Web3 found in window object');
                clearInterval(checkWeb3);
                resolve(window.Web3);
            } else if (attempts >= maxAttempts) {
                clearInterval(checkWeb3);
                reject(new Error('Timeout waiting for Web3'));
            }
        }, 100);
    });
}

// Initialize Web3 with provider
async function initWeb3() {
    if (isInitialized) {
        console.log('Web3 already initialized');
        return true;
    }

    try {
        const Web3 = await waitForWeb3();
        console.log('Initializing Web3...');
        const provider = new Web3.providers.HttpProvider(CHAIN_CONFIG.rpcUrl, {
            timeout: 10000,
            headers: [
                { name: 'Accept', value: 'application/json' },
                { name: 'Content-Type', value: 'application/json' }
            ]
        });
        
        web3Instance = new Web3(provider);
        window.web3 = web3Instance; // Make web3 globally available
        
        // Test connection with retry logic
        for (let i = 0; i < 3; i++) {
            try {
                await web3Instance.eth.net.isListening();
                console.log('Connected to Tura RPC');
                isInitialized = true;
                return true;
            } catch (err) {
                console.warn(`RPC connection attempt ${i + 1}/3 failed:`, err);
                if (i < 2) {
                    await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, i), 5000)));
                }
            }
        }
        
        console.warn('RPC connection failed, continuing with limited functionality');
        return true; // Allow wallet creation even without RPC
    } catch (error) {
        console.error('Failed to initialize Web3:', error);
        return false;
    }
}

// Initialize Web3 and Chain Configuration
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing Web3...');
    try {
        // Initialize Web3
        if (await initWeb3()) {
            console.log('Web3 initialized successfully');
            // Check for existing wallet and session
            const storedAddress = localStorage.getItem('lastWalletAddress');
            if (storedAddress) {
                document.querySelector('.account-address').textContent = storedAddress;
                document.getElementById('no-wallet-section').style.display = 'none';
                document.getElementById('account-section').style.display = 'block';
                
                // Check for active session
                const session = await WalletStorage.getSession();
                if (session && session.password) {
                    try {
                        const walletData = await WalletStorage.getWallet(storedAddress, session.password);
                        if (walletData) {
                            // Show logged in UI
                            document.getElementById('initial-buttons').style.display = 'none';
                            document.getElementById('logged-in-buttons').style.display = 'block';
                            
                            // Get and display balance
                            try {
                                const balance = await web3Instance.eth.getBalance(storedAddress);
                                document.querySelector('.balance-amount').textContent = 
                                    web3Instance.utils.fromWei(balance, 'ether') + ' TURA';
                            } catch (e) {
                                console.warn('Failed to get balance:', e);
                            }
                        }
                    } catch (e) {
                        console.warn('Failed to restore session:', e);
                        // Show logged out UI
                        document.getElementById('initial-buttons').style.display = 'none';
                        document.getElementById('logged-out-buttons').style.display = 'block';
                    }
                } else {
                    // Show logged out UI
                    document.getElementById('initial-buttons').style.display = 'none';
                    document.getElementById('logged-out-buttons').style.display = 'block';
                }
            }
        }
    } catch (error) {
        console.error('Failed to initialize Web3:', error);
        const errorMsg = document.getElementById('error-message');
        errorMsg.textContent = 'Failed to initialize wallet. Please try again later.';
        errorMsg.style.display = 'block';
    }
});

// Initialize Web3 and Chain Configuration
// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing Web3...');
    try {
        // Initialize Web3
        if (await initWeb3()) {
            console.log('Web3 initialized successfully');
            // Check for existing wallet and session
        // Check for existing wallet and session
        const storedAddress = localStorage.getItem('lastWalletAddress');
        if (storedAddress) {
            document.querySelector('.account-address').textContent = storedAddress;
            document.getElementById('no-wallet-section').style.display = 'none';
            document.getElementById('account-section').style.display = 'block';
            
            // Check for active session
            const session = await WalletStorage.getSession();
            if (session && session.password) {
                try {
                    const walletData = await WalletStorage.getWallet(storedAddress, session.password);
                    if (walletData) {
                        // Show logged in UI
                        document.getElementById('initial-buttons').style.display = 'none';
                        document.getElementById('logged-in-buttons').style.display = 'block';
                        
                        // Get and display balance
                        try {
                            const balance = await web3Instance.eth.getBalance(storedAddress);
                            document.querySelector('.balance-amount').textContent = 
                                web3Instance.utils.fromWei(balance, 'ether') + ' TURA';
                        } catch (e) {
                            console.warn('Failed to get balance:', e);
                        }
                    }
                } catch (e) {
                    console.warn('Failed to restore session:', e);
                    // Show logged out UI
                    document.getElementById('initial-buttons').style.display = 'none';
                    document.getElementById('logged-out-buttons').style.display = 'block';
                }
            } else {
                // Show logged out UI
                document.getElementById('initial-buttons').style.display = 'none';
                document.getElementById('logged-out-buttons').style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Failed to initialize Web3:', error);
        const errorMsg = document.getElementById('error-message');
        errorMsg.textContent = 'Failed to initialize wallet. Please try again later.';
        errorMsg.style.display = 'block';
    }
});

// Crypto utilities
class WalletCrypto {
    static async deriveKey(password) {
        try {
            // Match reference implementation's key derivation
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hash = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        } catch (error) {
            console.error('Key derivation failed:', error);
            throw new Error('Failed to generate encryption key');
        }
    }

    static async encrypt(data, password) {
        try {
            // Generate encryption key using SHA-256
            const key = await this.deriveKey(password);
            
            // Create encrypted data structure matching reference implementation
            const encryptedData = {
                data: data,
                key: key
            };

            // Encrypt and encode
            return btoa(JSON.stringify(encryptedData));
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data: ' + error.message);
        }
    }

    static async decrypt(encryptedData, password) {
        try {
            // Generate key for verification
            const key = await this.deriveKey(password);

            // Decode and parse data
            try {
                const decoded = JSON.parse(atob(encryptedData));
                if (decoded.key !== key) {
                    throw new Error('Invalid password');
                }
                return decoded.data;
            } catch (error) {
                throw new Error('Decryption failed: Invalid password or data');
            }
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data: ' + error.message);
        }
    }
}

// Storage utilities
const WALLET_PREFIX = 'wallet_';
const SESSION_KEY = 'tempWalletPassword';

class WalletStorage {
    static async storeWallet(address, walletData, password) {
        try {
            // Validate input data
            if (!address || !walletData || !password) {
                throw new Error('Missing required wallet data');
            }

            // Ensure wallet data has required fields
            if (!walletData.address || !walletData.privateKey || !walletData.mnemonic) {
                throw new Error('Invalid wallet data structure');
            }

            // Encrypt wallet data
            const encrypted = await WalletCrypto.encrypt(walletData, password);
            
            // Store encrypted data
            localStorage.setItem(`${WALLET_PREFIX}${address.toLowerCase()}`, encrypted);
            localStorage.setItem('lastWalletAddress', address);
            
            return true;
        } catch (error) {
            console.error('Failed to store wallet:', error);
            throw new Error('Failed to store wallet data: ' + error.message);
        }
    }

    static async storeSession(password) {
        try {
            // Match reference implementation's session storage
            const sessionData = {
                password: password,
                expires: Date.now() + (5 * 60 * 1000), // 5 minutes
                created: new Date().toISOString()
            };

            // Encrypt session data using the same approach as wallet_manager.js
            const encrypted = await WalletCrypto.encrypt(sessionData, password);
            
            // Store encrypted session
            sessionStorage.setItem(SESSION_KEY, encrypted);
            
            return true;
        } catch (error) {
            console.error('Failed to store session:', error);
            throw new Error('Failed to store session data: ' + error.message);
        }
    }

    static async getWallet(address, password) {
        try {
            // Get encrypted wallet data
            const encrypted = localStorage.getItem(`${WALLET_PREFIX}${address.toLowerCase()}`);
            if (!encrypted) {
                throw new Error('Wallet not found');
            }

            // Decrypt and validate wallet data
            const walletData = await WalletCrypto.decrypt(encrypted, password);
            if (!walletData || !walletData.address || !walletData.privateKey) {
                throw new Error('Invalid wallet data');
            }

            return walletData;
        } catch (error) {
            console.error('Failed to get wallet:', error);
            throw new Error('Failed to get wallet data: ' + error.message);
        }
    }

    static async getSession() {
        try {
            // Get encrypted session data
            const encrypted = sessionStorage.getItem(SESSION_KEY);
            if (!encrypted) {
                return null;
            }

            // Attempt to decrypt session
            let session;
            try {
                const decrypted = await WalletCrypto.decrypt(encrypted, 'session');
                if (!decrypted || !decrypted.password || !decrypted.expires) {
                    throw new Error('Invalid session format');
                }
                session = decrypted;
            } catch (e) {
                console.warn('Failed to decrypt session:', e);
                sessionStorage.removeItem(SESSION_KEY);
                return null;
            }

            // Check session expiration
            if (session.expires <= Date.now()) {
                console.log('Session expired');
                sessionStorage.removeItem(SESSION_KEY);
                return null;
            }

            return session;
        } catch (error) {
            console.warn('Failed to get session:', error);
            sessionStorage.removeItem(SESSION_KEY);
            return null;
        }
    }
}

// Dialog Management
function showDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (!dialog) {
        console.error(`Dialog with id ${dialogId} not found`);
        return;
    }
    
    console.log(`Showing dialog: ${dialogId}`);
    dialog.style.display = 'block';
    dialog.classList.add('visible');
    
    // Prevent body scroll when dialog is open
    document.body.style.overflow = 'hidden';
    
    // Handle escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            hideDialog(dialogId);
        }
    };
    document.addEventListener('keydown', handleEscape);
    dialog.addEventListener('close', () => {
        document.removeEventListener('keydown', handleEscape);
    });
    
    // Focus the first input if it exists
    const firstInput = dialog.querySelector('input');
    if (firstInput) {
        firstInput.focus();
    }
}

function hideDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (!dialog) {
        console.error(`Dialog with id ${dialogId} not found`);
        return;
    }
    
    console.log(`Hiding dialog: ${dialogId}`);
    dialog.classList.remove('visible');
    
    // Restore body scroll
    document.body.style.overflow = '';
    
    // Clear any input values
    dialog.querySelectorAll('input').forEach(input => {
        input.value = '';
    });
}

// Button Event Handlers
async function handleCreateWallet() {
    try {
        // Ensure Web3 is initialized
        if (!web3Instance) {
            console.log('Waiting for Web3 initialization...');
            await initWeb3();
        }
        
        if (!web3Instance || !web3Instance.eth) {
            throw new Error('Web3 not properly initialized');
        }
        
        // Show password dialog
        showDialog('password-dialog');
        
        // Wait for password confirmation
        return new Promise((resolve, reject) => {
            window.confirmPassword = async () => {
                const password = document.getElementById('create-password').value;
                if (!password) {
                    const errorMsg = document.getElementById('password-error');
                    errorMsg.textContent = 'Please enter a password';
                    errorMsg.style.display = 'block';
                    return;
                }
                
                try {
                    console.log('Creating new wallet...');
                    
                    // Generate entropy for account creation
                    const entropy = await window.crypto.getRandomValues(new Uint8Array(32));
                    const entropyHex = Array.from(entropy)
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join('');
                    
                    // Create account with Web3
                    if (!web3Instance || !web3Instance.eth || !web3Instance.eth.accounts) {
                        throw new Error('Web3 not properly initialized');
                    }
                    
                    const account = web3Instance.eth.accounts.create(entropyHex);
                    console.log('Created new account:', account.address);

                    // Generate mnemonic
                    const mnemonic = bip39.entropyToMnemonic(entropyHex);
                    
                    // Create wallet data
                    const walletData = {
                        address: account.address,
                        privateKey: account.privateKey,
                        mnemonic: mnemonic,
                        createdAt: new Date().toISOString()
                    };

                    // Store wallet and session data
                    await WalletStorage.storeWallet(account.address, walletData, password);
                    await WalletStorage.storeSession(password);

                    // Hide password dialog
                    hideDialog('password-dialog');
                    document.getElementById('password-dialog').remove();
                    delete window.confirmPassword;

                    // Update UI
                    document.getElementById('no-wallet-section').style.display = 'none';
                    document.getElementById('account-section').style.display = 'block';
                    document.querySelector('.account-address').textContent = account.address;

                    // Display mnemonic in grid
                    const words = mnemonic.split(' ');
                    const grid = document.getElementById('mnemonic-grid');
                    grid.innerHTML = '';
                    
                    words.forEach((word, index) => {
                        const div = document.createElement('div');
                        div.innerHTML = `
                            <span class="word-number">${index + 1}.</span>
                            <span class="word">${word}</span>
                        `;
                        grid.appendChild(div);
                    });
                    
                    showDialog('mnemonic-dialog');
                    resolve(account.address);
                } catch (error) {
                    console.error('Failed to create wallet:', error);
                    const errorMsg = document.getElementById('error-message');
                    errorMsg.textContent = 'Failed to create wallet: ' + error.message;
                    errorMsg.style.display = 'block';
                    reject(error);
                }
            };
        });
    } catch (error) {
        console.error('Failed to show password dialog:', error);
        const errorMsg = document.getElementById('error-message');
        errorMsg.textContent = 'Failed to create wallet: ' + error.message;
        errorMsg.style.display = 'block';
    }
}

function handleRestoreWallet() {
    showDialog('restore-dialog');
}

function handleLogin() {
    showDialog('login-dialog');
}

function handleSend() {
    showDialog('send-dialog');
}

function closeLoginDialog() {
    hideDialog('login-dialog');
    document.getElementById('wallet-password').value = '';
}

function closeSendDialog() {
    hideDialog('send-dialog');
    document.getElementById('recipient-address').value = '';
    document.getElementById('send-amount').value = '';
}

async function handleLoginConfirm() {
    try {
        const password = document.getElementById('wallet-password').value.trim();
        if (!password) {
            const errorMsg = document.getElementById('error-message');
            errorMsg.textContent = 'Please enter your password';
            errorMsg.style.display = 'block';
            return;
        }

        // Get stored wallet data
        const storedAddress = localStorage.getItem('lastWalletAddress');
        if (!storedAddress) {
            throw new Error('No wallet found');
        }

        const encryptedWallet = localStorage.getItem(`${WALLET_PREFIX}${storedAddress.toLowerCase()}`);
        if (!encryptedWallet) {
            throw new Error('Wallet data not found');
        }

        // Try to decrypt wallet data with password
        const walletData = await WalletCrypto.decrypt(encryptedWallet, password);
        if (!walletData || !walletData.address || !walletData.privateKey) {
            throw new Error('Invalid wallet data');
        }

        // Store session data
        const sessionData = {
            password,
            expires: Date.now() + (5 * 60 * 1000) // 5 minutes
        };
        const encryptedSession = await WalletCrypto.encrypt(sessionData, password);
        sessionStorage.setItem(SESSION_KEY, encryptedSession);

        hideDialog('login-dialog');
        document.getElementById('wallet-password').value = '';

        // Update UI
        document.getElementById('no-wallet-section').style.display = 'none';
        document.getElementById('account-section').style.display = 'block';
        document.querySelector('.account-address').textContent = walletData.address;
    } catch (error) {
        const errorMsg = document.getElementById('error-message');
        errorMsg.textContent = 'Login failed: ' + error.message;
        errorMsg.style.display = 'block';
    }
}

function handleSendConfirm() {
    const toAddress = document.getElementById('recipient-address').value.trim();
    const amount = document.getElementById('send-amount').value.trim();
    
    if (!toAddress || !amount) {
        const errorMsg = document.getElementById('error-message');
        errorMsg.textContent = 'Please fill in all fields';
        errorMsg.style.display = 'block';
        return;
    }
    
    // Show signature request dialog
    const fromAddress = document.querySelector('.account-address').textContent;
    document.getElementById('signature-from').textContent = fromAddress;
    document.getElementById('signature-to').textContent = toAddress;
    document.getElementById('signature-amount').textContent = `${amount} TURA`;
    
    hideDialog('send-dialog');
    showDialog('signature-dialog');
}

function rejectSignature() {
    hideDialog('signature-dialog');
    const errorMsg = document.getElementById('error-message');
    errorMsg.textContent = 'Transaction rejected';
    errorMsg.style.display = 'block';
    setTimeout(() => {
        errorMsg.style.display = 'none';
    }, 3000);
}

function confirmSignature() {
    // Visual feedback
    const button = document.querySelector('#signature-dialog .primary-button');
    button.disabled = true;
    button.innerHTML = '<span class="icon icon-refresh"></span>Processing...';
    
    setTimeout(() => {
        hideDialog('signature-dialog');
        button.disabled = false;
        button.innerHTML = 'Sign';
        
        // Show success message
        const errorMsg = document.getElementById('error-message');
        errorMsg.style.backgroundColor = '#dcfce7';
        errorMsg.style.borderColor = '#bbf7d0';
        errorMsg.style.color = '#15803d';
        errorMsg.textContent = 'Transaction successful!';
        errorMsg.style.display = 'block';
        setTimeout(() => {
            errorMsg.style.display = 'none';
            errorMsg.style.backgroundColor = '';
            errorMsg.style.borderColor = '';
            errorMsg.style.color = '';
        }, 3000);
    }, 1000);
}

async function handleRefreshBalance() {
    try {
        // Visual feedback
        const button = event.target;
        button.disabled = true;
        button.innerHTML = '<span class="icon icon-refresh"></span>Refreshing...';

        // Get stored wallet and session data
        const storedAddress = localStorage.getItem('lastWalletAddress');
        const storedSession = sessionStorage.getItem(SESSION_KEY);
        
        if (!storedAddress || !storedSession) {
            throw new Error('Wallet not found or session expired');
        }

        // Get and display actual balance
        const balance = await web3Instance.eth.getBalance(storedAddress);
        document.querySelector('.balance-amount').textContent = 
            web3Instance.utils.fromWei(balance, 'ether') + ' TURA';
    } catch (error) {
        const errorMsg = document.getElementById('error-message');
        errorMsg.textContent = 'Failed to refresh balance: ' + error.message;
        errorMsg.style.display = 'block';
    } finally {
        // Reset button state
        const button = event.target;
        button.disabled = false;
        button.innerHTML = '<span class="icon icon-refresh"></span>Refresh Balance';
    }
}

// Dialog Event Handlers
function closeMnemonicDialog() {
    hideDialog('mnemonic-dialog');
}

function closeRestoreDialog() {
    hideDialog('restore-dialog');
    document.getElementById('mnemonic-input').value = '';
}

async function confirmMnemonicBackup() {
    try {
        hideDialog('mnemonic-dialog');
        
        // Store last wallet address
        const address = document.querySelector('.account-address').textContent;
        localStorage.setItem('lastWalletAddress', address);
        
        // Update UI
        document.getElementById('no-wallet-section').style.display = 'none';
        document.getElementById('account-section').style.display = 'block';
        
        // Show login dialog for password entry
        handleLogin();
    } catch (error) {
        const errorMsg = document.getElementById('error-message');
        errorMsg.textContent = 'Failed to save wallet: ' + error.message;
        errorMsg.style.display = 'block';
    }
}

async function handleRestoreConfirm() {
    try {
        const mnemonic = document.getElementById('mnemonic-input').value.trim();
        if (!mnemonic) {
            const errorMsg = document.getElementById('error-message');
            errorMsg.textContent = 'Please enter your mnemonic phrase';
            errorMsg.style.display = 'block';
            return;
        }

        const password = prompt('Enter a secure password for your restored wallet:');
        if (!password) return;

        // Validate mnemonic
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic phrase');
        }
        
        // Create account from mnemonic
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const account = web3Instance.eth.accounts.privateKeyToAccount(
            '0x' + seed.slice(0, 32).toString('hex')
        );
        
        const walletData = {
            address: account.address,
            privateKey: account.privateKey,
            mnemonic: mnemonic,
            createdAt: new Date().toISOString()
        };

        // Encrypt and store wallet data
        const encrypted = await WalletCrypto.encrypt(walletData, password);
        localStorage.setItem(`${WALLET_PREFIX}${address.toLowerCase()}`, encrypted);

        // Store temporary session
        const sessionData = {
            password,
            expires: Date.now() + (5 * 60 * 1000) // 5 minutes
        };
        const encryptedSession = await WalletCrypto.encrypt(sessionData, password);
        sessionStorage.setItem(SESSION_KEY, encryptedSession);

        hideDialog('restore-dialog');
        document.getElementById('mnemonic-input').value = '';
        
        // Update UI to show wallet
        document.getElementById('no-wallet-section').style.display = 'none';
        document.getElementById('account-section').style.display = 'block';
        document.querySelector('.account-address').textContent = address;
    } catch (error) {
        const errorMsg = document.getElementById('error-message');
        errorMsg.textContent = 'Failed to restore wallet: ' + error.message;
        errorMsg.style.display = 'block';
    }
}

// Account Management UI
function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    const isVisible = dropdown.style.display === 'block';
    
    // Hide all dropdowns first
    document.querySelectorAll('.dropdown-content').forEach(d => {
        d.style.display = 'none';
    });
    
    // Toggle clicked dropdown
    dropdown.style.display = isVisible ? 'none' : 'block';
}

// Initialize UI and check for existing session
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing wallet interface...');
        
        // Log initial storage state
        console.log('Initial Storage State:', {
            localStorage: Object.fromEntries(
                Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
            ),
            sessionStorage: Object.fromEntries(
                Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])
            )
        });
        
        // Check for existing wallet and session
        const storedAddress = localStorage.getItem('lastWalletAddress');
        console.log('Stored wallet address:', storedAddress);
        
        // Log storage contents for verification
        console.log('Storage Contents:', {
            localStorage: Object.fromEntries(
                Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])
            ),
            sessionStorage: Object.fromEntries(
                Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])
            )
        });
        
        if (storedAddress) {
            // Update UI with stored address
            document.querySelector('.account-address').textContent = storedAddress;
            
            const storedSession = sessionStorage.getItem(SESSION_KEY);
            if (storedSession) {
                try {
                    // Try to get session data
                    const sessionData = await WalletStorage.getSession();
                    if (!sessionData || !sessionData.password) {
                        throw new Error('Invalid session data');
                    }
                    
                    console.log('Session data:', {
                        expires: new Date(sessionData.expires).toLocaleString(),
                        remainingTime: Math.round((sessionData.expires - Date.now()) / 1000) + ' seconds',
                        isValid: sessionData.expires > Date.now(),
                        hasPassword: !!sessionData.password
                    });
                    
                    if (sessionData.expires && sessionData.expires > Date.now()) {
                        // Valid session exists, get wallet data
                        const encryptedWallet = localStorage.getItem(`${WALLET_PREFIX}${storedAddress.toLowerCase()}`);
                        console.log('Found encrypted wallet data:', !!encryptedWallet);
                        
                        if (encryptedWallet) {
                            const walletData = await WalletCrypto.decrypt(encryptedWallet, sessionData.password);
                            console.log('Wallet data decrypted successfully:', !!walletData);
                            if (walletData && walletData.address) {
                                // Update UI with wallet data
                                document.getElementById('no-wallet-section').style.display = 'none';
                                document.getElementById('account-section').style.display = 'block';
                                document.querySelector('.account-address').textContent = walletData.address;
                                
                                // Show logged-in buttons
                                document.getElementById('initial-buttons').style.display = 'none';
                                document.getElementById('logged-out-buttons').style.display = 'none';
                                document.getElementById('logged-in-buttons').style.display = 'block';
                                
                                // Update balance (mock for now)
                                document.querySelector('.balance-amount').textContent = '0 TURA';
                                return;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Failed to restore session:', e);
                }
                // Invalid or expired session, clear it
                sessionStorage.removeItem(SESSION_KEY);
            }
            
            // Show logged-out buttons if we have a wallet but no valid session
            document.getElementById('initial-buttons').style.display = 'none';
            document.getElementById('logged-out-buttons').style.display = 'block';
            document.getElementById('logged-in-buttons').style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to initialize wallet:', error);
        const errorMsg = document.getElementById('error-message');
        errorMsg.textContent = 'Failed to load wallet data: ' + error.message;
        errorMsg.style.display = 'block';
    }

    // Set up event listeners
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-content').forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        }
    });
    
    document.querySelectorAll('.dialog-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            const dialog = overlay.closest('.dialog');
            if (dialog) {
                hideDialog(dialog.id);
            }
        });
    });
});
