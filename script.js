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
    const key = await deriveKey(password);
    return btoa(JSON.stringify({
        data: data,
        key: key
    }));
}

async function decryptData(encryptedData, password) {
    try {
        const key = await deriveKey(password);
        const decoded = JSON.parse(atob(encryptedData));
        if (decoded.key !== key) {
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
    dialog.setAttribute('open', '');
    dialog.style.display = 'flex';
    setTimeout(() => dialog.style.opacity = '1', 10);
    
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
}

function hideDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    dialog.style.opacity = '0';
    setTimeout(() => {
        dialog.style.display = 'none';
        dialog.removeAttribute('open');
        // Restore body scroll
        document.body.style.overflow = '';
    }, 200);
}

// Button Event Handlers
async function handleCreateWallet() {
    try {
        const password = prompt('Enter a secure password for your new wallet:');
        if (!password) return;

        // Generate random private key and address
        const entropy = await window.crypto.getRandomValues(new Uint8Array(32));
        const entropyHex = Array.from(entropy)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        // Create wallet data
        const address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'; // Example address
        const privateKey = entropyHex;
        const walletData = {
            address,
            privateKey,
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

function handleRefreshBalance() {
    // Visual feedback only
    const button = event.target;
    button.disabled = true;
    button.innerHTML = '<span class="icon icon-refresh"></span>Refreshing...';
    setTimeout(() => {
        button.disabled = false;
        button.innerHTML = '<span class="icon icon-refresh"></span>Refresh Balance';
    }, 1000);
}

// Dialog Event Handlers
function closeMnemonicDialog() {
    hideDialog('mnemonic-dialog');
}

function closeRestoreDialog() {
    hideDialog('restore-dialog');
    document.getElementById('mnemonic-input').value = '';
}

function confirmMnemonicBackup() {
    hideDialog('mnemonic-dialog');
    // Show account section for UI demonstration
    handleLogin();
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

        // Example restored wallet data (in production, this would be derived from mnemonic)
        const address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
        const privateKey = '0x1234567890abcdef'; // Example key
        
        const walletData = {
            address,
            privateKey,
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
        // Check for existing wallet and session
        const storedAddress = localStorage.getItem('lastWalletAddress');
        if (storedAddress) {
            const storedSession = sessionStorage.getItem(SESSION_KEY);
            if (storedSession) {
                try {
                    // Try to decrypt session data
                    const sessionData = await decryptData(storedSession, storedSession);
                    if (sessionData.expires && sessionData.expires > Date.now()) {
                        // Valid session exists, get wallet data
                        const encryptedWallet = localStorage.getItem(`${WALLET_PREFIX}${storedAddress.toLowerCase()}`);
                        if (encryptedWallet) {
                            const walletData = await decryptData(encryptedWallet, sessionData.password);
                            if (walletData && walletData.address) {
                                // Update UI with wallet data
                                document.getElementById('no-wallet-section').style.display = 'none';
                                document.getElementById('account-section').style.display = 'block';
                                document.querySelector('.account-address').textContent = walletData.address;
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
        }
    } catch (error) {
        console.error('Failed to initialize wallet:', error);
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
