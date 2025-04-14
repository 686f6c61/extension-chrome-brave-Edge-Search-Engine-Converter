// Función para actualizar el estado con icono y clase apropiados
function updateStatus(message, type = 'info') {
  const statusElement = document.getElementById('status');
  const statusContainer = document.querySelector('.status-container');
  
  // Eliminar clases anteriores
  statusElement.classList.remove('success', 'error', 'warning');
  statusContainer.classList.remove('pulse');
  
  // Configurar el icono y la clase según el tipo
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
  
  // Actualizar el contenido
  statusElement.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
  
  // Añadir efecto de pulso para llamar la atención
  if (type === 'success' || type === 'error' || type === 'warning') {
    statusContainer.classList.add('pulse');
    setTimeout(() => statusContainer.classList.remove('pulse'), 2000);
  }
}

// Configuración de dominios y orden de botones (gestionada a través del panel de configuración)
let config = {
  amazonDomain: 'es',
  youtubeDomain: 'com',
  buttonOrder: ['googleButton', 'duckduckgoButton', 'bingButton', 'openaiButton', 'amazonButton', 'youtubeButton', 'braveButton', 'wikipediaButton'],
  defaultSearchEngine: 'googleButton', // Motor de búsqueda predeterminado para el menú contextual
  openAIApiKey: '', // Clave API de OpenAI
  openAIModel: 'gpt-4o-mini', // Modelo de OpenAI predeterminado
  openAIMaxTokens: 1000 // Límite de tokens para la respuesta
};

// Cargar configuración guardada si existe
function loadConfig() {
  // Verificar si chrome.storage está disponible
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get('searchEngineConverterConfig', function(data) {
    if (data.searchEngineConverterConfig) {
      config = JSON.parse(data.searchEngineConverterConfig);
      
      // Actualizar los selectores en la interfaz
      const amazonDomainSelect = document.getElementById('amazonDomain');
      if (amazonDomainSelect) {
        amazonDomainSelect.value = config.amazonDomain;
      }
      
      const youtubeDomainSelect = document.getElementById('youtubeDomain');
      if (youtubeDomainSelect) {
        youtubeDomainSelect.value = config.youtubeDomain;
      }
      
      const defaultSearchEngineSelect = document.getElementById('defaultSearchEngine');
      if (defaultSearchEngineSelect && config.defaultSearchEngine) {
        defaultSearchEngineSelect.value = config.defaultSearchEngine;
      }
      
      // Cargar configuración de OpenAI
      const openAIApiKeyInput = document.getElementById('openAIApiKey');
      if (openAIApiKeyInput && config.openAIApiKey) {
        openAIApiKeyInput.value = config.openAIApiKey;
      }
      
      const openAIModelSelect = document.getElementById('openAIModel');
      if (openAIModelSelect && config.openAIModel) {
        openAIModelSelect.value = config.openAIModel;
      }
      
      const openAIMaxTokensInput = document.getElementById('openAIMaxTokens');
      if (openAIMaxTokensInput && config.openAIMaxTokens) {
        openAIMaxTokensInput.value = config.openAIMaxTokens;
      }
      
      // Si no existe la configuración de orden de botones, inicializarla
      if (!config.buttonOrder) {
        config.buttonOrder = ['googleButton', 'duckduckgoButton', 'bingButton', 'openaiButton', 'amazonButton', 'youtubeButton'];
      }
      
      // Si no existe la configuración de motor predeterminado, inicializarla
      if (!config.defaultSearchEngine) {
        config.defaultSearchEngine = 'googleButton';
      }
      
      // Aplicar el orden de botones guardado
      applyButtonOrder();
    }
  });
  } else {
    // Fallback para cuando chrome.storage no está disponible
    console.log('chrome.storage.local no disponible, usando localStorage');
    const savedConfig = localStorage.getItem('searchEngineConverterConfig');
    if (savedConfig) {
      config = JSON.parse(savedConfig);
      
      // Actualizar los selectores en la interfaz
      const amazonDomainSelect = document.getElementById('amazonDomain');
      if (amazonDomainSelect) {
        amazonDomainSelect.value = config.amazonDomain;
      }
      
      const youtubeDomainSelect = document.getElementById('youtubeDomain');
      if (youtubeDomainSelect) {
        youtubeDomainSelect.value = config.youtubeDomain;
      }
      
      const defaultSearchEngineSelect = document.getElementById('defaultSearchEngine');
      if (defaultSearchEngineSelect && config.defaultSearchEngine) {
        defaultSearchEngineSelect.value = config.defaultSearchEngine;
      }
      
      // Cargar configuración de OpenAI
      const openAIApiKeyInput = document.getElementById('openAIApiKey');
      if (openAIApiKeyInput && config.openAIApiKey) {
        openAIApiKeyInput.value = config.openAIApiKey;
      }
      
      const openAIModelSelect = document.getElementById('openAIModel');
      if (openAIModelSelect && config.openAIModel) {
        openAIModelSelect.value = config.openAIModel;
      }
      
      const openAIMaxTokensInput = document.getElementById('openAIMaxTokens');
      if (openAIMaxTokensInput && config.openAIMaxTokens) {
        openAIMaxTokensInput.value = config.openAIMaxTokens;
      }
      
      // Si no existe la configuración de orden de botones, inicializarla
      if (!config.buttonOrder) {
        config.buttonOrder = ['googleButton', 'duckduckgoButton', 'bingButton', 'openaiButton', 'amazonButton', 'youtubeButton'];
      }
      
      // Si no existe la configuración de motor predeterminado, inicializarla
      if (!config.defaultSearchEngine) {
        config.defaultSearchEngine = 'googleButton';
      }
      
      // Aplicar el orden de botones guardado
      applyButtonOrder();
    }
  }
}

