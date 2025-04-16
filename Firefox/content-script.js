/**
 * content-script.js - Script de contenido para interacción con páginas web
 * 
 * Este script se inyecta en las páginas web para permitir la selección de texto
 * y áreas de la página para su análisis con OpenAI.
 */

// Estado global para seguimiento de selección
let selectionActive = false;
let selectedText = '';
let selectionMode = 'text'; // 'text' o 'area'
let selectionStart = null;
let selectionEnd = null;
let selectionRect = null;
let capturedImage = null;

/**
 * Inicializa el listener para mensajes del background script
 */
function initMessageListener() {
  console.log('Content script inicializado');
  
  // Usar la API adecuada según el navegador
  if (typeof browser !== 'undefined') {
    browser.runtime.onMessage.addListener(handleMessage);
  } else if (typeof chrome !== 'undefined') {
    chrome.runtime.onMessage.addListener(handleMessage);
  }
}

/**
 * Maneja los mensajes recibidos del background script
 */
function handleMessage(request, sender, sendResponse) {
  console.log('Mensaje recibido en content script:', request);
  
  if (request.action === 'activateSelection') {
    activateSelection(request, sendResponse);
    return true; // Mantener el canal abierto para respuesta asíncrona
  }
  
  if (request.action === 'showAnalysisResult') {
    showAnalysisResult(request.analysis);
    sendResponse({ success: true });
    return false;
  }
  
  if (request.action === 'showError') {
    showError(request.error);
    sendResponse({ success: true });
    return false;
  }
  
  return false;
}

/**
 * Activa el modo de selección (texto o área)
 * @param {Object} request - Objeto de solicitud con parámetros
 * @param {Function} sendResponse - Función para enviar respuesta
 */
function activateSelection(request, sendResponse) {
  // Obtener el modo de captura (analyze, copy, save)
  const captureMode = request && request.mode ? request.mode : 'analyze';
  
  // Determinar el modo de selección
  if (window.getSelection().toString().trim()) {
    // Si ya hay texto seleccionado, usar modo texto
    selectionMode = 'text';
    handleTextSelection(sendResponse, captureMode);
  } else {
    // Si no hay texto seleccionado, usar modo área
    selectionMode = 'area';
    handleAreaSelection(sendResponse, captureMode);
  }
}

/**
 * Maneja la selección de texto
 * @param {Function} sendResponse - Función para enviar respuesta
 * @param {string} mode - Modo de captura ('analyze', 'copy', 'save')
 */
function handleTextSelection(sendResponse, mode = 'analyze') {
  console.log('Activando modo de selección de texto');
  
  // Obtener el texto seleccionado
  const selection = window.getSelection();
  selectedText = selection.toString().trim();
  
  if (selectedText) {
    console.log('Texto seleccionado:', selectedText);
    
    // Preguntar al usuario si desea analizar el texto seleccionado
    if (confirm('\u00bfDeseas analizar el siguiente texto con OpenAI?\n\n' + 
               (selectedText.length > 150 ? selectedText.substring(0, 150) + '...' : selectedText))) {
      
      // Enviar el texto seleccionado al background script
      sendTextToBackground(selectedText, sendResponse);
    } else {
      sendResponse({ success: false, error: 'Operación cancelada por el usuario' });
    }
  } else {
    // Si no hay texto seleccionado, mostrar mensaje al usuario
    showSelectionOverlay('Selecciona el texto que deseas analizar con OpenAI');
    
    // Activar el modo de selección
    selectionActive = true;
    
    // Agregar listener para capturar la selección
    document.addEventListener('mouseup', handleMouseUp);
    
    // Función para manejar la selección de texto
    function handleMouseUp(event) {
      if (!selectionActive) return;
      
      // Obtener el texto seleccionado
      const selection = window.getSelection();
      selectedText = selection.toString().trim();
      
      if (selectedText) {
        console.log('Texto seleccionado:', selectedText);
        
        // Desactivar el modo de selección
        selectionActive = false;
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Ocultar el overlay
        hideSelectionOverlay();
        
        // Preguntar al usuario si desea analizar el texto seleccionado
        if (confirm('\u00bfDeseas analizar el siguiente texto con OpenAI?\n\n' + 
                   (selectedText.length > 150 ? selectedText.substring(0, 150) + '...' : selectedText))) {
          
          // Enviar el texto seleccionado al background script
          sendTextToBackground(selectedText, sendResponse);
        } else {
          sendResponse({ success: false, error: 'Operación cancelada por el usuario' });
        }
      }
    }
  }
}

