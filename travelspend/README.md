# TravelSpend v2 — gastos personales

Web móvil de gastos de San Diego, sin presupuesto inicial.

**Sitio:** https://camushellraiser.github.io/plex-tools/travelspend/

## Funciones

Registro de gastos y devoluciones en USD; edición/eliminación; análisis diario, por comercios y categorías; exportación CSV/JSON; conversión USD/MXN automática desde Frankfurter; lectura OCR de tickets por cámara. La v2 añade fotos persistentes de tickets y productos y sincronización privada mediante Supabase.

## Tarjetas y visualización del registro (noviembre de 2026)

El selector **Tarjeta o pago** incluye BBVA Dorada, Santander Free, tarjeta sin especificar, efectivo y otro. En Historial se indica la tarjeta utilizada; en Análisis se agrupan los gastos por tarjeta o método de pago; el CSV incluye una columna **Tarjeta**. Los respaldos JSON también preservan este dato.

**Activa la columna de tarjetas antes de registrar gastos con BBVA o Santander:**

1. En el proyecto Supabase ya conectado, abre **SQL Editor → New query**.
2. Abre [migrations/2026-11-24_payment_cards.sql](migrations/2026-11-24_payment_cards.sql), copia TODO y pulsa **Run** en SQL Editor.
3. La consulta final debe devolver una fila para la columna `card_name` (tipo `text`).
4. Vuelve a cargar TravelSpend para que reconozca la columna nueva. Sin ese paso, la app seguirá permitiendo operaciones genéricas, pero no guardará una selección de tarjeta específica: avisará que falta activar la migración.

La migración no cambia importes ni fechas y no modifica los permisos de los gastos privados.

**Ventana de Nuevo gasto:** no enfoca automáticamente el campo de cantidad al abrirse (para evitar zoom/desplazamientos en iOS) y en pantallas móviles se mantiene centrada horizontalmente.

## Dos modalidades

**Sin configurar Supabase:** los gastos continúan guardándose solo en el mismo Safari (localStorage). Las fotos NO se conservan. Exporta regularmente JSON y no borres los datos de Safari.

**Con Supabase:** la URL y clave pública de la conexión ya están configuradas en `travelspend/index.html`. No publiques claves secretas. Para un despliegue nuevo, primero ejecuta los scripts compartidos en [Encargos de Irlanda → backend](https://github.com/camushellraiser/encargos-irlanda/tree/main/backend) (`setup.sql` y `assign-users.sql`) y confirma las cuentas autorizadas antes de iniciar sesión.

Luego inicia sesión con la cuenta **owner**. En Ajustes usa **Subir gastos locales a la nube** para migrar registros de este Safari. Antes, exporta un JSON; si por alguna razón no aparecen los locales, usa Importar JSON. **El JSON no incluye las imágenes**: los archivos se guardan en Supabase Storage privado.

No emplees el sitio para guardar comprobantes si el banner no muestra la nube conectada. Si una foto no se carga, la compra queda registrada y el sistema informa del fallo.

## Seguridad

La web está alojada públicamente, los datos no: la política SQL solo concede la lectura de `personal_expenses` al rol `owner` asignado desde Supabase SQL Editor. El almacenamiento `travelspend-files` es **privado**. Las fotografías se comprimen y se consultan mediante sesión autenticada, sin URLs públicas permanentes.

La aplicación no almacena contraseñas en GitHub ni usa una clave secreta en el navegador. El OCR puede leer mal el total, así que conviene comprobarlo manualmente.
