/**
 * @module BackgroundController
 * @description Módulo principal de procesamiento en segundo plano. Implementa la lógica central
 * de la extensión, orquestando comunicaciones entre componentes y proporcionando
 * servicios fundamentales como interoperabilidad entre motores de búsqueda,
 * procesamiento de imágenes y gestión de configuración.
 */

/**
 * @var {Object} config
 * @description Modelo de configuración global con parámetros predeterminados
 */
let config = {
  amazonDomain: 'es',
  youtubeDomain: 'com',
  buttonOrder: ['googleButton', 'duckduckgoButton', 'bingButton', 'openaiButton', 'amazonButton', 'youtubeButton', 'braveButton', 'wikipediaButton'],
  defaultSearchEngine: 'googleButton', // Identificador del motor predeterminado para operaciones contextuales
  openAIApiKey: '', // Credenciales de autenticación para API de OpenAI
  openAIModel: 'gpt-4o-mini', // Identificador del modelo de inferencia
  openAIMaxTokens: 1000 // Límite de generación para optimización de recursos
};

/**
 * @function loadConfig
 * @description Recupera la configuración desde almacenamiento persistente con estrategia de fallback.
 * Implementa patrón de degradación graceful para garantizar operación en contextos limitados.
 * @returns {Promise<Object>} Promesa que resuelve al modelo de configuración consolidado
 */
function loadConfig() {
  return new Promise((resolve) => {
    // Validar disponibilidad de APIs de almacenamiento en tiempo de ejecución
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
      browser.storage.local.get('searchEngineConverterConfig').then(data => {
        if (data.searchEngineConverterConfig) {
          config = JSON.parse(data.searchEngineConverterConfig);
        }
        resolve(config);
      }).catch(error => {
        console.error('Error al cargar configuración:', error);
        resolve(config);
      });
    } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('searchEngineConverterConfig', function(data) {
        if (data.searchEngineConverterConfig) {
          config = JSON.parse(data.searchEngineConverterConfig);
        }
        resolve(config);
      });
    } else {
      // Implementación alternativa para entornos restringidos
      console.log('APIs de almacenamiento no disponibles, usando localStorage');
      const savedConfig = localStorage.getItem('searchEngineConverterConfig');
      if (savedConfig) {
        config = JSON.parse(savedConfig);
      }
      resolve(config);
    }
  });
}

/**
 * @function getConfig
 * @description Obtiene la configuración actual combinando valores predeterminados con almacenados
 * @returns {Promise<Object>} Promesa que resuelve a la configuración
 */
function getConfig() {
  return new Promise((resolve, reject) => {
    // Usar la API adecuada según el navegador
    if (typeof browser !== 'undefined' && browser.storage && browser.storage.local) {
      browser.storage.local.get('searchEngineConverterConfig')
        .then(data => {
          try {
            // Si hay datos guardados, analizarlos
            if (data.searchEngineConverterConfig) {
              const savedConfig = JSON.parse(data.searchEngineConverterConfig);
              
              // Combinar la configuración guardada con la predeterminada
              const mergedConfig = { ...config }; // Copia de la configuración predeterminada
              
              // Sobrescribir con valores guardados
              Object.keys(savedConfig).forEach(key => {
                mergedConfig[key] = savedConfig[key];
              });
              
              console.log('Configuración cargada:', {
                'openAIApiKey presente': mergedConfig.openAIApiKey ? 'Sí' : 'No',
                'openAIModel': mergedConfig.openAIModel
              });
              
              resolve(mergedConfig);
            } else {
              // Si no hay datos guardados, usar la configuración predeterminada
              console.log('No hay configuración guardada, usando predeterminada');
              resolve(config);
            }
          } catch (error) {
            console.error('Error al analizar la configuración:', error);
            // En caso de error, usar la configuración predeterminada
            resolve(config);
          }
        })
        .catch(error => {
          console.error('Error al acceder al almacenamiento:', error);
          // En caso de error, usar la configuración predeterminada
          resolve(config);
        });
    } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('searchEngineConverterConfig', function(data) {
        try {
          // Si hay datos guardados, analizarlos
          if (data.searchEngineConverterConfig) {
            const savedConfig = JSON.parse(data.searchEngineConverterConfig);
            
            // Combinar la configuración guardada con la predeterminada
            const mergedConfig = { ...config }; // Copia de la configuración predeterminada
            
            // Sobrescribir con valores guardados
            Object.keys(savedConfig).forEach(key => {
              mergedConfig[key] = savedConfig[key];
            });
            
            console.log('Configuración cargada:', {
              'openAIApiKey presente': mergedConfig.openAIApiKey ? 'Sí' : 'No',
              'openAIModel': mergedConfig.openAIModel
            });
            
            resolve(mergedConfig);
          } else {
            // Si no hay datos guardados, usar la configuración predeterminada
            console.log('No hay configuración guardada, usando predeterminada');
            resolve(config);
          }
        } catch (error) {
          console.error('Error al analizar la configuración:', error);
          // En caso de error, usar la configuración predeterminada
          resolve(config);
        }
      });
    } else {
      console.warn('API de almacenamiento no disponible, usando configuración predeterminada');
      resolve(config);
    }
  });
}