/**
 * Maneja la selección de área
 * @param {Function} sendResponse - Función para enviar respuesta
 * @param {string} mode - Modo de captura ('analyze', 'copy', 'save')
 */
function handleAreaSelection(sendResponse, mode = 'analyze') {
  console.log('Activando modo de selección de área');
  
  // Mostrar mensaje al usuario
  showSelectionOverlay('Haz clic y arrastra para seleccionar el área que deseas analizar con OpenAI');
  
  // Crear el overlay de selección
  const selectionBox = document.createElement('div');
  selectionBox.id = 'search-engine-converter-selection-box';
  selectionBox.style.position = 'absolute';
  selectionBox.style.border = '2px dashed #4285F4';
  selectionBox.style.backgroundColor = 'rgba(66, 133, 244, 0.1)';
  selectionBox.style.zIndex = '9998';
  selectionBox.style.display = 'none';
  document.body.appendChild(selectionBox);
  
  // Activar el modo de selección
  selectionActive = true;
  
  // Agregar listeners para capturar la selección
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  
  // Función para manejar el inicio de la selección
  function handleMouseDown(event) {
    if (!selectionActive) return;
    
    // Guardar la posición inicial
    selectionStart = {
      x: event.clientX + window.scrollX,
      y: event.clientY + window.scrollY
    };
    
    // Mostrar el cuadro de selección
    selectionBox.style.display = 'block';
    selectionBox.style.left = selectionStart.x + 'px';
    selectionBox.style.top = selectionStart.y + 'px';
    selectionBox.style.width = '0';
    selectionBox.style.height = '0';
  }
  
  // Función para manejar el movimiento durante la selección
  function handleMouseMove(event) {
    if (!selectionActive || !selectionStart) return;
    
    // Calcular las dimensiones del cuadro de selección
    const currentX = event.clientX + window.scrollX;
    const currentY = event.clientY + window.scrollY;
    
    const width = Math.abs(currentX - selectionStart.x);
    const height = Math.abs(currentY - selectionStart.y);
    
    const left = Math.min(currentX, selectionStart.x);
    const top = Math.min(currentY, selectionStart.y);
    
    // Actualizar el cuadro de selección
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
  }
  
  // Función para manejar el fin de la selección
  function handleMouseUp(event) {
    if (!selectionActive || !selectionStart) return;
    
    // Guardar la posición final
    selectionEnd = {
      x: event.clientX + window.scrollX,
      y: event.clientY + window.scrollY
    };
    
    // Calcular el rectángulo de selección
    const left = Math.min(selectionStart.x, selectionEnd.x);
    const top = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    // Si la selección es muy pequeña, ignorarla
    if (width < 10 || height < 10) {
      selectionStart = null;
      selectionEnd = null;
      selectionBox.style.display = 'none';
      return;
    }
    
    // Guardar el rectángulo de selección
    selectionRect = { left, top, width, height };
    
    // Desactivar el modo de selección
    selectionActive = false;
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    // Ocultar el overlay
    hideSelectionOverlay();
    
    // Capturar la imagen del área seleccionada
    captureSelectedArea(selectionRect).then(imageData => {
      // Ocultar el cuadro de selección
      selectionBox.style.display = 'none';
      
      // Guardar la imagen capturada
      capturedImage = imageData;
      
      // Manejar la imagen según el modo seleccionado
      switch (mode) {
        case 'analyze':
          // Preguntar al usuario si desea analizar la imagen
          if (confirm('\u00bfDeseas analizar esta área con OpenAI?')) {
            // Enviar la imagen al background script
            sendImageToBackground(imageData, sendResponse);
          } else {
            sendResponse({ success: false, error: 'Operación cancelada por el usuario' });
          }
          break;
          
        case 'copy':
          // Copiar la imagen al portapapeles
          copyImageToClipboard(imageData)
            .then(() => {
              showNotification('Imagen copiada al portapapeles', 'success');
              if (sendResponse) sendResponse({ success: true });
            })
            .catch(error => {
              console.error('Error al copiar imagen:', error);
              showError('Error al copiar imagen: ' + error.message);
              if (sendResponse) sendResponse({ success: false, error: error.message });
            });
          break;
          
        case 'save':
          // Guardar la imagen como archivo
          saveImageAsFile(imageData)
            .then(() => {
              showNotification('Imagen guardada correctamente', 'success');
              if (sendResponse) sendResponse({ success: true });
            })
            .catch(error => {
              console.error('Error al guardar imagen:', error);
              showError('Error al guardar imagen: ' + error.message);
              if (sendResponse) sendResponse({ success: false, error: error.message });
            });
          break;
          
        default:
          console.error('Modo de captura no reconocido:', mode);
          showError('Modo de captura no reconocido');
          if (sendResponse) sendResponse({ success: false, error: 'Modo de captura no reconocido' });
      }
    }).catch(error => {
      console.error('Error al capturar el área:', error);
      showError('Error al capturar el área: ' + error.message);
      sendResponse({ success: false, error: 'Error al capturar el área: ' + error.message });
    });
  }
}

