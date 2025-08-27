const { ipcRenderer } = require('electron');

// Application State
let currentUser = null;
let sessionStartTime = null;
let sessionDurationInterval = null;
let activePeer = null;
let activeMessages = [];
let discoveredPeers = [];

// DOM Elements
const currentUserAvatar = document.getElementById('currentUserAvatar');
const currentUserName = document.getElementById('currentUserName');
const currentUserDevice = document.getElementById('currentUserDevice');
const sessionStart = document.getElementById('sessionStart');
const sessionDuration = document.getElementById('sessionDuration');
const sessionIP = document.getElementById('sessionIP');
const peerCount = document.getElementById('peerCount');
const peersList = document.getElementById('peersList');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const chatTitle = document.getElementById('chatTitle');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');

// Initialize chat application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeChatApp();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing chat app:', error);
        showError('Failed to initialize chat application');
    }
});

async function initializeChatApp() {
    // Get user data from localStorage (set by login page)
    const userData = localStorage.getItem('currentUser');
    
    if (!userData) {
        console.error('No user data found, redirecting to login');
        await ipcRenderer.invoke('navigate-to-login');
        return;
    }
    
    currentUser = JSON.parse(userData);
    sessionStartTime = new Date(currentUser.joinedAt);
    
    // Update UI with user information
    updateUserInfo();
    
    // Start session duration timer
    startSessionTimer();
    
    // Start peer discovery
    await discoverPeers();
    
    // Set up auto-refresh for peers
    setInterval(discoverPeers, 30000); // Refresh every 30 seconds
    
    console.log('Chat app initialized successfully');
}

function updateUserInfo() {
    currentUserAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
    currentUserName.textContent = currentUser.name;
    currentUserDevice.textContent = currentUser.device;
    sessionStart.textContent = sessionStartTime.toLocaleTimeString();
    sessionIP.textContent = currentUser.ip;
}

function startSessionTimer() {
    sessionDurationInterval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now - sessionStartTime) / 1000);
        const hours = Math.floor(duration / 3600);
        const minutes = Math.floor((duration % 3600) / 60);
        const seconds = duration % 60;
        
        sessionDuration.textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

function setupEventListeners() {
    // Logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // Refresh button
    refreshBtn.addEventListener('click', discoverPeers);
    
    // Message input
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Send button
    sendBtn.addEventListener('click', sendMessage);
    
    // File upload
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    console.log('Event listeners set up successfully');
}

async function discoverPeers() {
    try {
        // Show loading state
        showPeersLoading();
        
        // Get peers from main process
        const peers = await ipcRenderer.invoke('discover-peers');
        
        // Filter out current user
        discoveredPeers = peers.filter(peer => peer.ip !== currentUser.ip);
        
        updatePeersUI();
        
    } catch (error) {
        console.error('Error discovering peers:', error);
        showPeersError();
    }
}

function showPeersLoading() {
    peersList.innerHTML = `
        <div class="loading-peers">
            <div class="spinner"></div>
            <p>Discovering peers...</p>
        </div>
    `;
    peerCount.textContent = '...';
}

function showPeersError() {
    peersList.innerHTML = `
        <div class="no-peers">
            <div class="no-peers-icon">⚠️</div>
            <div>Failed to discover peers</div>
            <div style="font-size: 12px; margin-top: 5px;">Click refresh to try again</div>
        </div>
    `;
    peerCount.textContent = 'Error';
}

function updatePeersUI() {
    peerCount.textContent = discoveredPeers.length;
    
    if (discoveredPeers.length === 0) {
        peersList.innerHTML = `
            <div class="no-peers">
                <div class="no-peers-icon">🔍</div>
                <div>No peers found</div>
                <div style="font-size: 12px; margin-top: 5px;">Click refresh to scan again</div>
            </div>
        `;
        return;
    }
    
    peersList.innerHTML = discoveredPeers.map(peer => `
        <div class="peer-item" data-peer-ip="${peer.ip}">
            <div class="peer-avatar">${peer.avatar}</div>
            <div class="peer-info">
                <div class="peer-name">${peer.name}</div>
                <div class="peer-status peer-${peer.status}">
                    ${peer.device} • ${peer.ip} • ${peer.status}
                </div>
            </div>
        </div>
    `).join('');
    
    // Add click listeners to peer items
    document.querySelectorAll('.peer-item').forEach(item => {
        item.addEventListener('click', () => {
            const peerIP = item.dataset.peerIp;
            selectPeer(peerIP);
        });
    });
}