/**
 * @var {Object} searchEnginePatterns
 * @description Mapa de patrones estructurales para identificación y generación de URLs de búsqueda
 */
const searchEnginePatterns = {
  'brave': {
    pattern: 'https://search.brave.com/search',
    queryParam: 'q'
  },
  'google': {
    pattern: 'https://www.google.com/search',
    queryParam: 'q'
  },
  'duckduckgo': {
    pattern: 'https://duckduckgo.com/',
    queryParam: 'q'
  },
  'bing': {
    pattern: 'https://www.bing.com/search',
    queryParam: 'q'
  },
  'youtube': {
    pattern: 'https://www.youtube.com/results',
    queryParam: 'search_query'
  },
  'amazon': {
    pattern: 'https://www.amazon.',
    queryParam: 'k'
  },
  'wikipedia': {
    pattern: 'https://es.wikipedia.org/wiki/Special:Search',
    queryParam: 'search'
  }
};

/**
 * @function getURLs
 * @description Genera colección normalizada de endpoints para cada motor de búsqueda
 * @param {string} query - Término de búsqueda a procesar
 * @param {Object} config - Configuración contextual activa
 * @returns {Object} Mapa de identificadores a URLs completas
 */
function getURLs(query, config) {
  return {
    'googleButton': `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    'duckduckgoButton': `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    'bingButton': `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
    'openaiButton': `https://chat.openai.com/?q=${encodeURIComponent(query)}`,
    'amazonButton': `https://www.amazon.${config.amazonDomain}/s?k=${encodeURIComponent(query)}`,
    'youtubeButton': `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    'braveButton': `https://search.brave.com/search?q=${encodeURIComponent(query)}`,
    'wikipediaButton': `https://es.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`
  };
}

/**
 * @function detectSearchEngine
 * @description Analiza una URL para identificar el motor de búsqueda y extraer parámetros
 * @param {string} url - URI a procesar
 * @returns {Object|null} Estructura con metadatos del motor y consulta, o null si no se identifica
 */
function detectSearchEngine(url) {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    for (const [engine, data] of Object.entries(searchEnginePatterns)) {
      if (url.startsWith(data.pattern)) {
        const query = urlObj.searchParams.get(data.queryParam);
        if (query) {
          return {
            name: engine,
            query: query,
            param: data.queryParam
          };
        }
      }
    }
  } catch (error) {
    console.error('Error al analizar la URL:', error);
  }
  
  return null;
}

/**
 * @function createContextMenu
 * @description Implementa interfaz contextual dinámica para operaciones de búsqueda
 */
function createContextMenu() {
  loadConfig().then(config => {
    // Purgar instancias previas para prevenir duplicación
    chrome.contextMenus.removeAll();
    
    // Mapeo de identificadores a etiquetas de presentación
    let defaultEngine = 'Google';
    if (config.defaultSearchEngine === 'duckduckgoButton') defaultEngine = 'DuckDuckGo';
    else if (config.defaultSearchEngine === 'bingButton') defaultEngine = 'Bing';
    else if (config.defaultSearchEngine === 'openaiButton') defaultEngine = 'OpenAI';
    else if (config.defaultSearchEngine === 'amazonButton') defaultEngine = 'Amazon';
    else if (config.defaultSearchEngine === 'youtubeButton') defaultEngine = 'YouTube';
    else if (config.defaultSearchEngine === 'braveButton') defaultEngine = 'Brave';
    else if (config.defaultSearchEngine === 'wikipediaButton') defaultEngine = 'Wikipedia';
    
    // Establecer contenedor principal
    chrome.contextMenus.create({
      id: 'searchEngineConverter',
      title: 'Buscar con otros motores',
      contexts: ['selection']
    });
    
    // Generar opciones para cada motor soportado
    chrome.contextMenus.create({
      id: 'googleSearch',
      parentId: 'searchEngineConverter',
      title: 'Google',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'duckduckgoSearch',
      parentId: 'searchEngineConverter',
      title: 'DuckDuckGo',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'bingSearch',
      parentId: 'searchEngineConverter',
      title: 'Bing',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'openaiSearch',
      parentId: 'searchEngineConverter',
      title: 'OpenAI',
      contexts: ['selection']
    });
    
      chrome.contextMenus.create({
      id: 'amazonSearch',
      parentId: 'searchEngineConverter',
      title: 'Amazon',
        contexts: ['selection']
      });
    
    chrome.contextMenus.create({
      id: 'youtubeSearch',
      parentId: 'searchEngineConverter',
      title: 'YouTube',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'braveSearch',
      parentId: 'searchEngineConverter',
      title: 'Brave',
      contexts: ['selection']
    });
    
      chrome.contextMenus.create({
      id: 'wikipediaSearch',
      parentId: 'searchEngineConverter',
      title: 'Wikipedia',
      contexts: ['selection']
    });
    
    // Exponer acceso rápido al motor predeterminado
    chrome.contextMenus.create({
      id: 'defaultSearch',
      title: `Buscar con ${defaultEngine}`,
      contexts: ['selection']
    });
    
    // Separador para opciones de análisis
    chrome.contextMenus.create({
      id: 'separator1',
      type: 'separator',
      contexts: ['selection']
    });
    
    // Opción para analizar texto seleccionado con OpenAI
    chrome.contextMenus.create({
      id: 'analyzeTextOpenAI',
      title: 'Analizar texto con OpenAI',
      contexts: ['selection']
    });
    
    // Separador para opciones de captura
    chrome.contextMenus.create({
      id: 'separator2',
      type: 'separator',
      contexts: ['page']
    });
    
    // Opción para capturar área y analizar con OpenAI
    chrome.contextMenus.create({
      id: 'captureAreaOpenAI',
      title: 'Capturar área y analizar con OpenAI',
      contexts: ['page']
    });
    
    // Opción para capturar área y copiar al portapapeles
    chrome.contextMenus.create({
      id: 'captureAreaCopy',
      title: 'Capturar área y copiar al portapapeles',
      contexts: ['page']
    });
    
    // Opción para capturar área y guardar como imagen
    chrome.contextMenus.create({
      id: 'captureAreaSave',
      title: 'Capturar área y guardar como imagen',
      contexts: ['page']
    });
  });
}

