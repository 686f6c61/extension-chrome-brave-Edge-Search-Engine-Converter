/**
 * @module PopupController
 * @description Módulo controlador de la interfaz principal de la extensión.
 * Gestiona el ciclo de vida de la UI, persistencia de configuración y comunicación
 * con los procesos de fondo mediante mensajería asíncrona.
 */

/**
 * @function updateStatus
 * @description Actualiza el componente de estado con retroalimentación visual
 * @param {string} message - Contenido textual del mensaje
 * @param {string} type - Clasificación del mensaje (info, success, error, warning)
 */
function updateStatus(message, type = 'info') {
  const statusElement = document.getElementById('status');
  const statusContainer = document.querySelector('.status-container');
  
  // Restablecer estado visual previo
  statusElement.classList.remove('success', 'error', 'warning');
  statusContainer.classList.remove('pulse');
  
  // Aplicar el estilo correspondiente según el tipo de mensaje
  let icon = 'fa-info-circle';
  if (type === 'success') {
    icon = 'fa-check-circle';
    statusElement.classList.add('success');
  } else if (type === 'error') {
    icon = 'fa-exclamation-circle';
    statusElement.classList.add('error');
  } else if (type === 'warning') {
    icon = 'fa-exclamation-triangle';
    statusElement.classList.add('warning');
  }
  
  // Actualizar contenido del elemento de estado
  statusElement.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
  
  // Añadir efecto de animación para llamar la atención del usuario
  if (type === 'success' || type === 'error' || type === 'warning') {
    statusContainer.classList.add('pulse');
    setTimeout(() => statusContainer.classList.remove('pulse'), 2000);
  }
}

// Modelo de estado para la configuración de la extensión
let configState = {
  targetEngine: 'google',               // Motor de búsqueda destino para conversiones
  includeImages: true,                  // Integración de resultados de imágenes
  includeVideos: true,                  // Integración de resultados de vídeos
  convertRelatedSearches: true,         // Procesamiento de sugerencias relacionadas
  openAIApiKey: '',                     // Credenciales de autenticación para API de OpenAI
  openAIModel: 'gpt-4o-mini',           // Modelo de OpenAI a utilizar
  openAIMaxTokens: 1000,                // Máximo de tokens para respuestas
  autoConversion: false,                // Activar conversión automática en navegación
  enableKeyboardShortcut: true,         // Habilitación de atajos de teclado globales
  customShortcut: 'Alt+G',              // Combinación de teclas para activación rápida
  saveHistory: false,                   // Persistencia de historial de conversiones
  theme: 'system',                      // Esquema visual (system, light, dark)
  advancedMode: false,                  // Habilitación de funcionalidades extendidas
  amazonDomain: 'com',                  // Dominio de Amazon
  youtubeDomain: 'com',                 // Dominio de YouTube
  // Motores visibles (por defecto solo los principales)
  visibleEngines: {
    google: true,
    brave: true,
    duckduckgo: true,
    bing: true,
    openai: true,
    amazon: true,
    youtube: true,
    wikipedia: true,
    twitter: true,
    // Nuevos motores (deshabilitados por defecto)
    github: false,
    gitlab: false,
    stackoverflow: false,
    reddit: false,
    pinterest: false,
    startpage: false,
    ecosia: false,
    qwant: false,
    yandex: false,
    baidu: false,
    ebay: false,
    aliexpress: false,
    etsy: false,
    scholar: false,
    archive: false,
    wolframalpha: false,
    spotify: false,
    soundcloud: false,
    vimeo: false,
    linkedin: false,
    tiktok: false
  }
};

/**
 * @function initializePopup
 * @description Punto de entrada principal que inicializa los componentes al cargar el documento
 */
document.addEventListener('DOMContentLoaded', async function() {
  // Secuencia de inicialización de componentes
  setupTabNavigation();
  await loadConfiguration();
  setupEventListeners();
  updateEngineButtonVisibility();
  checkCurrentPage();
  applyTheme();
});

/**
 * @function setupTabNavigation
 * @description Implementa el sistema de navegación por pestañas mediante delegación de eventos
 */
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Registrar manejadores para la navegación entre pestañas
  tabButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Restaurar estado neutral en todos los componentes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Activar componentes de la pestaña seleccionada
      button.classList.add('active');
      const targetTab = button.getAttribute('data-tab');
      document.getElementById(targetTab).classList.add('active');
      
      // Recalcular dimensiones según contenido activo
      updatePopupHeight();
    });
  });
  
  // Establecer pestaña inicial por defecto
  if (tabButtons.length > 0) {
    tabButtons[0].click();
  }
}

/**
 * @function loadConfiguration
 * @description Recupera la configuración persistente desde el almacenamiento local
 */
async function loadConfiguration() {
  return new Promise((resolve) => {
    chrome.storage.local.get('searchEngineConverterConfig', async function(data) {
    if (data.searchEngineConverterConfig) {
      try {
        // Deserializar configuración almacenada
        const savedConfig = JSON.parse(data.searchEngineConverterConfig);
        
        // Fusionar con estado actual preservando estructura
        Object.keys(savedConfig).forEach(key => {
          if (configState.hasOwnProperty(key)) {
            configState[key] = savedConfig[key];
          }
        });
        
        // Descifrar la API key de OpenAI si está cifrada
        if (configState.openAIApiKey && CryptoUtils.isEncrypted(configState.openAIApiKey)) {
          try {
            const decryptedKey = await CryptoUtils.decrypt(configState.openAIApiKey);
            if (decryptedKey) {
              configState.openAIApiKey = decryptedKey;
            }
          } catch (error) {
            console.error('Error al descifrar API key:', error);
            configState.openAIApiKey = '';
          }
        }
        
        // Sincronizar interfaz con estado recuperado
        applyConfigToUI();
      } catch (error) {
        console.error('Error al cargar configuración:', error);
        showNotification('Error al cargar configuración', 'error');
      }
    } else {
      // Inicialización: persistir valores predeterminados
      saveConfiguration();
    }
    resolve();
  });
  });
}