// Aplicar el orden de los botones en la interfaz
function applyButtonOrder() {
  const searchButtonsContainer = document.querySelector('.search-buttons');
  const buttonOrderList = document.getElementById('buttonOrderList');
  
  if (searchButtonsContainer && config.buttonOrder) {
    // Reordenar los botones en el contenedor principal
    const buttons = {};
    document.querySelectorAll('.search-button').forEach(button => {
      buttons[button.id] = button;
      button.remove(); // Quitar todos los botones
    });
    
    // Añadir los botones en el orden guardado
    config.buttonOrder.forEach(buttonId => {
      if (buttons[buttonId]) {
        searchButtonsContainer.appendChild(buttons[buttonId]);
      }
    });
    
    // Reordenar la lista en el panel de configuración si existe
    if (buttonOrderList) {
      const listItems = {};
      buttonOrderList.querySelectorAll('li').forEach(item => {
        listItems[item.getAttribute('data-id')] = item;
        item.remove(); // Quitar todos los elementos
      });
      
      // Añadir los elementos en el orden guardado
      config.buttonOrder.forEach(buttonId => {
        if (listItems[buttonId]) {
          buttonOrderList.appendChild(listItems[buttonId]);
        }
      });
    }
  }
}

// Guardar configuración
function saveConfig() {
  // Obtener valores de los selectores
  const amazonDomainSelect = document.getElementById('amazonDomain');
  const youtubeDomainSelect = document.getElementById('youtubeDomain');
  const defaultSearchEngineSelect = document.getElementById('defaultSearchEngine');
  const openAIApiKeyInput = document.getElementById('openAIApiKey');
  const openAIModelSelect = document.getElementById('openAIModel');
  const openAIMaxTokensInput = document.getElementById('openAIMaxTokens');
  
  if (amazonDomainSelect && youtubeDomainSelect && defaultSearchEngineSelect) {
    config.amazonDomain = amazonDomainSelect.value;
    config.youtubeDomain = youtubeDomainSelect.value;
    config.defaultSearchEngine = defaultSearchEngineSelect.value;
    
    // Guardar configuración de OpenAI
    if (openAIApiKeyInput) {
      config.openAIApiKey = openAIApiKeyInput.value;
    }
    
    if (openAIModelSelect) {
      config.openAIModel = openAIModelSelect.value;
    }
    
    if (openAIMaxTokensInput) {
      config.openAIMaxTokens = parseInt(openAIMaxTokensInput.value) || 1000;
    }
    
    // Obtener el orden actual de los botones desde la lista de configuración
    const buttonOrderList = document.getElementById('buttonOrderList');
    if (buttonOrderList) {
      const newOrder = [];
      buttonOrderList.querySelectorAll('li').forEach(item => {
        newOrder.push(item.getAttribute('data-id'));
      });
      config.buttonOrder = newOrder;
    }
    
    // Verificar si chrome.storage está disponible
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      // Guardar en chrome.storage.local
      chrome.storage.local.set({
        'searchEngineConverterConfig': JSON.stringify(config)
      }, function() {
      // Aplicar el nuevo orden de botones
      applyButtonOrder();
      
      // Mostrar mensaje de éxito
      updateStatus('Configuración guardada correctamente', 'success');
      
      // Cerrar panel de configuración
      toggleConfigPanel(false);
      });
    } else {
      // Fallback para cuando chrome.storage no está disponible
      console.log('chrome.storage.local no disponible, usando localStorage');
      localStorage.setItem('searchEngineConverterConfig', JSON.stringify(config));
      
      // Aplicar el nuevo orden de botones
      applyButtonOrder();
      
      // Mostrar mensaje de éxito
      updateStatus('Configuración guardada correctamente', 'success');
      
      // Cerrar panel de configuración
      toggleConfigPanel(false);
    }
  }
}

