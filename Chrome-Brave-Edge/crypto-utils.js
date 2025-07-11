/**
 * @module CryptoUtils
 * @description Utilidades de cifrado para proteger datos sensibles como API keys
 * Utiliza Web Crypto API para cifrado AES-GCM
 */

const CryptoUtils = (() => {
  // Configuración de cifrado
  const ALGORITHM = 'AES-GCM';
  const KEY_LENGTH = 256;
  const IV_LENGTH = 12; // 96 bits para GCM
  const SALT_LENGTH = 16; // 128 bits
  const ITERATIONS = 100000; // Para PBKDF2
  
  /**
   * Genera una clave de cifrado derivada de una contraseña
   * @param {string} password - Contraseña base
   * @param {Uint8Array} salt - Salt para la derivación
   * @returns {Promise<CryptoKey>} Clave de cifrado
   */
  async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Importar la contraseña como clave
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    // Derivar la clave de cifrado
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: ITERATIONS,
        hash: 'SHA-256'
      },
      passwordKey,
      {
        name: ALGORITHM,
        length: KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * Genera una contraseña única basada en el ID de la extensión
   * @returns {Promise<string>} Contraseña única
   */
  async function getUniquePassword() {
    // Usar el ID de la extensión y información del navegador como base
    const extensionId = chrome.runtime.id || 'default-extension-id';
    const userAgent = navigator.userAgent;
    const baseString = `${extensionId}-${userAgent}-search-engine-converter`;
    
    // Hash la cadena base para obtener una contraseña consistente
    const encoder = new TextEncoder();
    const data = encoder.encode(baseString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Cifra un texto usando AES-GCM
   * @param {string} text - Texto a cifrar
   * @returns {Promise<Object>} Objeto con datos cifrados, IV y salt
   */
  async function encrypt(text) {
    try {
      if (!text) return null;
      
      const encoder = new TextEncoder();
      const textBuffer = encoder.encode(text);
      
      // Generar IV y salt aleatorios
      const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
      const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
      
      // Obtener la contraseña única y derivar la clave
      const password = await getUniquePassword();
      const key = await deriveKey(password, salt);
      
      // Cifrar los datos
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: ALGORITHM,
          iv: iv
        },
        key,
        textBuffer
      );
      
      // Convertir a base64 para almacenamiento
      const encryptedArray = new Uint8Array(encryptedBuffer);
      const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(encryptedArray, salt.length + iv.length);
      
      // Convertir a base64
      const base64 = btoa(String.fromCharCode.apply(null, combined));
      
      return {
        encrypted: base64,
        version: 1 // Para futuras migraciones
      };
    } catch (error) {
      console.error('Error al cifrar:', error);
      throw error;
    }
  }
  
  /**
   * Descifra un texto cifrado con AES-GCM
   * @param {Object} encryptedData - Objeto con datos cifrados
   * @returns {Promise<string>} Texto descifrado
   */
  async function decrypt(encryptedData) {
    try {
      if (!encryptedData || !encryptedData.encrypted) return null;
      
      // Convertir de base64
      const combined = Uint8Array.from(atob(encryptedData.encrypted), c => c.charCodeAt(0));
      
      // Extraer salt, IV y datos cifrados
      const salt = combined.slice(0, SALT_LENGTH);
      const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const encryptedBuffer = combined.slice(SALT_LENGTH + IV_LENGTH);
      
      // Obtener la contraseña única y derivar la clave
      const password = await getUniquePassword();
      const key = await deriveKey(password, salt);
      
      // Descifrar los datos
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: ALGORITHM,
          iv: iv
        },
        key,
        encryptedBuffer
      );
      
      // Convertir a texto
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Error al descifrar:', error);
      // Si falla el descifrado, podría ser datos antiguos sin cifrar
      return null;
    }
  }
  
  /**
   * Verifica si los datos están cifrados
   * @param {any} data - Datos a verificar
   * @returns {boolean} True si los datos están cifrados
   */
  function isEncrypted(data) {
    return data && typeof data === 'object' && 
           data.encrypted && data.version;
  }
  
  // API pública
  return {
    encrypt,
    decrypt,
    isEncrypted
  };
})();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined') {
  module.exports = CryptoUtils;
}