function selectPeer(ip) {
    const peer = discoveredPeers.find(p => p.ip === ip);
    if (!peer) return;
    
    activePeer = peer;
    activeMessages = []; // Clear messages for new chat (no persistence)
    
    // Update UI
    document.querySelectorAll('.peer-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-peer-ip="${ip}"]`).classList.add('active');
    
    chatTitle.textContent = `Chat with ${peer.name} (${peer.device})`;
    
    // Enable messaging
    messageInput.disabled = false;
    messageInput.placeholder = `Message ${peer.name}...`;
    sendBtn.disabled = false;
    
    // Show welcome message
    displayMessages();
    
    // Focus on message input
    messageInput.focus();
}

function displayMessages() {
    if (activeMessages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="no-messages">
                <div class="no-messages-icon">👋</div>
                <div>Start a conversation with ${activePeer.name}</div>
                <div style="font-size: 14px; margin-top: 5px; opacity: 0.7;">
                    Connected to ${activePeer.device} (${activePeer.ip})
                </div>
            </div>
        `;
    } else {
        messagesContainer.innerHTML = activeMessages.map(msg => {
            if (msg.type === 'file') {
                return createFileMessageHTML(msg);
            } else {
                return createTextMessageHTML(msg);
            }
        }).join('');
        
        scrollToBottom();
    }
}

function createTextMessageHTML(msg) {
    return `
        <div class="message ${msg.sent ? 'sent' : 'received'}">
            <div class="message-content">
                <div class="message-text">${escapeHtml(msg.text)}</div>
                <div class="message-time">${msg.time}</div>
            </div>
        </div>
    `;
}

function createFileMessageHTML(msg) {
    const statusText = msg.progress === 100 ? 'sent ✓' : `${msg.status}... ${msg.progress}%`;
    
    return `
        <div class="file-message">
            <div class="file-icon">${msg.fileIcon}</div>
            <div class="file-info">
                <div class="file-name">${escapeHtml(msg.fileName)}</div>
                <div class="file-size">${msg.fileSize} MB • ${statusText}</div>
                <div class="file-progress">
                    <div class="file-progress-bar" style="width: ${msg.progress}%"></div>
                </div>
            </div>
        </div>
    `;
}

async function sendMessage() {
    if (!activePeer) return;
    
    const text = messageInput.value.trim();
    if (!text) return;
    
    const message = {
        text: text,
        sent: true,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        timestamp: new Date()
    };
    
    try {
        // Add message to UI immediately
        activeMessages.push(message);
        messageInput.value = '';
        displayMessages();
        
        // Send message through main process to Python backend
        const result = await ipcRenderer.invoke('send-message', {
            text: text,
            targetPeer: activePeer.ip,
            sender: currentUser
        });
        
        if (result.success) {
            console.log('Message sent successfully');
            
            // Simulate response after a delay
            setTimeout(() => {
                simulateResponse();
            }, 1000 + Math.random() * 2000);
        } else {
            throw new Error('Failed to send message');
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Failed to send message');
    }
}

function simulateResponse() {
    const responses = [
        "Got it!",
        "Thanks for that",
        "Understood",
        "Sounds good",
        "I'll check it out",
        "Let me know if you need anything else"
    ];
    
    const message = {
        text: responses[Math.floor(Math.random() * responses.length)],
        sent: false,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        timestamp: new Date()
    };
    
    activeMessages.push(message);
    displayMessages();
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && activePeer) {
        sendFile(file);
        event.target.value = ''; // Reset input
    }
}

async function sendFile(file) {
    const fileMessage = {
        type: 'file',
        fileName: file.name,
        fileSize: (file.size / (1024 * 1024)).toFixed(1),
        fileIcon: getFileIcon(file.name),
        progress: 0,
        status: 'sending',
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        timestamp: new Date()
    };
    
    try {
        activeMessages.push(fileMessage);
        displayMessages();
        
        // Send file through main process to Python backend
        const result = await ipcRenderer.invoke('send-file', {
            fileName: file.name,
            fileSize: file.size,
            targetPeer: activePeer.ip,
            sender: currentUser
        });
        
        if (result.success) {
            simulateFileTransfer(fileMessage);
        } else {
            throw new Error('Failed to initiate file transfer');
        }
        
    } catch (error) {
        console.error('Error sending file:', error);
        fileMessage.status = 'failed';
        displayMessages();
    }
}

function simulateFileTransfer(fileMessage) {
    const interval = setInterval(() => {
        fileMessage.progress += Math.random() * 15;
        
        if (fileMessage.progress >= 100) {
            fileMessage.progress = 100;
            fileMessage.status = 'sent';
            clearInterval(interval);
        }
        
        displayMessages();
    }, 200);
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'pdf': '📄', 'doc': '📝', 'docx': '📝', 'txt': '📝',
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
        'mp4': '🎥', 'avi': '🎥', 'mkv': '🎥',
        'mp3': '🎵', 'wav': '🎵', 'flac': '🎵',
        'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️'
    };
    return icons[ext] || '📄';
}

async function handleLogout() {
    const confirmed = confirm('Are you sure you want to leave the network?');
    if (!confirmed) return;
    
    try {
        // Calculate session data
        const sessionEnd = new Date();
        const sessionData = {
            user: currentUser.name,
            device: currentUser.device,
            ip: currentUser.ip,
            startTime: sessionStartTime,
            endTime: sessionEnd,
            duration: sessionEnd - sessionStartTime
        };
        
        // Send session data to main process for logging
        await ipcRenderer.invoke('log-session-data', sessionData);
        
        // Clear application state
        cleanup();
        
        // Navigate back to login
        await ipcRenderer.invoke('navigate-to-login');
        
    } catch (error) {
        console.error('Error during logout:', error);
        showError('Error occurred during logout');
    }
}

function cleanup() {
    // Clear intervals
    if (sessionDurationInterval) {
        clearInterval(sessionDurationInterval);
        sessionDurationInterval = null;
    }
    
    // Clear state
    currentUser = null;
    sessionStartTime = null;
    activePeer = null;
    activeMessages = [];
    discoveredPeers = [];
    
    // Clear localStorage
    localStorage.removeItem('currentUser');
}

// Utility functions
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    // Simple error display - you can enhance this with better UI
    console.error(message);
    alert(message);
}

// Handle window close
window.addEventListener('beforeunload', async () => {
    if (currentUser && sessionStartTime) {
        const sessionData = {
            user: currentUser.name,
            device: currentUser.device,
            ip: currentUser.ip,
            startTime: sessionStartTime,
            endTime: new Date(),
            duration: new Date() - sessionStartTime
        };
        
        // Try to send session data before closing
        try {
            await ipcRenderer.invoke('log-session-data', sessionData);
        } catch (error) {
            console.error('Error logging session data on close:', error);
        }
    }
});