// Mostrar/ocultar panel de configuración - versión simplificada
function toggleConfigPanel(show) {
  const configPanel = document.getElementById('configPanel');
  if (!configPanel) {
    console.error('Panel de configuración no encontrado');
    return;
  }
  
  console.log('Panel encontrado, toggling visibility');
  
  // Método simple: alternar entre display block y none
  if (show === undefined) {
    // Si el panel está visible, ocultarlo; si está oculto, mostrarlo
    if (configPanel.style.display === 'block') {
      configPanel.style.display = 'none';
    } else {
      configPanel.style.display = 'block';
    }
  } else {
    // Establecer específicamente
    configPanel.style.display = show ? 'block' : 'none';
  }
  
  console.log('Panel visibility set to:', configPanel.style.display);
}

// Función para animar botones durante el proceso
function animateButtons(isProcessing = false, buttonId = null) {
  const buttons = document.querySelectorAll('.search-button');
  const iconMap = {
    'googleButton': '<i class="fab fa-google" style="color: #4285F4;"></i> Google',
    'duckduckgoButton': '<i class="fab fa-d-and-d" style="color: #DE5833;"></i> DuckDuckGo',
    'bingButton': '<i class="fab fa-microsoft" style="color: #008373;"></i> Bing',
    'openaiButton': '<i class="fas fa-robot" style="color: #10A37F;"></i> OpenAI',
    'amazonButton': '<i class="fab fa-amazon" style="color: #FF9900;"></i> Amazon',
    'youtubeButton': '<i class="fab fa-youtube" style="color: #FF0000;"></i> YouTube',
    'braveButton': '<i class="fas fa-shield-alt" style="color: #FB542B;"></i> Brave',
    'wikipediaButton': '<i class="fab fa-wikipedia-w" style="color: #000000;"></i> Wikipedia'
  };
  
  if (isProcessing && buttonId) {
    // Desactivar todos los botones
    buttons.forEach(button => {
      button.disabled = true;
      button.style.backgroundColor = '#555555';
    });
    
    // Mostrar animación solo en el botón seleccionado
    const selectedButton = document.getElementById(buttonId);
    selectedButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
  } else {
    // Restaurar todos los botones
    buttons.forEach(button => {
      button.innerHTML = iconMap[button.id];
      button.disabled = false;
      button.style.backgroundColor = '#212121';
    });
  }
}

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

// Detectar si estamos en una página de búsqueda al abrir el popup
document.addEventListener('DOMContentLoaded', function() {
  // Cargar configuración guardada
  loadConfig();
  
  // Configurar listeners para el panel de configuración
  const configToggleButton = document.getElementById('configToggleButton');
  if (configToggleButton) {
    configToggleButton.addEventListener('click', function() {
      console.log('Botón de configuración clickeado');
      toggleConfigPanel();
    });
  } else {
    console.error('Botón de configuración no encontrado');
  }
  
  const saveConfigButton = document.getElementById('saveConfigButton');
  if (saveConfigButton) {
    saveConfigButton.addEventListener('click', function() {
      console.log('Botón de guardar configuración clickeado');
      saveConfig();
    });
  } else {
    console.error('Botón de guardar configuración no encontrado');
  }
  
  // Inicializar Sortable.js para permitir arrastrar y soltar los botones
  const buttonOrderList = document.getElementById('buttonOrderList');
  if (buttonOrderList && typeof Sortable !== 'undefined') {
    new Sortable(buttonOrderList, {
      animation: 150,
      ghostClass: 'button-order-ghost',
      handle: '.fa-grip-lines',
      onEnd: function(evt) {
        // No guardamos automáticamente al reordenar, solo al hacer clic en Guardar
      }
    });
  }
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let currentTab = tabs[0];
    try {
      // Detectar si estamos en una página de búsqueda
      const searchEngine = detectSearchEngine(currentTab.url);
      
      if (searchEngine) {
        updateStatus(`Búsqueda detectada en ${searchEngine.name}. ¿A qué motor deseas cambiar?`, 'info');
      } else {
        updateStatus('No estás en una página de búsqueda compatible', 'warning');
        // Desactivar todos los botones
        document.querySelectorAll('.search-button').forEach(button => {
          button.disabled = true;
          button.style.backgroundColor = '#555555';
        });
      }
    } catch (error) {
      updateStatus('Error al analizar la URL', 'error');
      console.error('Error al analizar la URL:', error);
    }
  });
});

