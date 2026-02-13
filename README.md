# Surdegsbageriet

En enkel webbutik med:
- startsida med 3 brodval
- kundkorg och checkout
- backend API for bestallning
- e-postbekraftelse via SMTP
- admin-sida for att se bestallningar

## 1. Krav
- Node.js 20+

## 2. Installera
```bash
npm install
cp .env.example .env
```

## 3. Fyll i `.env`
Minst dessa:
- `ORDER_NOTIFICATION_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Valfritt:
- `ADMIN_KEY` (om du vill lasa admin-vyn)

## 4. Starta
```bash
npm run dev
```

Oppna:
- butik: `http://localhost:3000`
- admin: `http://localhost:3000/admin.html`

## API
- `GET /api/health`
- `POST /api/orders`
- `GET /api/orders?adminKey=...` (admin)

Bestallningar sparas i `data/orders.json`.
