const { app, BrowserWindow, Menu, screen } = require('electron');
const path = require('node:path');

const isDev = process.argv.includes('--dev');

function createWindow() {
  Menu.setApplicationMenu(null);

  const display = screen.getPrimaryDisplay();
  const window = new BrowserWindow({
    width: display.bounds.width,
    height: display.bounds.height,
    backgroundColor: '#151b2b',
    fullscreen: !isDev,
    kiosk: !isDev,
    autoHideMenuBar: true,
    frame: isDev,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'Escape' || input.key === 'Q') {
      app.quit();
    }
    if (input.key === 'F11' && isDev) {
      window.setFullScreen(!window.isFullScreen());
    }
  });

  if (isDev) {
    window.loadURL('http://127.0.0.1:5173');
    return;
  }

  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
