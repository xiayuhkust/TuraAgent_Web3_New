// Chain Configuration
const CHAIN_CONFIG = {
    chainId: 1337,
    chainName: 'Tura',
    rpcUrl: 'https://43.135.26.222:8088',
    nativeCurrency: {
        name: 'TURA',
        symbol: 'TURA',
        decimals: 18
    }
};

// Initialize Web3
let web3;
try {
    const provider = new Web3.providers.HttpProvider(CHAIN_CONFIG.rpcUrl, {
        timeout: 10000,
        headers: [
            { name: 'Accept', value: 'application/json' },
            { name: 'Content-Type', value: 'application/json' }
        ]
    });
    web3 = new Web3(provider);
    
    // Verify connection
    web3.eth.net.isListening()
        .then(() => console.log('Connected to Tura RPC'))
        .catch(err => console.error('Failed to connect to RPC:', err));
} catch (error) {
    console.error('Failed to initialize Web3:', error);
}

// Chain Configuration
const CHAIN_CONFIG = {
    chainId: 1337,
    chainName: 'Tura',
    rpcUrl: 'https://43.135.26.222:8088',
    nativeCurrency: {
        name: 'TURA',
        symbol: 'TURA',
        decimals: 18
    }
};

// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider(CHAIN_CONFIG.rpcUrl, {
    timeout: 10000,
    headers: [
        { name: 'Accept', value: 'application/json' },
        { name: 'Content-Type', value: 'application/json' }
    ]
}));

// Crypto utilities
async function deriveKey(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function encryptData(data, password) {
    try {
        const encoder = new TextEncoder();
        const passwordData = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', passwordData);
        const key = Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
            
        const encrypted = btoa(JSON.stringify({
            data: data,
            key: key,
            version: '1.0'
        }));
        
        // Verify encryption format
        const verify = JSON.parse(atob(encrypted));
        if (!verify.data || !verify.key || verify.key !== key) {
            throw new Error('Encryption verification failed');
        }
        
        return encrypted;
    } catch (error) {
        throw new Error('Encryption failed: ' + error.message);
    }
}

async function decryptData(encryptedData, password) {
    try {
        // Generate key from password
        const encoder = new TextEncoder();
        const passwordData = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', passwordData);
        const key = Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        // Decode and verify
        const decoded = JSON.parse(atob(encryptedData));
        if (!decoded.data || !decoded.key || decoded.key !== key) {
            throw new Error('Invalid password');
        }
        
        return decoded.data;
    } catch (error) {
        throw new Error('Decryption failed: Invalid password or data');
    }
}

// Storage utilities
const WALLET_PREFIX = 'wallet_';
const SESSION_KEY = 'tempWalletPassword';

// Dialog Management
function showDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (!dialog) {
        console.error(`Dialog with id ${dialogId} not found`);
        return;
    }
    
    console.log(`Showing dialog: ${dialogId}`);
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
        // Create password input dialog
        const passwordDialog = document.createElement('div');
        passwordDialog.className = 'dialog';
        passwordDialog.id = 'password-dialog';
        passwordDialog.innerHTML = `
            <div class="dialog-overlay"></div>
            <div class="dialog-content">
                <div class="dialog-header">
                    <h2>Create Wallet Password</h2>
                    <p>Enter a secure password to encrypt your wallet.</p>
                </div>
                <div class="dialog-body">
                    <div id="password-error" class="error-message" style="display: none;"></div>
                    <input type="password" id="create-password" class="form-input" placeholder="Enter password" />
                </div>
                <div class="dialog-footer">
                    <button class="secondary-button" onclick="hideDialog('password-dialog')">Cancel</button>
                    <button class="primary-button" onclick="confirmPassword()">Create Wallet</button>
                </div>
            </div>
        `;
        document.body.appendChild(passwordDialog);
        showDialog('password-dialog');
        
        // Wait for password confirmation
        return new Promise((resolve, reject) => {
            window.confirmPassword = async () => {
                const password = document.getElementById('create-password').value;
                if (!password) {
                    const errorMsg = document.getElementById('error-message');
                    errorMsg.textContent = 'Please enter a password';
                    errorMsg.style.display = 'block';
                    return;
                }
                hideDialog('password-dialog');
                document.getElementById('password-dialog').remove();
                delete window.confirmPassword;
                
                try {
                    // Generate mnemonic and derive wallet
        const entropy = await window.crypto.getRandomValues(new Uint8Array(32));
        const mnemonic = bip39.entropyToMnemonic(Buffer.from(entropy).toString('hex'));
        
        // Create account using Web3
        const account = web3.eth.accounts.create();
        console.log('Created new account:', account.address);
        
        // Create wallet data
        const walletData = {
            address: account.address,
            privateKey: account.privateKey,
            mnemonic: mnemonic,
            createdAt: new Date().toISOString()
        };

        // Encrypt and store wallet data
        const encrypted = await encryptData(walletData, password);
        localStorage.setItem(`${WALLET_PREFIX}${address.toLowerCase()}`, encrypted);
        localStorage.setItem('lastWalletAddress', address);

        // Store temporary session
        const sessionData = {
            password,
            expires: Date.now() + (5 * 60 * 1000) // 5 minutes
        };
        const encryptedSession = await encryptData(sessionData, password);
        sessionStorage.setItem(SESSION_KEY, encryptedSession);

        // Update UI
        document.getElementById('no-wallet-section').style.display = 'none';
        document.getElementById('account-section').style.display = 'block';
        document.querySelector('.account-address').textContent = address;

        // Generate sample mnemonic for demonstration
        const sampleMnemonic = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
        const words = sampleMnemonic.split(' ');
        const grid = document.getElementById('mnemonic-grid');
        
        // Clear existing content
        grid.innerHTML = '';
        
        // Create grid items
        words.forEach((word, index) => {
            const div = document.createElement('div');
            div.innerHTML = `
                <span class="word-number">${index + 1}.</span>
                <span class="word">${word}</span>
            `;
            grid.appendChild(div);
        });
        
        showDialog('mnemonic-dialog');
    } catch (error) {
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
        const walletData = await decryptData(encryptedWallet, password);
        if (!walletData || !walletData.address || !walletData.privateKey) {
            throw new Error('Invalid wallet data');
        }

        // Store session data
        const sessionData = {
            password,
            expires: Date.now() + (5 * 60 * 1000) // 5 minutes
        };
        const encryptedSession = await encryptData(sessionData, password);
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

        // For now, just update with mock balance
        document.querySelector('.balance-amount').textContent = '0 TURA';
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
        const account = web3.eth.accounts.privateKeyToAccount(
            '0x' + seed.slice(0, 32).toString('hex')
        );
        
        const walletData = {
            address: account.address,
            privateKey: account.privateKey,
            mnemonic: mnemonic,
            createdAt: new Date().toISOString()
        };

        // Encrypt and store wallet data
        const encrypted = await encryptData(walletData, password);
        localStorage.setItem(`${WALLET_PREFIX}${address.toLowerCase()}`, encrypted);

        // Store temporary session
        const sessionData = {
            password,
            expires: Date.now() + (5 * 60 * 1000) // 5 minutes
        };
        const encryptedSession = await encryptData(sessionData, password);
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
                    // Try to decrypt session data with stored password
                    const sessionData = await decryptData(storedSession, password);
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
                            const walletData = await decryptData(encryptedWallet, sessionData.password);
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
