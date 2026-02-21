# Venture Connect

A lightweight Traxcn + PitchBook-inspired web app prototype that supports both sides of private-market discovery:

- **Founder POV**: discover investors by sector, stage, ticket size, and term preferences.
- **Investor POV**: discover startups by sector, stage, capital required, and term alignment.
- Includes investor classes: **Angel, Family Office, VC, PE**.
- Includes stage-aware matching from **Idea** through **Pre-IPO**.

## Run

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Core capabilities

- Dual-role match engine (founder/investor toggle)
- Sector + stage filters
- Raise/ticket-size compatibility check
- Terms overlap scoring (board seat, pro-rata, governance preferences, etc.)
- Ranked fit scores with profile cards
- Market snapshot metrics