/**
 * @event runtime.onInstalled
 * @description Punto de entrada para inicialización durante instalación o actualización
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extensión instalada correctamente');
  
  // Establecer estado inicial
  initializeStorage();
});

/**
 * @function initializeStorage
 * @description Inicializa estructuras de almacenamiento con valores predeterminados
 * Implementa estrategia de no sobrescritura para preservar configuraciones existentes
 */
function initializeStorage() {
  chrome.storage.local.get('searchEngineConverterConfig', function(data) {
    if (!data.searchEngineConverterConfig) {
      // Esquema de configuración para nuevas instalaciones
      const defaultConfig = {
        targetEngine: 'google',       // Identificador del motor predeterminado 
        openInNewTab: true,           // Control de contexto de navegación
        preserveUrl: false,           // Retención de URL original
        animations: true,             // Control de efectos visuales
        buttonOrder: [                // Secuencia de elementos en interfaz
          'googleButton', 
          'bingButton', 
          'duckduckgoButton', 
          'braveButton',
          'youtubeButton', 
          'amazonButton'
        ]
      };
      
      // Persistir estructura inicial
      chrome.storage.local.set({
        'searchEngineConverterConfig': JSON.stringify(defaultConfig)
      }, function() {
        console.log('Configuración inicial establecida correctamente');
      });
    }
  });
}

/**
 * @event runtime.onStartup
 * @description Inicialización durante arranque del navegador
 */
chrome.runtime.onStartup.addListener(function() {
  createContextMenu();
});

/**
 * @event storage.onChanged
 * @description Observador de modificaciones en almacenamiento para sincronización
 */
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes.searchEngineConverterConfig) {
    createContextMenu();
  }
});

