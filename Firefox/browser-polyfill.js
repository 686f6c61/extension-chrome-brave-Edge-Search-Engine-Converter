/**
 * browser-polyfill.js
 * 
 * Este script proporciona compatibilidad entre las APIs de extensiones de Chrome y Firefox.
 * Permite que el código escrito para Chrome funcione en Firefox sin modificaciones significativas.
 */

(function() {
  'use strict';

  if (typeof globalThis.browser === 'undefined') {
    const CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE = 'The message port closed before a response was received.';

    // Define el objeto browser si no existe
    const browser = globalThis.browser = {};

    // Crea un proxy para las APIs de Chrome
    const createProxyForChrome = (chromeNamespace, browserNamespace) => {
      for (const key in chromeNamespace) {
        if (typeof chromeNamespace[key] === 'object' && chromeNamespace[key] !== null) {
          browserNamespace[key] = {};
          createProxyForChrome(chromeNamespace[key], browserNamespace[key]);
        } else if (typeof chromeNamespace[key] === 'function') {
          browserNamespace[key] = (...args) => {
            return new Promise((resolve, reject) => {
              chromeNamespace[key](...args, (result) => {
                if (chrome.runtime.lastError) {
                  if (chrome.runtime.lastError.message === CHROME_SEND_MESSAGE_CALLBACK_NO_RESPONSE_MESSAGE) {
                    resolve();
                  } else {
                    reject(new Error(chrome.runtime.lastError.message));
                  }
                } else {
                  resolve(result);
                }
              });
            });
          };
        } else {
          browserNamespace[key] = chromeNamespace[key];
        }
      }
    };

    // Aplica el proxy a todas las APIs de Chrome
    if (typeof chrome !== 'undefined') {
      createProxyForChrome(chrome, browser);
    }
  }
})();
