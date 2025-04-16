/**
 * @module CaptureModule
 * @description Subsistema especializado para adquisición, manipulación y análisis de imágenes.
 * Implementa arquitectura modular para captura de pantalla, procesamiento de regiones
 * y comunicación asíncrona con servicios de visión computacional externos.
 */

// Parámetros de configuración para procesamiento de imágenes
const captureConfig = {
  quality: 0.85,         // Ratio de compresión para serialización (0-1)
  format: 'png',         // Codificación de salida (png/jpeg)
  maxWidth: 1920,        // Límite de resolución horizontal para optimización
  compressionLevel: 9,   // Nivel de optimización para compresión sin pérdida
  selectionEnabled: true // Control de funcionalidad de selección regional
};

// Modelo de estado central de la aplicación
let appState = {
  screenshotData: null,  // Buffer de imagen serializado en formato base64
  selectionActive: false,// Indicador de operación de selección en curso
  apiKey: null,          // Token de autenticación para APIs externas
  analysisInProgress: false, // Semáforo para operaciones concurrentes
  analysisResult: null,  // Caché de resultado de última inferencia
  selectedArea: null     // Descriptor geométrico de región seleccionada
};

/**
 * @function initCapturePage
 * @description Punto de entrada principal. Inicializa subsistemas y establece topología de eventos.
 * Implementa patrón de inicialización secuencial garantizando dependencias correctas.
 */
document.addEventListener('DOMContentLoaded', function() {
  // Secuencia de inicialización con orden de dependencias
  setupUI();
  setupMessageListeners();
  setupEventHandlers();
  loadApiKeyFromStorage();
});

/**
 * @function setupUI
 * @description Constructor de interfaz de usuario y gestor de estado inicial de componentes.
 * Aplica inicialización condicional y enlaza selectores con controladores correspondientes.
 */
function setupUI() {
  // Referencias a nodos DOM principales
  const screenshotContainer = document.getElementById('screenshotContainer');
  const analysisPanel = document.getElementById('analysisPanel');
  const loadingSpinner = document.getElementById('loadingSpinner');
  
  // Establecer estado inicial para componentes visuales
  if (analysisPanel) {
    analysisPanel.style.display = 'none';
  }
  
  if (loadingSpinner) {
    loadingSpinner.style.display = 'none';
  }
  
  // Inicializar conmutador de servicios
  const serviceSelector = document.getElementById('analysisServiceSelector');
  if (serviceSelector) {
    serviceSelector.addEventListener('change', function() {
      // Implementar patrón observador para cambios de servicio
      const selectedService = serviceSelector.value;
      toggleServiceSpecificFields(selectedService);
    });
  }
}

/**
 * @function setupMessageListeners
 * @description Implementa canal de comunicación con procesos de fondo mediante API de mensajería.
 * Establece receptor asíncrono para procesamiento de comandos interdocumento.
 */
function setupMessageListeners() {
  // Registrar manejador para el bus de mensajes de la extensión
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    console.log('Mensaje recibido en capture.js:', message.action);
    
    if (message.action === 'setScreenshot' && message.dataUrl) {
      // Procesar comando de establecimiento de imagen
      setScreenshotImage(message.dataUrl);
      sendResponse({ success: true });
    }
  });
}

/**
 * @function setScreenshotImage
 * @description Establece imagen capturada y reconfigura interfaz para modo de edición.
 * Gestiona ciclo de vida completo del elemento visual desde creación hasta manipulación.
 * @param {string} dataUrl - Representación serializada de imagen en formato URI (base64)
 */
function setScreenshotImage(dataUrl) {
  // Persistir estado en modelo de aplicación
  appState.screenshotData = dataUrl;
  
  // Implementar patrón singleton para elemento de imagen
  const imgElement = document.getElementById('screenshotImage') || new Image();
  imgElement.id = 'screenshotImage';
  imgElement.src = dataUrl;
  imgElement.style.maxWidth = '100%';
  imgElement.onload = function() {
    // Reconfigurar contenedor tras carga completa
    const container = document.getElementById('screenshotContainer');
    if (container) {
      container.innerHTML = '';
      container.appendChild(imgElement);
      container.style.display = 'block';
    }
    
    // Activar interfaz de análisis condicionalmente
    const analysisPanel = document.getElementById('analysisPanel');
    if (analysisPanel) {
      analysisPanel.style.display = 'block';
    }
    
    // Inicializar subsistema de selección si está habilitado
    if (captureConfig.selectionEnabled) {
      enableAreaSelection(imgElement);
    }
  };
}

