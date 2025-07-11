# Política de Privacidad - Search Engine Converter

**Última actualización: 11 de julio de 2025**

## 1. Introducción

Esta Política de Privacidad describe cómo Search Engine Converter ("la Extensión", "nosotros", "nuestro") maneja la información cuando utilizas nuestra extensión de navegador. Nos comprometemos a proteger tu privacidad y a ser transparentes sobre nuestras prácticas de datos.

**Contacto:** ext_chrome@00b.tech

## 2. Información que NO Recopilamos

Search Engine Converter ha sido diseñada con la privacidad como prioridad. **NO recopilamos, almacenamos ni transmitimos:**

- Historiales de búsqueda
- Términos de búsqueda
- Datos personales identificables
- Direcciones IP
- Información del dispositivo
- Datos de navegación
- Capturas de pantalla o imágenes analizadas
- Textos seleccionados o analizados

## 3. Información que se Almacena Localmente

La extensión almacena únicamente la siguiente información en el almacenamiento local de tu navegador:

### 3.1 Configuraciones de Usuario
- Motores de búsqueda visibles/ocultos
- Motor de búsqueda predeterminado
- Dominios regionales (Amazon, YouTube)
- Orden personalizado de botones
- Preferencias de tema (claro/oscuro/sistema)

### 3.2 Configuración de OpenAI (Opcional)
- Clave API de OpenAI (cifrada con AES-GCM 256-bit)
- Modelo seleccionado (GPT-4o-mini, GPT-4o)
- Límite de tokens configurado

**Importante:** Toda esta información se almacena exclusivamente en tu dispositivo y nunca se transmite a servidores externos.

## 4. Uso de Servicios de Terceros

### 4.1 OpenAI API (Opcional)

Cuando utilizas las funciones de análisis con IA:
- Los datos (texto o imágenes) se envían directamente a los servidores de OpenAI
- La transmisión se realiza mediante conexión HTTPS segura
- No almacenamos copias de los datos enviados o recibidos
- El procesamiento está sujeto a la [Política de Privacidad de OpenAI](https://openai.com/privacy/)

**Nota:** Esta funcionalidad es completamente opcional y solo se activa cuando explícitamente solicitas un análisis.

### 4.2 Motores de Búsqueda

Al convertir búsquedas entre motores:
- La extensión redirige tu navegador al motor seleccionado
- Los términos de búsqueda se envían directamente al motor de búsqueda
- No interceptamos ni modificamos estos datos
- Cada motor de búsqueda tiene su propia política de privacidad

## 5. Permisos de la Extensión

La extensión solicita los siguientes permisos y aquí explicamos por qué:

- **activeTab**: Para detectar el motor de búsqueda actual y capturar áreas de pantalla
- **contextMenus**: Para ofrecer opciones de búsqueda mediante clic derecho
- **storage**: Para guardar tus preferencias localmente
- **scripting**: Para inyectar el selector de captura de pantalla
- **tabs**: Para abrir nuevas pestañas con resultados convertidos
- **host_permissions**: Para detectar y convertir búsquedas en los motores soportados

## 6. Seguridad de los Datos

Implementamos las siguientes medidas de seguridad:

- **Cifrado AES-GCM**: Las claves API se cifran antes de almacenarse
- **PBKDF2**: Derivación segura de claves con 100,000 iteraciones
- **Sanitización**: Todo el contenido externo se sanitiza para prevenir ataques
- **CSP Estricto**: Política de seguridad de contenido restrictiva
- **Sin conexiones externas**: Excepto a api.openai.com cuando se usa esa función

## 7. Tus Derechos y Control

Tienes control total sobre tus datos:

- **Acceso**: Puedes ver todas las configuraciones en el panel de opciones
- **Modificación**: Puedes cambiar cualquier configuración en cualquier momento
- **Eliminación**: Desinstalar la extensión elimina todos los datos locales
- **Portabilidad**: Las configuraciones son locales y portables con tu perfil de navegador

## 8. Menores de Edad

La extensión no está dirigida a menores de 13 años. No recopilamos intencionalmente información de menores.

## 9. Cambios en la Política

Si realizamos cambios materiales en esta política:
- Actualizaremos la fecha de "Última actualización"
- Notificaremos cambios significativos en la página de la extensión
- La versión actual siempre estará disponible en GitHub

## 10. Cumplimiento Legal

Esta extensión cumple con:
- Regulación General de Protección de Datos (GDPR)
- California Consumer Privacy Act (CCPA)
- Políticas de Chrome Web Store

## 11. Información de Contacto

Para cualquier pregunta o inquietud sobre esta política de privacidad o las prácticas de datos de la extensión, contáctanos en:

- **Email**: ext_chrome@00b.tech
- **GitHub**: https://github.com/686f6c61/extension-chrome-brave-Edge-Search-Engine-Converter

## 12. Consentimiento

Al instalar y usar Search Engine Converter, aceptas esta Política de Privacidad. Si no estás de acuerdo con estos términos, por favor no instales o desinstala la extensión.

---

**Search Engine Converter** - Desarrollado con respeto por tu privacidad