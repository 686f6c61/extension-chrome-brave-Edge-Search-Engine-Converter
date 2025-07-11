/**
 * Screen Selector - Nueva implementación de captura de pantalla
 * Enfoque: Overlay directo en la página actual sin ventanas emergentes
 */

(() => {
  // Evitar múltiples inyecciones
  if (window.__screenSelectorActive) return;
  window.__screenSelectorActive = true;

  // Estado de la aplicación
  const state = {
    isSelecting: false,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    screenshot: null
  };

  // Crear elementos del UI
  function createUI() {
    // Contenedor principal
    const container = document.createElement('div');
    container.id = 'screen-selector-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 2147483647;
      pointer-events: none;
    `;

    // Overlay oscuro
    const overlay = document.createElement('div');
    overlay.id = 'screen-selector-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      cursor: crosshair;
      pointer-events: auto;
    `;

    // Área de selección
    const selection = document.createElement('div');
    selection.id = 'screen-selector-area';
    selection.style.cssText = `
      position: absolute;
      border: 2px solid #3498db;
      background: rgba(52, 152, 219, 0.1);
      display: none;
      pointer-events: none;
    `;

    // Instrucciones
    const instructions = document.createElement('div');
    instructions.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 15px 30px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 16px;
      pointer-events: none;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    `;
    instructions.innerHTML = 'Arrastra para seleccionar el área • ESC para cancelar';

    // Panel de resultados
    const resultPanel = document.createElement('div');
    resultPanel.id = 'screen-selector-results';
    resultPanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      display: none;
      z-index: 2147483648;
    `;

    resultPanel.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; font-family: Arial, sans-serif;">Análisis con OpenAI</h3>
        <textarea id="custom-prompt" placeholder="Describe qué quieres analizar..." 
          style="width: 100%; height: 80px; padding: 10px; border: 1px solid #ddd; 
          border-radius: 6px; resize: vertical; font-family: Arial, sans-serif;"></textarea>
      </div>
      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <button id="analyze-btn" style="flex: 1; padding: 12px; background: #3498db; 
          color: white; border: none; border-radius: 6px; cursor: pointer; 
          font-size: 16px; font-weight: bold;">Analizar</button>
        <button id="cancel-analysis-btn" style="padding: 12px 24px; background: #e74c3c; 
          color: white; border: none; border-radius: 6px; cursor: pointer; 
          font-size: 16px;">Cancelar</button>
      </div>
      <div id="analysis-result" style="display: none;">
        <div id="loading" style="text-align: center; padding: 20px;">
          <div style="display: inline-block; width: 40px; height: 40px; 
            border: 4px solid #f3f3f3; border-top: 4px solid #3498db; 
            border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p style="margin-top: 10px; color: #666;">Analizando imagen...</p>
        </div>
        <div id="result-content" style="display: none;">
          <h4 style="margin: 20px 0 10px 0; font-family: Arial, sans-serif;">Resultado:</h4>
          <div id="result-text" style="line-height: 1.8; color: #333; font-family: Arial, sans-serif; 
            white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 6px; 
            max-height: 400px; overflow-y: auto;"></div>
        </div>
      </div>
    `;

    // Añadir animación de spinner
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    // Ensamblar UI
    container.appendChild(overlay);
    container.appendChild(selection);
    container.appendChild(instructions);
    document.body.appendChild(container);
    document.body.appendChild(resultPanel);

    return { container, overlay, selection, instructions, resultPanel };
  }

  // Manejadores de eventos
  function setupEventHandlers(elements) {
    const { overlay, selection } = elements;

    overlay.addEventListener('mousedown', handleMouseDown);
    overlay.addEventListener('mousemove', handleMouseMove);
    overlay.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    function handleMouseDown(e) {
      state.isSelecting = true;
      state.startX = e.clientX;
      state.startY = e.clientY;
      selection.style.display = 'block';
      selection.style.left = e.clientX + 'px';
      selection.style.top = e.clientY + 'px';
      selection.style.width = '0px';
      selection.style.height = '0px';
    }

    function handleMouseMove(e) {
      if (!state.isSelecting) return;

      state.endX = e.clientX;
      state.endY = e.clientY;

      const left = Math.min(state.startX, state.endX);
      const top = Math.min(state.startY, state.endY);
      const width = Math.abs(state.endX - state.startX);
      const height = Math.abs(state.endY - state.startY);

      selection.style.left = left + 'px';
      selection.style.top = top + 'px';
      selection.style.width = width + 'px';
      selection.style.height = height + 'px';
    }

    function handleMouseUp(e) {
      if (!state.isSelecting) return;
      state.isSelecting = false;

      const width = Math.abs(state.endX - state.startX);
      const height = Math.abs(state.endY - state.startY);

      if (width > 10 && height > 10) {
        captureArea();
      } else {
        cleanup();
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        cleanup();
      }
    }
  }

  // Capturar área seleccionada
  function captureArea() {
    const area = {
      x: Math.min(state.startX, state.endX),
      y: Math.min(state.startY, state.endY),
      width: Math.abs(state.endX - state.startX),
      height: Math.abs(state.endY - state.startY)
    };

    // Ocultar UI temporalmente para captura limpia
    const container = document.getElementById('screen-selector-container');
    container.style.display = 'none';

    // Solicitar captura al background
    chrome.runtime.sendMessage({
      action: 'captureVisibleTab'
    }, response => {
      if (response && response.success) {
        // Recortar la imagen en el frontend
        cropImage(response.screenshot, area)
          .then(croppedImage => {
            state.screenshot = croppedImage;
            showAnalysisPanel();
          })
          .catch(err => {
            alert('Error al procesar imagen: ' + err.message);
            cleanup();
          });
      } else {
        alert('Error al capturar: ' + (response?.error || 'Error desconocido'));
        cleanup();
      }
    });
  }

  // Función para recortar imagen en el frontend
  function cropImage(dataUrl, area) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = area.width;
        canvas.height = area.height;
        const ctx = canvas.getContext('2d');
        
        // Considerar el device pixel ratio para alta resolución
        const dpr = window.devicePixelRatio || 1;
        
        ctx.drawImage(
          img,
          area.x * dpr,
          area.y * dpr,
          area.width * dpr,
          area.height * dpr,
          0, 0,
          area.width,
          area.height
        );
        
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Error al cargar imagen'));
      img.src = dataUrl;
    });
  }

  // Mostrar panel de análisis
  function showAnalysisPanel() {
    const resultPanel = document.getElementById('screen-selector-results');
    resultPanel.style.display = 'block';

    // Configurar botones
    document.getElementById('analyze-btn').addEventListener('click', analyzeImage);
    document.getElementById('cancel-analysis-btn').addEventListener('click', cleanup);
  }

  // Analizar imagen con OpenAI
  function analyzeImage() {
    const customPrompt = document.getElementById('custom-prompt').value.trim();
    const prompt = customPrompt || 'Analiza esta imagen y describe qué ves en detalle.';

    // Mostrar loading
    document.getElementById('analysis-result').style.display = 'block';
    document.getElementById('loading').style.display = 'block';
    document.getElementById('result-content').style.display = 'none';

    // Enviar a background para análisis
    chrome.runtime.sendMessage({
      action: 'analyzeScreenshot',
      screenshot: state.screenshot,
      prompt: prompt
    }, response => {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('result-content').style.display = 'block';

      if (response && response.success) {
        document.getElementById('result-text').innerHTML = formatResult(response.analysis);
      } else {
        document.getElementById('result-text').innerHTML = 
          `<p style="color: #e74c3c;">Error: ${response?.error || 'Error al analizar'}</p>`;
      }
    });
  }

  // Formatear resultado - mostrar como texto plano
  function formatResult(text) {
    // Primero eliminar cualquier formato markdown que pueda haber
    let cleaned = text
      // Eliminar negritas **texto** o __texto__
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      // Eliminar cursivas *texto* o _texto_
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      // Eliminar encabezados ###
      .replace(/^#{1,6}\s+/gm, '')
      // Eliminar formato de código `código`
      .replace(/`([^`]+)`/g, '$1')
      // Eliminar enlaces [texto](url)
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    
    // Escapar HTML para evitar problemas de seguridad
    const escaped = cleaned
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // Convertir saltos de línea a <br>
    return escaped.replace(/\n/g, '<br>');
  }

  // Limpiar todo
  function cleanup() {
    window.__screenSelectorActive = false;
    
    // Remover elementos
    const container = document.getElementById('screen-selector-container');
    const resultPanel = document.getElementById('screen-selector-results');
    
    if (container) container.remove();
    if (resultPanel) resultPanel.remove();

    // Limpiar event listeners
    document.removeEventListener('keydown', handleKeyDown);
  }

  // Inicializar
  const elements = createUI();
  setupEventHandlers(elements);
})();