/**
 * @function enableAreaSelection
 * @description Implementa capa de interacción para selección vectorial sobre imagen.
 * Crea estructura DOM jerárquica para captura de eventos de selección regional.
 * @param {HTMLImageElement} imgElement - Elemento DOM imagen sobre el que se aplicará selección
 */
function enableAreaSelection(imgElement) {
  // Implementar patrón Decorator para añadir funcionalidad de selección
  if (!document.getElementById('selectionOverlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'selectionOverlay';
    overlay.style.position = 'absolute';
    overlay.style.top = `${imgElement.offsetTop}px`;
    overlay.style.left = `${imgElement.offsetLeft}px`;
    overlay.style.width = `${imgElement.offsetWidth}px`;
    overlay.style.height = `${imgElement.offsetHeight}px`;
    
    // Establecer contexto posicional para sistema de coordenadas
    const container = document.getElementById('screenshotContainer');
    container.style.position = 'relative';
    container.appendChild(overlay);
    
    // Enlazar manejadores de eventos interactivos
    setupSelectionEvents(overlay, imgElement);
  }
}

/**
 * @function setupSelectionEvents
 * @description Configura sistema de eventos para interacción vectorial bidimensional.
 * Implementa máquina de estados para tracking de operación de selección con feedback visual.
 * @param {HTMLElement} overlay - Capa de captura de eventos interactivos
 * @param {HTMLImageElement} imgElement - Referencia base para cálculos geométricos
 */
function setupSelectionEvents(overlay, imgElement) {
  let startX, startY, endX, endY;
  let isSelecting = false;
  let selectionBox = null;
  
  // Manejador de inicio de operación vectorial
  overlay.addEventListener('mousedown', function(e) {
    // Calcular coordenadas normalizadas en espacio de overlay
    startX = e.clientX - overlay.getBoundingClientRect().left;
    startY = e.clientY - overlay.getBoundingClientRect().top;
    
    // Activar estado operativo de selección
    isSelecting = true;
    appState.selectionActive = true;
    
    // Implementar patrón de limpieza previa
    if (selectionBox) {
      overlay.removeChild(selectionBox);
    }
    
    // Generar elemento visual de feedback
    selectionBox = document.createElement('div');
    selectionBox.className = 'selection-box';
    selectionBox.style.position = 'absolute';
    selectionBox.style.border = '2px dashed #3498db';
    selectionBox.style.backgroundColor = 'rgba(52, 152, 219, 0.2)';
    selectionBox.style.pointerEvents = 'none';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.left = startX + 'px';
    
    overlay.appendChild(selectionBox);
  });
  
  // Manejador de progreso de selección vectorial
  overlay.addEventListener('mousemove', function(e) {
    if (!isSelecting) return;
    
    // Actualizar coordenadas terminales en tiempo real
    endX = e.clientX - overlay.getBoundingClientRect().left;
    endY = e.clientY - overlay.getBoundingClientRect().top;
    
    // Aplicar restricciones de límites espaciales
    endX = Math.max(0, Math.min(endX, imgElement.offsetWidth));
    endY = Math.max(0, Math.min(endY, imgElement.offsetHeight));
    
    // Cálculo de propiedades geométricas de selección
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    
    // Actualizar representación visual en tiempo real
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.left = left + 'px';
  });
  
  // Manejador de finalización de operación vectorial
  overlay.addEventListener('mouseup', function() {
    if (!isSelecting) return;
    
    // Finalizar estado operativo
    isSelecting = false;
    
    // Calcular factores de escala para resolución nativa
    const scaleX = imgElement.naturalWidth / imgElement.offsetWidth;
    const scaleY = imgElement.naturalHeight / imgElement.offsetHeight;
    
    // Persistir descriptor geométrico normalizado
    appState.selectedArea = {
      x: Math.round(Math.min(startX, endX) * scaleX),
      y: Math.round(Math.min(startY, endY) * scaleY),
      width: Math.round(Math.abs(endX - startX) * scaleX),
      height: Math.round(Math.abs(endY - startY) * scaleY)
    };
    
    console.log('Área seleccionada:', appState.selectedArea);
    
    // Actualizar estado UI para operaciones de manipulación
    const cropButton = document.getElementById('cropButton');
    if (cropButton) {
      cropButton.disabled = false;
    }
  });
}

/**
 * @function setupEventHandlers
 * @description Inicializa manejadores de eventos para controles de interfaz de usuario.
 * Implementa arquitectura basada en eventos para operaciones asíncronas de análisis y manipulación.
 */
function setupEventHandlers() {
  // Controlador para operación de análisis de imagen
  const analyzeButton = document.getElementById('analyzeButton');
  if (analyzeButton) {
    analyzeButton.addEventListener('click', function() {
      if (!appState.screenshotData) {
        showNotification('Error', 'No hay captura de pantalla para analizar');
        return;
      }
      
      // Iniciar flujo asíncrono de análisis
      analyzeImage();
    });
  }
  
  // Controlador para operación de recorte vectorial
  const cropButton = document.getElementById('cropButton');
  if (cropButton) {
    cropButton.disabled = true; // Estado inicial deshabilitado
    cropButton.addEventListener('click', function() {
      if (!appState.selectedArea) {
        showNotification('Error', 'No hay área seleccionada para recortar');
        return;
      }
      
      // Ejecutar transformación de imagen
      cropSelectedArea();
    });
  }
  
  // Controlador para operación de exportación
  const downloadButton = document.getElementById('downloadButton');
  if (downloadButton) {
    downloadButton.addEventListener('click', function() {
      if (!appState.screenshotData) {
        showNotification('Error', 'No hay captura de pantalla para descargar');
        return;
      }
      
      // Generar identificador temporal único
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Implementar mecanismo de descarga vía API de Blob
      const link = document.createElement('a');
      link.href = appState.screenshotData;
      link.download = `captura_${timestamp}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
  
  // Controlador para gestión de credenciales
  const saveApiKeyButton = document.getElementById('saveApiKeyButton');
  if (saveApiKeyButton) {
    saveApiKeyButton.addEventListener('click', function() {
      const apiKeyInput = document.getElementById('apiKeyInput');
      if (apiKeyInput && apiKeyInput.value) {
        // Persistir token de autenticación
        saveApiKey(apiKeyInput.value);
      }
    });
  }
}

/**
 * @function cropSelectedArea
 * @description Implementa operación de transformación geométrica para extracción de región.
 * Utiliza APIs de Canvas para manipulación de mapa de bits con precisión de píxel.
 */
function cropSelectedArea() {
  if (!appState.selectedArea || !appState.screenshotData) {
    console.error('No hay área seleccionada o imagen para recortar');
    return;
  }
  
  // Inicializar buffer temporal para operación
  const img = new Image();
  img.onload = function() {
    // Crear contexto de renderizado para manipulación
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
    
    // Configurar dimensiones objetivo para transformación
    canvas.width = appState.selectedArea.width;
    canvas.height = appState.selectedArea.height;
    
    // Ejecutar operación de recorte mediante contexto gráfico
      ctx.drawImage(
      img,
      appState.selectedArea.x,
      appState.selectedArea.y,
      appState.selectedArea.width,
      appState.selectedArea.height,
      0, 0,
      appState.selectedArea.width,
      appState.selectedArea.height
    );
    
    // Serializar resultado de transformación
    const croppedDataUrl = canvas.toDataURL(`image/${captureConfig.format}`, captureConfig.quality);
    
    // Actualizar modelo con resultado procesado
    setScreenshotImage(croppedDataUrl);
    
    // Restablecer estado operativo
    appState.selectedArea = null;
    
    // Sincronizar estado de interfaz
    const cropButton = document.getElementById('cropButton');
    if (cropButton) {
      cropButton.disabled = true;
    }
  };
  
  // Iniciar carga asíncrona de datos fuente
  img.src = appState.screenshotData;
}

/**
 * @function analyzeImage
 * @description Orquesta proceso de análisis de imagen mediante servicios de IA externos.
 * Implementa flujo asíncrono completo desde preparación hasta visualización de resultados.
 */
function analyzeImage() {
  if (!appState.screenshotData) {
    showNotification('Error', 'No hay imagen para analizar');
    return;
  }
  
  // Validar exclusión mutua para operaciones concurrentes
  if (appState.analysisInProgress) {
    showNotification('Info', 'Ya hay un análisis en curso');
    return;
  }
  
  // Resolver proveedor de servicio seleccionado
  const serviceSelector = document.getElementById('analysisServiceSelector');
  const selectedService = serviceSelector ? serviceSelector.value : 'openai';
  
  // Resolver credenciales de autenticación
  let apiKey = null;
  if (selectedService === 'openai') {
    apiKey = appState.apiKey || document.getElementById('apiKeyInput').value;
  }
  
  // Validar requerimientos de seguridad
  if (!apiKey) {
    showNotification('Error', 'Se requiere una clave API para el análisis');
    return;
  }
  
  // Activar semáforo de operación
  appState.analysisInProgress = true;
  
  // Actualizar estado visual de interfaz
  const loadingSpinner = document.getElementById('loadingSpinner');
  if (loadingSpinner) {
    loadingSpinner.style.display = 'block';
  }
  
  // Preparar contenedor para resultados
  const resultContainer = document.getElementById('analysisResult');
  if (resultContainer) {
    resultContainer.innerHTML = '<p>Analizando imagen...</p>';
  }
  
  // Normalizar formato de datos para transmisión
  const base64Data = appState.screenshotData.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
  
  // Extraer parámetros de configuración para inferencia
  const analysisOptions = {
    model: document.getElementById('modelSelector')?.value || 'gpt-4-vision-preview',
    maxTokens: parseInt(document.getElementById('maxTokensInput')?.value || '1000', 10),
    prompt: document.getElementById('promptInput')?.value || 'Describe detalladamente lo que ves en esta imagen'
  };
  
  // Iniciar petición asíncrona al proceso de fondo
  chrome.runtime.sendMessage({
    action: 'analyzeImage',
    imageData: appState.screenshotData,
    apiKey: apiKey,
    options: analysisOptions
  }, function(response) {
    // Liberar semáforo de operación
    appState.analysisInProgress = false;
    
    // Restaurar estado visual de interfaz
    if (loadingSpinner) {
      loadingSpinner.style.display = 'none';
    }
    
    // Procesamiento condicional de respuesta
    if (response.success) {
      // Persistir resultado en modelo de aplicación
      appState.analysisResult = response.analysis;
      
      if (resultContainer) {
        resultContainer.innerHTML = `<div class="analysis-content">${formatAnalysisResult(response.analysis)}</div>`;
      }
    } else {
      // Manejar condición de error
      console.error('Error en análisis:', response.error);
      
      if (resultContainer) {
        resultContainer.innerHTML = `<div class="error-message">Error: ${response.error}</div>`;
      }
    }
  });
}

/**
 * @function formatAnalysisResult
 * @description Transforma resultado textual a formato estructurado para presentación.
 * Implementa algoritmo de procesamiento para optimizar legibilidad del análisis.
 * @param {string} text - Contenido textual del análisis en formato plano
 * @returns {string} Marcado HTML estructurado con formato optimizado
 */
function formatAnalysisResult(text) {
  if (!text) return '<p>No se obtuvo resultado del análisis</p>';
  
  // Aplicar transformación estructural para visualización
  return text.split('\n\n')
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * @function saveApiKey
 * @description Implementa persistencia segura de credenciales de autenticación.
 * Utiliza API de almacenamiento local con integración en configuración global.
 * @param {string} apiKey - Token de autenticación para APIs externas
 */
function saveApiKey(apiKey) {
  if (!apiKey) return;
  
  // Actualizar en contexto de memoria
  appState.apiKey = apiKey;
  
  // Obtener configuración persistente
  chrome.storage.local.get('searchEngineConverterConfig', function(data) {
    let config = {};
    
    try {
      // Resolver configuración preexistente o inicializar nueva
      config = data.searchEngineConverterConfig ? 
        JSON.parse(data.searchEngineConverterConfig) : {};
    } catch (e) {
      console.error('Error al analizar configuración:', e);
    }
    
    // Integrar credencial en estructura de configuración
    config.openAIApiKey = apiKey;
    
    // Persistir en almacenamiento
    chrome.storage.local.set({
      'searchEngineConverterConfig': JSON.stringify(config)
    }, function() {
      showNotification('Éxito', 'Clave API guardada correctamente');
    });
  });
}

/**
 * @function loadApiKeyFromStorage
 * @description Implementa recuperación de credenciales desde almacenamiento persistente.
 * Sincroniza estado de memoria con configuración almacenada, aplicando máscara visual.
 */
function loadApiKeyFromStorage() {
  chrome.storage.local.get('searchEngineConverterConfig', function(data) {
    if (data.searchEngineConverterConfig) {
      try {
        // Deserializar configuración almacenada
        const config = JSON.parse(data.searchEngineConverterConfig);
        
        // Procesar credencial si existe
        if (config.openAIApiKey) {
          appState.apiKey = config.openAIApiKey;
          
          // Actualizar representación visual aplicando enmascaramiento
          const apiKeyInput = document.getElementById('apiKeyInput');
          if (apiKeyInput) {
            apiKeyInput.value = '••••••••••••••••••••••••••';
            apiKeyInput.placeholder = 'Clave API guardada';
          }
        }
      } catch (e) {
        console.error('Error al cargar configuración:', e);
      }
    }
  });
}

/**
 * @function toggleServiceSpecificFields
 * @description Gestiona visibilidad condicional de controles específicos por servicio.
 * Implementa patrón de interfaz adaptativa según contexto operativo seleccionado.
 * @param {string} serviceName - Identificador del servicio activo
 */
function toggleServiceSpecificFields(serviceName) {
  // Resolver referencias a contenedores de configuración
  const openaiFields = document.getElementById('openaiFields');
  const otherServiceFields = document.getElementById('otherServiceFields');
  
  // Aplicar reglas de visibilidad condicional
  if (openaiFields) {
    openaiFields.style.display = serviceName === 'openai' ? 'block' : 'none';
  }
  
  if (otherServiceFields) {
    otherServiceFields.style.display = serviceName === 'other' ? 'block' : 'none';
  }
}

/**
 * @function showNotification
 * @description Sistema de notificaciones transitorias con generación dinámica de elementos.
 * Implementa creación, estilizado y ciclo de vida completo de notificaciones temporales.
 * @param {string} type - Categoría semántica de la notificación (Error|Éxito|Info)
 * @param {string} message - Contenido informativo del mensaje
 */
function showNotification(type, message) {
  // Resolver o crear contenedor principal de notificaciones
  let notifications = document.getElementById('notificationContainer');
  
  if (!notifications) {
    // Inicializar contenedor con posicionamiento absoluto
    notifications = document.createElement('div');
    notifications.id = 'notificationContainer';
    notifications.style.position = 'fixed';
    notifications.style.bottom = '20px';
    notifications.style.right = '20px';
    notifications.style.zIndex = '9999';
    document.body.appendChild(notifications);
  }
  
  // Generar elemento de notificación individual
  const notification = document.createElement('div');
  notification.className = `notification ${type.toLowerCase()}`;
  notification.innerHTML = `
    <div class="notification-header">${type}</div>
    <div class="notification-message">${message}</div>
  `;
  
  // Aplicar estilizado programático según categoría
  notification.style.backgroundColor = type === 'Error' ? '#f44336' : 
                                       type === 'Éxito' ? '#4CAF50' : '#2196F3';
  notification.style.color = 'white';
  notification.style.padding = '10px 15px';
  notification.style.marginBottom = '10px';
  notification.style.borderRadius = '4px';
  notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  notification.style.minWidth = '250px';
  
  // Integrar en sistema de notificaciones
  notifications.appendChild(notification);
  
  // Implementar ciclo de vida con desvanecimiento temporal
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    
    // Programar eliminación del DOM tras transición
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 500);
  }, 3000);
}
