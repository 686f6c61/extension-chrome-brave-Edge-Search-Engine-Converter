// Configuración predeterminada
let config = {
  amazonDomain: 'es',
  youtubeDomain: 'com',
  buttonOrder: ['googleButton', 'duckduckgoButton', 'bingButton', 'openaiButton', 'amazonButton', 'youtubeButton', 'braveButton', 'wikipediaButton'],
  defaultSearchEngine: 'googleButton' // Motor de búsqueda predeterminado para el menú contextual
};

// Mapeo de IDs de botones a URLs y nombres
const searchEngines = {
  'googleButton': {
    url: 'https://www.google.com/search?q=',
    name: 'Google'
  },
  'duckduckgoButton': {
    url: 'https://duckduckgo.com/?q=',
    name: 'DuckDuckGo'
  },
  'bingButton': {
    url: 'https://www.bing.com/search?q=',
    name: 'Bing'
  },
  'openaiButton': {
    url: 'https://chat.openai.com/chat?q=',
    name: 'OpenAI'
  },
  'amazonButton': {
    url: null, // Se actualiza dinámicamente según el dominio configurado
    name: 'Amazon'
  },
  'youtubeButton': {
    url: null, // Se actualiza dinámicamente según el dominio configurado
    name: 'YouTube'
  },
  'braveButton': {
    url: 'https://search.brave.com/search?q=',
    name: 'Brave'
  },
  'wikipediaButton': {
    url: 'https://es.wikipedia.org/wiki/Special:Search?search=',
    name: 'Wikipedia'
  }
};

// Definir los patrones de búsqueda para diferentes motores
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

// Detectar el motor de búsqueda actual
function detectSearchEngine(url) {
  if (!url) return null;
  
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
  
  return null;
}

// Cargar configuración guardada
function loadConfig() {
  chrome.storage.local.get('searchEngineConverterConfig', function(data) {
    if (data.searchEngineConverterConfig) {
      config = JSON.parse(data.searchEngineConverterConfig);
      
      // Actualizar URLs dinámicas
      updateDynamicUrls();
      
      // Recrear menús contextuales
      setupContextMenus();
    }
  });
}

// Actualizar URLs que dependen de dominios configurables
function updateDynamicUrls() {
  console.log('Actualizando URLs dinámicas con configuración:', config);
  
  // Asegurarse de que todas las URLs base estén correctamente inicializadas
  // URLs estáticas que nunca deben ser null
  searchEngines.googleButton.url = 'https://www.google.com/search?q=';
  searchEngines.duckduckgoButton.url = 'https://duckduckgo.com/?q=';
  searchEngines.bingButton.url = 'https://www.bing.com/search?q=';
  searchEngines.openaiButton.url = 'https://chat.openai.com/chat?q=';
  searchEngines.braveButton.url = 'https://search.brave.com/search?q=';
  searchEngines.wikipediaButton.url = 'https://es.wikipedia.org/wiki/Special:Search?search=';
  
  // Asegurarse de que los dominios tengan un formato válido
  const amazonDomain = config.amazonDomain ? config.amazonDomain.trim() : 'es';
  const youtubeDomain = config.youtubeDomain ? config.youtubeDomain.trim() : 'com';
  
  // Formatear correctamente las URLs dinámicas
  searchEngines.amazonButton.url = `https://www.amazon.${amazonDomain}/s?k=`;
  
  // Para YouTube, el dominio debe incluir el punto
  if (youtubeDomain.startsWith('.')) {
    searchEngines.youtubeButton.url = `https://www.youtube${youtubeDomain}/results?search_query=`;
  } else {
    searchEngines.youtubeButton.url = `https://www.youtube.com/${youtubeDomain === 'com' ? '' : youtubeDomain + '/'}`;
    searchEngines.youtubeButton.url += 'results?search_query=';
  }
  
  // Verificar que todas las URLs estén correctamente inicializadas
  for (const [id, engine] of Object.entries(searchEngines)) {
    if (!engine.url) {
      console.error(`URL no inicializada para el motor ${id}. Usando URL por defecto.`);
      // Establecer una URL por defecto para evitar errores
      engine.url = 'https://www.google.com/search?q=';
    }
  }
  
  console.log('URLs actualizadas:', searchEngines);
}

// Importar el módulo de captura de pantalla
importScripts('screenshot.js');

// Configurar menús contextuales
function setupContextMenus() {
  // Limpiar menús existentes
  chrome.contextMenus.removeAll(function() {
    // Crear menú principal para búsqueda de texto
    chrome.contextMenus.create({
      id: 'searchSelection',
      title: 'Buscar "%s" en...',
      contexts: ['selection']
    });
    
    // Crear menú para captura de pantalla
    chrome.contextMenus.create({
      id: 'captureScreenshot',
      title: 'Capturar y analizar con OpenAI',
      contexts: ['page', 'image']
    });
    
    // Crear submenús para cada motor de búsqueda
    for (const [buttonId, engine] of Object.entries(searchEngines)) {
      chrome.contextMenus.create({
        id: buttonId,
        parentId: 'searchSelection',
        title: engine.name,
        contexts: ['selection']
      });
    }
    
    // Opción para establecer motor predeterminado
    chrome.contextMenus.create({
      id: 'separator',
      parentId: 'searchSelection',
      type: 'separator',
      contexts: ['selection']
    });
    
    chrome.contextMenus.create({
      id: 'setDefault',
      parentId: 'searchSelection',
      title: 'Establecer motor predeterminado',
      contexts: ['selection']
    });
    
    // Submenús para establecer motor predeterminado
    for (const [buttonId, engine] of Object.entries(searchEngines)) {
      chrome.contextMenus.create({
        id: `default_${buttonId}`,
        parentId: 'setDefault',
        title: engine.name,
        contexts: ['selection'],
        type: 'radio',
        checked: config.defaultSearchEngine === buttonId
      });
    }
    
    // Opción para búsqueda rápida (usa el motor predeterminado)
    chrome.contextMenus.create({
      id: 'quickSearch',
      title: `Búsqueda rápida en ${searchEngines[config.defaultSearchEngine].name}`,
      contexts: ['selection']
    });
  });
}