/**
 * Envía el texto seleccionado al background script
 */
function sendTextToBackground(text, sendResponse) {
  console.log('Enviando texto al background script');
  
  // Usar la API adecuada según el navegador
  if (typeof browser !== 'undefined') {
    browser.runtime.sendMessage({
      action: 'analyzeText',
      textData: text
    }).then(response => {
      console.log('Respuesta recibida:', response);
      if (response && response.success) {
        showAnalysisResult(response.analysis);
      } else {
        showError(response ? response.error : 'Error desconocido');
      }
    }).catch(error => {
      console.error('Error al enviar texto:', error);
      showError(error.message);
    });
  } else if (typeof chrome !== 'undefined') {
    chrome.runtime.sendMessage({
      action: 'analyzeText',
      textData: text
    }, function(response) {
      console.log('Respuesta recibida:', response);
      if (response && response.success) {
        showAnalysisResult(response.analysis);
      } else {
        showError(response ? response.error : 'Error desconocido');
      }
    });
  }
  
  // Informar al popup que la operación está en curso
  if (sendResponse) {
    sendResponse({ success: true, message: 'Procesando texto seleccionado' });
  }
}

/**
 * Envía la imagen capturada al background script
 */
function sendImageToBackground(imageData, sendResponse) {
  console.log('Enviando imagen al background script');
  
  // Usar la API adecuada según el navegador
  if (typeof browser !== 'undefined') {
    browser.runtime.sendMessage({
      action: 'analyzeImage',
      imageData: imageData
    }).then(response => {
      console.log('Respuesta recibida:', response);
      if (response && response.success) {
        showAnalysisResult(response.analysis);
      } else {
        showError(response ? response.error : 'Error desconocido');
      }
    }).catch(error => {
      console.error('Error al enviar imagen:', error);
      showError(error.message);
    });
  } else if (typeof chrome !== 'undefined') {
    chrome.runtime.sendMessage({
      action: 'analyzeImage',
      imageData: imageData
    }, function(response) {
      console.log('Respuesta recibida:', response);
      if (response && response.success) {
        showAnalysisResult(response.analysis);
      } else {
        showError(response ? response.error : 'Error desconocido');
      }
    });
  }
  
  // Informar al popup que la operación está en curso
  if (sendResponse) {
    sendResponse({ success: true, message: 'Procesando imagen seleccionada' });
  }
}

/**
 * Captura el área seleccionada como una imagen
 * @param {Object} rect - Rectángulo de selección {left, top, width, height}
 * @returns {Promise<string>} - Promesa que resuelve con la imagen en formato base64
 */
