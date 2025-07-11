// Background Service Worker Simplificado
console.log('Background service worker cargando...');

// Importar scripts necesarios
try {
  importScripts('crypto-utils.js');
  importScripts('sanitizer.js');
  importScripts('rate-limiter.js');
} catch (e) {
  console.error('Error importando scripts:', e);
}

// Configuración por defecto
let config = {
  amazonDomain: 'es',
  youtubeDomain: 'com',
  openAIApiKey: '',
  openAIModel: 'gpt-4o-mini',
  openAIMaxTokens: 1000
};

// Crear menú contextual al instalar/actualizar
chrome.runtime.onInstalled.addListener(() => {
  console.log('onInstalled ejecutado');
  createContextMenus();
});

// Crear menú contextual al iniciar
chrome.runtime.onStartup.addListener(() => {
  console.log('onStartup ejecutado');
  createContextMenus();
});

// Función para crear menús contextuales
function createContextMenus() {
  console.log('Creando menús contextuales...');
  
  chrome.contextMenus.removeAll(() => {
    console.log('Menús anteriores eliminados');
    
    // Crear menú de captura - SIMPLIFICADO
    chrome.contextMenus.create({
      id: 'captureScreen',
      title: 'Capturar área y analizar con OpenAI',
      contexts: ['all']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creando menú:', chrome.runtime.lastError);
      } else {
        console.log('Menú de captura creado exitosamente');
      }
    });
    
    // Crear menús de búsqueda (para que siga funcionando el resto)
    chrome.contextMenus.create({
      id: 'searchEngineConverter',
      title: 'Buscar con otros motores',
      contexts: ['selection']
    });
    
    const engines = ['Google', 'DuckDuckGo', 'Bing', 'OpenAI', 'Amazon', 'YouTube', 'Brave', 'Wikipedia'];
    engines.forEach(engine => {
      chrome.contextMenus.create({
        id: engine.toLowerCase() + 'Search',
        parentId: 'searchEngineConverter',
        title: engine,
        contexts: ['selection']
      });
    });
  });
}

// Manejar clics en menús contextuales
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Menú clickeado:', info.menuItemId);
  
  if (info.menuItemId === 'captureScreen') {
    console.log('Captura solicitada en tab:', tab.id);
    
    // Inyectar el script de captura
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['screen-selector.js']
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error inyectando script:', chrome.runtime.lastError);
      } else {
        console.log('Script de captura inyectado');
      }
    });
  } else if (info.selectionText && info.menuItemId.endsWith('Search')) {
    // Manejar búsquedas
    const query = info.selectionText.trim();
    let url = '';
    
    switch (info.menuItemId) {
      case 'googleSearch':
        url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        break;
      case 'duckduckgoSearch':
        url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
        break;
      case 'bingSearch':
        url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
        break;
      case 'openaiSearch':
        url = `https://chat.openai.com/?q=${encodeURIComponent(query)}`;
        break;
      case 'amazonSearch':
        url = `https://www.amazon.${config.amazonDomain}/s?k=${encodeURIComponent(query)}`;
        break;
      case 'youtubeSearch':
        url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        break;
      case 'braveSearch':
        url = `https://search.brave.com/search?q=${encodeURIComponent(query)}`;
        break;
      case 'wikipediaSearch':
        url = `https://es.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`;
        break;
    }
    
    if (url) {
      chrome.tabs.create({ url: url });
    }
  }
});

// Manejar mensajes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Mensaje recibido:', request.action);
  
  switch (request.action) {
    case 'captureVisibleTab':
      handleCapture(request, sendResponse);
      break;
      
    case 'analyzeScreenshot':
      handleAnalyze(request, sendResponse);
      break;
      
    case 'getConfig':
      chrome.storage.local.get('searchEngineConverterConfig', (data) => {
        try {
          const storedConfig = JSON.parse(data.searchEngineConverterConfig || '{}');
          sendResponse({ success: true, config: storedConfig });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      });
      break;
      
    default:
      sendResponse({ success: false, error: 'Acción no reconocida' });
  }
  
  return true; // Mantener el canal abierto
});

