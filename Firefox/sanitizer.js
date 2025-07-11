/**
 * @module Sanitizer
 * @description Utilidades para sanitizar contenido HTML y texto antes de insertarlo en el DOM
 * Previene ataques XSS y otros problemas de seguridad
 */

const Sanitizer = (() => {
  /**
   * Lista de etiquetas HTML permitidas
   */
  const ALLOWED_TAGS = [
    'p', 'br', 'span', 'div', 'b', 'i', 'u', 'strong', 'em',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'a', 'img'
  ];
  
  /**
   * Lista de atributos permitidos por etiqueta
   */
  const ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'width', 'height'],
    'div': ['class'],
    'span': ['class'],
    'p': ['class'],
    'pre': ['class'],
    'code': ['class']
  };
  
  /**
   * Patrones de URL permitidas
   */
  const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];
  
  /**
   * Escapa caracteres HTML especiales
   * @param {string} text - Texto a escapar
   * @returns {string} Texto escapado
   */
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return text.replace(/[&<>"'/]/g, char => map[char]);
  }
  
  /**
   * Valida si una URL es segura
   * @param {string} url - URL a validar
   * @returns {boolean} True si la URL es segura
   */
  function isValidUrl(url) {
    try {
      const urlObj = new URL(url);
      return ALLOWED_PROTOCOLS.includes(urlObj.protocol);
    } catch {
      // Si no es una URL válida, verificar si es una ruta relativa
      return url.startsWith('/') || url.startsWith('#');
    }
  }
  
  /**
   * Sanitiza contenido HTML
   * @param {string} html - HTML a sanitizar
   * @returns {string} HTML sanitizado
   */
  function sanitizeHtml(html) {
    if (!html) return '';
    
    // Crear un documento temporal para parsear el HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Función recursiva para sanitizar nodos
    function sanitizeNode(node) {
      // Si es un nodo de texto, no hacer nada
      if (node.nodeType === Node.TEXT_NODE) {
        return node;
      }
      
      // Si es un elemento
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        
        // Si la etiqueta no está permitida, reemplazar con su contenido
        if (!ALLOWED_TAGS.includes(tagName)) {
          const fragment = document.createDocumentFragment();
          while (node.firstChild) {
            fragment.appendChild(sanitizeNode(node.firstChild));
          }
          return fragment;
        }
        
        // Crear un nuevo elemento limpio
        const cleanElement = document.createElement(tagName);
        
        // Copiar solo los atributos permitidos
        const allowedAttrs = ALLOWED_ATTRIBUTES[tagName] || [];
        for (const attr of allowedAttrs) {
          if (node.hasAttribute(attr)) {
            const value = node.getAttribute(attr);
            
            // Validación especial para URLs
            if (attr === 'href' || attr === 'src') {
              if (isValidUrl(value)) {
                cleanElement.setAttribute(attr, value);
              }
            } else {
              cleanElement.setAttribute(attr, value);
            }
          }
        }
        
        // Sanitizar los hijos
        while (node.firstChild) {
          const sanitizedChild = sanitizeNode(node.firstChild);
          if (sanitizedChild) {
            cleanElement.appendChild(sanitizedChild);
          }
          node.removeChild(node.firstChild);
        }
        
        return cleanElement;
      }
      
      // Para otros tipos de nodos, ignorar
      return null;
    }
    
    // Sanitizar el body completo
    const sanitizedBody = sanitizeNode(doc.body);
    
    // Convertir de vuelta a HTML
    const container = document.createElement('div');
    container.appendChild(sanitizedBody);
    return container.innerHTML;
  }
  
  /**
   * Sanitiza texto plano (sin HTML)
   * @param {string} text - Texto a sanitizar
   * @returns {string} Texto sanitizado
   */
  function sanitizeText(text) {
    if (!text) return '';
    
    // Eliminar caracteres de control peligrosos
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Escapar HTML
    return escapeHtml(text);
  }
  
  /**
   * Convierte markdown básico a HTML sanitizado
   * @param {string} markdown - Texto en markdown
   * @returns {string} HTML sanitizado
   */
  function markdownToSafeHtml(markdown) {
    if (!markdown) return '';
    
    // Primero escapar HTML
    let html = escapeHtml(markdown);
    
    // Convertir markdown básico
    // Enlaces: [texto](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      if (isValidUrl(url)) {
        return `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(text)}</a>`;
      }
      return match;
    });
    
    // Negritas: **texto**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Cursivas: *texto*
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Código inline: `código`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Saltos de línea
    html = html.replace(/\n/g, '<br>');
    
    // Párrafos (doble salto de línea)
    html = html.replace(/(<br>){2,}/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Limpiar párrafos vacíos
    html = html.replace(/<p>\s*<\/p>/g, '');
    
    return html;
  }
  
  // API pública
  return {
    escapeHtml,
    sanitizeHtml,
    sanitizeText,
    markdownToSafeHtml
  };
})();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined') {
  module.exports = Sanitizer;
}