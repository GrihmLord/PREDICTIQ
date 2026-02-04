import { Platform } from 'react-native';

// Standardized interface for storage
export interface SecureStorageInterface {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
}

// Android implementation
const AndroidStorage: SecureStorageInterface = {
    setItem: async (key: string, value: string) => {
        const EncryptedStorage = require('react-native-encrypted-storage').default;
        await EncryptedStorage.setItem(key, value);
    },
    getItem: async (key: string) => {
        const EncryptedStorage = require('react-native-encrypted-storage').default;
        return await EncryptedStorage.getItem(key);
    },
    removeItem: async (key: string) => {
        const EncryptedStorage = require('react-native-encrypted-storage').default;
        await EncryptedStorage.removeItem(key);
    }
};

// Electron implementation (using electron-store via IPC or direct import if context isolation is off)
// Note: In a real production app with Context Isolation, this would require IPC. 
// For this architecture where Node Integration is enabled (as per main.js), we can use remote/ipc or direct import.
// However, electron-store is a node module. React Native Web might not polyfill it correctly without config.
// Better approach for RN-Web: use window.require if available.

const getElectronStore = () => {
    // @ts-ignore
    if (window.electron && window.electron.store) {
        // @ts-ignore
        return window.electron.store;
    }
    return null;
};

const ElectronStorage: SecureStorageInterface = {
    setItem: async (key: string, value: string) => {
        const store = getElectronStore();
        if (store) store.set(key, value);
    },
    getItem: async (key: string) => {
        const store = getElectronStore();
        return store ? store.get(key) : null;
    },
    removeItem: async (key: string) => {
        const store = getElectronStore();
        if (store) store.delete(key);
    }
};

// Web/Fallback
const WebStorage: SecureStorageInterface = {
    setItem: async (key: string, value: string) => {
        console.warn('Using insecure storage for web fallback');
        localStorage.setItem(key, value);
    },
    getItem: async (key: string) => {
        return localStorage.getItem(key);
    },
    removeItem: async (key: string) => {
        localStorage.removeItem(key);
    }
};

// Factory
const SecureStorageService: SecureStorageInterface = Platform.select({
    android: AndroidStorage,
    ios: AndroidStorage, // Use same for iOS for now ( EncryptedStorage supports both)
    web: (window as any).require ? ElectronStorage : WebStorage,
    default: WebStorage
}) as SecureStorageInterface;

export default SecureStorageService;
