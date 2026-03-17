let token = localStorage.getItem('cf_token') || '';

const logEl = document.getElementById('log');
const sessionEl = document.getElementById('session');

function log(msg, data) {
  logEl.textContent = `[${new Date().toLocaleTimeString()}] ${msg}\n${data ? JSON.stringify(data, null, 2) : ''}\n\n` + logEl.textContent;
}

async function api(path, method = 'GET', body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'API failed');
  return json;
}

async function loadChain() {
  const cfg = await api('/onchain/config');
  document.getElementById('chain').textContent = JSON.stringify(cfg, null, 2);
}

async function refreshDashboard() {
  const data = await api('/dashboard');
  document.getElementById('dashboard').textContent = JSON.stringify(data, null, 2);
}

async function auth(mode) {
  const payload = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    role: document.getElementById('role').value
  };
  const res = await api(`/auth/${mode}`, 'POST', payload);
  token = res.token;
  localStorage.setItem('cf_token', token);
  sessionEl.textContent = `Logged in as ${res.user.name} (${res.user.role})`;
  log(`${mode} success`, res.user);
}

document.getElementById('registerBtn').onclick = async () => {
  try { await auth('register'); } catch (e) { log('register failed', e.message); }
};
document.getElementById('loginBtn').onclick = async () => {
  try { await auth('login'); } catch (e) { log('login failed', e.message); }
};

document.getElementById('uploadInvoiceBtn').onclick = async () => {
  try {
    const payload = {
      invoiceNumber: document.getElementById('invoiceNumber').value,
      buyerEmail: document.getElementById('buyerEmail').value,
      amountUSDC: Number(document.getElementById('amountUSDC').value),
      dueDate: document.getElementById('dueDate').value,
      metadata: document.getElementById('metadata').value
    };
    const res = await api('/invoices', 'POST', payload);
    log('invoice uploaded', res);
  } catch (e) { log('invoice upload failed', e.message); }
};

document.getElementById('approveBtn').onclick = async () => {
  try {
    const id = Number(document.getElementById('targetInvoiceId').value);
    const res = await api(`/invoices/${id}/approve`, 'POST');
    log('invoice approved', res);
  } catch (e) { log('approve failed', e.message); }
};

document.getElementById('financeBtn').onclick = async () => {
  try {
    const id = Number(document.getElementById('targetInvoiceId').value);
    const res = await api(`/invoices/${id}/finance`, 'POST');
    log('invoice financed', res);
  } catch (e) { log('finance failed', e.message); }
};

document.getElementById('depositBtn').onclick = async () => {
  try {
    const amountUSDC = Number(document.getElementById('depositUSDC').value);
    const res = await api('/pool/deposit', 'POST', { amountUSDC });
    log('pool deposit', res);
  } catch (e) { log('deposit failed', e.message); }
};

document.getElementById('refreshBtn').onclick = async () => {
  try { await refreshDashboard(); } catch (e) { log('dashboard failed', e.message); }
};

(async function init() {
  await loadChain();
  if (token) {
    try {
      const me = await api('/me');
      sessionEl.textContent = `Logged in as ${me.name} (${me.role})`;
    } catch {
      localStorage.removeItem('cf_token');
      token = '';
    }
  }
})();