/**
 * @function applyConfigToUI
 * @description Sincroniza el estado de los elementos de la interfaz con la configuración actual
 */
function applyConfigToUI() {
  // Configurar selector de motor de búsqueda
  const engineSelect = document.getElementById('targetEngine');
  if (engineSelect) {
    engineSelect.value = configState.targetEngine;
  }
  
  // Establecer estados de componentes de configuración
  setCheckboxState('includeImages', configState.includeImages);
  setCheckboxState('includeVideos', configState.includeVideos);
  setCheckboxState('convertRelatedSearches', configState.convertRelatedSearches);
  setCheckboxState('autoConversion', configState.autoConversion);
  setCheckboxState('enableKeyboardShortcut', configState.enableKeyboardShortcut);
  setCheckboxState('saveHistory', configState.saveHistory);
  
  // Configurar selector de tema visual
  const themeSelect = document.getElementById('themeSelector');
  if (themeSelect) {
    themeSelect.value = configState.theme;
  }
  
  // Configurar campo de atajo de teclado
  const shortcutInput = document.getElementById('customShortcut');
  if (shortcutInput) {
    shortcutInput.value = configState.customShortcut;
    shortcutInput.disabled = !configState.enableKeyboardShortcut;
  }
  
  // Proteger visualización de credenciales API de OpenAI
  const openAIApiKeyInput = document.getElementById('openAIApiKey');
  if (openAIApiKeyInput && configState.openAIApiKey) {
    openAIApiKeyInput.value = '••••••••••••••••••••••••••';
    openAIApiKeyInput.placeholder = 'Clave API guardada';
  }
  
  // Configurar modelo de OpenAI
  const openAIModelSelect = document.getElementById('openAIModel');
  if (openAIModelSelect && configState.openAIModel) {
    openAIModelSelect.value = configState.openAIModel;
  }
  
  // Configurar max tokens
  const openAIMaxTokensInput = document.getElementById('openAIMaxTokens');
  if (openAIMaxTokensInput && configState.openAIMaxTokens) {
    openAIMaxTokensInput.value = configState.openAIMaxTokens;
  }
  
  // Configurar visibilidad de opciones avanzadas
  const advancedToggle = document.getElementById('advancedMode');
  if (advancedToggle) {
    advancedToggle.checked = configState.advancedMode;
    toggleAdvancedOptions(configState.advancedMode);
  }
  
  // Actualizar dimensiones del contenedor
  updatePopupHeight();
}

/**
 * @function setCheckboxState
 * @description Establece el estado de un componente checkbox
 * @param {string} id - Identificador del elemento DOM
 * @param {boolean} checked - Estado de activación a aplicar
 */
function setCheckboxState(id, checked) {
  const checkbox = document.getElementById(id);
  if (checkbox) {
    checkbox.checked = checked;
  }
}

/**
 * @function setupEventListeners
 * @description Registra los manejadores de eventos para los elementos interactivos
 */
