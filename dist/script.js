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
function handleCreateWallet() {
    // Generate sample mnemonic for UI demonstration
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

function handleLoginConfirm() {
    const password = document.getElementById('wallet-password').value.trim();
    if (!password) {
        const errorMsg = document.getElementById('error-message');
        errorMsg.textContent = 'Please enter your password';
        errorMsg.style.display = 'block';
        return;
    }
    hideDialog('login-dialog');
    // Show account section for UI demonstration
    document.getElementById('no-wallet-section').style.display = 'none';
    document.getElementById('account-section').style.display = 'block';
    document.querySelector('.account-address').textContent = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
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

function handleRestoreConfirm() {
    const mnemonic = document.getElementById('mnemonic-input').value.trim();
    if (!mnemonic) {
        const errorMsg = document.getElementById('error-message');
        errorMsg.textContent = 'Please enter your mnemonic phrase';
        errorMsg.style.display = 'block';
        return;
    }
    hideDialog('restore-dialog');
    // Show account section for UI demonstration
    handleLogin();
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

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    // Close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-content').forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        }
    });
    
    // Close dialogs when clicking overlay
    document.querySelectorAll('.dialog-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            const dialog = overlay.closest('.dialog');
            if (dialog) {
                hideDialog(dialog.id);
            }
        });
    });
});
