/**
 * ScreenshotModule - Core module for screen capture and OpenAI integration
 * Provides functionality for user selection, image processing, and API communication
 */
const ScreenshotModule = (() => {
  // OpenAI API configuration parameters
  let openAIConfig = {
    apiKey: '', 
    model: 'gpt-4o-mini', 
    maxTokens: 1000 
  };

  /**
   * Loads extension configuration from Chrome storage
   * Retrieves API keys and model preferences
   * @returns {Promise} Resolves when configuration is loaded
   */
  const loadConfig = () => {
    return new Promise((resolve) => {
      chrome.storage.local.get('braveSearchConverterConfig', function(data) {
        if (data.braveSearchConverterConfig) {
          const config = JSON.parse(data.braveSearchConverterConfig);
          if (config.openAIApiKey) {
            openAIConfig.apiKey = config.openAIApiKey;
          }
          if (config.openAIModel) {
            openAIConfig.model = config.openAIModel;
          }
          if (config.openAIMaxTokens) {
            openAIConfig.maxTokens = config.openAIMaxTokens;
          }
        }
        resolve();
      });
    });
  };

  /**
   * Initiates the selection mode for screen capture
   * Injects CSS and scripts to enable interactive region selection
   * @param {number} tabId - Chrome tab identifier
   * @returns {Promise<void>}
   */
  const startSelectionMode = async (tabId) => {
    console.log('Iniciando modo de selección para tab:', tabId);
    
    await loadConfig();
    
    if (!openAIConfig.apiKey) {
      console.log('No hay clave API configurada');
      await showNotification(tabId, 'error', 'No se ha configurado una clave API de OpenAI. Por favor, configúrala en el panel de configuración.');
      return;
    }
    
    console.log('Clave API configurada correctamente, procediendo con la captura');
    
    await chrome.scripting.insertCSS({
      target: { tabId },
      css: `
        .screenshot-selection {
          position: fixed;
          border: 2px dashed #4285F4;
          background-color: rgba(66, 133, 244, 0.1);
          z-index: 9999;
          cursor: crosshair;
        }
        .screenshot-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.3);
          z-index: 9998;
          cursor: crosshair;
        }
        .screenshot-instructions {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #fff;
          color: #212121;
          padding: 10px 20px;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          z-index: 10000;
          font-family: 'Roboto', sans-serif;
          font-size: 14px;
          text-align: center;
        }
        .screenshot-actions {
          position: fixed;
          display: none;
          background-color: #fff;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          z-index: 10000;
          padding: 10px;
        }
        .screenshot-actions button {
          background-color: #4285F4;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          margin: 0 5px;
          cursor: pointer;
          font-family: 'Roboto', sans-serif;
          font-size: 14px;
        }
        .screenshot-actions button.cancel {
          background-color: #757575;
        }
        .screenshot-notification {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          border-radius: 4px;
          color: white;
          font-family: 'Roboto', sans-serif;
          font-size: 14px;
          z-index: 10001;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
        }
        .screenshot-notification.success {
          background-color: #0F9D58;
        }
        .screenshot-notification.error {
          background-color: #DB4437;
        }
        .screenshot-notification.info {
          background-color: #4285F4;
        }
        .screenshot-notification i {
          margin-right: 8px;
        }
        .openai-result {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          max-width: 800px;
          max-height: 80vh;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          z-index: 10001;
          overflow: auto;
          padding: 20px;
          font-family: 'Roboto', sans-serif;
        }
        .openai-result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .openai-result-header h2 {
          margin: 0;
          font-size: 18px;
          color: #212121;
        }
        .openai-result-header button {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #757575;
        }
        .openai-result-content {
          white-space: pre-wrap;
          line-height: 1.5;
          color: #212121;
        }
      `
    });
    
    try {
      console.log('Ejecutando script de selección en tab:', tabId);
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        function: initSelectionMode,
        args: [openAIConfig]
      });
      console.log('Script ejecutado con resultado:', result);
    } catch (error) {
      console.error('Error al ejecutar script de selección:', error);
      await showNotification(tabId, 'error', 'Error al iniciar el modo de selección: ' + error.message);
    }
  };
  
  /**
   * Displays a notification in the target tab
   * Creates temporary notification element with appropriate styling
   * @param {number} tabId - Chrome tab identifier
   * @param {string} type - Notification type (success, error, info)
   * @param {string} message - Notification message text
   * @returns {Promise<void>}
   */
  const showNotification = async (tabId, type, message) => {
    await chrome.scripting.executeScript({
      target: { tabId },
      function: (type, message) => {
        const notification = document.createElement('div');
        notification.className = `screenshot-notification ${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        
        notification.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.style.opacity = '0';
          notification.style.transition = 'opacity 0.5s';
          setTimeout(() => notification.remove(), 500);
        }, 3000);
      },
      args: [type, message]
    });
  };
  
  /**
   * Client-side script injected into target page to handle selection interactions
   * Manages overlay creation, mouse events, and selection process
   * @param {Object} openAIConfig - Configuration for OpenAI API
   */
  function initSelectionMode(openAIConfig) {
    console.log('Iniciando modo de selección');
    
    if (document.querySelector('.screenshot-overlay')) {
      console.log('Modo de selección ya iniciado, limpiando...');
      document.querySelectorAll('.screenshot-overlay, .screenshot-instructions, .screenshot-selection, .screenshot-actions').forEach(el => el.remove());
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'screenshot-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    overlay.style.zIndex = '99998';
    overlay.style.cursor = 'crosshair !important';
    
    const instructions = document.createElement('div');
    instructions.className = 'screenshot-instructions';
    instructions.textContent = 'Haz clic y arrastra para seleccionar el área a capturar';
    instructions.style.position = 'fixed';
    instructions.style.top = '20px';
    instructions.style.left = '50%';
    instructions.style.transform = 'translateX(-50%)';
    instructions.style.padding = '10px 20px';
    instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    instructions.style.color = 'white';
    instructions.style.borderRadius = '5px';
    instructions.style.zIndex = '99999';
    instructions.style.fontFamily = 'Arial, sans-serif';
    instructions.style.fontSize = '14px';
    
    document.body.appendChild(overlay);
    document.body.appendChild(instructions);
    
    let selection = null;
    let startX, startY;
    let isSelecting = false;
    
    document.documentElement.style.cursor = 'crosshair';
    document.body.style.cursor = 'crosshair';
    
    // Mouse down event - start selection
    overlay.addEventListener('mousedown', (e) => {
      console.log('Mouse down detectado');
      if (e.button !== 0) return;
      
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      
      selection = document.createElement('div');
      selection.className = 'screenshot-selection';
      selection.style.position = 'fixed';
      selection.style.left = `${startX}px`;
      selection.style.top = `${startY}px`;
      selection.style.width = '0';
      selection.style.height = '0';
      selection.style.border = '2px dashed #4285F4';
      selection.style.backgroundColor = 'rgba(66, 133, 244, 0.1)';
      selection.style.zIndex = '99999';
      
      document.body.appendChild(selection);
      
      e.preventDefault();
      e.stopPropagation();
    }, true);
    
    // Mouse move event - update selection dimensions
    overlay.addEventListener('mousemove', (e) => {
      if (!isSelecting || !selection) return;
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      
      selection.style.left = `${left}px`;
      selection.style.top = `${top}px`;
      selection.style.width = `${width}px`;
      selection.style.height = `${height}px`;
      
      e.preventDefault();
      e.stopPropagation();
    }, true);
    
    // Mouse up event - finalize selection
    overlay.addEventListener('mouseup', (e) => {
      console.log('Mouse up detectado, isSelecting:', isSelecting);
      if (!isSelecting || !selection) return;
      isSelecting = false;
      
      const width = parseInt(selection.style.width);
      const height = parseInt(selection.style.height);
      
      console.log('Selección completada, dimensiones:', width, 'x', height);
      
      if (width < 10 || height < 10) {
        console.log('Selección demasiado pequeña, cancelando');
        cleanupSelection();
        return;
      }
      
      showSelectionActions(selection);
      
      e.preventDefault();
      e.stopPropagation();
    }, true);
    
    // Escape key handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cleanupSelection();
      }
    });
    
    /**
     * Displays action buttons for the selected region
     * @param {HTMLElement} selection - Selection DOM element
     */
    function showSelectionActions(selection) {
      const existingActions = document.querySelector('.screenshot-actions');
      if (existingActions) existingActions.remove();
      
      const actions = document.createElement('div');
      actions.className = 'screenshot-actions';
      
      const selRect = selection.getBoundingClientRect();
      actions.style.position = 'fixed';
      actions.style.left = `${selRect.left}px`;
      actions.style.top = `${selRect.bottom + 10}px`;
      actions.style.display = 'flex';
      actions.style.gap = '10px';
      actions.style.padding = '10px';
      actions.style.backgroundColor = 'white';
      actions.style.borderRadius = '5px';
      actions.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      actions.style.zIndex = '999999';
      
      const captureBtn = document.createElement('button');
      captureBtn.textContent = 'Enviar a OpenAI';
      captureBtn.style.padding = '8px 16px';
      captureBtn.style.backgroundColor = '#4285F4';
      captureBtn.style.color = 'white';
      captureBtn.style.border = 'none';
      captureBtn.style.borderRadius = '4px';
      captureBtn.style.cursor = 'pointer';
      captureBtn.style.fontWeight = 'bold';
      captureBtn.addEventListener('click', () => captureAndSend(selection));
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.className = 'cancel';
      cancelBtn.style.padding = '8px 16px';
      cancelBtn.style.backgroundColor = '#f1f1f1';
      cancelBtn.style.border = 'none';
      cancelBtn.style.borderRadius = '4px';
      cancelBtn.style.cursor = 'pointer';
      cancelBtn.addEventListener('click', cleanupSelection);
      
      actions.appendChild(captureBtn);
      actions.appendChild(cancelBtn);
      document.body.appendChild(actions);
    }
    
    /**
     * Captures the selected region and sends it to OpenAI
     * Uses html2canvas for DOM-to-image conversion
     * @param {HTMLElement} selection - Selection DOM element
     */
    async function captureAndSend(selection) {
      try {
        console.log('Iniciando captura de pantalla');
        const rect = selection.getBoundingClientRect();
        console.log('Dimensiones de la selección:', rect);
        
        showNotification('info', 'Capturando y enviando a OpenAI...');
        
        if (typeof html2canvas === 'undefined') {
          console.error('html2canvas no está disponible');
          showNotification('error', 'Error: Biblioteca de captura no disponible');
          cleanupSelection();
          return;
        }
        
        console.log('Usando html2canvas para capturar');
        
        const elementsToHide = document.querySelectorAll('.screenshot-selection, .screenshot-actions, .screenshot-instructions');
        elementsToHide.forEach(el => {
          el.style.visibility = 'hidden';
        });
        
        try {
          const canvas = await html2canvas(document.documentElement, {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
            scrollX: -window.scrollX,
            scrollY: -window.scrollY,
            windowWidth: document.documentElement.offsetWidth,
            windowHeight: document.documentElement.offsetHeight,
            logging: true,
            useCORS: true,
            allowTaint: true,
            foreignObjectRendering: false
          });
          console.log('Captura completada con éxito');
          const imageData = canvas.toDataURL('image/png');
          console.log('Imagen convertida a base64');
          
          elementsToHide.forEach(el => {
            el.style.visibility = 'visible';
          });
          
          cleanupSelection();
          
          await sendToOpenAI(imageData);
        } catch (error) {
          elementsToHide.forEach(el => {
            el.style.visibility = 'visible';
          });
          
          console.error('Error al capturar:', error);
          showNotification('error', 'Error al capturar la imagen: ' + error.message);
          cleanupSelection();
        }
      } catch (error) {
        console.error('Error en captureAndSend:', error);
        showNotification('error', 'Error al procesar la captura');
        cleanupSelection();
      }
    }
    
    /**
     * Sends image data to OpenAI API for analysis
     * Handles authentication, request formatting, and response processing
     * @param {string} imageData - Base64-encoded image data
     */
    async function sendToOpenAI(imageData) {
      try {
        if (!openAIConfig.apiKey) {
          showNotification('error', 'No se ha configurado una clave API de OpenAI');
          return;
        }
        
        const base64Data = imageData.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        
        for (let i = 0; i < byteCharacters.length; i += 512) {
          const slice = byteCharacters.slice(i, i + 512);
          const byteNumbers = new Array(slice.length);
          
          for (let j = 0; j < slice.length; j++) {
            byteNumbers[j] = slice.charCodeAt(j);
          }
          
          byteArrays.push(new Uint8Array(byteNumbers));
        }
        
        const blob = new Blob(byteArrays, {type: 'image/png'});
        
        const formData = new FormData();
        formData.append('model', openAIConfig.model);
        
        const messages = [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '¿Qué ves en esta imagen? Por favor, describe detalladamente su contenido.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ];
        
        formData.append('messages', JSON.stringify(messages));
        formData.append('max_tokens', openAIConfig.maxTokens);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: openAIConfig.model,
            messages: messages,
            max_tokens: openAIConfig.maxTokens
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Error de OpenAI: ${errorData.error?.message || 'Desconocido'}`);
        }
        
        const data = await response.json();
        
        showOpenAIResult(data.choices[0].message.content);
        showNotification('success', 'Respuesta recibida de OpenAI');
      } catch (error) {
        console.error('Error al enviar a OpenAI:', error);
        showNotification('error', `Error al enviar a OpenAI: ${error.message}`);
      }
    }
    
    /**
     * Displays OpenAI result in a modal dialog
     * Creates formatted UI for viewing analysis results
     * @param {string} content - Text content from OpenAI API
     */
    function showOpenAIResult(content) {
      const resultWindow = document.createElement('div');
      resultWindow.className = 'openai-result';
      
      const header = document.createElement('div');
      header.className = 'openai-result-header';
      
      const title = document.createElement('h2');
      title.textContent = 'Resultado de OpenAI';
      
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => resultWindow.remove());
      
      header.appendChild(title);
      header.appendChild(closeBtn);
      
      const resultContent = document.createElement('div');
      resultContent.className = 'openai-result-content';
      resultContent.textContent = content;
      
      resultWindow.appendChild(header);
      resultWindow.appendChild(resultContent);
      document.body.appendChild(resultWindow);
    }
    
    /**
     * Displays a temporary notification
     * @param {string} type - Notification type (success, error, info)
     * @param {string} message - Notification message text
     */
    function showNotification(type, message) {
      const notification = document.createElement('div');
      notification.className = `screenshot-notification ${type}`;
      
      let icon = 'info-circle';
      if (type === 'success') icon = 'check-circle';
      if (type === 'error') icon = 'exclamation-circle';
      
      notification.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
      }, 3000);
    }
    
    /**
     * Removes all selection-related elements from the DOM
     * Resets interface to initial state
     */
    function cleanupSelection() {
      console.log('Limpiando elementos de selección');
      document.querySelectorAll('.screenshot-overlay, .screenshot-instructions, .screenshot-selection, .screenshot-actions, .screenshot-notification').forEach(el => el.remove());
      isSelecting = false;
      selection = null;
      document.body.style.cursor = 'auto';
    }
    
    /**
     * Dynamically loads html2canvas if not available
     * @returns {Promise} Resolves when library is loaded
     */
    if (typeof html2canvas === 'undefined') {
      const scriptURL = chrome.runtime.getURL('html2canvas.min.js');
      console.log('Cargando html2canvas desde:', scriptURL);
      
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = scriptURL;
        script.onload = () => {
          console.log('html2canvas cargado localmente con éxito');
          resolve();
        };
        script.onerror = (error) => {
          console.error('Error al cargar html2canvas:', error);
          showNotification('error', 'Error al cargar la biblioteca de captura');
          cleanupSelection();
          reject(error);
        };
        document.head.appendChild(script);
      });
    }
    
    return Promise.resolve();
  }
  
  return {
    startSelectionMode
  };
})();

/**
 * Module export for CommonJS environments
 */
if (typeof module !== 'undefined') {
  module.exports = ScreenshotModule;
}
