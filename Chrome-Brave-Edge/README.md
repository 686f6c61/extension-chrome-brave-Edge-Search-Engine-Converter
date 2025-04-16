<div align="center">

# Search Engine Converter para Chrome, Brave y Edge

<img src="images/icon256.png" alt="Search Engine Converter Logo" width="128px" height="128px">

### Motores de búsqueda soportados:

[<img src="https://www.google.com/favicon.ico" width="32" alt="Google">](https://www.google.com) &nbsp;&nbsp;
[<img src="https://www.bing.com/favicon.ico" width="32" alt="Bing">](https://www.bing.com) &nbsp;&nbsp;
[<img src="https://duckduckgo.com/favicon.ico" width="32" alt="DuckDuckGo">](https://duckduckgo.com) &nbsp;&nbsp;
[<img src="https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" width="32" alt="OpenAI">](https://chat.openai.com) &nbsp;&nbsp;
[<img src="https://www.amazon.es/favicon.ico" width="32" alt="Amazon">](https://www.amazon.es) &nbsp;&nbsp;
[<img src="https://www.youtube.com/favicon.ico" width="32" alt="YouTube">](https://www.youtube.com) &nbsp;&nbsp;
[<img src="https://es.wikipedia.org/static/favicon/wikipedia.ico" width="32" alt="Wikipedia">](https://es.wikipedia.org)

_Convierte tus búsquedas entre Google, Brave, DuckDuckGo, Bing, OpenAI, Amazon, YouTube y Wikipedia con un solo clic o desde el menú contextual. Captura y analiza imágenes con OpenAI._

[![Versión](https://img.shields.io/badge/versi%C3%B3n-1.1-blue)](https://github.com/686f6c61/extension-chrome-search-engine-converter)
[![Chrome](https://img.shields.io/badge/Chrome-compatible-brightgreen)](https://github.com/686f6c61/extension-chrome-search-engine-converter)
[![Brave](https://img.shields.io/badge/Brave-compatible-brightgreen)](https://github.com/686f6c61/extension-chrome-search-engine-converter)
[![Edge](https://img.shields.io/badge/Edge-compatible-brightgreen)](https://github.com/686f6c61/extension-chrome-search-engine-converter)

</div>

## 📝 Descripción

**Search Engine Converter** es una extensión minimalista para Chrome, Brave y Edge que te permite cambiar fácilmente entre resultados de búsqueda de diferentes motores de búsqueda compatibles (Google, Brave, DuckDuckGo, Bing, OpenAI, Amazon y YouTube). Con un simple clic, la extensión redirige la página de resultados del motor de búsqueda actual a la página correspondiente del motor de búsqueda seleccionado, conservando exactamente los mismos términos de búsqueda.

## ✨ Características

- Funciona con múltiples motores de búsqueda compatibles: Google, Brave, DuckDuckGo, Bing, OpenAI, Amazon, YouTube y Wikipedia
- Interfaz minimalista con iconos claramente identificables
- Cambio instantáneo entre motores de búsqueda con un solo clic
- Menú contextual para buscar texto seleccionado en cualquier página
- Opción para configurar el motor de búsqueda predeterminado para el menú contextual
- Configuración personalizable para dominios de Amazon y YouTube
- 🔄 Conversión instantánea de Brave Search a múltiples motores de búsqueda
- 🔍 Mantiene los términos de búsqueda originales
- 🎨 Interfaz minimalista con colores distintivos para cada motor de búsqueda
- 📱 Diseño moderno y responsive
- 🔔 Feedback visual con indicadores de estado
- ⚡ Ligera y rápida, sin impacto en el rendimiento
- 🔐 Búsqueda rápida con motor predeterminado configurable
- 📸 Captura de áreas específicas de la pantalla para análisis con OpenAI
- 🤖 Integración con el modelo GPT-4o-mini para análisis de imágenes

## 🚀 Instalación

### Instalación manual (Modo desarrollador)

1. Descarga o clona este repositorio
   ```bash
   git clone https://github.com/686f6c61/extension-chrome-search-engine-converter.git
   ```

2. Abre Chrome/Brave/Edge y navega a `chrome://extensions/`

3. Activa el "Modo de desarrollador" en la esquina superior derecha

4. Haz clic en "Cargar descomprimida" y selecciona la carpeta "Chrome-Brave-Edge" que contiene los archivos de la extensión

5. ¡Listo! La extensión aparecerá en tu barra de herramientas

## 🔧 Uso

### Desde el popup de la extensión

1. Navega a una página de resultados de búsqueda de Brave (URL que comience con `https://search.brave.com/search?`)

2. Haz clic en el icono de la extensión en la barra de herramientas

3. Verás un mensaje preguntando a qué motor de búsqueda deseas cambiar

4. Si estás en una página de búsqueda de Brave, selecciona uno de los motores disponibles:
   - Google: Para buscar en Google Search
   - DuckDuckGo: Para buscar en DuckDuckGo
   - Bing: Para buscar en Microsoft Bing
   - OpenAI: Para preguntar a ChatGPT
   - Amazon: Para buscar productos en Amazon
   - YouTube: Para buscar videos en YouTube

5. La página se actualizará automáticamente con los resultados equivalentes en el motor seleccionado

### Desde el menú contextual (botón derecho)

1. Selecciona cualquier texto en cualquier página web

2. Haz clic derecho sobre el texto seleccionado

3. En el menú contextual, encontrarás las siguientes opciones:
   - "Búsqueda rápida en [Motor predeterminado]": Busca directamente con tu motor preferido
   - "Buscar '[texto seleccionado]' en...": Submenu con todos los motores disponibles
   - "Establecer motor predeterminado": Para cambiar el motor de búsqueda rápida

4. Al seleccionar cualquier opción, se abrirá una nueva pestaña con los resultados de la búsqueda

### Captura y análisis de pantalla con OpenAI

1. Haz clic derecho en cualquier parte de una página web

2. Selecciona "Capturar y analizar con OpenAI" en el menú contextual

3. Se capturará automáticamente la pantalla visible y se abrirá una nueva pestaña

4. En la nueva pestaña, haz clic y arrastra para seleccionar el área específica que deseas analizar

5. Opcionalmente, escribe un prompt personalizado en el campo de texto para dirigir el análisis (por ejemplo, "Identifica los productos que aparecen en esta imagen")

6. Haz clic en el botón "Analizar con OpenAI" para procesar la imagen seleccionada

7. Espera unos segundos mientras se procesa la imagen y se muestra el resultado del análisis

8. Puedes cerrar la ventana de resultados o la pestaña completa cuando hayas terminado
