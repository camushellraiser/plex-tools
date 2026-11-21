# Balance Compartido

Panel financiero independiente, pensado para iPhone y público de solo lectura: `/plex-tools/balance/`.

## Cómo funciona
- **Publicación:** GitHub Pages del repositorio `camushellraiser/plex-tools`. No se modifica el sitio principal de Plex Tools.
- **Datos:** GitHub Issue [#1](https://github.com/camushellraiser/plex-tools/issues/1). Se guarda ahí el registro JSON de movimientos y su número de revisión.
- **Consulta:** cualquier visitante puede leer cargos, abonos y saldo neto, buscar conceptos, filtrar y exportar CSV sin autenticación.
- **Alta de movimientos (sin token):** el botón **+ Nuevo movimiento** está siempre visible. Se llena el formulario en el dashboard; al continuar, GitHub abre un Issue con los datos precargados. El usuario `camushellraiser` confirma **Submit new issue** en su sesión habitual; una GitHub Action valida autor/importes y agrega el movimiento al JSON en el Issue #1. El workflow cierra el Issue de solicitud al finalizar. Solo las solicitudes de ese usuario se procesan.
- **Edición y eliminación avanzada:** aún requieren un **fine-grained personal access token** con permiso **Issues → Read and write** del repositorio `plex-tools`. El token existe solo en memoria del navegador, no se guarda en archivos, localStorage ni almacenamiento de sesión.
- **Importes:** MXN, cantidades almacenadas en centavos para evitar errores de coma flotante; cargos suman, abonos restan. El saldo puede ser negativo.
- **Al guardar:** verifica la revisión actual de GitHub antes de sustituir el JSON, evitando sobreescrituras comunes desde dos pestañas.
- **Sin servicios adicionales:** no requiere Supabase, Firebase, servidor, ni database aparte.

## Registrar cargos y abonos SIN token
1. Entra a https://camushellraiser.github.io/plex-tools/balance/.
2. Pulsa **+ Nuevo movimiento** y completa Cargo o Abono, cantidad, fecha y concepto.
3. Pulsa **Continuar en GitHub**; inicia sesión en GitHub con `camushellraiser` si hace falta.
4. Revisa los campos precargados y pulsa **Submit new issue** en GitHub.
5. Después de que GitHub Actions procese la solicitud, regresa al dashboard y pulsa **Actualizar**.

El acceso es exclusivo del propietario: cualquier otro usuario puede intentar crear un Issue, pero el workflow no guardará su movimiento. Esta alternativa funciona sin PAT, pero requiere la confirmación final dentro de GitHub y no es instantánea. El registro sigue siendo público.

## Edición y borrado con token (opcional)
1. Inicia sesión en GitHub y abre https://github.com/settings/personal-access-tokens/new.
2. En **Resource owner**, selecciona tu propia cuenta.
3. En **Repository access**, elige **Only select repositories** y selecciona `plex-tools`.
4. En **Repository permissions**, agrega **Issues: Read and write**. No autorices **Contents: Read and write**, ni acceso a otros repositorios.
5. Crea el token con una fecha de caducidad razonable. **No lo compartas ni lo envíes por WhatsApp o correo.**
6. Entra en el dashboard, pulsa **Editar / borrar**, pega el token y podrás modificar o eliminar movimientos. Para crear nuevos, no lo necesitas.

La interfaz pública **no solicita token** para consultar.

## Privacidad y limitaciones
El enlace es **público de verdad**. Cualquier persona con la URL puede leer los movimientos, y la información también puede verse en el Issue público del repositorio. No anotar RFC, CLABE, cuentas bancarias, domicilio, datos de menores ni información sensible. Evita conceptos excesivamente íntimos. No hay controles de privacidad por visitante.

La API pública de GitHub puede limitar accesos anónimos o tardar por conectividad: si la lectura falla, la página muestra un error en vez de inventar saldo $0. El saldo no se actualiza en vivo mientras la pestaña está abierta; se actualiza al recargar, al pulsar actualizar o al regresar a la pestaña después de 90 segundos. GitHub Issues conserva historial de ediciones, pero esto no es un contrato ni una certificación contable. Las eliminaciones se reflejan en la vista pública.

La configuración de GitHub Pages ya está habilitada en el repositorio. La ruta de publicación esperada es: https://camushellraiser.github.io/plex-tools/balance/
