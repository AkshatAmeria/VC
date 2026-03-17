require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { getDb } = require('./db');
const { signToken, authRequired, hashPassword, verifyPassword } = require('./auth');
const { computeRiskScore, discountFromRisk, buildOverdueAlerts } = require('./services');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ONCHAIN_CONFIG = {
  network: process.env.CHAIN_NETWORK || 'baseSepolia',
  rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  invoiceRegistry: process.env.INVOICE_REGISTRY || '0x0000000000000000000000000000000000000000',
  liquidityPool: process.env.LIQUIDITY_POOL || '0x0000000000000000000000000000000000000000',
  usdc: process.env.USDC_ADDRESS || '0x0000000000000000000000000000000000000000',
  mode: process.env.ONCHAIN_MODE || 'simulated'
};

app.get('/api/health', (_, res) => res.json({ ok: true, service: 'chainfloat-api' }));
app.get('/api/onchain/config', (_, res) => res.json(ONCHAIN_CONFIG));

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, wallet } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'name/email/password/role are required' });
  const db = await getDb();
  const password_hash = await hashPassword(password);
  try {
    const result = await db.run(
      'INSERT INTO users(name,email,password_hash,role,wallet) VALUES(?,?,?,?,?)',
      [name, email.toLowerCase(), password_hash, role, wallet || null]
    );
    const user = { id: result.lastID, name, email: email.toLowerCase(), role };
    res.json({ token: signToken(user), user });
  } catch (e) {
    res.status(409).json({ error: 'Email already exists' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await getDb();
  const user = await db.get('SELECT * FROM users WHERE email = ?', [email?.toLowerCase()]);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, wallet: user.wallet }
  });
});

app.get('/api/me', authRequired, async (req, res) => {
  const db = await getDb();
  const me = await db.get('SELECT id,name,email,role,wallet FROM users WHERE id = ?', [req.user.id]);
  res.json(me);
});

app.post('/api/invoices', authRequired, async (req, res) => {
  if (req.user.role !== 'supplier') return res.status(403).json({ error: 'Only suppliers can upload invoices' });
  const { invoiceNumber, buyerEmail, amountUSDC, dueDate, metadata } = req.body;
  if (!invoiceNumber || !buyerEmail || !amountUSDC || !dueDate) return res.status(400).json({ error: 'Missing required fields' });
  const db = await getDb();
  const buyer = await db.get('SELECT id FROM users WHERE email=? AND role="buyer"', [buyerEmail.toLowerCase()]);
  if (!buyer) return res.status(404).json({ error: 'Buyer not found. Ask buyer to register first.' });

  const supplierHistory = await db.get('SELECT COUNT(*) as c FROM invoices WHERE supplier_id=? AND status IN ("REPAID","FINANCED")', [req.user.id]);
  const riskScore = computeRiskScore({ amountUSDC: Number(amountUSDC), dueDate, supplierHistory: supplierHistory?.c || 0 });
  const discountBps = discountFromRisk(riskScore);

  const result = await db.run(
    `INSERT INTO invoices(invoice_number,supplier_id,buyer_id,amount_usdc,due_date,metadata,risk_score,discount_bps)
     VALUES(?,?,?,?,?,?,?,?)`,
    [invoiceNumber, req.user.id, buyer.id, Number(amountUSDC), dueDate, metadata || null, riskScore, discountBps]
  );
  res.json({ id: result.lastID, invoiceNumber, riskScore, discountBps, status: 'UPLOADED' });
});

app.post('/api/invoices/:id/approve', authRequired, async (req, res) => {
  if (req.user.role !== 'buyer') return res.status(403).json({ error: 'Only buyers can approve invoices' });
  const db = await getDb();
  const invoice = await db.get('SELECT * FROM invoices WHERE id=?', [req.params.id]);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.buyer_id !== req.user.id) return res.status(403).json({ error: 'Not your invoice' });

  const mockTx = `simulated-approve-${invoice.id}-${Date.now()}`;
  await db.run('UPDATE invoices SET status="APPROVED", tx_hash=? WHERE id=?', [mockTx, invoice.id]);
  res.json({ ok: true, status: 'APPROVED', txHash: mockTx, onchainMode: ONCHAIN_CONFIG.mode });
});

app.post('/api/invoices/:id/finance', authRequired, async (req, res) => {
  if (req.user.role !== 'supplier') return res.status(403).json({ error: 'Only suppliers can finance invoices' });
  const db = await getDb();
  const invoice = await db.get('SELECT * FROM invoices WHERE id=?', [req.params.id]);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.supplier_id !== req.user.id) return res.status(403).json({ error: 'Not your invoice' });
  if (invoice.status !== 'APPROVED') return res.status(400).json({ error: 'Invoice must be approved first' });

  const pool = await db.get('SELECT COALESCE(SUM(CASE WHEN event_type="DEPOSIT" THEN amount_usdc ELSE -amount_usdc END),0) as liquidity FROM pool_events');
  const payout = invoice.amount_usdc * (1 - invoice.discount_bps / 10000);
  if (pool.liquidity < payout) return res.status(400).json({ error: `Not enough pool liquidity. Need ${payout.toFixed(2)} USDC` });

  await db.run('UPDATE invoices SET status="FINANCED" WHERE id=?', [invoice.id]);
  await db.run('INSERT INTO pool_events(event_type,amount_usdc,invoice_id) VALUES("FINANCE",?,?)', [payout, invoice.id]);
  res.json({ ok: true, payoutUSDC: Number(payout.toFixed(2)), discountBps: invoice.discount_bps });
});

app.post('/api/pool/deposit', authRequired, async (req, res) => {
  if (req.user.role !== 'lp') return res.status(403).json({ error: 'Only LP can deposit' });
  const { amountUSDC } = req.body;
  if (!amountUSDC || Number(amountUSDC) <= 0) return res.status(400).json({ error: 'Invalid amount' });
  const db = await getDb();
  await db.run('INSERT INTO pool_positions(lp_id,amount_usdc) VALUES(?,?)', [req.user.id, Number(amountUSDC)]);
  await db.run('INSERT INTO pool_events(event_type,amount_usdc) VALUES("DEPOSIT",?)', [Number(amountUSDC)]);
  res.json({ ok: true, amountUSDC: Number(amountUSDC) });
});

app.get('/api/dashboard', authRequired, async (req, res) => {
  const db = await getDb();
  const invoices = await db.all(
    `SELECT i.*, s.name as supplier_name, b.name as buyer_name
     FROM invoices i
     JOIN users s ON s.id=i.supplier_id
     JOIN users b ON b.id=i.buyer_id
     ORDER BY i.created_at DESC`
  );

  const pool = await db.get('SELECT COALESCE(SUM(CASE WHEN event_type="DEPOSIT" THEN amount_usdc ELSE -amount_usdc END),0) as liquidity FROM pool_events');
  const financed = await db.get('SELECT COALESCE(SUM(amount_usdc),0) as financed FROM pool_events WHERE event_type="FINANCE"');
  const overdueAlerts = buildOverdueAlerts(invoices);

  for (const alert of overdueAlerts) {
    await db.run('UPDATE invoices SET status="OVERDUE", alert_sent=1 WHERE id=?', [alert.invoiceId]);
  }

  res.json({
    poolLiquidityUSDC: Number(pool.liquidity.toFixed(2)),
    totalFinancedUSDC: Number(financed.financed.toFixed(2)),
    estimatedAPR: pool.liquidity > 0 ? Number(((financed.financed * 0.08) / pool.liquidity * 100).toFixed(2)) : 0,
    invoices,
    overdueAlerts
  });
});

if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`ChainFloat API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