/**
 * @event contextMenus.onClicked
 * @description Controlador para interacciones con menú contextual
 */
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  loadConfig().then(config => {
    // Manejar opciones de análisis con OpenAI
    if (info.menuItemId === 'analyzeTextOpenAI') {
      if (!info.selectionText) return;
      
      const selectedText = info.selectionText.trim();
      console.log('Analizando texto seleccionado con OpenAI:', selectedText);
      
      // Enviar el texto seleccionado para análisis
      handleTextAnalysis(
        { textData: selectedText },
        { tab: tab },
        function(response) {
          if (response && response.success) {
            // Mostrar el resultado del análisis
            chrome.tabs.sendMessage(tab.id, {
              action: 'showAnalysisResult',
              analysis: response.analysis
            });
          } else {
            // Mostrar error
            const errorMsg = response ? response.error : 'Error desconocido';
            chrome.tabs.sendMessage(tab.id, {
              action: 'showError',
              error: errorMsg
            });
          }
        }
      );
      return;
    }
    
    // Manejar captura de área y análisis con OpenAI
    if (info.menuItemId === 'captureAreaOpenAI') {
      console.log('Activando captura de área para análisis con OpenAI');
      
      // Activar el modo de selección en la página actual con modo 'analyze'
      chrome.tabs.sendMessage(tab.id, { 
        action: 'activateSelection',
        mode: 'analyze'
      }, function(response) {
        // Si hay un error porque el content script no está inyectado, inyectarlo
        if (chrome.runtime.lastError) {
          console.log('Inyectando content script...');
          chrome.tabs.executeScript(tab.id, {
            file: 'content-script.js'
          }, function() {
            // Intentar nuevamente después de inyectar el script
            setTimeout(function() {
              chrome.tabs.sendMessage(tab.id, { 
                action: 'activateSelection',
                mode: 'analyze'
              });
            }, 500);
          });
        }
      });
      return;
    }
    
    // Manejar captura de área y copiar al portapapeles
    if (info.menuItemId === 'captureAreaCopy') {
      console.log('Activando captura de área para copiar al portapapeles');
      
      // Activar el modo de selección en la página actual con modo 'copy'
      chrome.tabs.sendMessage(tab.id, { 
        action: 'activateSelection',
        mode: 'copy'
      }, function(response) {
        // Si hay un error porque el content script no está inyectado, inyectarlo
        if (chrome.runtime.lastError) {
          console.log('Inyectando content script...');
          chrome.tabs.executeScript(tab.id, {
            file: 'content-script.js'
          }, function() {
            // Intentar nuevamente después de inyectar el script
            setTimeout(function() {
              chrome.tabs.sendMessage(tab.id, { 
                action: 'activateSelection',
                mode: 'copy'
              });
            }, 500);
          });
        }
      });
      return;
    }
    
    // Manejar captura de área y guardar como imagen
    if (info.menuItemId === 'captureAreaSave') {
      console.log('Activando captura de área para guardar como imagen');
      
      // Activar el modo de selección en la página actual con modo 'save'
      chrome.tabs.sendMessage(tab.id, { 
        action: 'activateSelection',
        mode: 'save'
      }, function(response) {
        // Si hay un error porque el content script no está inyectado, inyectarlo
        if (chrome.runtime.lastError) {
          console.log('Inyectando content script...');
          chrome.tabs.executeScript(tab.id, {
            file: 'content-script.js'
          }, function() {
            // Intentar nuevamente después de inyectar el script
            setTimeout(function() {
              chrome.tabs.sendMessage(tab.id, { 
                action: 'activateSelection',
                mode: 'save'
              });
            }, 500);
          });
        }
      });
      return;
    }
    
    // Manejar búsquedas de texto seleccionado
    if (info.selectionText) {
      // Normalizar entrada y generar endpoints
      const query = info.selectionText.trim();
      const urls = getURLs(query, config);
      
      // Direccionar según opción seleccionada
      let url;
      switch (info.menuItemId) {
        case 'googleSearch':
          url = urls.googleButton;
          break;
        case 'duckduckgoSearch':
          url = urls.duckduckgoButton;
          break;
        case 'bingSearch':
          url = urls.bingButton;
          break;
        case 'openaiSearch':
          url = urls.openaiButton;
          break;
        case 'amazonSearch':
          url = urls.amazonButton;
          break;
        case 'youtubeSearch':
          url = urls.youtubeButton;
          break;
        case 'braveSearch':
          url = urls.braveButton;
          break;
        case 'wikipediaSearch':
          url = urls.wikipediaButton;
          break;
        case 'defaultSearch':
          // Resolución dinámica según preferencia configurada
          url = urls[config.defaultSearchEngine];
          break;
      }
      
      if (url) {
        // Iniciar navegación en contexto aislado
        chrome.tabs.create({ url: url });
      }
    }
  });
});

/**
 * @event runtime.onMessage
 * @description Sistema centralizado de mensajería para comunicación entre componentes
 */
const messageHandler = function(request, sender, sendResponse) {
  console.log('Mensaje recibido en background:', request.action);
  
  // Enrutamiento basado en tipo de solicitud
  switch (request.action) {
    case 'convertSearch':
      handleSearchConversion(request, sender, sendResponse);
      break;
      
    case 'captureScreen':
      handleScreenCapture(request, sender, sendResponse);
      break;
    
    case 'analyzeImage':
      handleImageAnalysis(request, sender, sendResponse);
      break;
      
    case 'analyzeText':
      handleTextAnalysis(request, sender, sendResponse);
      break;
      
    case 'getConfig':
      handleGetConfig(sendResponse);
      break;
      
    case 'captureVisibleTab':
      captureVisibleTab(sender.tab.id)
        .then(imageData => {
          sendResponse({ success: true, imageData: imageData });
        })
        .catch(error => {
          console.error('Error al capturar pestaña visible:', error);
          sendResponse({ success: false, error: error.message || 'Error desconocido' });
        });
      return true; // Mantener el canal abierto para respuesta asíncrona
    default:
      console.warn('Acción no reconocida:', request.action);
      sendResponse({ success: false, error: 'Acción no soportada' });
  }
  
  // Retención de canal para comunicación asíncrona
  return true;
};

// Usar la API adecuada según el navegador
if (typeof browser !== 'undefined') {
  browser.runtime.onMessage.addListener(messageHandler);
} else {
  chrome.runtime.onMessage.addListener(messageHandler);
}

