# Balance Compartido

Panel financiero independiente, pensado para iPhone y público de solo lectura: `/plex-tools/balance/`.

## Cómo funciona
- **Publicación:** GitHub Pages del repositorio `camushellraiser/plex-tools`. No se modifica el sitio principal de Plex Tools.
- **Datos:** GitHub Issue [#1](https://github.com/camushellraiser/plex-tools/issues/1). Se guarda ahí el registro JSON de movimientos y su número de revisión.
- **Consulta:** cualquier visitante puede leer cargos, abonos y saldo neto, buscar conceptos, filtrar y exportar CSV sin autenticación.
- **Edición:** únicamente con un **fine-grained personal access token** de GitHub, limitado al repositorio `plex-tools`, permiso **Issues → Read and write** y sin permiso de escritura de código. La clave se mantiene **solo en la memoria de la pestaña**, nunca en archivos del repositorio, localStorage ni almacenamiento de sesión. Cuando recargas, debes ingresar la clave otra vez.
- **Importes:** MXN, cantidades almacenadas en centavos para evitar errores de coma flotante; cargos suman, abonos restan. El saldo puede ser negativo.
- **Al guardar:** verifica la revisión actual de GitHub antes de sustituir el JSON, evitando sobreescrituras comunes desde dos pestañas.
- **Sin servicios adicionales:** no requiere Supabase, Firebase, servidor, ni database aparte.

## Crear el token (una vez)
1. Inicia sesión en GitHub y abre https://github.com/settings/personal-access-tokens/new.
2. En **Resource owner**, selecciona tu propia cuenta.
3. En **Repository access**, elige **Only select repositories** y selecciona `plex-tools`.
4. En **Repository permissions**, agrega **Issues: Read and write**. No autorices **Contents: Read and write**, ni acceso a otros repositorios.
5. Crea el token con una fecha de caducidad razonable. **No lo compartas ni lo envíes por WhatsApp o correo.**
6. Entra en el dashboard, pulsa **Administrar**, pega el token y podrás cargar movimientos.

La interfaz pública **no solicita token** para consultar.

## Privacidad y limitaciones
El enlace es **público de verdad**. Cualquier persona con la URL puede leer los movimientos, y la información también puede verse en el Issue público del repositorio. No anotar RFC, CLABE, cuentas bancarias, domicilio, datos de menores ni información sensible. Evita conceptos excesivamente íntimos. No hay controles de privacidad por visitante.

La API pública de GitHub puede limitar accesos anónimos o tardar por conectividad: si la lectura falla, la página muestra un error en vez de inventar saldo $0. El saldo no se actualiza en vivo mientras la pestaña está abierta; se actualiza al recargar, al pulsar actualizar o al regresar a la pestaña después de 90 segundos. GitHub Issues conserva historial de ediciones, pero esto no es un contrato ni una certificación contable. Las eliminaciones se reflejan en la vista pública.

La configuración de GitHub Pages ya está habilitada en el repositorio. La ruta de publicación esperada es: https://camushellraiser.github.io/plex-tools/balance/
