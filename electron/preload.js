const { contextBridge, ipcRenderer } = require('electron');
const Store = require('electron-store');

const store = new Store();

contextBridge.exposeInMainWorld('electron', {
    store: {
        get: (key) => store.get(key),
        set: (key, val) => store.set(key, val),
        delete: (key) => store.delete(key),
        // Add other needed methods
    },
    // Expose verified secure APIs only
    versions: {
        node: () => process.versions.node,
        chrome: () => process.versions.chrome,
        electron: () => process.versions.electron,
    },
});
