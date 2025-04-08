// Configuración predeterminada
let config = {
  amazonDomain: 'es',
  youtubeDomain: 'com',
  buttonOrder: ['googleButton', 'duckduckgoButton', 'bingButton', 'openaiButton', 'amazonButton', 'youtubeButton'],
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
    url: 'https://chat.openai.com/?q=',
    name: 'OpenAI'
  },
  'amazonButton': {
    url: null, // Se actualiza dinámicamente según el dominio configurado
    name: 'Amazon'
  },
  'youtubeButton': {
    url: null, // Se actualiza dinámicamente según el dominio configurado
    name: 'YouTube'
  }
};

// Cargar configuración guardada
function loadConfig() {
  chrome.storage.local.get('braveSearchConverterConfig', function(data) {
    if (data.braveSearchConverterConfig) {
      config = JSON.parse(data.braveSearchConverterConfig);
      
      // Actualizar URLs dinámicas
      updateDynamicUrls();
      
      // Recrear menús contextuales
      setupContextMenus();
    }
  });
}

// Actualizar URLs que dependen de dominios configurables
function updateDynamicUrls() {
  searchEngines.amazonButton.url = `https://www.amazon.${config.amazonDomain}/s?k=`;
  searchEngines.youtubeButton.url = `https://www.youtube.${config.youtubeDomain}/results?search_query=`;
}

// Configurar menús contextuales
function setupContextMenus() {
  // Limpiar menús existentes
  chrome.contextMenus.removeAll(function() {
    // Crear menú principal
    chrome.contextMenus.create({
      id: 'searchSelection',
      title: 'Buscar "%s" en...',
      contexts: ['selection']
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

// Manejar clics en el menú contextual
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId.startsWith('default_')) {
    // Establecer motor de búsqueda predeterminado
    const engineId = info.menuItemId.replace('default_', '');
    config.defaultSearchEngine = engineId;
    
    // Guardar configuración
    chrome.storage.local.set({
      'braveSearchConverterConfig': JSON.stringify(config)
    });
    
    // Actualizar menús
    setupContextMenus();
  } else if (info.menuItemId === 'quickSearch') {
    // Búsqueda rápida con motor predeterminado
    const engine = searchEngines[config.defaultSearchEngine];
    const searchUrl = engine.url + encodeURIComponent(info.selectionText);
    chrome.tabs.create({ url: searchUrl });
  } else if (searchEngines[info.menuItemId]) {
    // Búsqueda con motor específico
    const engine = searchEngines[info.menuItemId];
    const searchUrl = engine.url + encodeURIComponent(info.selectionText);
    chrome.tabs.create({ url: searchUrl });
  }
});

// Inicializar extensión
chrome.runtime.onInstalled.addListener(function() {
  // Cargar configuración
  loadConfig();
  
  // Actualizar URLs dinámicas
  updateDynamicUrls();
  
  // Configurar menús contextuales
  setupContextMenus();
});

// Escuchar cambios en la configuración
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && changes.braveSearchConverterConfig) {
    loadConfig();
  }
});
