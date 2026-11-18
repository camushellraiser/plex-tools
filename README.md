# Plex Tools · portal privado

Página principal para abrir **Plex Analytics** en tu Synology DS220+ usando siempre la IP local más reciente que ya reporta **IP Pulse** a Supabase.

## Qué hace
- Sitio web estático independiente, diseñado para GitHub Pages.
- Inicia sesión con las **mismas credenciales de Supabase Auth** usadas en IP Pulse.
- Consulta la tabla `devices`, filtra `device_type = "nas"` y lee `local_ip`.
- Actualiza los datos cada 15 segundos y vuelve a consultar justo antes de abrir Analytics.
- Construye `http://<IP_LOCAL_ACTUAL>:8765/` y abre ese sitio en la misma pestaña.
- Incluye una tarjeta «Plex Library» **aún no funcional**, marcada Próximamente.
- **No modifica ni reemplaza ningún archivo de IP Pulse o Plex Analytics.**

## Instalación en GitHub Pages

1. En tu cuenta GitHub `camushellraiser`, crea un **repositorio nuevo** llamado **`plex-tools`** (no uses el repositorio `ip-pulse`).
2. Sube a la **raíz** del nuevo repositorio estos archivos: `index.html`, `styles.css`, `app.js`, `icon.svg` y `manifest.webmanifest` (README opcional).
3. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → main → /(root) → Save**.
4. Cuando GitHub Pages publique el repositorio, entra a `https://camushellraiser.github.io/plex-tools/`.
5. Inicia sesión con el mismo usuario y contraseña de IP Pulse (si la sesión ya está guardada en ese navegador, podría abrir directamente).
6. Conectado a la misma red local que el NAS, pulsa **Abrir dashboard**. El enlace se construye con la IP actual registrada por IP Pulse.

## Importante sobre la configuración de Supabase

`index.html` carga automáticamente la configuración pública del proyecto ya existente:

`https://camushellraiser.github.io/ip-pulse/config.js`

Esto funciona porque las dos páginas están bajo el **mismo dominio** de GitHub Pages y se publican en repositorios hermanos. Por tanto **NO hace falta copiar tu token de Plex ni tu contraseña**, y tampoco duplicar `config.js`. No copies `service_role`, claves secretas ni tu token de Plex a GitHub.

La variable que usa el script actual de IP Pulse es `window.IP_PULSE_CONFIG`, con `supabaseUrl` y `publishableKey`. Si en el futuro cambias el nombre de tu repositorio `ip-pulse` o la ubicación de `config.js`, será necesario actualizar esta ruta en `index.html`.

## Requisitos, límites y seguridad

- **La red local importa.** El botón solo abre `http://IP_LAN:8765`; fuera de casa no es accesible por Internet solo por estar alojado en GitHub Pages.
- **GitHub Pages no se conecta al NAS directamente.** Solo lee desde Supabase la IP que el agente de IP Pulse envía. La navegación al NAS la hace tu propio navegador.
- Se requiere que IP Pulse siga registrando `devices.local_ip` del NAS. El código entregado de IP Pulse **lee** este campo, pero solo el agente instalado en el NAS puede confirmar si se actualiza cuando cambia la IP. Se recomienda probarlo tras una renovación de IP real.
- La página inicia sesión con Supabase. Para que la IP privada no sea visible a usuarios sin autorización, mantén las políticas **RLS** correctas en la tabla `devices`, igual que para IP Pulse.
- La IP local se valida como IPv4 privada antes de generar un enlace. No hay claves del NAS, tokens de Plex ni contraseñas almacenados en este proyecto.
- El dashboard actual utiliza HTTP (`:8765`), así que el navegador podría avisar que la conexión no está cifrada. Se espera usarlo solo en una red local de confianza.
- Si tu teléfono está en una red Wi-Fi de invitados, aislada o conectada a otra subred sin rutas, el enlace quizá no abra aunque la IP sea correcta.
- Cuando pulses «Abrir dashboard», Plex Tools reconsulta Supabase. Si no puede confirmarlo, no abrirá una IP que pueda estar desactualizada.
- El botón navega a HTTP desde una página HTTPS. Es una **navegación normal del navegador**, no una solicitud `fetch`, evitando el problema de CORS/mixed content para consultas JavaScript desde GitHub Pages. Según la configuración de seguridad del navegador, la navegación local puede requerir permiso o generar una advertencia.

## Cómo verificar antes de publicar

Abre IP Pulse, confirma que **NAS Synology** tiene una dirección en **IP PRIVADA (LAN)** y que muestra la misma IP a la que entras por `http://IP:8765`. Si aparece "No detectada", el agente del NAS requiere ajustes y Plex Tools no podrá adivinar la IP.

## Si el nombre de NAS cambia

El sitio selecciona primero el registro NAS cuyo nombre contenga `samael` o `synology`; si solo hay uno, selecciona ese. Se puede ajustar esta lógica en `app.js`.

## Cómo revertir

Solo elimina el repositorio `plex-tools` si ya no lo necesitas. IP Pulse, la base de datos, Plex y Plex Analytics seguirán funcionando sin cambios.