function setupEventListeners() {
  // Acción principal de conversión
  const convertButton = document.getElementById('convertButton');
  if (convertButton) {
    convertButton.addEventListener('click', handleConvertClick);
  }
  
  // Configurar los botones de conversión para cada motor
  const allEngineButtons = [
    { id: 'googleButton', engine: 'google' },
    { id: 'braveButton', engine: 'brave' },
    { id: 'duckduckgoButton', engine: 'duckduckgo' },
    { id: 'bingButton', engine: 'bing' },
    { id: 'openaiButton', engine: 'openai' },
    { id: 'amazonButton', engine: 'amazon' },
    { id: 'youtubeButton', engine: 'youtube' },
    { id: 'wikipediaButton', engine: 'wikipedia' },
    { id: 'twitterButton', engine: 'twitter' },
    { id: 'githubButton', engine: 'github' },
    { id: 'gitlabButton', engine: 'gitlab' },
    { id: 'stackoverflowButton', engine: 'stackoverflow' },
    { id: 'redditButton', engine: 'reddit' },
    { id: 'pinterestButton', engine: 'pinterest' },
    { id: 'startpageButton', engine: 'startpage' },
    { id: 'ecosiaButton', engine: 'ecosia' },
    { id: 'qwantButton', engine: 'qwant' },
    { id: 'yandexButton', engine: 'yandex' },
    { id: 'baiduButton', engine: 'baidu' },
    { id: 'ebayButton', engine: 'ebay' },
    { id: 'aliexpressButton', engine: 'aliexpress' },
    { id: 'etsyButton', engine: 'etsy' },
    { id: 'scholarButton', engine: 'scholar' },
    { id: 'archiveButton', engine: 'archive' },
    { id: 'wolframalphaButton', engine: 'wolframalpha' },
    { id: 'spotifyButton', engine: 'spotify' },
    { id: 'soundcloudButton', engine: 'soundcloud' },
    { id: 'vimeoButton', engine: 'vimeo' },
    { id: 'linkedinButton', engine: 'linkedin' },
    { id: 'tiktokButton', engine: 'tiktok' }
  ];
  
  // Solo configurar listeners para motores visibles
  const engineButtons = allEngineButtons.filter(btn => 
    configState.visibleEngines[btn.engine]
  );
  
  engineButtons.forEach(({ id, engine }) => {
    const button = document.getElementById(id);
    if (button) {
      button.addEventListener('click', () => {
        handleEngineConversion(engine);
      });
    }
  });
  
  
  // Configuración de motor de búsqueda
  const engineSelect = document.getElementById('targetEngine');
  if (engineSelect) {
    engineSelect.addEventListener('change', function() {
      configState.targetEngine = engineSelect.value;
      saveConfiguration();
    });
  }
  
  // Registro de controladores para opciones de configuración
  setupCheckboxListener('includeImages', value => {
    configState.includeImages = value;
    saveConfiguration();
  });
  
  setupCheckboxListener('includeVideos', value => {
    configState.includeVideos = value;
    saveConfiguration();
  });
  
  setupCheckboxListener('convertRelatedSearches', value => {
    configState.convertRelatedSearches = value;
    saveConfiguration();
  });
  
  setupCheckboxListener('autoConversion', value => {
    configState.autoConversion = value;
    saveConfiguration();
  });
  
  setupCheckboxListener('enableKeyboardShortcut', value => {
    configState.enableKeyboardShortcut = value;
    saveConfiguration();
    
    // Actualizar estado de dependencias relacionadas
    const shortcutInput = document.getElementById('customShortcut');
    if (shortcutInput) {
      shortcutInput.disabled = !value;
    }
  });
  
  setupCheckboxListener('saveHistory', value => {
    configState.saveHistory = value;
    saveConfiguration();
  });
  
  // Configuración de tema visual
  const themeSelect = document.getElementById('themeSelector');
  if (themeSelect) {
    themeSelect.addEventListener('change', function() {
      configState.theme = themeSelect.value;
      saveConfiguration();
      applyTheme();
    });
  }
  
  // Configuración de atajo de teclado personalizado
  const shortcutInput = document.getElementById('customShortcut');
  if (shortcutInput) {
    shortcutInput.addEventListener('blur', function() {
      if (shortcutInput.value) {
        configState.customShortcut = shortcutInput.value;
        saveConfiguration();
      }
    });
    
    // Captura interactiva de combinación de teclas
    shortcutInput.addEventListener('keydown', function(e) {
      e.preventDefault();
      
      const key = e.key.toUpperCase();
      if (key === 'CONTROL' || key === 'ALT' || key === 'SHIFT') {
        return; // Ignorar teclas modificadoras aisladas
      }
      
      const modifiers = [];
      if (e.ctrlKey) modifiers.push('Ctrl');
      if (e.altKey) modifiers.push('Alt');
      if (e.shiftKey) modifiers.push('Shift');
      
      // Generar representación normalizada de la combinación
      if (modifiers.length > 0) {
        const shortcut = modifiers.join('+') + '+' + key;
        shortcutInput.value = shortcut;
        configState.customShortcut = shortcut;
        saveConfiguration();
      }
    });
  }
  
  // Gestión de credenciales API de OpenAI
  const openAIApiKeyInput = document.getElementById('openAIApiKey');
  const openAIModelSelect = document.getElementById('openAIModel');
  const openAIMaxTokensInput = document.getElementById('openAIMaxTokens');
  const saveConfigButton = document.getElementById('saveConfigButton');
  
  if (saveConfigButton) {
    saveConfigButton.addEventListener('click', async function() {
      // Guardar API key
      if (openAIApiKeyInput && openAIApiKeyInput.value && 
          openAIApiKeyInput.value !== '••••••••••••••••••••••••••') {
        configState.openAIApiKey = openAIApiKeyInput.value;
      }
      
      // Guardar modelo
      if (openAIModelSelect) {
        configState.openAIModel = openAIModelSelect.value;
      }
      
      // Guardar max tokens
      if (openAIMaxTokensInput) {
        configState.openAIMaxTokens = parseInt(openAIMaxTokensInput.value) || 1000;
      }
      
      // Guardar configuración
      await saveConfiguration();
      
      // Implementar oscurecimiento para protección visual
      if (openAIApiKeyInput && configState.openAIApiKey) {
        openAIApiKeyInput.value = '••••••••••••••••••••••••••';
        openAIApiKeyInput.placeholder = 'Clave API guardada';
      }
      
      showNotification('Configuración guardada correctamente', 'success');
    });
  }
  
  // Configuración de modo avanzado
  const advancedToggle = document.getElementById('advancedMode');
  if (advancedToggle) {
    advancedToggle.addEventListener('change', function() {
      configState.advancedMode = advancedToggle.checked;
      saveConfiguration();
      toggleAdvancedOptions(advancedToggle.checked);
    });
  }
  
  // Gestión de portabilidad de configuración
  const exportButton = document.getElementById('exportConfig');
  if (exportButton) {
    exportButton.addEventListener('click', exportConfiguration);
  }
  
  const importButton = document.getElementById('importConfig');
  if (importButton) {
    importButton.addEventListener('click', importConfiguration);
  }
  
  // Gestión de reinicio de configuración
  const resetButton = document.getElementById('resetConfig');
  if (resetButton) {
    resetButton.addEventListener('click', resetConfiguration);
  }
  
  // Configuración del botón de toggle de configuración
  const configToggleButton = document.getElementById('configToggleButton');
  const configPanel = document.getElementById('configPanel');
  
  if (configToggleButton && configPanel) {
    configToggleButton.addEventListener('click', function() {
      configPanel.classList.toggle('visible');
      const isVisible = configPanel.classList.contains('visible');
      configToggleButton.innerHTML = isVisible ? 
        '<i class="fas fa-times"></i> Cerrar' : 
        '<i class="fas fa-cog"></i> Configuración';
    });
  }
  
  // Configuración de visibilidad de motores
  const visibilityCheckboxes = [
    'visibleGoogle', 'visibleBrave', 'visibleDuckduckgo', 'visibleBing',
    'visibleOpenai', 'visibleAmazon', 'visibleYoutube', 'visibleWikipedia',
    'visibleTwitter', 'visibleGithub', 'visibleGitlab', 'visibleStackoverflow',
    'visibleReddit', 'visiblePinterest', 'visibleStartpage', 'visibleEcosia',
    'visibleQwant', 'visibleYandex', 'visibleBaidu', 'visibleEbay',
    'visibleAliexpress', 'visibleEtsy', 'visibleScholar', 'visibleArchive',
    'visibleWolframalpha', 'visibleSpotify', 'visibleSoundcloud', 'visibleVimeo',
    'visibleLinkedin', 'visibleTiktok'
  ];
  
  visibilityCheckboxes.forEach(checkboxId => {
    const checkbox = document.getElementById(checkboxId);
    if (checkbox) {
      // Establecer el estado inicial
      const engineName = checkboxId.replace('visible', '').toLowerCase();
      checkbox.checked = configState.visibleEngines[engineName] !== false;
      
      // Manejar cambios
      checkbox.addEventListener('change', function() {
        const engineName = checkboxId.replace('visible', '').toLowerCase();
        configState.visibleEngines[engineName] = checkbox.checked;
        updateEngineButtonVisibility();
        saveConfiguration();
      });
    }
  });
  
  // Configurar dominios
  const amazonDomainSelect = document.getElementById('amazonDomain');
  if (amazonDomainSelect) {
    amazonDomainSelect.value = configState.amazonDomain || 'es';
    amazonDomainSelect.addEventListener('change', function() {
      configState.amazonDomain = amazonDomainSelect.value;
      saveConfiguration();
    });
  }
  
  const youtubeDomainSelect = document.getElementById('youtubeDomain');
  if (youtubeDomainSelect) {
    youtubeDomainSelect.value = configState.youtubeDomain || 'com';
    youtubeDomainSelect.addEventListener('change', function() {
      configState.youtubeDomain = youtubeDomainSelect.value;
      saveConfiguration();
    });
  }
  
  // Motor de búsqueda predeterminado
  const defaultSearchEngineSelect = document.getElementById('defaultSearchEngine');
  if (defaultSearchEngineSelect) {
    defaultSearchEngineSelect.value = configState.defaultSearchEngine || 'googleButton';
    defaultSearchEngineSelect.addEventListener('change', function() {
      configState.defaultSearchEngine = defaultSearchEngineSelect.value;
      saveConfiguration();
    });
  }
}