/**
 * @function handleSearchConversion
 * @description Procesa conversión de búsquedas entre motores heterogéneos
 * @param {Object} request - Estructura con parámetros de conversión
 * @param {Object} sender - Metadatos del emisor de la solicitud
 * @param {Function} sendResponse - Callback para respuesta asíncrona
 */
function handleSearchConversion(request, sender, sendResponse) {
  console.log('Recibida solicitud de conversión:', request);
  console.log('Sender:', sender);
  
  // Extraer el motor de búsqueda destino
  const targetEngine = request.options ? request.options.targetEngine : request.targetEngine;
  console.log('Motor destino:', targetEngine);
  
  if (!targetEngine) {
    const error = 'Parámetros insuficientes: Motor destino no especificado.';
    console.error(error);
    sendResponse({ success: false, error: error });
    return true;
  }
  
  // Primero intentamos obtener la URL del request
  let url = request.url || (sender && sender.tab ? sender.tab.url : null);
  
  // Si estamos en Firefox, intentamos obtener la URL del storage
  if (!url && typeof browser !== 'undefined' && browser.storage) {
    console.log('Intentando obtener URL desde storage...');
    browser.storage.local.get('currentUrl')
      .then(result => {
        if (result && result.currentUrl) {
          console.log('URL recuperada del storage:', result.currentUrl);
          processConversion(result.currentUrl, targetEngine, request, sender, sendResponse);
        } else {
          // Si no hay URL en storage, intentamos obtenerla de la pestaña activa
          return browser.tabs.query({active: true, currentWindow: true});
        }
      })
      .then(tabs => {
        if (tabs && tabs.length > 0) {
          const activeTab = tabs[0];
          console.log('URL obtenida de pestaña activa:', activeTab.url);
          processConversion(activeTab.url, targetEngine, request, sender, sendResponse);
        } else {
          throw new Error('No se pudo obtener la URL');
        }
      })
      .catch(error => {
        console.error('Error al obtener URL:', error);
        sendResponse({ success: false, error: 'No se pudo obtener la URL: ' + error.message });
      });
  } else {
    // Si ya tenemos la URL o estamos en Chrome, procesamos directamente
    processConversion(url, targetEngine, request, sender, sendResponse);
  }
  
  // Indicar que la respuesta se enviará de forma asíncrona
  return true;
}

/**
 * @function processConversion
 * @description Procesa la conversión de búsqueda con una URL conocida
 * @param {string} url - URL actual
 * @param {string} targetEngine - Motor de búsqueda destino
 * @param {Object} request - Solicitud original
 * @param {Object} sender - Remitente original
 * @param {Function} sendResponse - Función de respuesta
 */
function processConversion(url, targetEngine, request, sender, sendResponse) {
  console.log('Procesando conversión con URL:', url);
  
  if (!url) {
    const error = 'URL no especificada o no disponible';
    console.error(error);
    sendResponse({ success: false, error: error });
    return;
  }
  
  try {
    // Detectar el motor de búsqueda actual y extraer la consulta
    const searchInfo = detectSearchEngine(url);
    console.log('Información de búsqueda detectada:', searchInfo);
    
    if (!searchInfo || !searchInfo.query) {
      const error = 'No se pudo detectar una búsqueda válida en la URL actual';
      console.error(error);
      sendResponse({ success: false, error: error });
      return;
    }
    
    // Construir los parámetros de búsqueda
    const searchParams = {
      query: searchInfo.query,
      includeImages: request.options ? request.options.includeImages : true,
      includeVideos: request.options ? request.options.includeVideos : true,
      convertRelatedSearches: request.options ? request.options.convertRelatedSearches : true
    };
    
    // Generación de URL destino
    let targetUrl = buildTargetUrl(searchParams, targetEngine);
    console.log('URL destino generada:', targetUrl);
    
    // Ejecución de navegación según preferencias
    const openInNewTab = request.openInNewTab || false;
    
    if (typeof browser !== 'undefined' && browser.tabs) {
      console.log('Usando APIs de Firefox para navegación');
      
      // En Firefox, obtenemos la pestaña activa primero
      browser.tabs.query({active: true, currentWindow: true})
        .then(tabs => {
          if (!tabs || tabs.length === 0) {
            throw new Error('No se pudo obtener la pestaña activa');
          }
          
          const activeTab = tabs[0];
          console.log('Pestaña activa obtenida:', activeTab);
          
          if (openInNewTab) {
            return browser.tabs.create({ url: targetUrl });
          } else {
            return browser.tabs.update(activeTab.id, { url: targetUrl });
          }
        })
        .then(() => {
          sendResponse({ success: true, url: targetUrl });
        })
        .catch(error => {
          console.error('Error en la navegación:', error);
          sendResponse({ success: false, error: error.message || 'Error en la navegación' });
        });
    } else if (typeof chrome !== 'undefined' && chrome.tabs) {
      console.log('Usando APIs de Chrome para navegación');
      if (openInNewTab) {
        chrome.tabs.create({ url: targetUrl }, () => {
          sendResponse({ success: true, url: targetUrl });
        });
      } else {
        const tabId = sender && sender.tab ? sender.tab.id : null;
        if (!tabId) {
          console.error('ID de pestaña no disponible');
          sendResponse({ success: false, error: 'ID de pestaña no disponible' });
          return;
        }
        
        chrome.tabs.update(tabId, { url: targetUrl }, () => {
          sendResponse({ success: true, url: targetUrl });
        });
      }
    } else {
      const error = 'No se encontró API de pestañas compatible';
      console.error(error);
      sendResponse({ success: false, error: error });
    }
  } catch (error) {
    console.error('Error en la conversión de búsqueda:', error);
    sendResponse({ success: false, error: error.message || 'Error desconocido' });
  }
}

