const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');

// Режим разработки, если передан аргумент --dev или установлена переменная среды
const isDev = process.argv.includes('--dev') || process.env.ELECTRON_DEV === 'true';

/**
 * Проверяет, доступен ли ffmpeg в системе.
 * Возвращает путь к ffmpeg или null.
 */
function findFfmpeg() {
  return new Promise((resolve) => {
    const ffmpegName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    // Пробуем просто вызвать ffmpeg -version
    execFile(ffmpegName, ['-version'], (error) => {
      if (error) {
        resolve(null);
      } else {
        resolve(ffmpegName);
      }
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'BookTok Carousel',
    icon: isDev 
      ? path.join(__dirname, '..', 'public', 'icon.ico') 
      : path.join(__dirname, '..', 'dist', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    backgroundColor: '#09090b', // zinc-950
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: process.platform === 'win32' ? {
      color: '#09090b',
      symbolColor: '#a1a1aa',
      height: 32
    } : false,
  });

  if (isDev) {
    // В режиме разработки подключаемся к Vite dev-серверу
    const devUrl = process.env.VITE_DEV_URL || 'http://127.0.0.1:5173';
    win.loadURL(devUrl);
  } else {
    // В продакшн-режиме загружаем собранные файлы
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// IPC обработчик для сохранения изображений с выбором файла
ipcMain.handle('save-images-dialog', async (event, { images }) => {
  const saveResult = await dialog.showSaveDialog({
    title: 'Сохранить слайды как JPG',
    defaultPath: path.join(app.getPath('downloads'), 'slide.jpg'),
    filters: [
      { name: 'JPEG Изображения (*.jpg)', extensions: ['jpg', 'jpeg'] }
    ]
  });

  if (saveResult.canceled || !saveResult.filePath) {
    return { success: false, error: 'Cancelled' };
  }

  const filePath = saveResult.filePath;
  const dirPath = path.dirname(filePath);
  const ext = path.extname(filePath) || '.jpg';
  const baseName = path.basename(filePath, ext);

  try {
    for (let i = 0; i < images.length; i++) {
      const dataUrl = images[i];
      const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, "");
      
      let currentFilePath;
      if (i === 0) {
        currentFilePath = filePath;
      } else {
        const suffix = `_${String(i + 1).padStart(2, '0')}`; // _02, _03
        currentFilePath = path.join(dirPath, `${baseName}${suffix}${ext}`);
      }
      fs.writeFileSync(currentFilePath, base64Data, 'base64');
    }
    return { success: true, dirPath };
  } catch (error) {
    console.error('Error saving images:', error);
    return { success: false, error: error.message };
  }
});

// IPC обработчик для транскодирования WebM в MP4 с помощью системы ffmpeg
ipcMain.handle('save-video', async (event, { webmBase64 }) => {
  // Сначала проверяем наличие ffmpeg в системе
  const ffmpegPath = await findFfmpeg();

  if (!ffmpegPath) {
    return { 
      success: false, 
      error: 'FFmpeg не установлен в системе. Для экспорта MP4 видео необходимо:\n1. Скачайте ffmpeg с сайта ffmpeg.org\n2. Добавьте папку с ffmpeg.exe в переменную PATH\n3. Перезапустите приложение'
    };
  }

  const saveResult = await dialog.showSaveDialog({
    title: 'Сохранить MP4 видео',
    defaultPath: path.join(app.getPath('downloads'), 'TikTok_book_carousel.mp4'),
    filters: [
      { name: 'MP4 Видео', extensions: ['mp4'] }
    ]
  });

  if (saveResult.canceled || !saveResult.filePath) {
    return { success: false, error: 'Cancelled' };
  }

  const outputPath = saveResult.filePath;

  try {
    const webmBuffer = Buffer.from(webmBase64, 'base64');

    // FFmpeg доступен — транскодируем WebM → MP4
    // Используем короткое имя во временной папке (только ASCII), чтобы избежать проблем с кодировкой
    const tempWebmPath = path.join(os.tmpdir(), `btk_${Date.now()}.webm`);
    // Также используем временный путь для выходного файла, если путь содержит не-ASCII символы
    const hasNonAscii = /[^\x00-\x7F]/.test(outputPath);
    const tempMp4Path = hasNonAscii 
      ? path.join(os.tmpdir(), `btk_out_${Date.now()}.mp4`)
      : null;
    const ffmpegOutputPath = tempMp4Path || outputPath;

    fs.writeFileSync(tempWebmPath, webmBuffer);

    // Используем execFile вместо exec — он НЕ запускает shell, 
    // поэтому нет проблем с кодировкой путей в cmd.exe
    return new Promise((resolve) => {
      const args = [
        '-y',
        '-i', tempWebmPath,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-crf', '20',
        ffmpegOutputPath
      ];

      execFile(ffmpegPath, args, (error, stdout, stderr) => {
        // Если использовали временный выходной путь, копируем результат
        if (!error && tempMp4Path) {
          try {
            fs.copyFileSync(tempMp4Path, outputPath);
          } catch (copyErr) {
            console.error('Failed to copy output file:', copyErr);
            // Очищаем временные файлы
            try { fs.unlinkSync(tempWebmPath); } catch (e) {}
            try { if (tempMp4Path) fs.unlinkSync(tempMp4Path); } catch (e) {}
            resolve({ success: false, error: `Не удалось сохранить файл по указанному пути: ${copyErr.message}` });
            return;
          }
        }

        // Очищаем временные файлы
        try {
          if (fs.existsSync(tempWebmPath)) fs.unlinkSync(tempWebmPath);
        } catch (cleanupErr) {
          console.error('Failed to clean up temp webm file:', cleanupErr);
        }
        try {
          if (tempMp4Path && fs.existsSync(tempMp4Path)) fs.unlinkSync(tempMp4Path);
        } catch (cleanupErr) {
          console.error('Failed to clean up temp mp4 file:', cleanupErr);
        }

        if (error) {
          console.error('FFmpeg error:', error, stderr);
          resolve({ success: false, error: `FFmpeg ошибка: ${error.message}` });
        } else {
          resolve({ success: true, filePath: outputPath });
        }
      });
    });
  } catch (err) {
    console.error('Transcoding failed:', err);
    return { success: false, error: err.message };
  }
});

// IPC обработчики для сохранения/загрузки настроек и шаблонов в файлы на диске
ipcMain.handle('save-user-templates', async (event, { templates }) => {
  try {
    const filePath = path.join(app.getPath('userData'), 'user_templates.json');
    fs.writeFileSync(filePath, JSON.stringify(templates, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error saving templates to file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-user-templates', async () => {
  try {
    const filePath = path.join(app.getPath('userData'), 'user_templates.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return { success: true, templates: JSON.parse(data) };
    }
    return { success: true, templates: [] };
  } catch (error) {
    console.error('Error loading templates from file:', error);
    return { success: false, error: error.message, templates: [] };
  }
});

ipcMain.handle('save-carousel-config', async (event, { config }) => {
  try {
    const filePath = path.join(app.getPath('userData'), 'carousel_config.json');
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    console.error('Error saving config to file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-carousel-config', async () => {
  try {
    const filePath = path.join(app.getPath('userData'), 'carousel_config.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return { success: true, config: JSON.parse(data) };
    }
    return { success: true, config: null };
  } catch (error) {
    console.error('Error loading config from file:', error);
    return { success: false, error: error.message, config: null };
  }
});


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