/**
 * @function updateEngineButtonVisibility
 * @description Actualiza la visibilidad de los botones de motores según la configuración
 */
function updateEngineButtonVisibility() {
  const engineMapping = {
    google: 'googleButton',
    brave: 'braveButton',
    duckduckgo: 'duckduckgoButton',
    bing: 'bingButton',
    openai: 'openaiButton',
    amazon: 'amazonButton',
    youtube: 'youtubeButton',
    wikipedia: 'wikipediaButton',
    twitter: 'twitterButton',
    github: 'githubButton',
    gitlab: 'gitlabButton',
    stackoverflow: 'stackoverflowButton',
    reddit: 'redditButton',
    pinterest: 'pinterestButton',
    startpage: 'startpageButton',
    ecosia: 'ecosiaButton',
    qwant: 'qwantButton',
    yandex: 'yandexButton',
    baidu: 'baiduButton',
    ebay: 'ebayButton',
    aliexpress: 'aliexpressButton',
    etsy: 'etsyButton',
    scholar: 'scholarButton',
    archive: 'archiveButton',
    wolframalpha: 'wolframalphaButton',
    spotify: 'spotifyButton',
    soundcloud: 'soundcloudButton',
    vimeo: 'vimeoButton',
    linkedin: 'linkedinButton',
    tiktok: 'tiktokButton'
  };
  
  Object.entries(engineMapping).forEach(([engine, buttonId]) => {
    const button = document.getElementById(buttonId);
    if (button) {
      button.style.display = configState.visibleEngines[engine] ? '' : 'none';
    }
  });
}

/**
 * @function setupCheckboxListener
 * @description Registra manejador de eventos para controles tipo checkbox
 * @param {string} id - Identificador del elemento DOM
 * @param {function} callback - Función a invocar con el nuevo estado
 */
function setupCheckboxListener(id, callback) {
  const checkbox = document.getElementById(id);
  if (checkbox) {
    checkbox.addEventListener('change', function() {
      callback(checkbox.checked);
    });
  }
}