// Crear menú contextual para cambiar el motor de búsqueda en una página de búsqueda
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const searchEngine = detectSearchEngine(tab.url);
      
      if (searchEngine) {
        // Configurar menú contextual para cambio de motor
        chrome.contextMenus.removeAll(function() {
          // Menú principal para cambio de motor
          chrome.contextMenus.create({
            id: 'changeEngine',
            title: `Cambiar de ${searchEngine.name.toUpperCase()} a otro motor`,
            contexts: ['page']
          });
          
          // Crear submenús para cada motor de búsqueda (excepto el actual)
          for (const [buttonId, engine] of Object.entries(searchEngines)) {
            // No mostrar el motor actual como opción
            if (buttonId.toLowerCase().startsWith(searchEngine.name)) {
              continue;
            }
            
            chrome.contextMenus.create({
              id: `change_${buttonId}`,
              parentId: 'changeEngine',
              title: engine.name,
              contexts: ['page']
            });
          }
          
          // Restablecer el menú para búsqueda de texto seleccionado
          setupContextMenus();
        });
      }
    } catch (error) {
      console.error('Error al procesar la URL para el menú contextual:', error);
    }
  }
});

// Manejar clics en el menú contextual
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId.startsWith('default_')) {
    // Establecer motor de búsqueda predeterminado
    const engineId = info.menuItemId.replace('default_', '');
    config.defaultSearchEngine = engineId;
    
    // Guardar configuración
    chrome.storage.local.set({
      'searchEngineConverterConfig': JSON.stringify(config)
    });
    
    // Actualizar menús
    setupContextMenus();
  } else if (info.menuItemId === 'quickSearch') {
    // Búsqueda rápida con motor predeterminado
    const engine = searchEngines[config.defaultSearchEngine];
    
    // Verificar que la URL del motor de búsqueda sea válida
    if (!engine.url) {
      console.error(`URL no válida para el motor de búsqueda predeterminado: ${config.defaultSearchEngine}`);
      return;
    }
    
    // Construir y abrir la URL de búsqueda
    const searchUrl = engine.url + encodeURIComponent(info.selectionText);
    console.log(`Abriendo URL de búsqueda rápida: ${searchUrl}`);
    chrome.tabs.create({ url: searchUrl });
  } else if (info.menuItemId === 'captureScreenshot') {
    // Enfoque directo para la captura de pantalla
    console.log('Capturando pantalla para tab:', tab.id);
    
    // Capturar la pantalla completa
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
      if (chrome.runtime.lastError) {
        console.error('Error al capturar pantalla:', chrome.runtime.lastError);
        return;
      }
      
      console.log('Pantalla capturada correctamente');
      
      // Abrir una nueva pestaña con la imagen capturada y herramientas para seleccionar área
      chrome.tabs.create({url: 'capture.html'}, function(newTab) {
        // Esperar a que la página se cargue completamente
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
          if (tabId === newTab.id && changeInfo.status === 'complete') {
            // Eliminar el listener una vez que la página esté cargada
            chrome.tabs.onUpdated.removeListener(listener);
            
            // Enviar la imagen capturada a la nueva pestaña
            chrome.tabs.sendMessage(newTab.id, {
              action: 'setScreenshot',
              dataUrl: dataUrl
            });
          }
        });
      });
    });
  } else if (info.menuItemId.startsWith('change_')) {
    // Cambiar el motor de búsqueda desde el menú contextual
    const engineId = info.menuItemId.replace('change_', '');
    const engine = searchEngines[engineId];
    
    if (!engine || !engine.url) {
      console.error(`Motor de búsqueda no válido: ${engineId}`);
      return;
    }
    
    try {
      // Detectar el motor de búsqueda actual
      const searchEngine = detectSearchEngine(tab.url);
      
      if (searchEngine) {
        // Construir y abrir la URL de búsqueda
        const newUrl = engine.url + encodeURIComponent(searchEngine.query);
        console.log(`Cambiando de ${searchEngine.name} a ${engine.name}: ${newUrl}`);
        chrome.tabs.update(tab.id, { url: newUrl });
      }
    } catch (error) {
      console.error('Error al procesar la URL para cambiar el motor de búsqueda:', error);
    }
  } else if (searchEngines[info.menuItemId]) {
    // Búsqueda con motor específico
    const engine = searchEngines[info.menuItemId];
    
    // Verificar que la URL del motor de búsqueda sea válida
    if (!engine.url) {
      console.error(`URL no válida para el motor de búsqueda: ${info.menuItemId}`);
      return;
    }
    
    // Construir y abrir la URL de búsqueda
    const searchUrl = engine.url + encodeURIComponent(info.selectionText);
    console.log(`Abriendo URL de búsqueda: ${searchUrl}`);
    chrome.tabs.create({ url: searchUrl });
  }
});

// Inicializar extensión
chrome.runtime.onInstalled.addListener(function() {
  // Cargar configuración y esperar a que se complete
  chrome.storage.local.get('searchEngineConverterConfig', function(data) {
    if (data.searchEngineConverterConfig) {
      config = JSON.parse(data.searchEngineConverterConfig);
    }
    
    // Actualizar URLs dinámicas
    updateDynamicUrls();
    
    // Configurar menús contextuales
    setupContextMenus();
  });
});

// Escuchar cambios en la configuración
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes.searchEngineConverterConfig) {
    loadConfig();
  }
});
