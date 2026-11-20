# TravelSpend — San Diego

Dashboard móvil de gastos en **USD**, sin presupuestos iniciales. Añade, edita o elimina compras y devoluciones, consulta total neto, movimientos diarios, categorías, comercios y medios de pago. Exporta CSV o JSON, lee tickets con la cámara y consulta automáticamente el tipo de cambio USD/MXN si habilitas esa opción.

## Abrir en el iPhone

La app está en la carpeta `travelspend` de `camushellraiser/plex-tools`:  
https://camushellraiser.github.io/plex-tools/travelspend/

En Safari, abre la URL y usa **Compartir → Agregar a pantalla de inicio**.

## Almacenamiento local (disponible de inmediato)

Mientras Firebase no esté configurado, todos los gastos se guardan en el almacenamiento de **ese navegador y dispositivo**. No se transfieren entre iPhones y pueden desaparecer si borras los datos de Safari. Guarda un respaldo con **Ajustes → Respaldo JSON** todos los días. Los archivos JSON incluyen tus movimientos en texto claro: consérvalos de forma privada.

## Sincronización privada con Firebase (recomendada)

1. Crea un proyecto en https://console.firebase.google.com/. Puedes empezar con el nivel gratuito Spark, sujeto a límites.
2. En **Project Settings → Your apps → Web**, registra una Web app. Copia el objeto `firebaseConfig`.
3. Edita el archivo **`travelspend/index.html` en GitHub**. Busca la línea `window.TRAVELSPEND_FIREBASE_CONFIG = null;` y reemplaza *solo el null* con el objeto de Firebase. Ejemplo:

```js
window.TRAVELSPEND_FIREBASE_CONFIG = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  appId: "TU_APP_ID",
  messagingSenderId: "TU_SENDER_ID"
};
```

4. En **Authentication → Sign-in method**, habilita **Email/Password**; desde **Users**, crea el usuario con tu correo y contraseña. La aplicación deliberadamente no permite crear usuarios desde la página.
5. En **Firestore Database**, crea la base y ve a **Rules**. Sustituye las reglas iniciales por el contenido exacto de [firestore.rules](./firestore.rules) y pulsa **Publish**. ¡Nunca dejes Firestore en modo de prueba!
6. En **Authentication → Settings → Authorized domains**, autoriza `camushellraiser.github.io` si no aparece ya.
7. Abre de nuevo la app e inicia sesión. Revisa el banner **Nube conectada** y prueba un registro. Los usuarios autenticados solo acceden a su propia colección de movimientos; las reglas de Firestore son esenciales. El objeto `firebaseConfig` es un identificador público de cliente, no una contraseña.
8. Si ya tenías datos locales, en **Ajustes** aparecerá el botón **Subir gastos locales a la nube**. Comprueba que la sincronización terminó y exporta otro JSON.

## Conversión USD a MXN, sin captura manual

En **Ajustes → Conversión automática a MXN** activa **Mostrar equivalentes en pesos (MXN)**. TravelSpend consulta https://api.frankfurter.dev/v2/rate/usd/mxn (Frankfurter, sin clave), muestra la fecha y el tipo de cambio y actualiza los equivalentes del total en MXN automáticamente; refresca al menos cada seis horas mientras se abra la web y permite forzar la actualización. Conserva la última cotización en el dispositivo para mostrar una estimación si no hay conexión; indica que puede estar desactualizada. No pide que captures el tipo de cambio. Las transacciones siguen guardándose en USD, y el equivalente es una referencia, no el monto exacto que cobrará tu tarjeta, ni considera comisiones, márgenes ni tipo de cambio bancario.

## Cámara / OCR

Los botones **Tomar foto del ticket** y **Elegir foto** utilizan Tesseract.js en el navegador, descargado cuando se necesita. Se procesa la imagen en el dispositivo y **no se guarda la foto**. El comercio y el total pueden detectarse incorrectamente: siempre verifica los campos antes de guardar.

## Exportaciones

- **CSV**: para Excel, con fecha, comercio, categoría, importe USD con signo, tipo, pago y nota.
- **JSON**: respaldo/restauración. La importación fusiona por ID y pide confirmación.
- **MXN**: tipo de cambio manual opcional solo para estimar; los importes originales continúan en USD.

## Límites

- Sin Firebase, no hay respaldo en la nube.
- Aunque la URL sea pública, los movimientos remotos pertenecen a cada cuenta autenticada y se restringen por reglas de Firestore. No compartas tu contraseña.
- El uso de Safari sin conexión o el modo offline de Firebase depende del navegador y de disponer de datos almacenados previamente; no asumas que una transacción se subió si aún no ves la confirmación.
- Es una página estática autocontenida; **index.html** incluye estilos y JavaScript para simplificar el despliegue.
