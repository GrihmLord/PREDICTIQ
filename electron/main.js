'use strict';

const path = require('path');
const {app, BrowserWindow, Menu, session} = require('electron');

const {
  registerAppScheme,
  serveAppScheme,
  applySessionHardening,
  applyWindowHardening,
} = require('./lib/security');
const {registerIpcHandlers} = require('./lib/ipc');
const {APP_ORIGIN, DEV_ORIGIN} = require('./lib/contract');

const isDev = process.env.NODE_ENV === 'development';
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Must happen before app.whenReady(): the scheme's privileges are read during
// protocol registration, not on first use.
registerAppScheme();

// A second copy of the app would open its own window against the same store.
// Hand the activation to the window that already exists instead.
const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) {
  app.quit();
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 940,
    minHeight: 620,
    backgroundColor: '#0F172A',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webviewTag: false,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  applyWindowHardening(mainWindow, isDev);

  // Painting only once the renderer is ready avoids the white flash that a
  // dark-themed app makes very obvious.
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[main] renderer gone:', details.reason);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.loadURL(DEV_ORIGIN);
  } else {
    mainWindow.loadURL(APP_ORIGIN + '/index.html');
  }
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

// Defence in depth behind the per-window webPreferences above: if any future
// window is created without them, it still cannot gain node access.
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', event => event.preventDefault());
});

if (hasInstanceLock) {
  app.enableSandbox();

  app.whenReady().then(() => {
    applySessionHardening(session.defaultSession, isDev);

    if (!isDev) {
      serveAppScheme(DIST_DIR);
    }

    // The default menu carries developer tools and navigation entries the
    // app has no use for.
    Menu.setApplicationMenu(null);

    registerIpcHandlers();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Never let a certificate error be silently accepted.
app.on(
  'certificate-error',
  (event, _webContents, _url, _error, _certificate, callback) => {
    event.preventDefault();
    callback(false);
  },
);
