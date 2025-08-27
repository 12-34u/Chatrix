const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');

let mainWindow;

// Enable live reload for development
if (process.env.NODE_ENV === 'development') {
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
        hardResetMethod: 'exit'
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        titleBarStyle: 'default',
        icon: path.join(__dirname, 'assets', 'icon.png'), // Add your app icon
        show: false // Don't show until ready
    });

    // Load the login page initially
    mainWindow.loadFile('src/login.html');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Open DevTools in development
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
        }
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC handlers for communication between renderer and main process
ipcMain.handle('get-user-ip', async () => {
    const networkInterfaces = os.networkInterfaces();
    
    for (const interfaceName in networkInterfaces) {
        const addresses = networkInterfaces[interfaceName];
        for (const address of addresses) {
            if (address.family === 'IPv4' && !address.internal) {
                return address.address;
            }
        }
    }
    
    return '127.0.0.1'; // Fallback
});

ipcMain.handle('get-platform-info', () => {
    return {
        platform: os.platform(),
        hostname: os.hostname(),
        type: os.type(),
        arch: os.arch()
    };
});

ipcMain.handle('navigate-to-chat', () => {
    if (mainWindow) {
        mainWindow.loadFile('src/chat.html');
        return true;
    }
    return false;
});

ipcMain.handle('navigate-to-login', () => {
    if (mainWindow) {
        mainWindow.loadFile('src/login.html');
        return true;
    }
    return false;
});

// Handle session data logging
ipcMain.handle('log-session-data', (event, sessionData) => {
    console.log('Session Data Logged:', sessionData);
    // Here you can save to file, send to Python backend, etc.
    // For example: fs.writeFileSync('session-log.json', JSON.stringify(sessionData));
    return true;
});

// Handle peer discovery requests
ipcMain.handle('discover-peers', async () => {
    // This is where you'll integrate with your Python backend
    // For now, returning mock data
    const mockPeers = [
        { name: 'Alice', device: 'Ubuntu Desktop', ip: '192.168.1.101', status: 'online', avatar: 'A' },
        { name: 'Bob', device: 'MacBook Pro', ip: '192.168.1.102', status: 'online', avatar: 'B' },
        { name: 'Carol', device: 'Windows 11', ip: '192.168.1.103', status: 'away', avatar: 'C' },
        { name: 'David', device: 'Linux Mint', ip: '192.168.1.104', status: 'online', avatar: 'D' }
    ];
    
    return mockPeers;
});

// Handle message sending
ipcMain.handle('send-message', async (event, messageData) => {
    console.log('Sending message:', messageData);
    // Integrate with your Python backend here
    return { success: true, messageId: Date.now() };
});

// Handle file transfer
ipcMain.handle('send-file', async (event, fileData) => {
    console.log('Sending file:', fileData.fileName, 'to', fileData.targetPeer);
    // Integrate with your Python file transfer logic here
    return { success: true, transferId: Date.now() };
});
