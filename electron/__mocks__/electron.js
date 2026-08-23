'use strict';

/**
 * Minimal stand-in for the electron module so the main-process helpers can be
 * unit tested outside a running Electron app. Only the surface those helpers
 * touch is implemented; anything else is deliberately absent so a test that
 * strays past the intended boundary fails loudly.
 */

const noop = () => {};

module.exports = {
  app: {
    getVersion: () => '0.0.0-test',
    getPath: () => '/tmp',
    on: noop,
    quit: noop,
    whenReady: () => Promise.resolve(),
    requestSingleInstanceLock: () => true,
    enableSandbox: noop,
  },
  shell: {openExternal: () => Promise.resolve()},
  protocol: {registerSchemesAsPrivileged: noop, handle: noop},
  net: {fetch: () => Promise.resolve({body: null, headers: new Map()})},
  session: {defaultSession: {}},
  dialog: {
    showSaveDialog: () => Promise.resolve({canceled: true, filePath: null}),
  },
  ipcMain: {handle: noop},
  BrowserWindow: Object.assign(function BrowserWindow() {}, {
    fromWebContents: () => null,
    getAllWindows: () => [],
  }),
  Menu: {setApplicationMenu: noop},
  contextBridge: {exposeInMainWorld: noop},
  ipcRenderer: {invoke: () => Promise.resolve({ok: true, data: null})},
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: value => Buffer.from(value, 'utf8'),
    decryptString: buffer => buffer.toString('utf8'),
  },
};
