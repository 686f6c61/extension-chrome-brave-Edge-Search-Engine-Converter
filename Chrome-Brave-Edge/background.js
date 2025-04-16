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
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get('searchEngineConverterConfig', function(data) {
        if (data.searchEngineConverterConfig) {
          config = JSON.parse(data.searchEngineConverterConfig);
        }
        resolve(config);
      });
    } else {
      // Implementación alternativa para entornos restringidos
      console.log('chrome.storage.local no disponible, usando localStorage');
      const savedConfig = localStorage.getItem('searchEngineConverterConfig');
      if (savedConfig) {
        config = JSON.parse(savedConfig);
      }
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
  if (!info.selectionText) return;
  
  loadConfig().then(config => {
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
  });
});

/**
 * @event runtime.onMessage
 * @description Sistema centralizado de mensajería para comunicación entre componentes
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
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
      
    case 'getConfig':
      handleGetConfig(sendResponse);
      break;
      
    default:
      console.warn('Acción no reconocida:', request.action);
      sendResponse({ success: false, error: 'Acción no soportada' });
  }
  
  // Retención de canal para comunicación asíncrona
  return true;
});

/**
 * @function handleSearchConversion
 * @description Procesa conversión de búsquedas entre motores heterogéneos
 * @param {Object} request - Estructura con parámetros de conversión
 * @param {Object} sender - Metadatos del emisor de la solicitud
 * @param {Function} sendResponse - Callback para respuesta asíncrona
 */
function handleSearchConversion(request, sender, sendResponse) {
  // Validación de precondiciones
  if (!request.searchParams || !request.targetEngine) {
    sendResponse({ success: false, error: 'Parámetros insuficientes' });
      return;
    }
    
  try {
    // Generación de URL destino
    let targetUrl = buildTargetUrl(request.searchParams, request.targetEngine);
    
    // Ejecución de navegación según preferencias
    if (request.openInNewTab) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      chrome.tabs.update(sender.tab.id, { url: targetUrl });
    }
    
    sendResponse({ success: true, url: targetUrl });
  } catch (error) {
    console.error('Error en la conversión de búsqueda:', error);
    sendResponse({ success: false, error: error.message });
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
 * @function handleImageAnalysis
 * @description Procesa análisis de contenido visual mediante servicios de IA
 * @param {Object} request - Estructura con datos de imagen en formato base64
 * @param {Object} sender - Metadatos del emisor de la solicitud
 * @param {Function} sendResponse - Callback para respuesta asíncrona
 */
function handleImageAnalysis(request, sender, sendResponse) {
  // Validación de contenido mínimo
  if (!request.imageData) {
    sendResponse({ success: false, error: 'Datos de imagen no proporcionados' });
      return;
    }
    
  // Resolución de proveedor de análisis
  chrome.storage.local.get('searchEngineConverterConfig', function(data) {
    const config = JSON.parse(data.searchEngineConverterConfig || '{}');
    
    // Selección de servicio según disponibilidad
    if (config.openAIApiKey) {
      analyzeWithOpenAI(request.imageData, config, sendResponse);
    } else {
      // Notificación de requisitos no cumplidos
      sendResponse({ 
        success: false, 
        error: 'API de análisis no configurada. Configure OpenAI en opciones.' 
      });
    }
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
  const model = config.openAIModel || 'gpt-4-vision-preview';
  const maxTokens = config.openAIMaxTokens || 1000;
  
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
      
      // Iniciar flujo de captura completa
      handleScreenCapture({ selectionMode: false }, { tab: tabs[0] }, function(response) {
        if (response.success) {
          // Apertura de visor dedicado con captura
          chrome.tabs.create({
            url: chrome.runtime.getURL('capture.html')
          }, function(tab) {
            // Inyección diferida para garantizar inicialización
            setTimeout(function() {
              chrome.tabs.sendMessage(tab.id, {
                action: 'setScreenshot',
                dataUrl: response.screenshot
              });
            }, 500);
          });
        }
      });
    });
  }
});
