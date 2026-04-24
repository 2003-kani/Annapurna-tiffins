# Annapurna Tiffins Backend

## What this adds
- SQL-backed order creation API
- MCP gateway layer (`src/mcpGateway.js`) to connect multiple restaurant connectors
- Support fields for international orders (country/currency)

## Run
1. Copy `.env.example` to `.env` and set DB credentials.
2. Run SQL in `../database/schema.sql`.
3. Install and start:
   - `npm install`
   - `npm start`

Server runs at `http://localhost:4000`.

## API
`POST /api/orders`

Example payload:
```json
{
  "name": "Kanishka",
  "phone": "7842010670",
  "address": "Gopalpur, Hanamkonda",
  "orderSource": "chatbot",
  "countryCode": "IN",
  "currencyCode": "INR",
  "items": [
    { "name": "Vada", "qty": 1 },
    { "name": "Puri", "qty": 2 }
  ]
}
```
