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
  apiKey: null,                         // Credenciales de autenticación para APIs
  autoConversion: false,                // Activar conversión automática en navegación
  enableKeyboardShortcut: true,         // Habilitación de atajos de teclado globales
  customShortcut: 'Alt+G',              // Combinación de teclas para activación rápida
  saveHistory: false,                   // Persistencia de historial de conversiones
  theme: 'system',                      // Esquema visual (system, light, dark)
  advancedMode: false                   // Habilitación de funcionalidades extendidas
};

/**
 * @function initializePopup
 * @description Punto de entrada principal que inicializa los componentes al cargar el documento
 */
document.addEventListener('DOMContentLoaded', function() {
  // Secuencia de inicialización de componentes
  setupTabNavigation();
  loadConfiguration();
  setupEventListeners();
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
function loadConfiguration() {
  chrome.storage.local.get('searchEngineConverterConfig', function(data) {
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
  
  // Proteger visualización de credenciales API
  const apiKeyInput = document.getElementById('apiKey');
  if (apiKeyInput && configState.apiKey) {
    apiKeyInput.value = '••••••••••••••••••••••••••';
    apiKeyInput.placeholder = 'Clave API guardada';
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
  
  // Acción de captura de pantalla
  const captureButton = document.getElementById('captureButton');
  if (captureButton) {
    captureButton.addEventListener('click', handleCaptureClick);
  }
  
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
  
  // Gestión de credenciales API
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyButton = document.getElementById('saveApiKey');
  
  if (apiKeyInput && saveApiKeyButton) {
    saveApiKeyButton.addEventListener('click', function() {
      if (apiKeyInput.value && apiKeyInput.value !== '••••••••••••••••••••••••••') {
        configState.apiKey = apiKeyInput.value;
        saveConfiguration();
        
        // Implementar oscurecimiento para protección visual
        apiKeyInput.value = '••••••••••••••••••••••••••';
        apiKeyInput.placeholder = 'Clave API guardada';
        
        showNotification('Clave API guardada correctamente', 'success');
      }
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
 * @function handleCaptureClick
 * @description Gestiona la acción de captura de pantalla
 */
function handleCaptureClick() {
  // Recuperar contexto de pestaña activa
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const activeTab = tabs[0];
    
    // Notificar inicio de operación al usuario
    showNotification('Capturando pantalla...', 'info');
    
    // Cerrar popup para evitar interferencia visual
    window.close();
    
    // Solicitar operación de captura al proceso de fondo
    chrome.runtime.sendMessage({
      action: 'captureScreen',
      tabId: activeTab.id
    });
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
    
    // Validar mediante patrones de URL de motores soportados
    const isSearchEngine = (
      url.includes('google.com/search') ||
      url.includes('bing.com/search') ||
      url.includes('yahoo.com/search') ||
      url.includes('duckduckgo.com') ||
      url.includes('brave.com/search')
    );
    
    // Actualizar estado de interfaz según compatibilidad
    const convertButton = document.getElementById('convertButton');
    const statusMessage = document.getElementById('statusMessage');
    
    if (convertButton && statusMessage) {
      if (isSearchEngine) {
        convertButton.disabled = false;
        statusMessage.textContent = 'Página de búsqueda detectada';
        statusMessage.className = 'status-message compatible';
      } else {
        convertButton.disabled = true;
        statusMessage.textContent = 'No es una página de búsqueda compatible';
        statusMessage.className = 'status-message incompatible';
      }
        }
      });
    }

/**
 * @function saveConfiguration
 * @description Persiste la configuración actual en almacenamiento local
 */
function saveConfiguration() {
  // Generar copia para exportación sin datos sensibles
  const configForExport = Object.assign({}, configState);
  
  // Persistir configuración completa
  chrome.storage.local.set({
    'searchEngineConverterConfig': JSON.stringify(configState)
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
