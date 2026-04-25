# PWA Checklist - Asciende

## Lo que se ha configurado:

### Archivos Base ✓
- [x] `index.html` - Con manifest.json y meta tags completos
- [x] `public/manifest.json` - Configurado con iconos, display: standalone
- [x] `public/service-worker.js` - Service Worker activo
- [x] `public/browserconfig.xml` - Para Windows Tiles
- [x] `public/favicon.png` - Favicon 320x320
- [x] `public/icon-192.png` - Icon 192x192
- [x] `public/icon-512.png` - Icon 512x512

### Meta Tags en HTML ✓
- [x] `theme-color`
- [x] `apple-mobile-web-app-capable`
- [x] `apple-mobile-web-app-status-bar-style`
- [x] `apple-mobile-web-app-title`
- [x] `mobile-web-app-capable`
- [x] `application-name`
- [x] `msapplication-TileColor`
- [x] `msapplication-TileImage`

### Service Worker ✓
- [x] Registrado en `src/main.tsx`
- [x] `updateViaCache: 'none'` - Para evitar problemas de caché
- [x] Auto-actualización cada 60 segundos
- [x] Manejo de offline
- [x] Caché de assets críticos

### PWA Prompt ✓
- [x] Event listener `beforeinstallprompt` configurado
- [x] Prompt automático disparado

## Qué hacer en tu hosting:

### 1. Verificar Headers HTTP
Asegúrate que tu servidor devuelve estos headers:

```
Cache-Control: no-cache, no-store, must-revalidate
Content-Type: application/json
```

Para `manifest.json`, `service-worker.js` y archivos estáticos.

### 2. Verificar HTTPS ✓
Ya tienes HTTPS en tu subdominio.

### 3. Verificar Mime Types
Asegúrate que tu servidor reconoce:
- `.json` → `application/json`
- `.xml` → `application/xml` o `text/xml`
- `.js` → `application/javascript`

### 4. Testear en Chrome DevTools

1. Abre: `F12 → Application → Manifest`
   - Verifica que aparezca con status verde
   - Que todos los iconos carguen

2. Abre: `F12 → Application → Service Workers`
   - Verifica que esté registrado y activo
   - Que muestre "offline"

3. Abre: `F12 → Application → Storage`
   - Verifica que el caché funcione

### 5. Instalar en Chrome Desktop
- Abre DevTools
- Espera 2-3 segundos
- El prompt debería dispararse automáticamente
- O haz clic en el icono "Install" en la barra de direcciones

### 6. Instalar en Android
- Abre en Chrome
- Espera 2-3 segundos
- Deberías ver "Instalar Asciende" en el menú de contexto

### 7. Instalar en iPhone/Safari
- Abre en Safari
- Comparte → "Agregar a inicio"

## Si no aparece el botón Install:

### Checklist Diagnóstico:
1. ✓ Verifica la consola de DevTools (F12) para errores
2. ✓ Busca "PWA install prompt available" en logs
3. ✓ Verifica que `manifest.json` devuelve HTTP 200
4. ✓ Verifica que `service-worker.js` devuelve HTTP 200
5. ✓ Asegúrate que la app está visible por 2+ segundos
6. ✓ Prueba en modo incógnito (incógnito limpia datos)
7. ✓ Borra caché del navegador y recarga

## URLs para testear:
- Manifest: `https://tu-dominio.com/manifest.json`
- Service Worker: `https://tu-dominio.com/service-worker.js`
- Favicon: `https://tu-dominio.com/favicon.png`

## Validadores Online:
- https://www.pwabuilder.com/ (valida PWA)
- https://wave.webaim.org/ (verifica accesibilidad)
- https://pagespeed.web.dev/ (performance)