// Función para capturar pantalla
function handleCapture(request, sendResponse) {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error('Error capturando:', chrome.runtime.lastError);
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
      return;
    }
    
    // Por ahora, enviar la imagen completa sin recortar
    // El recorte se puede hacer en el frontend si es necesario
    sendResponse({ success: true, screenshot: dataUrl });
  });
}

// Función para recortar imagen usando OffscreenCanvas directamente
async function cropImage(dataUrl, area) {
  try {
    // Convertir dataURL a blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    // Crear bitmap desde el blob
    const imageBitmap = await createImageBitmap(blob);
    
    // Crear canvas del tamaño del área recortada
    const canvas = new OffscreenCanvas(area.width, area.height);
    const ctx = canvas.getContext('2d');
    
    // Dibujar la porción recortada
    ctx.drawImage(
      imageBitmap,
      area.x, area.y, area.width, area.height,
      0, 0, area.width, area.height
    );
    
    // Convertir de vuelta a blob y luego a dataURL
    const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(croppedBlob);
    });
  } catch (error) {
    console.error('Error en cropImage:', error);
    throw error;
  }
}

// Función para analizar con OpenAI
async function handleAnalyze(request, sendResponse) {
  // Cargar configuración
  chrome.storage.local.get('searchEngineConverterConfig', async (data) => {
    if (data.searchEngineConverterConfig) {
      try {
        const parsedConfig = JSON.parse(data.searchEngineConverterConfig);
        // Asegurarse de que tenemos la API key correcta
        if (parsedConfig.openAIApiKey) {
          // Verificar si la API key está encriptada
          if (CryptoUtils && CryptoUtils.isEncrypted && CryptoUtils.isEncrypted(parsedConfig.openAIApiKey)) {
            // Descifrar la API key
            try {
              const decryptedKey = await CryptoUtils.decrypt(parsedConfig.openAIApiKey);
              if (decryptedKey) {
                config.openAIApiKey = decryptedKey;
                console.log('API key descifrada correctamente');
              } else {
                sendResponse({ success: false, error: 'No se pudo descifrar la API key' });
                return;
              }
            } catch (error) {
              console.error('Error al descifrar API key:', error);
              sendResponse({ success: false, error: 'Error al descifrar API key: ' + error.message });
              return;
            }
          } else if (typeof parsedConfig.openAIApiKey === 'string') {
            config.openAIApiKey = parsedConfig.openAIApiKey;
          } else {
            console.error('API key en formato incorrecto:', parsedConfig.openAIApiKey);
          }
          config.openAIModel = parsedConfig.openAIModel || 'gpt-4o-mini';
          config.openAIMaxTokens = parsedConfig.openAIMaxTokens || 1000;
        }
      } catch (e) {
        console.error('Error parseando config:', e);
      }
    }
    
    console.log('Config cargada, tiene API key:', !!config.openAIApiKey);
    console.log('Tipo de API key:', typeof config.openAIApiKey);
    
    if (!config.openAIApiKey || typeof config.openAIApiKey !== 'string') {
      sendResponse({ success: false, error: 'API key de OpenAI no configurada correctamente' });
      return;
    }
    
    try {
      const base64 = request.screenshot.split(',')[1];
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openAIApiKey}`
        },
        body: JSON.stringify({
          model: config.openAIModel || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Responde SIEMPRE en texto plano sin formato. NO uses markdown, NO uses asteriscos para negritas, NO uses guiones bajos para cursiva, NO uses numeración con ##. Solo texto simple y directo.'
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: request.prompt || 'Describe esta imagen' },
                { type: 'image_url', image_url: { url: request.screenshot } }
              ]
            }
          ],
          max_tokens: 1000
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        sendResponse({ success: false, error: data.error.message });
      } else if (data.choices && data.choices[0]) {
        sendResponse({ success: true, analysis: data.choices[0].message.content });
      } else {
        sendResponse({ success: false, error: 'Respuesta inesperada de OpenAI' });
      }
    } catch (e) {
      console.error('Error en análisis:', e);
      sendResponse({ success: false, error: e.message });
    }
  });
}

// Crear menús al cargar
createContextMenus();

console.log('Background service worker listo');