function captureSelectedArea(rect) {
  return new Promise((resolve, reject) => {
    try {
      console.log('Capturando área:', rect);
      
      // Método 1: Captura utilizando captureVisibleTab (a través del background script)
      if (typeof browser !== 'undefined') {
        console.log('Intentando captura con browser.runtime.sendMessage');
        browser.runtime.sendMessage({
          action: 'captureVisibleTab'
        }).then(response => {
          if (response && response.success && response.imageData) {
            console.log('Captura exitosa con browser.runtime.sendMessage');
            // Recortar la imagen capturada
            cropImage(response.imageData, rect)
              .then(croppedImage => {
                resolve(croppedImage);
              })
              .catch(error => {
                console.error('Error al recortar imagen:', error);
                // Intentar con método alternativo
                captureWithHtml2Canvas();
              });
          } else {
            console.error('Error en captureVisibleTab:', response ? response.error : 'Respuesta vacía');
            // Intentar con método alternativo
            captureWithHtml2Canvas();
          }
        }).catch(error => {
          console.error('Error al enviar mensaje de captura:', error);
          // Intentar con método alternativo
          captureWithHtml2Canvas();
        });
      } else if (typeof chrome !== 'undefined') {
        console.log('Intentando captura con chrome.runtime.sendMessage');
        chrome.runtime.sendMessage({
          action: 'captureVisibleTab'
        }, function(response) {
          if (response && response.success && response.imageData) {
            console.log('Captura exitosa con chrome.runtime.sendMessage');
            // Recortar la imagen capturada
            cropImage(response.imageData, rect)
              .then(croppedImage => {
                resolve(croppedImage);
              })
              .catch(error => {
                console.error('Error al recortar imagen:', error);
                // Intentar con método alternativo
                captureWithHtml2Canvas();
              });
          } else {
            console.error('Error en captureVisibleTab:', response ? response.error : 'Respuesta vacía');
            // Intentar con método alternativo
            captureWithHtml2Canvas();
          }
        });
      } else {
        // Si no hay API de runtime disponible, intentar con html2canvas
        captureWithHtml2Canvas();
      }
      
      // Método 2: Captura utilizando html2canvas
      function captureWithHtml2Canvas() {
        console.log('Intentando captura con html2canvas');
        // Crear un canvas del tamaño del área seleccionada
        const canvas = document.createElement('canvas');
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Opciones para html2canvas
        const html2canvasOptions = {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          windowWidth: document.documentElement.offsetWidth,
          windowHeight: document.documentElement.offsetHeight,
          scale: window.devicePixelRatio || 1,
          allowTaint: true,
          useCORS: true,
          logging: false,
          backgroundColor: null
        };
        
        // Verificar si html2canvas ya está cargado
        if (typeof html2canvas !== 'undefined') {
          console.log('html2canvas ya está disponible');
          html2canvas(document.documentElement, html2canvasOptions)
            .then(renderedCanvas => {
              console.log('Captura exitosa con html2canvas');
              const imageData = renderedCanvas.toDataURL('image/png');
              resolve(imageData);
            })
            .catch(error => {
              console.error('Error en html2canvas:', error);
              // Intentar con método alternativo
              captureWithScreenshot();
            });
        } else {
          console.log('Cargando html2canvas dinámicamente');
          // Cargar html2canvas dinámicamente
          const script = document.createElement('script');
          script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
          script.onload = function() {
            console.log('html2canvas cargado correctamente');
            html2canvas(document.documentElement, html2canvasOptions)
              .then(renderedCanvas => {
                console.log('Captura exitosa con html2canvas');
                const imageData = renderedCanvas.toDataURL('image/png');
                resolve(imageData);
              })
              .catch(error => {
                console.error('Error en html2canvas:', error);
                // Intentar con método alternativo
                captureWithScreenshot();
              });
          };
          script.onerror = function() {
            console.error('Error al cargar html2canvas');
            // Intentar con método alternativo
            captureWithScreenshot();
          };
          document.head.appendChild(script);
        }
      }
      
      // Método 3: Captura utilizando screenshot (fallback)
      function captureWithScreenshot() {
        console.log('Intentando captura con screenshot');
        try {
          // Crear una imagen de la selección utilizando un rectángulo coloreado
          const overlay = document.createElement('div');
          overlay.style.position = 'absolute';
          overlay.style.left = rect.left + 'px';
          overlay.style.top = rect.top + 'px';
          overlay.style.width = rect.width + 'px';
          overlay.style.height = rect.height + 'px';
          overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          overlay.style.border = '2px solid #4285F4';
          overlay.style.zIndex = '9999';
          document.body.appendChild(overlay);
          
          // Mostrar mensaje al usuario
          showNotification('No se pudo capturar el área automáticamente. Por favor, utilice la herramienta de captura de pantalla de su sistema operativo.', 'info', 5000);
          
          // Generar una imagen de marcador de posición
          const canvas = document.createElement('canvas');
          canvas.width = rect.width;
          canvas.height = rect.height;
          const ctx = canvas.getContext('2d');
          
          // Dibujar un fondo con mensaje
          ctx.fillStyle = '#f5f5f5';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#333';
          ctx.font = '14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('Captura no disponible', canvas.width / 2, canvas.height / 2 - 10);
          ctx.fillText('Use la herramienta de captura de su sistema', canvas.width / 2, canvas.height / 2 + 10);
          
          // Convertir a imagen
          const imageData = canvas.toDataURL('image/png');
          
          // Eliminar el overlay después de 3 segundos
          setTimeout(() => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
          }, 3000);
          
          resolve(imageData);
        } catch (error) {
          console.error('Error en captura con screenshot:', error);
          reject(new Error('No se pudo capturar el área seleccionada'));
        }
      }
    } catch (error) {
      console.error('Error al capturar área:', error);
      reject(error);
    }
  });
}