// Función para cambiar el motor de búsqueda
function changeSearchEngine(engineName, engineUrl) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    let currentTab = tabs[0];
    
    try {
      // Detectar el motor de búsqueda actual
      const searchEngine = detectSearchEngine(currentTab.url);
      
      if (searchEngine) {
        // Animar botones mientras se procesa
        const buttonId = {
          'Google': 'googleButton',
          'DuckDuckGo': 'duckduckgoButton',
          'Bing': 'bingButton',
          'OpenAI': 'openaiButton',
          'Amazon': 'amazonButton',
          'YouTube': 'youtubeButton',
          'Brave': 'braveButton',
          'Wikipedia': 'wikipediaButton'
        }[engineName];
        
        animateButtons(true, buttonId);
        
        let query = searchEngine.query;
        let newUrl = `${engineUrl}${encodeURIComponent(query)}`;
        
        // Pequeña demora para mostrar la animación
        setTimeout(() => {
          chrome.tabs.update(currentTab.id, {url: newUrl}, function() {
            if (chrome.runtime.lastError) {
              updateStatus('Error: ' + chrome.runtime.lastError.message, 'error');
              animateButtons(false);
            } else {
              updateStatus(`¡Cambiado a ${engineName} con éxito!`, 'success');
              setTimeout(() => {
                animateButtons(false);
              }, 1000);
            }
          });
        }, 500);
      } else {
        updateStatus('No estás en una página de búsqueda compatible', 'warning');
      }
    } catch (error) {
      updateStatus('Error al procesar la búsqueda', 'error');
      console.error('Error al procesar la búsqueda:', error);
      animateButtons(false);
    }
  });
}

// Manejar clics en cada botón
document.getElementById('googleButton').addEventListener('click', function() {
  changeSearchEngine('Google', 'https://www.google.com/search?q=');
});

document.getElementById('duckduckgoButton').addEventListener('click', function() {
  changeSearchEngine('DuckDuckGo', 'https://duckduckgo.com/?q=');
});

document.getElementById('bingButton').addEventListener('click', function() {
  changeSearchEngine('Bing', 'https://www.bing.com/search?q=');
});

document.getElementById('openaiButton').addEventListener('click', function() {
  changeSearchEngine('OpenAI', 'https://chat.openai.com/?q=');
});

document.getElementById('amazonButton').addEventListener('click', function() {
  const amazonUrl = `https://www.amazon.${config.amazonDomain}/s?k=`;
  changeSearchEngine('Amazon', amazonUrl);
});

document.getElementById('youtubeButton').addEventListener('click', function() {
  // Fix: Usar el patrón correcto para la URL de YouTube con el dominio configurado
  const youtubeDomain = config.youtubeDomain || 'com';
  let youtubeUrl;
  
  if (youtubeDomain.startsWith('.')) {
    youtubeUrl = `https://www.youtube${youtubeDomain}/results?search_query=`;
  } else {
    youtubeUrl = `https://www.youtube.com/${youtubeDomain === 'com' ? '' : youtubeDomain + '/'}results?search_query=`;
  }
  
  changeSearchEngine('YouTube', youtubeUrl);
});

document.getElementById('braveButton').addEventListener('click', function() {
  changeSearchEngine('Brave', 'https://search.brave.com/search?q=');
});

document.getElementById('wikipediaButton').addEventListener('click', function() {
  changeSearchEngine('Wikipedia', 'https://es.wikipedia.org/wiki/Special:Search?search=');
});
