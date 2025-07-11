/**
 * @module RateLimiter
 * @description Implementa control de tasa para las llamadas a la API de OpenAI
 * Previene el abuso y evita exceder los límites de la API
 */

const RateLimiter = (() => {
  // Configuración del limitador de tasa
  const config = {
    maxRequests: 10,        // Máximo número de solicitudes permitidas
    windowMs: 60000,        // Ventana de tiempo en milisegundos (1 minuto)
    blockDurationMs: 300000 // Duración del bloqueo cuando se excede el límite (5 minutos)
  };

  // Almacenamiento de las solicitudes
  let requestHistory = [];
  let isBlocked = false;
  let blockUntil = null;

  /**
   * Limpia las solicitudes antiguas fuera de la ventana de tiempo
   */
  function cleanOldRequests() {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    requestHistory = requestHistory.filter(timestamp => timestamp > windowStart);
  }

  /**
   * Verifica si se puede hacer una nueva solicitud
   * @returns {Object} Objeto con `allowed` (boolean) y `message` (string)
   */
  function checkLimit() {
    const now = Date.now();

    // Verificar si estamos en período de bloqueo
    if (isBlocked && blockUntil) {
      if (now < blockUntil) {
        const remainingTime = Math.ceil((blockUntil - now) / 1000);
        return {
          allowed: false,
          message: `Las solicitudes están bloqueadas por ${remainingTime} segundos debido a exceso de uso.`
        };
      } else {
        // El período de bloqueo ha terminado
        isBlocked = false;
        blockUntil = null;
        requestHistory = [];
      }
    }

    // Limpiar solicitudes antiguas
    cleanOldRequests();

    // Verificar si hemos alcanzado el límite
    if (requestHistory.length >= config.maxRequests) {
      // Activar bloqueo
      isBlocked = true;
      blockUntil = now + config.blockDurationMs;
      
      return {
        allowed: false,
        message: `Se ha excedido el límite de ${config.maxRequests} solicitudes por minuto. Por favor, espera 5 minutos antes de intentar nuevamente.`
      };
    }

    return {
      allowed: true,
      message: null
    };
  }

  /**
   * Registra una nueva solicitud
   */
  function recordRequest() {
    requestHistory.push(Date.now());
  }

  /**
   * Obtiene el estado actual del limitador
   * @returns {Object} Estado con información sobre las solicitudes
   */
  function getStatus() {
    cleanOldRequests();
    
    const now = Date.now();
    const remainingRequests = Math.max(0, config.maxRequests - requestHistory.length);
    const resetTime = requestHistory.length > 0 
      ? new Date(requestHistory[0] + config.windowMs) 
      : null;

    return {
      requestsUsed: requestHistory.length,
      requestsRemaining: remainingRequests,
      resetTime: resetTime,
      isBlocked: isBlocked,
      blockUntil: blockUntil ? new Date(blockUntil) : null
    };
  }

  /**
   * Reinicia el limitador (útil para pruebas o reset manual)
   */
  function reset() {
    requestHistory = [];
    isBlocked = false;
    blockUntil = null;
  }

  /**
   * Actualiza la configuración del limitador
   * @param {Object} newConfig - Nueva configuración
   */
  function updateConfig(newConfig) {
    Object.assign(config, newConfig);
  }

  // API pública
  return {
    checkLimit,
    recordRequest,
    getStatus,
    reset,
    updateConfig
  };
})();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RateLimiter;
}