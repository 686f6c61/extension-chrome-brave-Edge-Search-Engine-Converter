// Módulo para capturar pantalla y enviar a OpenAI
const ScreenshotModule = (() => {
  // Configuración de la API de OpenAI
  let openAIConfig = {
    apiKey: '', // La clave API se configurará desde el panel de configuración
    model: 'gpt-4o-mini', // Modelo predeterminado
    maxTokens: 1000 // Límite de tokens para la respuesta
  };

  // Cargar configuración
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

  // Iniciar el modo de selección para captura de pantalla
  const startSelectionMode = async (tabId) => {
    console.log('Iniciando modo de selección para tab:', tabId);
    
    // Cargar configuración antes de continuar
    await loadConfig();
    
    // Verificar si hay una clave API configurada
    if (!openAIConfig.apiKey) {
      console.log('No hay clave API configurada');
      await showNotification(tabId, 'error', 'No se ha configurado una clave API de OpenAI. Por favor, configúrala en el panel de configuración.');
      return;
    }
    
    console.log('Clave API configurada correctamente, procediendo con la captura');
    
    // Inyectar CSS para el modo de selección
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
      // Inyectar script para el modo de selección
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
  
  // Mostrar notificación en la página
  const showNotification = async (tabId, type, message) => {
    await chrome.scripting.executeScript({
      target: { tabId },
      function: (type, message) => {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `screenshot-notification ${type}`;
        
        // Icono según el tipo
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        
        notification.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
        document.body.appendChild(notification);
        
        // Eliminar después de 3 segundos
        setTimeout(() => {
          notification.style.opacity = '0';
          notification.style.transition = 'opacity 0.5s';
          setTimeout(() => notification.remove(), 500);
        }, 3000);
      },
      args: [type, message]
    });
  };
  
  // Esta función se inyecta en la página para iniciar el modo de selección
  function initSelectionMode(openAIConfig) {
    console.log('Iniciando modo de selección');
    
    // Prevenir múltiples inicializaciones
    if (document.querySelector('.screenshot-overlay')) {
      console.log('Modo de selección ya iniciado, limpiando...');
      document.querySelectorAll('.screenshot-overlay, .screenshot-instructions, .screenshot-selection, .screenshot-actions').forEach(el => el.remove());
    }
    
    // Crear overlay y mensaje de instrucciones
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
    
    // Variables para la selección
    let selection = null;
    let startX, startY;
    let isSelecting = false;
    
    // Asegurarse de que el cursor sea visible
    document.documentElement.style.cursor = 'crosshair';
    document.body.style.cursor = 'crosshair';
    
    // Manejar inicio de selección
    overlay.addEventListener('mousedown', (e) => {
      console.log('Mouse down detectado');
      // Solo botón izquierdo
      if (e.button !== 0) return;
      
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      
      // Crear elemento de selección
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
      
      // Prevenir comportamiento predeterminado
      e.preventDefault();
      e.stopPropagation();
    }, true);
    
    // Manejar movimiento durante la selección
    overlay.addEventListener('mousemove', (e) => {
      if (!isSelecting || !selection) return;
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      // Calcular dimensiones
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      
      // Calcular posición (para permitir selección en cualquier dirección)
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      
      // Actualizar selección
      selection.style.left = `${left}px`;
      selection.style.top = `${top}px`;
      selection.style.width = `${width}px`;
      selection.style.height = `${height}px`;
      
      // Prevenir comportamiento predeterminado
      e.preventDefault();
      e.stopPropagation();
    }, true);
    
    // Manejar fin de selección
    overlay.addEventListener('mouseup', (e) => {
      console.log('Mouse up detectado, isSelecting:', isSelecting);
      if (!isSelecting || !selection) return;
      isSelecting = false;
      
      // Verificar si la selección es demasiado pequeña
      const width = parseInt(selection.style.width);
      const height = parseInt(selection.style.height);
      
      console.log('Selección completada, dimensiones:', width, 'x', height);
      
      if (width < 10 || height < 10) {
        // Cancelar selección si es muy pequeña
        console.log('Selección demasiado pequeña, cancelando');
        cleanupSelection();
        return;
      }
      
      // Mostrar acciones
      showSelectionActions(selection);
      
      // Prevenir comportamiento predeterminado
      e.preventDefault();
      e.stopPropagation();
    }, true);
    
    // Cancelar selección con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cleanupSelection();
      }
    });
    
    // Mostrar botones de acción para la selección
    function showSelectionActions(selection) {
      // Eliminar acciones previas si existen
      const existingActions = document.querySelector('.screenshot-actions');
      if (existingActions) existingActions.remove();
      
      // Crear botones de acción
      const actions = document.createElement('div');
      actions.className = 'screenshot-actions';
      
      // Posicionar debajo de la selección
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
      
      // Botones
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
    
    // Capturar y enviar a OpenAI
    async function captureAndSend(selection) {
      try {
        console.log('Iniciando captura de pantalla');
        // Obtener dimensiones de la selección
        const rect = selection.getBoundingClientRect();
        console.log('Dimensiones de la selección:', rect);
        
        // Mostrar notificación de carga
        showNotification('info', 'Capturando y enviando a OpenAI...');
        
        // Verificar si html2canvas está disponible
        if (typeof html2canvas === 'undefined') {
          console.error('html2canvas no está disponible');
          showNotification('error', 'Error: Biblioteca de captura no disponible');
          cleanupSelection();
          return;
        }
        
        console.log('Usando html2canvas para capturar');
        
        // Ocultar temporalmente la selección y los botones para la captura
        const elementsToHide = document.querySelectorAll('.screenshot-selection, .screenshot-actions, .screenshot-instructions');
        elementsToHide.forEach(el => {
          el.style.visibility = 'hidden';
        });
        
        // Capturar pantalla
        try {
          // Convertir la selección a una imagen
          const canvas = await html2canvas(document.documentElement, {
            x: rect.left + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
            scrollX: -window.scrollX,
            scrollY: -window.scrollY,
            windowWidth: document.documentElement.offsetWidth,
            windowHeight: document.documentElement.offsetHeight,
            logging: true, // Activar logs para depuración
            useCORS: true, // Intentar usar CORS para imágenes externas
            allowTaint: true, // Permitir elementos que podrían "contaminar" el canvas
            foreignObjectRendering: false // Deshabilitar foreignObject para mayor compatibilidad
          });
          console.log('Captura completada con éxito');
          // Convertir a base64
          const imageData = canvas.toDataURL('image/png');
          console.log('Imagen convertida a base64');
          
          // Restaurar visibilidad de los elementos
          elementsToHide.forEach(el => {
            el.style.visibility = 'visible';
          });
          
          // Limpiar la selección
          cleanupSelection();
          
          // Enviar a OpenAI
          await sendToOpenAI(imageData);
        } catch (error) {
          // Restaurar visibilidad de los elementos
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
    
    // Enviar imagen a OpenAI
    async function sendToOpenAI(imageData) {
      try {
        // Verificar si hay una clave API
        if (!openAIConfig.apiKey) {
          showNotification('error', 'No se ha configurado una clave API de OpenAI');
          return;
        }
        
        // Convertir base64 a blob para enviar
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
        
        // Crear FormData para la solicitud
        const formData = new FormData();
        formData.append('model', openAIConfig.model);
        
        // Crear el mensaje con la imagen
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
        
        // Enviar solicitud a OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIConfig.apiKey}`
          },
          body: JSON.stringify({
            model: openAIConfig.model,
            messages: messages,
            max_tokens: openAIConfig.maxTokens
          }),
          headers: {
            'Authorization': `Bearer ${openAIConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Error de OpenAI: ${errorData.error?.message || 'Desconocido'}`);
        }
        
        const data = await response.json();
        
        // Mostrar resultado
        showOpenAIResult(data.choices[0].message.content);
        showNotification('success', 'Respuesta recibida de OpenAI');
      } catch (error) {
        console.error('Error al enviar a OpenAI:', error);
        showNotification('error', `Error al enviar a OpenAI: ${error.message}`);
      }
    }
    
    // Mostrar resultado de OpenAI
    function showOpenAIResult(content) {
      // Crear ventana de resultado
      const resultWindow = document.createElement('div');
      resultWindow.className = 'openai-result';
      
      // Encabezado con título y botón de cerrar
      const header = document.createElement('div');
      header.className = 'openai-result-header';
      
      const title = document.createElement('h2');
      title.textContent = 'Resultado de OpenAI';
      
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => resultWindow.remove());
      
      header.appendChild(title);
      header.appendChild(closeBtn);
      
      // Contenido
      const resultContent = document.createElement('div');
      resultContent.className = 'openai-result-content';
      resultContent.textContent = content;
      
      // Ensamblar
      resultWindow.appendChild(header);
      resultWindow.appendChild(resultContent);
      document.body.appendChild(resultWindow);
    }
    
    // Mostrar notificación
    function showNotification(type, message) {
      // Crear elemento de notificación
      const notification = document.createElement('div');
      notification.className = `screenshot-notification ${type}`;
      
      // Icono según el tipo
      let icon = 'info-circle';
      if (type === 'success') icon = 'check-circle';
      if (type === 'error') icon = 'exclamation-circle';
      
      notification.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
      document.body.appendChild(notification);
      
      // Eliminar después de 3 segundos
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
      }, 3000);
    }
    
    // Limpiar elementos de selección
    function cleanupSelection() {
      console.log('Limpiando elementos de selección');
      // Eliminar overlay, instrucciones, selección y acciones
      document.querySelectorAll('.screenshot-overlay, .screenshot-instructions, .screenshot-selection, .screenshot-actions, .screenshot-notification').forEach(el => el.remove());
      // Resetear variables
      isSelecting = false;
      selection = null;
      // Restaurar cursor normal
      document.body.style.cursor = 'auto';
    }
    
    // Cargar html2canvas si no está disponible
    if (typeof html2canvas === 'undefined') {
      // Usar chrome.runtime.getURL para obtener la URL local del archivo
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

// Exportar el módulo
if (typeof module !== 'undefined') {
  module.exports = ScreenshotModule;
}
