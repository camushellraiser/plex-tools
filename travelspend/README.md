# TravelSpend v2 — gastos personales

Web móvil de gastos de San Diego, sin presupuesto inicial.

**Sitio:** https://camushellraiser.github.io/plex-tools/travelspend/

## Funciones

Registro de gastos y devoluciones en USD; edición/eliminación; análisis diario, por comercios y categorías; exportación CSV/JSON; conversión USD/MXN automática desde Frankfurter; lectura OCR de tickets por cámara. La v2 añade fotos persistentes de tickets y productos y sincronización privada mediante Supabase.

## Dos modalidades

**Sin configurar Supabase:** los gastos continúan guardándose solo en el mismo Safari (localStorage). Las fotos NO se conservan. Exporta regularmente JSON y no borres los datos de Safari.

**Con Supabase:** editar este `travelspend/index.html` en GitHub. Busca:

```js
window.TRAVELSPEND_SUPABASE_CONFIG = null;
```

Reemplaza `null` con la configuración pública del proyecto (nunca una secret/service_role key):

```js
{
  url: 'https://TU-PROYECTO.supabase.co',
  key: 'sb_publishable_TU_CLAVE_PUBLICA'
}
```

Antes de hacer esto debes crear en Supabase un proyecto y ejecutar los archivos `backend/setup.sql` y `backend/assign-users.sql` incluidos en el **paquete de instalación TravelSpend 2** entregado en la conversación. Estos archivos crean las tablas, los roles y las reglas de Storage RLS; no basta con pegar las credenciales.

Luego inicia sesión con la cuenta **owner**. En Ajustes usa **Subir gastos locales a la nube** para migrar registros de este Safari. Antes, exporta un JSON; si por alguna razón no aparecen los locales, usa Importar JSON. **El JSON no incluye las imágenes**: los archivos se guardan en Supabase Storage privado.

No emplees el sitio para guardar comprobantes si el banner no muestra la nube conectada. Si una foto no se carga, la compra queda registrada y el sistema informa del fallo.

## Seguridad

La web está alojada públicamente, los datos no: la política SQL solo concede la lectura de `personal_expenses` al rol `owner` asignado desde Supabase SQL Editor. El almacenamiento `travelspend-files` es **privado**. Las fotografías se comprimen y se consultan mediante sesión autenticada, sin URLs públicas permanentes.

La aplicación no almacena contraseñas en GitHub ni usa una clave secreta en el navegador. El OCR puede leer mal el total, así que conviene comprobarlo manualmente.
