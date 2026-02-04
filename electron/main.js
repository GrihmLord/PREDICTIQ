const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false, // Security: Disable node integration in renderer
            contextIsolation: true, // Security: Enable context isolation
            preload: path.join(__dirname, 'preload.js'), // Load secure bridge
            sandbox: true,
        },
        backgroundColor: '#0F172A', // Match app background
    });

    // Load the web app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:8080');
        // mainWindow.webContents.openDevTools(); // Disabled per user request
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        // mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
