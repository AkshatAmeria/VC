# ChainFloat — Testnet Supply Chain Finance

ChainFloat lets suppliers upload invoices, buyers approve them on-chain, and suppliers draw instant USDC liquidity from LP-funded pools at a discount. LPs earn yield from discount spread.

This implementation is built for **zero-cost prototyping now** using **testnet contracts** (Base Sepolia / Polygon Amoy) and **mock USDC**.

## Features implemented

- Solidity contracts:
  - `MockUSDC` (test token)
  - `InvoiceRegistry` (invoice lifecycle + approvals)
  - `LiquidityPool` (LP deposits and invoice financing)
- Full-stack app:
  - Node/Express backend + SQLite database
  - JWT auth for Supplier / Buyer / LP roles
  - Supplier invoice upload flow
  - Buyer approval flow (simulated tx hash mode by default)
  - LP deposit flow
  - Supplier instant finance flow
  - Risk score + discount basis points engine
  - Overdue alert generation
- Minimal frontend connected to backend APIs

## Quick start

```bash
npm install
npm start
```

Open `http://localhost:8080`.

## Testnet deploy (optional)

1. Create `.env`:

```env
DEPLOYER_KEY=0xyour_testnet_private_key
BASE_SEPOLIA_RPC=https://sepolia.base.org
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
CHAIN_NETWORK=baseSepolia
ONCHAIN_MODE=simulated
```

2. Deploy contracts:

```bash
npm run chain:deploy:base-sepolia
# or
npm run chain:deploy:polygon-amoy
```

3. Copy deployed addresses into env and restart backend:

```env
USDC_ADDRESS=0x...
INVOICE_REGISTRY=0x...
LIQUIDITY_POOL=0x...
ONCHAIN_MODE=live
```

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `POST /api/invoices` (supplier)
- `POST /api/invoices/:id/approve` (buyer)
- `POST /api/invoices/:id/finance` (supplier)
- `POST /api/pool/deposit` (lp)
- `GET /api/dashboard`
- `GET /api/onchain/config`

## Notes

- By default, approval/finance are in **simulated mode** to avoid requiring wallets/gas during development.
- Contracts and deployment scripts are production-extensible for live testnet integration.