/**
 * @function handleConvertClick
 * @description Gestiona la acción principal de conversión de búsqueda
 */
function handleConvertClick() {
  // Recuperar contexto de pestaña activa
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    
    // Iniciar proceso de conversión mediante mensajería
    chrome.runtime.sendMessage({
      action: 'convertSearch',
      tabId: activeTab.id,
      options: {
        targetEngine: configState.targetEngine,
        includeImages: configState.includeImages,
        includeVideos: configState.includeVideos,
        convertRelatedSearches: configState.convertRelatedSearches
      }
    }, function(response) {
      if (response && response.success) {
        showNotification('Búsqueda convertida correctamente', 'success');
      } else {
        const errorMsg = response ? response.error : 'Error al convertir búsqueda';
        showNotification(errorMsg, 'error');
      }
    });
  });
}

/**
 * @function handleEngineConversion
 * @description Gestiona la conversión de búsqueda a un motor específico
 * @param {string} targetEngine - Motor de búsqueda destino
 */
function handleEngineConversion(targetEngine) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    const currentUrl = activeTab.url;
    
    // Detectar si es búsqueda de imágenes
    const isImageSearch = currentUrl.includes('tbm=isch') || // Google
                         currentUrl.includes('/images') || // Brave, Bing
                         currentUrl.includes('iax=images') || // DuckDuckGo
                         currentUrl.includes('images/search'); // Bing
    
    // Extraer la consulta de búsqueda de la URL actual
    let query = null;
    
    // Patrones para extraer queries de diferentes motores
    const patterns = [
      { regex: /[?&]q=([^&]+)/, engines: ['google', 'bing', 'brave', 'duckduckgo', 'twitter', 'startpage', 'ecosia', 'qwant', 'yandex', 'github', 'gitlab', 'stackoverflow', 'reddit', 'linkedin', 'tiktok'] },
      { regex: /[?&]search_query=([^&]+)/, engines: ['youtube'] },
      { regex: /[?&]k=([^&]+)/, engines: ['amazon'] },
      { regex: /[?&]search=([^&]+)/, engines: ['wikipedia', 'pinterest', 'archive'] },
      { regex: /[?&]p=([^&]+)/, engines: ['yahoo'] },
      { regex: /[?&]text=([^&]+)/, engines: ['yandex'] },
      { regex: /[?&]wd=([^&]+)/, engines: ['baidu'] },
      { regex: /[?&]_nkw=([^&]+)/, engines: ['ebay'] },
      { regex: /[?&]SearchText=([^&]+)/, engines: ['aliexpress'] },
      { regex: /[?&]query=([^&]+)/, engines: ['etsy', 'soundcloud', 'vimeo', 'spotify'] },
      { regex: /[?&]i=([^&]+)/, engines: ['wolframalpha'] }
    ];
    
    // Intentar extraer la query
    for (const pattern of patterns) {
      const match = currentUrl.match(pattern.regex);
      if (match) {
        query = decodeURIComponent(match[1].replace(/\+/g, ' '));
        break;
      }
    }
    
    if (!query) {
      updateStatus('No se detectó ninguna búsqueda', 'error');
      return;
    }
    
    // Construir la URL del motor destino
    let targetUrl = '';
    
    switch(targetEngine) {
      case 'google':
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        if (isImageSearch) targetUrl += '&tbm=isch';
        break;
      case 'brave':
        if (isImageSearch) {
          targetUrl = `https://search.brave.com/images?q=${encodeURIComponent(query)}`;
        } else {
          targetUrl = `https://search.brave.com/search?q=${encodeURIComponent(query)}`;
        }
        break;
      case 'duckduckgo':
        targetUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
        if (isImageSearch) targetUrl += '&iax=images&ia=images';
        break;
      case 'bing':
        if (isImageSearch) {
          targetUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;
        } else {
          targetUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
        }
        break;
      case 'yahoo':
        targetUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
        if (isImageSearch) targetUrl = `https://images.search.yahoo.com/search/images?p=${encodeURIComponent(query)}`;
        break;
      case 'openai':
        targetUrl = `https://chat.openai.com/?q=${encodeURIComponent(query)}`;
        break;
      case 'amazon':
        const amazonDomain = configState.amazonDomain || 'com';
        targetUrl = `https://www.amazon.${amazonDomain}/s?k=${encodeURIComponent(query)}`;
        break;
      case 'youtube':
        targetUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        break;
      case 'wikipedia':
        targetUrl = `https://es.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`;
        break;
      case 'twitter':
        targetUrl = `https://twitter.com/search?q=${encodeURIComponent(query)}`;
        break;
      case 'github':
        targetUrl = `https://github.com/search?q=${encodeURIComponent(query)}`;
        break;
      case 'gitlab':
        targetUrl = `https://gitlab.com/search?search=${encodeURIComponent(query)}`;
        break;
      case 'stackoverflow':
        targetUrl = `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`;
        break;
      case 'reddit':
        targetUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`;
        break;
      case 'pinterest':
        if (isImageSearch) {
          targetUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
        } else {
          targetUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
        }
        break;
      case 'startpage':
        targetUrl = `https://www.startpage.com/do/search?q=${encodeURIComponent(query)}`;
        if (isImageSearch) targetUrl = `https://www.startpage.com/sp/search?cat=images&q=${encodeURIComponent(query)}`;
        break;
      case 'ecosia':
        targetUrl = `https://www.ecosia.org/search?q=${encodeURIComponent(query)}`;
        if (isImageSearch) targetUrl = `https://www.ecosia.org/images?q=${encodeURIComponent(query)}`;
        break;
      case 'qwant':
        targetUrl = `https://www.qwant.com/?q=${encodeURIComponent(query)}`;
        if (isImageSearch) targetUrl = `https://www.qwant.com/?q=${encodeURIComponent(query)}&t=images`;
        break;
      case 'yandex':
        targetUrl = `https://yandex.com/search/?text=${encodeURIComponent(query)}`;
        if (isImageSearch) targetUrl = `https://yandex.com/images/search?text=${encodeURIComponent(query)}`;
        break;
      case 'baidu':
        targetUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
        if (isImageSearch) targetUrl = `https://image.baidu.com/search/index?tn=baiduimage&word=${encodeURIComponent(query)}`;
        break;
      case 'ebay':
        targetUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
        break;
      case 'aliexpress':
        targetUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}`;
        break;
      case 'etsy':
        targetUrl = `https://www.etsy.com/search?q=${encodeURIComponent(query)}`;
        break;
      case 'scholar':
        targetUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
        break;
      case 'archive':
        targetUrl = `https://archive.org/search?query=${encodeURIComponent(query)}`;
        break;
      case 'wolframalpha':
        targetUrl = `https://www.wolframalpha.com/input?i=${encodeURIComponent(query)}`;
        break;
      case 'spotify':
        targetUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
        break;
      case 'soundcloud':
        targetUrl = `https://soundcloud.com/search?q=${encodeURIComponent(query)}`;
        break;
      case 'vimeo':
        targetUrl = `https://vimeo.com/search?q=${encodeURIComponent(query)}`;
        break;
      case 'linkedin':
        targetUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(query)}`;
        break;
      case 'tiktok':
        targetUrl = `https://www.tiktok.com/search?q=${encodeURIComponent(query)}`;
        break;
      default:
        updateStatus('Motor no soportado', 'error');
        return;
    }
    
    // Abrir en nueva pestaña
    chrome.tabs.create({ url: targetUrl });
    window.close();
  });
}