/**
 * @function buildTargetUrl
 * @description Construye URL específica para el motor destino aplicando transformaciones
 * @param {Object} searchParams - Estructura con consulta y filtros de búsqueda
 * @param {string} targetEngine - Identificador del motor destino
 * @returns {string} URL completa con parámetros codificados
 */
function buildTargetUrl(searchParams, targetEngine) {
  const { query, filters } = searchParams;
  let url = '';
  
  // Preparación de parámetros
  const encodedQuery = encodeURIComponent(query);
  
  // Construcción específica según proveedor
  switch (targetEngine) {
    case 'google':
      url = `https://www.google.com/search?q=${encodedQuery}`;
      // Extensión condicional para filtros temporales
      if (filters && filters.timeRange) {
        url += `&tbs=qdr:${filters.timeRange}`;
      }
      break;
      
    case 'bing':
      url = `https://www.bing.com/search?q=${encodedQuery}`;
      break;
      
    case 'duckduckgo':
      url = `https://duckduckgo.com/?q=${encodedQuery}`;
      break;
      
    case 'brave':
      url = `https://search.brave.com/search?q=${encodedQuery}`;
      break;
      
    case 'youtube':
      url = `https://www.youtube.com/results?search_query=${encodedQuery}`;
      break;
      
    case 'amazon':
      // Resolución dinámica del dominio geográfico
      chrome.storage.local.get('searchEngineConverterConfig', function(data) {
        const config = JSON.parse(data.searchEngineConverterConfig || '{}');
        const domain = config.amazonDomain || 'com';
        url = `https://www.amazon.${domain}/s?k=${encodedQuery}`;
      });
      break;
      
    default:
      throw new Error(`Motor de búsqueda no soportado: ${targetEngine}`);
  }
  
  return url;
}

/**
 * @function handleScreenCapture
 * @description Implementa captura de pantalla con opción de selección de área
 * @param {Object} request - Estructura con parámetros de captura
 * @param {Object} sender - Metadatos del emisor de la solicitud
 * @param {Function} sendResponse - Callback para respuesta asíncrona
 */
