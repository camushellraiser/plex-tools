"use strict";

// Portal independiente: toma la configuracion PUBLICA de /ip-pulse/config.js,
// pero nunca modifica IP Pulse ni expone credenciales del NAS o Plex.
const POLL_INTERVAL_MS = 15_000;
const ONLINE_THRESHOLD_MS = 20_000;
const DASHBOARD_PORT = 8765;
const $ = (selector) => document.querySelector(selector);
let supa = null;
let currentUser = null;
let nas = null;
let pendingRead = null;
let toastTimer = null;
let refreshTimer = null;

function isPrivateIPv4(raw) {
  if (typeof raw !== "string") return false;
  const parts = raw.split(".");
  if (parts.length !== 4 || !parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) return false;
  const [a, b] = parts.map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
function shortAge(iso) {
  if (!iso) return "Sin reportes";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "Sin reportes";
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 5) return "Ahora mismo";
  if (seconds < 60) return `Hace ${seconds} s`;
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  return `Hace ${Math.floor(seconds / 3600)} h`;
}
function online(device) {
  const seen = device?.last_seen ? new Date(device.last_seen).getTime() : 0;
  return !!seen && Date.now() - seen >= 0 && Date.now() - seen < ONLINE_THRESHOLD_MS;
}
function message(text) {
  const toast = $("#toast");
  toast.textContent = text;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 4500);
}
function setConnection(state, text) {
  $("#connection-label").className = `connection-label ${state}`;
  $("#connection-text").textContent = text;
}
function renderNas(error = null) {
  const ip = nas?.local_ip;
  const validIp = isPrivateIPv4(ip);
  const isUp = online(nas);
  const status = $("#nas-status");
  const badge = $("#app-badge");
  const openButton = $("#open-analytics");
  $("#nas-device-name").textContent = nas?.name || "Sin NAS registrado";
  $("#nas-ip").textContent = validIp ? ip : "No disponible";
  $("#nas-last-seen").textContent = shortAge(nas?.last_seen);
  if (error) {
    status.className = "server-state checking";
    status.innerHTML = "<i></i> SIN VERIFICAR";
    badge.className = "app-badge";
    badge.textContent = "SIN CONEXIÓN A DATOS";
    $("#connection-info").textContent = "No pudimos consultar la IP actual. Comprueba tu conexión a Supabase e inténtalo de nuevo.";
  } else if (!nas) {
    status.className = "server-state checking";
    status.innerHTML = "<i></i> SIN REGISTRO";
    badge.className = "app-badge";
    badge.textContent = "NAS NO ENCONTRADO";
    $("#connection-info").textContent = "IP Pulse no devolvió ningún dispositivo de tipo NAS.";
  } else {
    status.className = `server-state ${isUp ? "online" : "offline"}`;
    status.innerHTML = `<i></i> ${isUp ? "ONLINE" : "SIN SEÑAL"}`;
    badge.className = `app-badge ${isUp ? "online" : "offline"}`;
    badge.textContent = isUp ? "NAS CONECTADO" : "NAS SIN SEÑAL";
    $("#connection-info").textContent = isUp
      ? "IP detectada por IP Pulse. Antes de abrir, confirmaremos de nuevo la dirección actual."
      : "El último reporte del NAS no es reciente. Puedes intentar abrirlo si su IP está registrada.";
  }
  openButton.disabled = !!error || !validIp;
  $("#open-label").textContent = validIp && !error ? "Abrir dashboard" : "IP no disponible";
}
async function fetchNas(options = {}) {
  if (!supa || !currentUser) return false;
  if (pendingRead) return pendingRead;
  pendingRead = fetchNasNow(options);
  try { return await pendingRead; } finally { pendingRead = null; }
}
async function fetchNasNow({quiet = false} = {}) {
  $("#refresh-button").disabled = true;
  try {
    if (!navigator.onLine) throw new Error("Sin conexión a Internet");
    // Mismas tabla/columnas que el app.js de IP Pulse compartido por el usuario.
    const {data, error} = await supa.from("devices")
      .select("id,name,device_type,local_ip,last_seen,plex_online")
      .eq("device_type", "nas");
    if (error) throw error;
    if (!currentUser) return false;
    const found = (data || []).find((d) => /samael|synology/i.test(d.name || "")) || (data || [])[0] || null;
    nas = found;
    setConnection("online", "Supabase conectado");
    renderNas();
    if (!quiet) message("Dirección del NAS actualizada");
    return true;
  } catch (err) {
    console.warn("Plex Tools: no se pudo consultar Supabase", err);
    setConnection("error", "Sin conexión a datos");
    renderNas(err);
    if (!quiet) message("No se pudo consultar la IP actual del NAS");
    return false;
  } finally {
    $("#refresh-button").disabled = false;
  }
}
async function openDashboard() {
  const button = $("#open-analytics");
  button.disabled = true;
  $("#open-label").textContent = "Confirmando IP...";
  // Reconsulta antes de abrir para no usar la IP almacenada hace varios minutos.
  const ok = await fetchNas({quiet: true});
  const ip = nas?.local_ip;
  if (!ok || !isPrivateIPv4(ip)) {
    message("No se pudo confirmar la IP. Pulsa Actualizar e inténtalo otra vez.");
    renderNas(ok ? null : new Error("Sin conexión"));
    return;
  }
  // Navegacion principal: evita fetch a la LAN desde GitHub Pages (CORS / mixed content).
  // Solo funciona cuando el navegador puede acceder a la red LOCAL del Synology.
  window.location.assign(`http://${ip}:${DASHBOARD_PORT}/`);
}
async function setSession(session) {
  const newUser = session?.user || null;
  const changed = currentUser?.id !== newUser?.id;
  currentUser = newUser;
  const loggedIn = !!currentUser;
  $("#login-section").classList.toggle("hidden", loggedIn);
  $("#dashboard").classList.toggle("hidden", !loggedIn);
  $("#sign-out").classList.toggle("hidden", !loggedIn);
  if (!loggedIn) {
    nas = null;
    setConnection("", "Acceso privado");
  } else if (changed) {
    await fetchNas({quiet: true});
  }
}
async function initialize() {
  const c = window.IP_PULSE_CONFIG;
  if (!c || !c.supabaseUrl?.startsWith("https://") || !c.publishableKey || !window.supabase) {
    $("#login-message").textContent = "No se cargó la configuración de IP Pulse. Revisa /ip-pulse/config.js y tu conexión a Internet.";
    setConnection("error", "Configuración pendiente");
    $("#login-button").disabled = true;
    return;
  }
  supa = window.supabase.createClient(c.supabaseUrl, c.publishableKey, {
    auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: false},
  });
  supa.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => { void setSession(session); }, 0);
  });
  try {
    const {data, error} = await supa.auth.getSession();
    if (error) throw error;
    await setSession(data.session);
  } catch (err) {
    console.warn("Plex Tools: error de autenticación", err);
    $("#login-message").textContent = "No se pudo iniciar la sesión. Inténtalo nuevamente.";
    setConnection("error", "Error de sesión");
  }
}
$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supa) return;
  const btn = $("#login-button");
  const msg = $("#login-message");
  btn.disabled = true; msg.textContent = "";
  try {
    const {error} = await supa.auth.signInWithPassword({
      email: $("#email").value.trim(), password: $("#password").value,
    });
    if (error) throw error;
    $("#password").value = "";
  } catch (err) {
    console.warn("Plex Tools: error de inicio de sesión", err);
    msg.textContent = "No se pudo iniciar sesión. Verifica el correo y la contraseña de IP Pulse.";
  } finally { btn.disabled = false; }
});
$("#sign-out").addEventListener("click", async () => {
  if (supa) await supa.auth.signOut();
});
$("#open-analytics").addEventListener("click", () => {void openDashboard();});
$("#refresh-button").addEventListener("click", () => {void fetchNas();});
window.addEventListener("online", () => {void fetchNas({quiet: true});});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && currentUser) void fetchNas({quiet: true});
});
refreshTimer = setInterval(() => {
  if (currentUser && !document.hidden) void fetchNas({quiet: true});
}, POLL_INTERVAL_MS);
setInterval(() => { if (currentUser) renderNas(); }, 1000);
void initialize();
