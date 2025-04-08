// Script para manejar la selección y análisis de capturas de pantalla
document.addEventListener('DOMContentLoaded', function() {
  // Elementos del DOM
  const screenshot = document.getElementById('screenshot');
  const selectionOverlay = document.getElementById('selection-overlay');
  const selection = document.getElementById('selection');
  const analyzeButton = document.getElementById('analyze-button');
  const cancelButton = document.getElementById('cancel-button');
  const closeButton = document.getElementById('close-button');
  const resultContainer = document.getElementById('result-container');
  const resultContent = document.getElementById('result-content');
  const resultText = document.getElementById('result-text');
  const loading = document.getElementById('loading');
  const closeResult = document.getElementById('close-result');
  
  // Variables para la selección
  let isSelecting = false;
  let startX, startY;
  let selectionRect = null;
  
  // Escuchar mensajes del background script
  chrome.runtime.onMessage.addListener(function(message) {
    if (message.action === 'setScreenshot') {
      // Establecer la imagen capturada
      screenshot.src = message.dataUrl;
    }
  });
  
  // Iniciar selección
  selectionOverlay.addEventListener('mousedown', function(e) {
    isSelecting = true;
    startX = e.offsetX;
    startY = e.offsetY;
    
    // Inicializar selección
    selection.style.left = startX + 'px';
    selection.style.top = startY + 'px';
    selection.style.width = '0';
    selection.style.height = '0';
    selection.style.display = 'block';
    
    // Deshabilitar botón de análisis
    analyzeButton.disabled = true;
  });
  
  // Actualizar selección mientras se arrastra
  selectionOverlay.addEventListener('mousemove', function(e) {
    if (!isSelecting) return;
    
    const currentX = e.offsetX;
    const currentY = e.offsetY;
    
    // Calcular dimensiones
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    // Calcular posición (para permitir selección en cualquier dirección)
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    
    // Actualizar selección
    selection.style.left = left + 'px';
    selection.style.top = top + 'px';
    selection.style.width = width + 'px';
    selection.style.height = height + 'px';
  });
  
  // Finalizar selección
  selectionOverlay.addEventListener('mouseup', function() {
    if (!isSelecting) return;
    isSelecting = false;
    
    // Obtener dimensiones finales
    const width = parseInt(selection.style.width);
    const height = parseInt(selection.style.height);
    
    // Verificar si la selección es demasiado pequeña
    if (width < 10 || height < 10) {
      selection.style.display = 'none';
      return;
    }
    
    // Guardar información de la selección
    selectionRect = {
      left: parseInt(selection.style.left),
      top: parseInt(selection.style.top),
      width: width,
      height: height
    };
    
    // Habilitar botón de análisis
    analyzeButton.disabled = false;
  });
  
  // Cancelar selección
  cancelButton.addEventListener('click', function() {
    selection.style.display = 'none';
    selectionRect = null;
    analyzeButton.disabled = true;
  });
  
  // Cerrar la pestaña
  closeButton.addEventListener('click', function() {
    window.close();
  });
  
  // Analizar la selección con OpenAI
  analyzeButton.addEventListener('click', async function() {
    if (!selectionRect) return;
    
    // Obtener el prompt personalizado
    const customPrompt = document.getElementById('custom-prompt').value.trim();
    
    try {
      // Mostrar pantalla de carga
      resultContainer.style.display = 'flex';
      loading.style.display = 'flex';
      resultContent.style.display = 'none';
      
      // Crear un canvas para recortar la selección
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = selectionRect.width;
      canvas.height = selectionRect.height;
      
      // Dibujar solo la parte seleccionada
      ctx.drawImage(
        screenshot,
        selectionRect.left,
        selectionRect.top,
        selectionRect.width,
        selectionRect.height,
        0,
        0,
        selectionRect.width,
        selectionRect.height
      );
      
      // Convertir a base64
      const imageData = canvas.toDataURL('image/png');
      
      // Obtener configuración de OpenAI
      const config = await new Promise(resolve => {
        chrome.storage.local.get('braveSearchConverterConfig', function(data) {
          if (data.braveSearchConverterConfig) {
            resolve(JSON.parse(data.braveSearchConverterConfig));
          } else {
            resolve({});
          }
        });
      });
      
      // Verificar si hay una clave API configurada
      if (!config.openAIApiKey) {
        throw new Error('No se ha configurado una clave API de OpenAI. Por favor, configúrala en el panel de configuración.');
      }
      
      // Enviar a OpenAI con el prompt personalizado
      const response = await sendToOpenAI(imageData, config, customPrompt);
      
      // Mostrar resultado
      loading.style.display = 'none';
      resultContent.style.display = 'block';
      resultText.textContent = response;
      
    } catch (error) {
      console.error('Error al analizar la imagen:', error);
      
      // Mostrar error
      loading.style.display = 'none';
      resultContent.style.display = 'block';
      resultText.textContent = 'Error: ' + error.message;
    }
  });
  
  // Cerrar resultado
  closeResult.addEventListener('click', function() {
    resultContainer.style.display = 'none';
  });
  
  // Función para enviar imagen a OpenAI
  async function sendToOpenAI(imageData, config, customPrompt = '') {
    // Eliminar el prefijo de los datos de la imagen
    const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');
    
    // Configurar la solicitud
    const apiKey = config.openAIApiKey;
    const model = config.openAIModel || 'gpt-4o-mini';
    const maxTokens = parseInt(config.openAIMaxTokens) || 1000;
    
    console.log('Configuración OpenAI:', {
      modelo: model,
      maxTokens: maxTokens
    });
    
    // Crear la solicitud
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'Eres un asistente experto en analizar imágenes. Describe detalladamente lo que ves en la imagen proporcionada. NO uses formato markdown en tu respuesta, usa texto plano.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: customPrompt || 'Analiza esta imagen y describe detalladamente lo que ves. Sé específico y conciso.'
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
        max_tokens: parseInt(maxTokens)
      })
    });
    
    // Verificar respuesta
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al comunicarse con OpenAI');
    }
    
    // Procesar respuesta
    const data = await response.json();
    return data.choices[0].message.content;
  }
});
