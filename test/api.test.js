const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');

const dbPath = path.join(__dirname, '..', 'chainfloat.db');
if (fs.existsSync(dbPath)) fs.rmSync(dbPath);

const app = require('../server');

async function register(body) {
  return request(app).post('/api/auth/register').send(body);
}

test('end-to-end invoice lifecycle in simulated mode', async () => {
  const supplier = await register({ name: 'Sup', email: 'sup@x.com', password: 'pass123', role: 'supplier' });
  const buyer = await register({ name: 'Buy', email: 'buy@x.com', password: 'pass123', role: 'buyer' });
  const lp = await register({ name: 'LP', email: 'lp@x.com', password: 'pass123', role: 'lp' });

  assert.equal(supplier.status, 200);
  assert.equal(buyer.status, 200);
  assert.equal(lp.status, 200);

  const deposit = await request(app)
    .post('/api/pool/deposit')
    .set('Authorization', `Bearer ${lp.body.token}`)
    .send({ amountUSDC: 10000 });
  assert.equal(deposit.status, 200);

  const invoice = await request(app)
    .post('/api/invoices')
    .set('Authorization', `Bearer ${supplier.body.token}`)
    .send({ invoiceNumber: 'INV-1', buyerEmail: 'buy@x.com', amountUSDC: 1000, dueDate: '2099-01-01' });
  assert.equal(invoice.status, 200);

  const approve = await request(app)
    .post(`/api/invoices/${invoice.body.id}/approve`)
    .set('Authorization', `Bearer ${buyer.body.token}`);
  assert.equal(approve.status, 200);

  const finance = await request(app)
    .post(`/api/invoices/${invoice.body.id}/finance`)
    .set('Authorization', `Bearer ${supplier.body.token}`);
  assert.equal(finance.status, 200);
  assert.ok(finance.body.payoutUSDC > 0);
});