/**
 * @function checkCurrentPage
 * @description Verifica compatibilidad de la página actual con operaciones de conversión
 */
function checkCurrentPage() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    const url = activeTab.url || '';
    
    // Detectar el motor de búsqueda actual
    let currentEngine = null;
    let isSearchEngine = false;
    let isImageSearch = false;
    
    if (url.includes('google.com/search')) {
      currentEngine = 'Google';
      isSearchEngine = true;
      isImageSearch = url.includes('tbm=isch');
    } else if (url.includes('search.brave.com')) {
      currentEngine = 'Brave';
      isSearchEngine = true;
      isImageSearch = url.includes('/images');
    } else if (url.includes('bing.com/search') || url.includes('bing.com/images/search')) {
      currentEngine = 'Bing';
      isSearchEngine = true;
      isImageSearch = url.includes('/images/search');
    } else if (url.includes('duckduckgo.com')) {
      currentEngine = 'DuckDuckGo';
      isSearchEngine = true;
      isImageSearch = url.includes('iax=images');
    } else if (url.includes('yahoo.com/search')) {
      currentEngine = 'Yahoo';
      isSearchEngine = true;
    } else if (url.includes('amazon.') && url.includes('/s?')) {
      currentEngine = 'Amazon';
      isSearchEngine = true;
    } else if (url.includes('youtube.com/results')) {
      currentEngine = 'YouTube';
      isSearchEngine = true;
    } else if (url.includes('wikipedia.org') && url.includes('search')) {
      currentEngine = 'Wikipedia';
      isSearchEngine = true;
    } else if ((url.includes('twitter.com/search') || url.includes('x.com/search'))) {
      currentEngine = 'Twitter/X';
      isSearchEngine = true;
    } else if (url.includes('github.com/search')) {
      currentEngine = 'GitHub';
      isSearchEngine = true;
    } else if (url.includes('gitlab.com/search')) {
      currentEngine = 'GitLab';
      isSearchEngine = true;
    } else if (url.includes('stackoverflow.com/search')) {
      currentEngine = 'Stack Overflow';
      isSearchEngine = true;
    } else if (url.includes('reddit.com/search')) {
      currentEngine = 'Reddit';
      isSearchEngine = true;
    } else if (url.includes('pinterest.') && url.includes('/search/')) {
      currentEngine = 'Pinterest';
      isSearchEngine = true;
      isImageSearch = true;
    } else if (url.includes('startpage.com/search') || url.includes('startpage.com/sp/search')) {
      currentEngine = 'Startpage';
      isSearchEngine = true;
    } else if (url.includes('ecosia.org/search')) {
      currentEngine = 'Ecosia';
      isSearchEngine = true;
    } else if (url.includes('qwant.com/?q=')) {
      currentEngine = 'Qwant';
      isSearchEngine = true;
    } else if (url.includes('yandex.') && url.includes('/search/')) {
      currentEngine = 'Yandex';
      isSearchEngine = true;
      isImageSearch = url.includes('/images/');
    } else if (url.includes('baidu.com/s?')) {
      currentEngine = 'Baidu';
      isSearchEngine = true;
    } else if (url.includes('ebay.') && url.includes('/sch/')) {
      currentEngine = 'eBay';
      isSearchEngine = true;
    } else if (url.includes('aliexpress.com/wholesale')) {
      currentEngine = 'AliExpress';
      isSearchEngine = true;
    } else if (url.includes('etsy.com/search')) {
      currentEngine = 'Etsy';
      isSearchEngine = true;
    } else if (url.includes('scholar.google.com/scholar')) {
      currentEngine = 'Google Scholar';
      isSearchEngine = true;
    } else if (url.includes('archive.org/search')) {
      currentEngine = 'Archive.org';
      isSearchEngine = true;
    } else if (url.includes('wolframalpha.com/input')) {
      currentEngine = 'WolframAlpha';
      isSearchEngine = true;
    } else if (url.includes('open.spotify.com/search')) {
      currentEngine = 'Spotify';
      isSearchEngine = true;
    } else if (url.includes('soundcloud.com/search')) {
      currentEngine = 'SoundCloud';
      isSearchEngine = true;
    } else if (url.includes('vimeo.com/search')) {
      currentEngine = 'Vimeo';
      isSearchEngine = true;
    } else if ((url.includes('linkedin.com/search') || url.includes('linkedin.com/jobs/search'))) {
      currentEngine = 'LinkedIn';
      isSearchEngine = true;
    } else if (url.includes('tiktok.com/search')) {
      currentEngine = 'TikTok';
      isSearchEngine = true;
    }
    
    // Actualizar estado de interfaz según compatibilidad
    if (isSearchEngine && currentEngine) {
      let statusMessage = `Motor detectado: ${currentEngine}`;
      if (isImageSearch) {
        statusMessage += ' (Imágenes)';
      }
      updateStatus(statusMessage, 'success');
      
      // Habilitar/deshabilitar botones según el tipo de búsqueda
      document.querySelectorAll('.engine-button').forEach(btn => {
        const btnId = btn.id;
        
        // Si es búsqueda de imágenes, deshabilitar motores que no soportan imágenes
        if (isImageSearch) {
          const noImageSupport = ['wikipediaButton', 'amazonButton', 'openaiButton', 'twitterButton', 
            'youtubeButton', 'githubButton', 'gitlabButton', 'stackoverflowButton', 'redditButton',
            'ebayButton', 'aliexpressButton', 'etsyButton', 'scholarButton', 'archiveButton',
            'wolframalphaButton', 'spotifyButton', 'soundcloudButton', 'vimeoButton', 'linkedinButton',
            'tiktokButton'];
          
          if (noImageSupport.includes(btnId)) {
            btn.disabled = true;
            btn.title = 'Este motor no soporta búsqueda de imágenes';
          } else {
            btn.disabled = false;
            btn.title = '';
          }
        } else {
          // Para búsqueda normal, habilitar todos
          btn.disabled = false;
          btn.title = '';
        }
      });
    } else {
      updateStatus('No es una página de búsqueda compatible', 'warning');
      // Deshabilitar todos los botones de conversión
      document.querySelectorAll('.engine-button').forEach(btn => {
        btn.disabled = true;
      });
    }
  });
}