/**
 * Recorta una imagen según un rectángulo de selección
 * @param {string} imageData - Imagen en formato base64
 * @param {Object} rect - Rectángulo de selección {left, top, width, height}
 * @returns {Promise<string>} - Promesa que resuelve con la imagen recortada en formato base64
 */
function cropImage(imageData, rect) {
  return new Promise((resolve, reject) => {
    try {
      // Crear un elemento de imagen para cargar la imagen
      const img = new Image();
      img.onload = function() {
        try {
          // Crear un canvas para el recorte
          const canvas = document.createElement('canvas');
          canvas.width = rect.width;
          canvas.height = rect.height;
          const ctx = canvas.getContext('2d');
          
          // Calcular las coordenadas de recorte
          // Ajustar por el desplazamiento de la página
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          
          // Recortar la imagen
          ctx.drawImage(
            img,
            rect.left, rect.top, rect.width, rect.height,  // Coordenadas de origen
            0, 0, rect.width, rect.height                 // Coordenadas de destino
          );
          
          // Convertir a imagen
          const croppedImageData = canvas.toDataURL('image/png');
          resolve(croppedImageData);
        } catch (error) {
          console.error('Error al recortar imagen:', error);
          reject(error);
        }
      };
      
      img.onerror = function() {
        reject(new Error('Error al cargar la imagen para recortar'));
      };
      
      img.src = imageData;
    } catch (error) {
      console.error('Error en cropImage:', error);
      reject(error);
    }
  });
}

/**
 * Muestra un overlay para indicar al usuario que debe seleccionar texto
 */
function showSelectionOverlay(message) {
  // Crear el overlay si no existe
  let overlay = document.getElementById('search-engine-converter-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'search-engine-converter-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.color = 'white';
    overlay.style.padding = '20px';
    overlay.style.textAlign = 'center';
    overlay.style.zIndex = '9999';
    overlay.style.fontSize = '16px';
    overlay.style.fontFamily = 'Arial, sans-serif';
    
    document.body.appendChild(overlay);
  }
  
  overlay.textContent = message;
  overlay.style.display = 'block';
}

/**
 * Oculta el overlay de selección
 */