function handleScreenCapture(request, sender, sendResponse) {
  try {
    // Adquirir captura del viewport actual
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, function(dataUrl) {
      if (chrome.runtime.lastError) {
        sendResponse({ 
          success: false, 
          error: 'Error al capturar la pantalla: ' + chrome.runtime.lastError.message 
        });
        return;
      }
      
      // Bifurcación según modo de captura
      if (request.selectionMode) {
        // Almacenamiento temporal para contexto extendido
        chrome.storage.local.set({ 'tempScreenshot': dataUrl }, function() {
          chrome.tabs.sendMessage(sender.tab.id, { 
            action: 'activateSelection',
            screenshot: dataUrl
          });
        });
      } else {
        // Entrega directa para captura completa
        sendResponse({ success: true, screenshot: dataUrl });
      }
    });
  } catch (error) {
    console.error('Error en captura de pantalla:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  // Retención de canal para respuesta asíncrona
  return true;
}

/**
 * @function handleTextAnalysis
 * @description Procesa análisis de texto mediante servicios de IA
 * @param {Object} request - Estructura con datos de texto
 * @param {Object} sender - Metadatos del emisor de la solicitud
 * @param {Function} sendResponse - Callback para respuesta asíncrona
 */
function handleTextAnalysis(request, sender, sendResponse) {
  console.log('Iniciando análisis de texto...');
  
  // Validación de contenido mínimo
  if (!request.textData) {
    console.error('Error: Datos de texto no proporcionados');
    sendResponse({ success: false, error: 'Datos de texto no proporcionados' });
    return;
  }
  
  console.log('Obteniendo configuración para análisis de texto...');
  
  // Procesar el texto con OpenAI
  getConfig()
    .then(config => {
      console.log('Configuración obtenida:', {
        'openAIApiKey presente': config.openAIApiKey ? 'Sí' : 'No',
        'openAIApiKey longitud': config.openAIApiKey ? config.openAIApiKey.length : 0,
        'openAIApiKey primeros caracteres': config.openAIApiKey ? config.openAIApiKey.substring(0, 5) + '...' : 'N/A',
        'openAIModel': config.openAIModel || 'No definido'
      });
      
      // Validar disponibilidad de credenciales
      if (!config.openAIApiKey) {
        console.error('Error: API key de OpenAI no configurada');
        sendResponse({ success: false, error: 'API key de OpenAI no configurada. Por favor, configura tu API key en las opciones de la extensión.' });
        return;
      }
      
      // Procesar análisis de texto
      console.log('Iniciando análisis con OpenAI...');
      return analyzeTextWithOpenAI(request.textData, config);
    })
    .then(analysis => {
      console.log('Análisis completado');
      sendResponse({ success: true, analysis: analysis });
    })
    .catch(error => {
      console.error('Error en análisis de texto:', error);
      sendResponse({ success: false, error: error.message || 'Error desconocido' });
    });
  
  // Retención de canal para respuesta asíncrona
  return true;
}

/**
 * @function analyzeTextWithOpenAI
 * @description Utiliza servicios de OpenAI para análisis de texto
 * @param {string} text - Texto a analizar
 * @param {Object} config - Estructura con parámetros de configuración y credenciales
 * @returns {Promise<string>} Promesa que resuelve al análisis de texto
 */
function analyzeTextWithOpenAI(text, config) {
  return new Promise((resolve, reject) => {
    // Extracción de parámetros operativos
    const apiKey = config.openAIApiKey;
    
    // Validación de API key
    if (!apiKey) {
      console.error('Error: No se ha proporcionado una API key de OpenAI');
      reject(new Error('No se ha proporcionado una API key de OpenAI. Por favor, configura tu API key en las opciones de la extensión.'));
      return;
    }
    
    // Configuración del modelo y tokens
    const model = config.openAIModel || 'gpt-4o-mini';
    const maxTokens = config.openAIMaxTokens || 1000;
    
    console.log('Analizando texto con OpenAI, modelo:', model);
    console.log('API key configurada:', apiKey ? 'Sí (primeros caracteres: ' + apiKey.substring(0, 5) + '...)' : 'No');
    
    // Comunicación con servicio externo
    fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'Eres un asistente que analiza texto y proporciona información útil sobre el contenido.'
          },
          {
            role: 'user',
            content: `Analiza el siguiente texto y proporciona información relevante, ideas clave, y contexto:

${text}`
          }
        ],
        max_tokens: maxTokens
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Error en solicitud OpenAI: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      // Procesamiento de respuesta
      if (data.choices && data.choices.length > 0) {
        const analysis = data.choices[0].message.content;
        resolve(analysis);
      } else {
        reject(new Error('Respuesta de OpenAI sin datos válidos'));
      }
    })
    .catch(error => {
      console.error('Error en análisis con OpenAI:', error);
      reject(error);
    });
  });
}

/**
 * @function handleImageAnalysis
 * @description Procesa análisis de contenido visual mediante servicios de IA
 * @param {Object} request - Estructura con datos de imagen en formato base64
 * @param {Object} sender - Metadatos del emisor de la solicitud
 * @param {Function} sendResponse - Callback para respuesta asíncrona
 */
function handleImageAnalysis(request, sender, sendResponse) {
  console.log('Iniciando análisis de imagen...');
  
  // Validación de contenido mínimo
  if (!request.imageData) {
    console.error('Error: Datos de imagen no proporcionados');
    sendResponse({ success: false, error: 'Datos de imagen no proporcionados' });
    return;
  }
  
  console.log('Obteniendo configuración para análisis de imagen...');
  
  // Obtener configuración
  getConfig()
    .then(config => {
      console.log('Configuración obtenida:', {
        'openAIApiKey presente': config.openAIApiKey ? 'Sí' : 'No',
        'openAIApiKey longitud': config.openAIApiKey ? config.openAIApiKey.length : 0,
        'openAIApiKey primeros caracteres': config.openAIApiKey ? config.openAIApiKey.substring(0, 5) + '...' : 'N/A',
        'openAIModel': config.openAIModel || 'No definido'
      });
      
      // Validar disponibilidad de credenciales
      if (!config.openAIApiKey) {
        console.error('Error: API key de OpenAI no configurada');
        sendResponse({ success: false, error: 'API key de OpenAI no configurada. Por favor, configura tu API key en las opciones de la extensión.' });
        return;
      }
      
      // Procesar análisis de imagen
      console.log('Iniciando análisis con OpenAI...');
      analyzeWithOpenAI(request.imageData, config, sendResponse);
    })
    .catch(error => {
      console.error('Error al obtener configuración:', error);
      sendResponse({ success: false, error: 'Error al obtener configuración: ' + error.message });
    });
  
  // Retención de canal para respuesta asíncrona
  return true;
}