/**
 * @function saveConfiguration
 * @description Persiste la configuración actual en almacenamiento local
 */
async function saveConfiguration() {
  // Generar copia para exportación sin datos sensibles
  const configToSave = Object.assign({}, configState);
  
  // Cifrar la API key de OpenAI si existe
  if (configToSave.openAIApiKey && configToSave.openAIApiKey.length > 0 && 
      !configToSave.openAIApiKey.startsWith('•')) {
    try {
      const encryptedKey = await CryptoUtils.encrypt(configToSave.openAIApiKey);
      configToSave.openAIApiKey = encryptedKey;
    } catch (error) {
      console.error('Error al cifrar API key:', error);
      // Si falla el cifrado, no guardar la key
      delete configToSave.openAIApiKey;
    }
  }
  
  // Persistir configuración completa
  chrome.storage.local.set({
    'searchEngineConverterConfig': JSON.stringify(configToSave)
  }, function() {
    // Sincronizar atajos de teclado si están habilitados
    if (configState.enableKeyboardShortcut) {
      updateKeyboardShortcuts();
    }
  });
}

/**
 * @function updateKeyboardShortcuts
 * @description Actualiza la configuración de atajos de teclado globales
 */
function updateKeyboardShortcuts() {
  // Nota: Funcionalidad limitada por restricciones de la API de extensiones
  // Implementación para futuras versiones con soporte mejorado
  console.log('Atajo de teclado configurado:', configState.customShortcut);
}

/**
 * @function exportConfiguration
 * @description Exporta la configuración actual a un archivo JSON descargable
 */