function hideSelectionOverlay() {
  const overlay = document.getElementById('search-engine-converter-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

/**
 * Muestra el resultado del análisis de OpenAI
 */
function showAnalysisResult(analysis) {
  // Crear un modal para mostrar el resultado
  let modal = document.getElementById('search-engine-converter-modal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'search-engine-converter-modal';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = '80%';
    modal.style.maxWidth = '600px';
    modal.style.maxHeight = '80%';
    modal.style.backgroundColor = 'white';
    modal.style.borderRadius = '8px';
    modal.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    modal.style.zIndex = '10000';
    modal.style.overflow = 'auto';
    modal.style.padding = '20px';
    modal.style.fontFamily = 'Arial, sans-serif';
    
    document.body.appendChild(modal);
  }
  
  // Crear el contenido del modal
  modal.innerHTML = `
    <h2 style="margin-top: 0; color: #333;">Análisis de OpenAI</h2>
    <div style="margin-bottom: 20px; white-space: pre-wrap; line-height: 1.5;">${analysis}</div>
    <div style="text-align: right;">
      <button id="search-engine-converter-close-modal" style="padding: 8px 16px; background-color: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">Cerrar</button>
    </div>
  `;
  
  // Mostrar el modal
  modal.style.display = 'block';
  
  // Agregar evento para cerrar el modal
  document.getElementById('search-engine-converter-close-modal').addEventListener('click', function() {
    modal.style.display = 'none';
  });
}

/**
 * Copia una imagen al portapapeles
 * @param {string} imageData - Imagen en formato base64
 * @returns {Promise<void>} - Promesa que se resuelve cuando la imagen se ha copiado
 */
function copyImageToClipboard(imageData) {
  return new Promise((resolve, reject) => {
    try {
      // Crear un elemento de imagen para cargar la imagen
      const img = new Image();
      img.onload = function() {
        try {
          // Crear un canvas para dibujar la imagen
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          // En Firefox, usamos el API de clipboard para copiar la imagen
          canvas.toBlob(function(blob) {
            try {
              // Crear un objeto ClipboardItem con el blob
              const item = new ClipboardItem({ 'image/png': blob });
              
              // Copiar al portapapeles
              navigator.clipboard.write([item])
                .then(() => {
                  console.log('Imagen copiada al portapapeles');
                  resolve();
                })
                .catch(error => {
                  console.error('Error al copiar al portapapeles:', error);
                  
                  // Fallback: crear un enlace temporal y hacer clic en él
                  const tempLink = document.createElement('a');
                  tempLink.href = imageData;
                  tempLink.download = 'captura_' + new Date().getTime() + '.png';
                  document.body.appendChild(tempLink);
                  tempLink.click();
                  document.body.removeChild(tempLink);
                  
                  // Mostrar mensaje al usuario
                  alert('No se pudo copiar al portapapeles. La imagen se ha descargado como archivo.');
                  resolve();
                });
            } catch (error) {
              console.error('Error al crear ClipboardItem:', error);
              reject(error);
            }
          });
        } catch (error) {
          console.error('Error al dibujar en canvas:', error);
          reject(error);
        }
      };
      
      img.onerror = function() {
        reject(new Error('Error al cargar la imagen'));
      };
      
      img.src = imageData;
    } catch (error) {
      console.error('Error al copiar imagen:', error);
      reject(error);
    }
  });
}

/**
 * Guarda una imagen como archivo
 * @param {string} imageData - Imagen en formato base64
 * @returns {Promise<void>} - Promesa que se resuelve cuando la imagen se ha guardado
 */
function saveImageAsFile(imageData) {
  return new Promise((resolve, reject) => {
    try {
      // Crear un enlace temporal
      const link = document.createElement('a');
      link.href = imageData;
      link.download = 'captura_' + new Date().getTime() + '.png';
      
      // Añadir el enlace al documento
      document.body.appendChild(link);
      
      // Simular clic en el enlace
      link.click();
      
      // Eliminar el enlace
      document.body.removeChild(link);
      
      // Resolver la promesa
      resolve();
    } catch (error) {
      console.error('Error al guardar imagen:', error);
      reject(error);
    }
  });
}

/**
 * Muestra una notificación en la página
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación ('success', 'error', 'info')
 * @param {number} duration - Duración en milisegundos (por defecto 3000ms)
 */
function showNotification(message, type = 'info', duration = 3000) {
  // Eliminar notificación existente si hay alguna
  const existingNotification = document.getElementById('search-engine-converter-notification');
  if (existingNotification && existingNotification.parentNode) {
    existingNotification.parentNode.removeChild(existingNotification);
  }
  
  // Crear el elemento de notificación
  const notification = document.createElement('div');
  notification.id = 'search-engine-converter-notification';
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '10000';
  notification.style.fontFamily = 'Arial, sans-serif';
  notification.style.fontSize = '14px';
  notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
  notification.style.maxWidth = '80%';
  notification.style.wordWrap = 'break-word';
  notification.style.transition = 'opacity 0.3s ease-in-out';
  
  // Establecer el estilo según el tipo
  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#4CAF50';
      notification.style.color = 'white';
      break;
    case 'error':
      notification.style.backgroundColor = '#F44336';
      notification.style.color = 'white';
      break;
    case 'info':
    default:
      notification.style.backgroundColor = '#2196F3';
      notification.style.color = 'white';
      break;
  }
  
  // Establecer el mensaje
  notification.textContent = message;
  
  // Añadir la notificación al documento
  document.body.appendChild(notification);
  
  // Eliminar la notificación después de la duración especificada
  setTimeout(() => {
    if (notification.parentNode) {
      // Animación de desvanecimiento
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, duration);
  
  return notification;
}

/**
 * Muestra un mensaje de error
 */
function showError(errorMessage) {
  showNotification(errorMessage, 'error');
}

// Inicializar el script
initMessageListener();
