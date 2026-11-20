'use strict';

/* Balance compartido — GitHub Pages + un único GitHub Issue como registro.
   La clave de administración existe SOLO en memoria: nunca localStorage,
   cookies, URL, repositorio, GitHub Issue ni almacenamiento de sesión. */
const REPO = 'camushellraiser/plex-tools';
const ISSUE_NUMBER = 1;
const ISSUE_API = 'https://api.github.com/repos/' + REPO + '/issues/' + ISSUE_NUMBER;
const MARKER = '<!-- BALANCE_COMPARTIDO_DATA_V1 -->';
const FENCE = String.fromCharCode(96).repeat(3);

const byId = (id) => document.getElementById(id);
let accessToken = '';
let ledger = null;
let activeFilter = 'all';
let searchText = '';
let editingId = null;
let busy = false;
let lastFetch = 0;
let toastTimer = null;

const money = (cents) => new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', minimumFractionDigits: 2
}).format(cents / 100);

function dateToday() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')].join('-');
}
function prettyDate(date) {
  const d = new Date(date + 'T12:00:00');
  return isNaN(d.getTime()) ? date : new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(d);
}
function prettyTimestamp(iso) {
  if (!iso) return 'Sin movimientos registrados';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Actualización no disponible';
  return 'Actualizado el ' + new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(d);
}
function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function checkedLedger(candidate) {
  if (!candidate || candidate.schemaVersion !== 1 ||
      !Number.isSafeInteger(candidate.revision) ||
      !candidate.settings || !Array.isArray(candidate.movements)) {
    throw new Error('El registro de GitHub tiene un formato desconocido.');
  }
  for (const m of candidate.movements) {
    if (!m || typeof m.id !== 'string' ||
        !['charge', 'payment'].includes(m.type) ||
        !Number.isSafeInteger(m.amountCents) || m.amountCents <= 0 ||
        typeof m.concept !== 'string' ||
        typeof m.date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(m.date)) {
      throw new Error('Uno de los movimientos guardados no es válido.');
    }
  }
  return candidate;
}
function parseIssue(body) {
  if (typeof body !== 'string' || !body.includes(MARKER)) {
    throw new Error('No se reconoció el registro del balance.');
  }
  const open = body.indexOf(FENCE + 'json');
  const close = open < 0 ? -1 : body.indexOf(FENCE, open + (FENCE + 'json').length);
  if (open < 0 || close < 0) throw new Error('No se pudo interpretar la información guardada.');
  const raw = body.slice(open + (FENCE + 'json').length, close).trim();
  return checkedLedger(JSON.parse(raw));
}
function issueBody(data) {
  return MARKER + '\n' + FENCE + 'json\n' +
    JSON.stringify(data, null, 2) + '\n' + FENCE +
    '\n\n> Registro público del panel Balance Compartido. No incluir información bancaria, contraseñas ni datos sensibles.';
}
async function apiIssue(method, body, credential) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (credential) headers.Authorization = 'Bearer ' + credential;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(ISSUE_API, {
      method, headers, cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify({body})
    });
  } catch (err) {
    throw new Error('No se pudo conectar con GitHub. Revisa tu conexión.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error('El token no es válido o caducó.');
    if (response.status === 403) throw new Error('GitHub rechazó el acceso. Verifica los permisos "Issues: Read and write" del token.');
    if (response.status === 404) throw new Error('No se encontró el registro. Revisa que el token tenga acceso al repositorio.');
    if (response.status === 422) throw new Error('GitHub rechazó los datos. Vuelve a intentarlo.');
    throw new Error('GitHub respondió con el error ' + response.status + '.');
  }
  return payload;
}
function setBusy(value) {
  busy = value;
  byId('saveBtn').disabled = value;
  byId('accessSubmit').disabled = value;
  byId('refreshBtn').disabled = value;
  byId('saveBtn').textContent = value ? 'Guardando…' :
    (editingId ? 'Guardar cambios' : 'Guardar movimiento');
}
function toast(text) {
  const el = byId('toast');
  el.textContent = text;
  el.classList.add('visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3600);
}
async function loadLedger(silent) {
  if (busy) return;
  const errorEl = byId('loadError');
  if (!silent && !ledger) errorEl.hidden = true;
  try {
    const issue = await apiIssue('GET', undefined, accessToken);
    const parsed = parseIssue(issue.body);
    ledger = parsed;
    lastFetch = Date.now();
    errorEl.hidden = true;
    render();
  } catch (err) {
    errorEl.textContent = err.message + ' Usa el botón de actualizar para intentar de nuevo.';
    errorEl.hidden = false;
    if (!ledger) {
      byId('movementTable').innerHTML = '';
      byId('emptyState').hidden = true;
      byId('updatedLabel').textContent = 'Datos no disponibles';
      byId('balanceExplanation').textContent = 'No fue posible consultar el saldo.';
      byId('shownCount').textContent = 'No disponible';
    } else {
      toast('Sin conexión: se conserva la última información cargada.');
    }
  }
}
function amounts() {
  if (!ledger) return {charges: 0, payments: 0};
  let charges = 0;
  let payments = 0;
  ledger.movements.forEach(m => {
    if (m.type === 'charge') charges += m.amountCents;
    else payments += m.amountCents;
  });
  return {charges, payments};
}
function render() {
  if (!ledger) return;
  const {charges, payments} = amounts();
  const balance = charges - payments;
  const owner = ledger.settings.ownerLabel || 'Aldo';
  const other = ledger.settings.counterpartyLabel || 'Otra parte';
  byId('chargeTotal').textContent = money(charges);
  byId('paymentTotal').textContent = money(payments);
  byId('balanceAmount').textContent = money(Math.abs(balance));
  byId('balanceLabel').textContent = balance === 0 ? 'Saldo liquidado' : 'Saldo neto';
  byId('balancePill').textContent = balance > 0 ? 'Por cobrar' : balance < 0 ? 'Por pagar' : 'Al corriente';
  byId('balanceExplanation').textContent = balance > 0 ?
    'Saldo a favor de ' + owner + ' · pendiente de abono' :
    balance < 0 ? 'Saldo a favor de ' + other + ' · pendiente de pago' :
    'No hay importe pendiente entre las partes.';
  byId('movementCount').textContent = String(ledger.movements.length);
  byId('updatedLabel').textContent = prettyTimestamp(ledger.updatedAt);
  byId('footerUpdate').textContent = prettyTimestamp(ledger.updatedAt);
  byId('adminBtnText').textContent = accessToken ? 'Salir de edición' : 'Administrar';
  document.querySelectorAll('.admin-only').forEach(el => { el.hidden = !accessToken; });
  byId('movementTable').classList.toggle('is-admin', !!accessToken);
  byId('loadError').hidden = true;
  renderMovements();
}
function filteredMovements() {
  return (ledger ? ledger.movements : [])
    .filter(m => activeFilter === 'all' || m.type === activeFilter)
    .filter(m => (m.concept + ' ' + (m.note || '')).toLocaleLowerCase('es').includes(searchText))
    .sort((a, b) => b.date.localeCompare(a.date) ||
      String(b.createdAt || '').localeCompare(String(a.createdAt || '')) ||
      b.id.localeCompare(a.id));
}
function renderMovements() {
  if (!ledger) return;
  const list = filteredMovements();
  byId('movementTable').innerHTML = list.map(m => {
    const charge = m.type === 'charge';
    const kind = charge ? 'charge' : 'payment';
    const label = charge ? 'Cargo' : 'Abono';
    const sign = charge ? '+' : '−';
    const edit = accessToken ? '<td class="admin-cell"><div class="action-buttons">' +
      '<button type="button" data-action="edit" data-id="' + escapeHtml(m.id) + '" title="Editar movimiento" aria-label="Editar ' + escapeHtml(m.concept) + '">✎</button>' +
      '<button type="button" class="delete" data-action="delete" data-id="' + escapeHtml(m.id) + '" title="Eliminar movimiento" aria-label="Eliminar ' + escapeHtml(m.concept) + '">×</button>' +
      '</div></td>' : '';
    return '<tr><td class="concept-cell"><div class="concept-wrap">' +
      '<div class="transaction-icon ' + kind + '">' + (charge ? '↗' : '↙') + '</div>' +
      '<div class="concept-text"><strong>' + escapeHtml(m.concept) + '</strong>' +
      (m.note ? '<small>' + escapeHtml(m.note) + '</small>' : '') + '</div></div></td>' +
      '<td class="date-cell">' + escapeHtml(prettyDate(m.date)) + '</td>' +
      '<td class="type-cell"><span class="type-chip ' + kind + '">' + label + '</span></td>' +
      '<td class="amount-cell ' + (charge ? 'amount-positive' : 'amount-negative') + '">' +
      sign + ' ' + money(m.amountCents) + '</td>' + edit + '</tr>';
  }).join('');
  const empty = !list.length;
  byId('emptyState').hidden = !empty;
  if (empty) {
    byId('emptyTitle').textContent = ledger.movements.length === 0 ?
      'Todavía no hay movimientos' : 'Sin resultados';
    byId('emptyDescription').textContent = ledger.movements.length === 0 ?
      'Cuando se agreguen cargos o abonos, aparecerán aquí.' :
      'Prueba con otro concepto o cambia el filtro.';
  }
  byId('shownCount').textContent = list.length === 1 ?
    '1 movimiento' : list.length + ' movimientos';
}
function openDialog(id) {
  const el = byId(id);
  if (!el.open) el.showModal();
}
function closeDialog(id) {
  const el = byId(id);
  if (el.open) el.close();
}
function newMovement() {
  if (!accessToken || !ledger) return;
  editingId = null;
  byId('movementForm').reset();
  byId('dateInput').value = dateToday();
  byId('movementTitle').textContent = 'Nuevo movimiento';
  byId('saveBtn').textContent = 'Guardar movimiento';
  byId('movementError').hidden = true;
  openDialog('movementDialog');
  byId('amountInput').focus();
}
function editMovement(id) {
  const m = ledger && ledger.movements.find(v => v.id === id);
  if (!m || !accessToken) return;
  editingId = m.id;
  byId('movementForm').reset();
  byId('movementForm').elements.type.value = m.type;
  byId('amountInput').value = (m.amountCents / 100).toFixed(2);
  byId('dateInput').value = m.date;
  byId('conceptInput').value = m.concept;
  byId('noteInput').value = m.note || '';
  byId('movementTitle').textContent = 'Editar movimiento';
  byId('saveBtn').textContent = 'Guardar cambios';
  byId('movementError').hidden = true;
  openDialog('movementDialog');
  byId('amountInput').focus();
}
async function persistMovements(nextItems) {
  if (!accessToken || !ledger || busy) throw new Error('Entra a modo administración para guardar.');
  setBusy(true);
  try {
    /* Comprobar antes de cada escritura para no sobrescribir otra edición
       que alguien haya hecho desde otra pestaña o dispositivo. */
    const latestIssue = await apiIssue('GET', undefined, accessToken);
    const latest = parseIssue(latestIssue.body);
    if (latest.revision !== ledger.revision ||
        String(latest.updatedAt) !== String(ledger.updatedAt)) {
      ledger = latest;
      render();
      throw new Error('El registro cambió desde otra sesión. Ya cargué la versión actual; revisa los movimientos y vuelve a intentar.');
    }
    const next = Object.assign({}, ledger, {
      revision: ledger.revision + 1,
      updatedAt: new Date().toISOString(),
      movements: nextItems
    });
    await apiIssue('PATCH', issueBody(next), accessToken);
    ledger = next;
    lastFetch = Date.now();
    render();
  } finally {
    setBusy(false);
  }
}
function movementId() {
  return (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') ?
    globalThis.crypto.randomUUID() :
    String(Date.now()) + '-' + Math.random().toString(36).slice(2);
}
async function saveMovement(e) {
  e.preventDefault();
  if (busy || !ledger || !accessToken) return;
  const amount = Number(byId('amountInput').value);
  const cents = Math.round(amount * 100);
  const concept = byId('conceptInput').value.trim();
  const note = byId('noteInput').value.trim();
  const date = byId('dateInput').value;
  const type = byId('movementForm').elements.type.value;
  const errorEl = byId('movementError');
  errorEl.hidden = true;
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > 99999999900 ||
      !concept || concept.length > 120 || note.length > 300 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) || !['charge', 'payment'].includes(type)) {
    errorEl.textContent = 'Revisa el tipo, la fecha, el concepto y el importe (debe ser mayor a $0).';
    errorEl.hidden = false;
    return;
  }
  const now = new Date().toISOString();
  const before = editingId ? ledger.movements.find(m => m.id === editingId) : null;
  const movement = {
    id: before ? before.id : movementId(),
    type, amountCents: cents, concept, note, date,
    createdAt: before ? before.createdAt : now,
    modifiedAt: now
  };
  const nextItems = before ?
    ledger.movements.map(m => m.id === before.id ? movement : m) :
    ledger.movements.concat(movement);
  try {
    await persistMovements(nextItems);
    closeDialog('movementDialog');
    toast(before ? 'Movimiento actualizado correctamente.' : 'Movimiento guardado correctamente.');
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
}
async function deleteMovement(id) {
  if (busy || !accessToken || !ledger) return;
  const m = ledger.movements.find(x => x.id === id);
  if (!m) return;
  if (!confirm('¿Eliminar el movimiento "' + m.concept + '" por ' + money(m.amountCents) +
    '? Esta acción quedará reflejada en el historial de cambios de GitHub.')) return;
  try {
    await persistMovements(ledger.movements.filter(x => x.id !== id));
    toast('Movimiento eliminado.');
  } catch (err) {
    alert(err.message);
  }
}
async function enterAdmin(e) {
  e.preventDefault();
  if (busy) return;
  const candidate = byId('tokenInput').value.trim();
  const errorEl = byId('accessError');
  errorEl.hidden = true;
  if (!candidate) {
    errorEl.textContent = 'Introduce tu token de GitHub.';
    errorEl.hidden = false;
    return;
  }
  setBusy(true);
  byId('accessSubmit').textContent = 'Verificando…';
  try {
    const issue = await apiIssue('GET', undefined, candidate);
    const data = parseIssue(issue.body);
    ledger = data;
    accessToken = candidate;
    lastFetch = Date.now();
    byId('tokenInput').value = '';
    closeDialog('accessDialog');
    render();
    toast('Modo administración activado.');
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  } finally {
    setBusy(false);
    byId('accessSubmit').textContent = 'Entrar a administrar';
  }
}
function csvEscape(value) {
  let string = String(value === null || value === undefined ? '' : value)
    .replace(/\r?\n/g, ' ');
  /* Evitar que Excel interprete conceptos como fórmulas. */
  if (/^[\s]*[=+\-@]/.test(string)) string = "'" + string;
  return '"' + string.replace(/"/g, '""') + '"';
}
function exportCsv() {
  if (!ledger) return toast('Primero carga los movimientos.');
  const rows = [['Fecha', 'Tipo', 'Concepto', 'Nota', 'Importe MXN']].concat(
    ledger.movements.slice().sort((a, b) => a.date.localeCompare(b.date))
      .map(m => [m.date, m.type === 'charge' ? 'Cargo' : 'Abono',
        m.concept, m.note || '',
        (m.type === 'charge' ? '' : '-') + (m.amountCents / 100).toFixed(2)])
  );
  const totals = amounts();
  rows.push([]);
  rows.push(['', '', 'Total cargos', '', (totals.charges / 100).toFixed(2)]);
  rows.push(['', '', 'Total abonos', '', (totals.payments / 100).toFixed(2)]);
  rows.push(['', '', 'Saldo neto', '', ((totals.charges - totals.payments) / 100).toFixed(2)]);
  const csv = '\ufeff' + rows.map(r => r.map(csvEscape).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8;'}));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'balance-compartido-' + dateToday() + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Archivo CSV preparado.');
}
function init() {
  byId('todayLabel').textContent = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());
  byId('refreshBtn').addEventListener('click', () => {
    loadLedger(false).then(() => { if (ledger) toast('Balance actualizado.'); });
  });
  byId('adminBtn').addEventListener('click', () => {
    if (accessToken) {
      accessToken = '';
      byId('tokenInput').value = '';
      render();
      toast('Has salido del modo administración.');
    } else {
      byId('accessError').hidden = true;
      openDialog('accessDialog');
    }
  });
  byId('accessForm').addEventListener('submit', enterAdmin);
  byId('movementForm').addEventListener('submit', saveMovement);
  byId('addBtn').addEventListener('click', newMovement);
  byId('exportBtn').addEventListener('click', exportCsv);
  byId('searchInput').addEventListener('input', (e) => {
    searchText = e.target.value.trim().toLocaleLowerCase('es');
    renderMovements();
  });
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(other => {
        const selected = other === btn;
        other.classList.toggle('active', selected);
        other.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
      renderMovements();
    });
  });
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeDialog(btn.dataset.close));
  });
  byId('movementTable').addEventListener('click', (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn || !accessToken) return;
    if (btn.dataset.action === 'edit') editMovement(btn.dataset.id);
    if (btn.dataset.action === 'delete') deleteMovement(btn.dataset.id);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !busy &&
        Date.now() - lastFetch > 90000 &&
        !byId('movementDialog').open && !byId('accessDialog').open) {
      loadLedger(true);
    }
  });
  loadLedger(false);
}
document.addEventListener('DOMContentLoaded', init);
