# Pipeline de color (exportación CMYK)

## Resumen

1. **Cliente (Fabric)** genera PNG o JPEG en **sRGB** (espacio típico del lienzo web).
2. **`/api/export-print`** recibe el raster en base64, valida tamaño y DPI, y delega en `buildCmykPrintPdfBuffer`.
3. **sharp** aplana sobre blanco, convierte a CMYK y emite JPEG CMYK.
4. **pdfkit** coloca el JPEG en la página PDF con sangrado y marcas de corte opcionales.

## Perfil ICC de salida (CMYK)

- Variable recomendada: `PRINT_ICC_CMYK_OUTPUT_PATH` (ruta absoluta en el host al archivo `.icc`).
- Alias soportado: `SHARP_PRINT_OUTPUT_ICC`.
- sharp usa `withIccProfile(ruta, { attach: true })` para transformar hacia ese espacio e **incrustar** el perfil en el JPEG.
- Si la ruta no existe o sharp falla, se **degrada** a `toColorspace('cmyk')` sin perfil ICC explícito (menos fidelidad en prensa).

### Ejemplo típico (ISO Coated v2)

En Europa, **ISO Coated v2 300% (ECI)** es un perfil CMYK de referencia frecuente para revistas y packaging offset. El archivo `.icc` lo obtenés desde tu proveedor de colorimetría (p. ej. ECI) con licencia adecuada; montalo en el servidor y apuntá `PRINT_ICC_CMYK_OUTPUT_PATH` a esa ruta absoluta.

**pdfkit** inserta el JPEG ya convertido; la coherencia de tinta depende del JPEG CMYK + ICC embebido. Para **OutputIntent** PDF/X explícito haría falta extensión adicional (no incluida en esta versión).

No incluyas perfiles con copyright en el repositorio; montalos en el servidor (Docker volume, secret manager, etc.).

## Perfil de entrada RGB (futuro / opcional)

- Variables: `PRINT_ICC_RGB_INPUT_PATH` / `SHARP_PRINT_INPUT_ICC`.
- Hoy el raster del editor se trata como **sRGB implícito**. Ajustar interpretación RGB avanzada depende de cómo Fabric embebe o no ICC en el PNG; revisar sharp (`pipelineColourspace`, metadatos) antes de forzar otro espacio.

## Verificación

- Acrobat **Preflight** o RIP de imprenta para comprobar espacio de color y tintas.
- Los visores PDF comunes pueden **previsualizar en RGB**; eso no invalida el PDF de prensa.
