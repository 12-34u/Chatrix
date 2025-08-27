const { ipcRenderer } = require('electron');

// DOM Elements
const loginForm = document.getElementById('loginForm');
const displayNameInput = document.getElementById('displayName');
const deviceNameInput = document.getElementById('deviceName');
const loginBtn = document.getElementById('loginBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const userIPSpan = document.getElementById('userIP');
const platformInfoSpan = document.getElementById('platformInfo');

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await initializePage();
    setupEventListeners();
});

async function initializePage() {
    try {
        // Get user's IP address
        const userIP = await ipcRenderer.invoke('get-user-ip');
        userIPSpan.textContent = userIP;
        
        // Get platform information
        const platformInfo = await ipcRenderer.invoke('get-platform-info');
        platformInfoSpan.textContent = `${platformInfo.type} ${platformInfo.arch}`;
        
        // Set default device name based on platform
        const defaultDeviceName = getDefaultDeviceName(platformInfo);
        deviceNameInput.value = defaultDeviceName;
        deviceNameInput.placeholder = defaultDeviceName;
        
        console.log('Page initialized successfully');
    } catch (error) {
        console.error('Error initializing page:', error);
        userIPSpan.textContent = 'Error detecting IP';
        platformInfoSpan.textContent = 'Unknown';
    }
}

function setupEventListeners() {
    // Form submission
    loginForm.addEventListener('submit', handleLogin);
    
    // Input validation
    displayNameInput.addEventListener('input', validateForm);
    displayNameInput.addEventListener('blur', validateDisplayName);
    
    // Enter key handling
    displayNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && validateForm()) {
            handleLogin(e);
        }
    });
    
    deviceNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && validateForm()) {
            handleLogin(e);
        }
    });
}

async function handleLogin(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    const displayName = displayNameInput.value.trim();
    const deviceName = deviceNameInput.value.trim() || deviceNameInput.placeholder;
    
    try {
        // Show loading state
        setLoadingState(true);
        
        // Get network information
        const userIP = await ipcRenderer.invoke('get-user-ip');
        const platformInfo = await ipcRenderer.invoke('get-platform-info');
        
        // Create user session data
        const userData = {
            name: displayName,
            device: deviceName,
            ip: userIP,
            platform: platformInfo,
            joinedAt: new Date().toISOString()
        };
        
        // Store user data in localStorage for the chat page
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        // Simulate network connection delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Navigate to chat page
        const success = await ipcRenderer.invoke('navigate-to-chat');
        
        if (!success) {
            throw new Error('Failed to navigate to chat page');
        }
        
        console.log('Login successful:', userData);
        
    } catch (error) {
        console.error('Login error:', error);
        showError('Failed to join network. Please try again.');
        setLoadingState(false);
    }
}

function validateForm() {
    const displayName = displayNameInput.value.trim();
    
    // Clear previous errors
    clearErrors();
    
    if (!displayName) {
        showInputError(displayNameInput, 'Display name is required');
        return false;
    }
    
    if (displayName.length < 2) {
        showInputError(displayNameInput, 'Display name must be at least 2 characters');
        return false;
    }
    
    if (displayName.length > 20) {
        showInputError(displayNameInput, 'Display name must be less than 20 characters');
        return false;
    }
    
    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(displayName)) {
        showInputError(displayNameInput, 'Display name contains invalid characters');
        return false;
    }
    
    return true;
}

function validateDisplayName() {
    validateForm(); // This will show errors if any
}

function showInputError(input, message) {
    input.classList.add('error');
    
    // Remove existing error message
    const existingError = input.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message show';
    errorDiv.textContent = message;
    input.parentNode.appendChild(errorDiv);
    
    // Remove error state after a delay
    setTimeout(() => {
        input.classList.remove('error');
    }, 3000);
}

function clearErrors() {
    // Remove error classes
    document.querySelectorAll('.form-input.error').forEach(input => {
        input.classList.remove('error');
    });
    
    // Remove error messages
    document.querySelectorAll('.error-message').forEach(error => {
        error.remove();
    });
}

function showError(message) {
    // You can implement a toast notification or modal here
    alert(message); // Simple fallback for now
}

function setLoadingState(isLoading) {
    if (isLoading) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Connecting...';
        loadingIndicator.style.display = 'block';
        displayNameInput.disabled = true;
        deviceNameInput.disabled = true;
    } else {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Join Network';
        loadingIndicator.style.display = 'none';
        displayNameInput.disabled = false;
        deviceNameInput.disabled = false;
    }
}

function getDefaultDeviceName(platformInfo) {
    const platform = platformInfo.platform.toLowerCase();
    const hostname = platformInfo.hostname || '';
    
    if (hostname && hostname !== 'localhost') {
        return hostname;
    }
    
    switch (platform) {
        case 'linux':
            return 'Linux PC';
        case 'darwin':
            return 'MacBook';
        case 'win32':
            return 'Windows PC';
        default:
            return 'My Device';
    }
}

// Handle window focus for better UX
window.addEventListener('focus', () => {
    if (!displayNameInput.value) {
        displayNameInput.focus();
    }
});

// Auto-focus on display name input when page loads
window.addEventListener('load', () => {
    setTimeout(() => {
        displayNameInput.focus();
    }, 500);
});
