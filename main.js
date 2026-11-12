const { app, BrowserWindow, clipboard, globalShortcut, ipcMain, safeStorage, session } = require('electron');
const { readFileSync, writeFileSync, renameSync } = require('node:fs');
const { join } = require('node:path');
const { providers, transcriptionUrl, transcribe } = require('./speech');

const defaults = {
  provider: 'openai', endpoint: '', model: providers.openai.model,
  vocabulary: '', shortcut: (process.platform === 'darwin' ? 'Command' : 'Control') + '+Shift+Space', theme: 'dark'
};
let settings = { ...defaults };
let secret = '';
let activeShortcut = '';
let window;
let configFile;

function register(shortcut) {
  return globalShortcut.register(shortcut, () => window?.webContents.send('dictation:toggle'));
}

function encryptedStorageAvailable() {
  return safeStorage.isEncryptionAvailable() &&
    (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text');
}

function publicSettings() {
  return { ...settings, hasKey: Boolean(secret), activeShortcut };
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    window?.restore();
    window?.focus();
  });

  app.whenReady().then(() => {
    configFile = join(app.getPath('userData'), 'settings.json');
    try {
      const saved = JSON.parse(readFileSync(configFile, 'utf8'));
      settings = { ...defaults, ...saved.settings };
      secret = saved.secret || '';
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('Could not load settings.');
    }

    session.defaultSession.setPermissionRequestHandler((contents, permission, respond, details) => {
      respond(contents === window?.webContents && permission === 'media' &&
        details.mediaTypes?.length === 1 && details.mediaTypes[0] === 'audio');
    });
    session.defaultSession.setPermissionCheckHandler((contents, permission, _origin, details) =>
      contents === window?.webContents && permission === 'media' && details.mediaType === 'audio');

    window = new BrowserWindow({
      width: 900, height: 790, minWidth: 560, minHeight: 560,
      webPreferences: { preload: join(__dirname, 'preload.js'), backgroundThrottling: false }
    });
    window.webContents.on('will-navigate', event => event.preventDefault());
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.loadFile('index.html');
    try {
      if (register(settings.shortcut)) activeShortcut = settings.shortcut;
    } catch {
      console.error('Could not register the saved shortcut.');
    }
  });
}

ipcMain.handle('settings:get', publicSettings);
ipcMain.handle('settings:save', (_event, input) => {
  const next = Object.fromEntries(Object.keys(defaults).map(name => [name, String(input[name] ?? '').trim()]));
  if (!['openai', 'groq', 'custom'].includes(next.provider) || !['dark', 'light'].includes(next.theme)) {
    throw new Error('Select a valid provider and appearance.');
  }
  if (!next.model || !next.shortcut) throw new Error('Enter a model and a shortcut.');
  const endpointChanged = transcriptionUrl(next).href !== transcriptionUrl(settings).href;

  let nextSecret = input.clearKey || endpointChanged ? '' : secret;
  if (input.key && !input.clearKey) {
    if (!encryptedStorageAvailable()) throw new Error('Unlock or configure your system keyring to save an API key.');
    nextSecret = safeStorage.encryptString(input.key.trim()).toString('base64');
  }

  const shortcutChanged = next.shortcut !== activeShortcut;
  if (shortcutChanged) {
    let registered = false;
    try { registered = register(next.shortcut); } catch {}
    if (!registered) throw new Error('That shortcut is unavailable. Try another key or combination.');
  }
  try {
    writeFileSync(configFile + '.tmp', JSON.stringify({ settings: next, secret: nextSecret }), { mode: 0o600 });
    renameSync(configFile + '.tmp', configFile);
  } catch (error) {
    if (shortcutChanged) globalShortcut.unregister(next.shortcut);
    throw error;
  }

  if (shortcutChanged && activeShortcut) globalShortcut.unregister(activeShortcut);
  activeShortcut = next.shortcut;
  settings = next;
  secret = nextSecret;
  return publicSettings();
});

ipcMain.handle('dictation:transcribe', async (_event, audio) => {
  if (!(audio instanceof Uint8Array) || !audio.length || audio.length > 25_000_000) {
    throw new Error('Record a clip under 25 MB.');
  }
  if (secret && !encryptedStorageAvailable()) throw new Error('Unlock your system keyring.');
  const key = secret ? safeStorage.decryptString(Buffer.from(secret, 'base64')) : '';
  if (!key && settings.provider !== 'custom') throw new Error('Save your provider API key first.');
  const text = await transcribe(settings, key, audio);
  clipboard.writeText(text);
  return text;
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