/**
 * @function analyzeWithOpenAI
 * @description Utiliza servicios de visión computacional de OpenAI para análisis de imágenes
 * @param {string} imageData - Representación base64 de la imagen
 * @param {Object} config - Estructura con parámetros de configuración y credenciales
 * @param {Function} sendResponse - Callback para respuesta asíncrona
 */
function analyzeWithOpenAI(imageData, config, sendResponse) {
  // Extracción de parámetros operativos
  const apiKey = config.openAIApiKey;
  
  // Validación de API key
  if (!apiKey) {
    console.error('Error: No se ha proporcionado una API key de OpenAI');
    sendResponse({
      success: false,
      error: 'No se ha proporcionado una API key de OpenAI. Por favor, configura tu API key en las opciones de la extensión.'
    });
    return;
  }
  
  // Configuración del modelo y tokens
  const model = config.openAIModel || 'gpt-4-vision-preview';
  const maxTokens = config.openAIMaxTokens || 1000;
  
  console.log('Usando modelo:', model);
  console.log('API key configurada:', apiKey ? 'Sí (primeros caracteres: ' + apiKey.substring(0, 5) + '...)' : 'No');
  
  // Normalización del formato para API
  const base64Image = imageData.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  
  // Comunicación con servicio externo
  fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente que analiza imágenes y proporciona descripciones detalladas del contenido.'
        },
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: 'Describe detalladamente el contenido de esta imagen.' 
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: maxTokens
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Error en solicitud OpenAI: ${response.status} ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    // Procesamiento de respuesta
    if (data.choices && data.choices.length > 0) {
      const analysis = data.choices[0].message.content;
      sendResponse({ success: true, analysis: analysis });
    } else {
      sendResponse({ success: false, error: 'Respuesta de OpenAI sin datos válidos' });
    }
  })
  .catch(error => {
    console.error('Error en análisis con OpenAI:', error);
    sendResponse({ success: false, error: error.message });
  });
}

/**
 * @function handleGetConfig
 * @description Centraliza acceso a configuración para componentes distribuidos
 * @param {Function} sendResponse - Callback para respuesta asíncrona
 */
function handleGetConfig(sendResponse) {
  chrome.storage.local.get('searchEngineConverterConfig', function(data) {
    try {
      // Deserialización segura con fallback
      const config = JSON.parse(data.searchEngineConverterConfig || '{}');
      sendResponse({ success: true, config: config });
    } catch (error) {
      console.error('Error al obtener configuración:', error);
      sendResponse({ success: false, error: error.message });
    }
  });
  
  // Retención de canal para respuesta asíncrona
  return true;
}

/**
 * @function captureVisibleTab
 * @description Captura la pestaña visible y devuelve la imagen en formato base64
 * @param {number} tabId - ID de la pestaña a capturar
 * @returns {Promise<string>} - Promesa que resuelve con la imagen en formato base64
 */
function captureVisibleTab(tabId) {
  return new Promise((resolve, reject) => {
    try {
      console.log('Capturando pestaña visible:', tabId);
      
      // Usar la API de captureVisibleTab para capturar la pestaña
      if (typeof browser !== 'undefined' && browser.tabs && browser.tabs.captureVisibleTab) {
        // Firefox
        browser.tabs.captureVisibleTab(null, { format: 'png' })
          .then(dataUrl => {
            console.log('Captura exitosa con browser.tabs.captureVisibleTab');
            resolve(dataUrl);
          })
          .catch(error => {
            console.error('Error en browser.tabs.captureVisibleTab:', error);
            reject(error);
          });
      } else if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.captureVisibleTab) {
        // Chrome/Edge/Brave
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, function(dataUrl) {
          if (chrome.runtime.lastError) {
            console.error('Error en chrome.tabs.captureVisibleTab:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log('Captura exitosa con chrome.tabs.captureVisibleTab');
            resolve(dataUrl);
          }
        });
      } else {
        // Si no hay API de captureVisibleTab disponible
        reject(new Error('API de captura no disponible'));
      }
    } catch (error) {
      console.error('Error al capturar pestaña visible:', error);
      reject(error);
    }
  });
}

/**
 * @event commands.onCommand
 * @description Controlador para atajos de teclado globales de la extensión
 */
chrome.commands.onCommand.addListener(function(command) {
  if (command === 'convert_search') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) return;
      
      // Activación de conversión rápida en contenido activo
      chrome.tabs.sendMessage(tabs[0].id, { action: 'quickConvert' });
    });
  } else if (command === 'capture_screen') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length === 0) return;
      
      // Activar el modo de selección de texto para análisis con OpenAI
      chrome.tabs.sendMessage(tabs[0].id, { action: 'activateSelection' }, function(response) {
        // Si hay un error porque el content script no está inyectado, inyectarlo
        if (chrome.runtime.lastError) {
          console.log('Inyectando content script...');
          chrome.tabs.executeScript(tabs[0].id, {
            file: 'content-script.js'
          });
        }
      });
    });
  }
});