function exportConfiguration() {
  // Generar copia sanitizada sin información sensible
  const configForExport = Object.assign({}, configState);
  delete configForExport.apiKey; // Eliminar credenciales por seguridad
  
  // Serializar con formato legible
  const dataStr = JSON.stringify(configForExport, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  // Generar nombre de archivo con timestamp
  const exportName = `search_converter_config_${new Date().toISOString().slice(0, 10)}.json`;
  
  // Crear mecanismo de descarga temporal
  const downloadLink = document.createElement('a');
  downloadLink.setAttribute('href', dataUri);
  downloadLink.setAttribute('download', exportName);
  downloadLink.click();
  
  showNotification('Configuración exportada correctamente', 'success');
}

/**
 * @function importConfiguration
 * @description Importa configuración desde archivo JSON seleccionado por el usuario
 */
function importConfiguration() {
  // Crear selector de archivo temporal
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  
  // Procesar contenido del archivo seleccionado
  fileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        // Deserializar y validar estructura
        const importedConfig = JSON.parse(e.target.result);
        
        // Verificar integridad mínima de la configuración
        if (!importedConfig.targetEngine) {
          throw new Error('Archivo de configuración no válido');
        }
        
        // Preservar credenciales existentes
        const currentApiKey = configState.apiKey;
        
        // Actualizar configuración manteniendo estructura
        Object.keys(importedConfig).forEach(key => {
          if (configState.hasOwnProperty(key)) {
            configState[key] = importedConfig[key];
          }
        });
        
        // Restaurar credenciales sensibles
        configState.apiKey = currentApiKey;
        
        // Persistir y actualizar interfaz
        saveConfiguration();
        applyConfigToUI();
        
        showNotification('Configuración importada correctamente', 'success');
      } catch (error) {
        console.error('Error al importar configuración:', error);
        showNotification('Error al importar configuración', 'error');
      }
    };
    
    // Iniciar lectura asíncrona
    reader.readAsText(file);
    document.body.removeChild(fileInput);
  });
  
  // Activar selección de archivo
  fileInput.click();
}

/**
 * @function resetConfiguration
 * @description Restablece la configuración a valores predeterminados
 */
function resetConfiguration() {
  if (confirm('¿Estás seguro de que deseas restablecer la configuración a sus valores predeterminados?')) {
    // Preservar credenciales sensibles
    const currentApiKey = configState.apiKey;
    
    // Reconstruir modelo de configuración con valores predeterminados
    configState = {
      targetEngine: 'google',
      includeImages: true,
      includeVideos: true,
      convertRelatedSearches: true,
      apiKey: currentApiKey, // Preservar credenciales
      autoConversion: false,
      enableKeyboardShortcut: true,
      customShortcut: 'Alt+G',
      saveHistory: false,
      theme: 'system',
      advancedMode: false
    };
    
    // Persistir y actualizar interfaz
    saveConfiguration();
    applyConfigToUI();
    
    showNotification('Configuración restablecida correctamente', 'success');
  }
}

/**
 * @function toggleAdvancedOptions
 * @description Controla la visibilidad del panel de opciones avanzadas
 * @param {boolean} show - Indicador de visibilidad a aplicar
 */
function toggleAdvancedOptions(show) {
  const advancedSection = document.getElementById('advancedOptions');
  if (advancedSection) {
    advancedSection.style.display = show ? 'block' : 'none';
    updatePopupHeight();
  }
}

/**
 * @function updatePopupHeight
 * @description Optimiza las dimensiones del popup según contenido visible
 */
function updatePopupHeight() {
  // Nota: Dimensionamiento dinámico gestionado por navegador en implementaciones modernas
  // Lógica de respaldo para casos específicos de ajuste manual
  const activeTab = document.querySelector('.tab-content.active');
  if (activeTab) {
    const minHeight = 300; // Altura mínima garantizada
    const contentHeight = activeTab.scrollHeight;
    const newHeight = Math.max(minHeight, contentHeight);
    
    // Aplicar ajuste solo en caso de cambio significativo
    if (Math.abs(document.body.scrollHeight - newHeight) > 50) {
      document.body.style.height = newHeight + 'px';
    }
  }
}

/**
 * @function applyTheme
 * @description Implementa el sistema de temas visuales y su detección automática
 */
function applyTheme() {
  const body = document.body;
  
  // Restablecer estado visual
  body.classList.remove('light-theme', 'dark-theme');
  
  // Aplicar tema según configuración
  if (configState.theme === 'system') {
    // Detección dinámica de preferencia del sistema
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      body.classList.add('dark-theme');
    } else {
      body.classList.add('light-theme');
    }
    
    // Registro de observador para cambios dinámicos
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
      body.classList.toggle('dark-theme', event.matches);
      body.classList.toggle('light-theme', !event.matches);
    });
  } else {
    // Aplicación de tema explícito seleccionado por usuario
    body.classList.add(configState.theme === 'dark' ? 'dark-theme' : 'light-theme');
  }
}

/**
 * @function showNotification
 * @description Sistema de notificaciones transitorias para retroalimentación al usuario
 * @param {string} message - Contenido textual del mensaje
 * @param {string} type - Clasificación visual (success, error, info)
 */
function showNotification(message, type) {
  // Localizar o crear contenedor de notificaciones
  let notificationContainer = document.getElementById('notification-container');
  
  if (!notificationContainer) {
    // Inicializar sistema de notificaciones
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    document.body.appendChild(notificationContainer);
  }
  
  // Crear instancia de notificación
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Añadir al sistema de notificaciones
  notificationContainer.appendChild(notification);
  
  // Aplicar transición de entrada con retraso para forzar animación
  setTimeout(() => {
    notification.classList.add('visible');
  }, 10);
  
  // Programar desaparición automática
  setTimeout(() => {
    notification.classList.remove('visible');
    
    // Eliminar del DOM tras completar transición
    setTimeout(() => {
      if (notification.parentNode === notificationContainer) {
        notificationContainer.removeChild(notification);
      }
      
      // Destruir contenedor cuando no hay notificaciones activas
      if (notificationContainer.childNodes.length === 0) {
        document.body.removeChild(notificationContainer);
      }
    }, 300);
  }, 3000);
}
