# RetainerPal Shopify Checkout Extension

This repository contains the **RetainerPal checkout UI extension** that adds an intake prompt on Shopify's Thank You page.

After a customer places an order, the block helps them complete a required intake form so the team can begin retainer production quickly.

## What This Extension Does

The extension renders a block at `purchase.thank-you.block.render` and checks for an app metafield:

- Namespace: `retainerpal`
- Key: `intake_token`

Based on the metafield (or fallback API response), customers see one of these outcomes:

1. `completed`: nothing is shown (block hidden)
2. token present: info banner with a **Complete My Intake Form** button
3. no token yet: loading spinner while polling
4. polling timeout: fallback message asking the customer to refresh shortly

## How It Works

1. Customer places order.
2. RetainerPal backend/webhook generates intake token (or marks intake complete).
3. Extension checks `retainerpal.intake_token` metafield.
4. If missing, extension calls fallback API:
	- `GET /api/shopify/intake-token?order_id=<order_id>`
5. Extension updates UI when token status becomes ready/completed.

## Project Structure

- `extensions/retainerpal-intake-prompt/src/IntakePrompt.jsx`: UI extension logic and rendering
- `extensions/retainerpal-intake-prompt/shopify.extension.toml`: extension target/capabilities/metafield config
- `shopify.app.toml`: Shopify app configuration
- `docs/checkout-editor-setup.md`: instructions to add the block in Checkout Editor

## Prerequisites

1. Node.js 18+
2. npm (or another supported package manager)
3. Shopify CLI installed and authenticated
4. Shopify Partner account
5. Development store (or Plus sandbox)
6. A RetainerPal backend endpoint reachable by Shopify and checkout extension runtime

## Setup

1. Install dependencies:

```bash
npm install
```

2. Confirm Shopify app configuration in:

- `shopify.app.toml`
- `shopify.app.retainerpal-backend.toml` (if used in your environment)

3. Make sure the intake fallback API base URL in `IntakePrompt.jsx` points to your live backend (not a temporary tunnel).

4. Start local development:

```bash
npm run dev
```

5. Follow Shopify CLI prompts to select store/app and preview extension changes.

## Deploy

Deploy app + extension with:

```bash
npm run deploy
```

After successful deploy, configure checkout editor placement (next section).

## Checkout Editor Setup

Add this block to the Thank You page in the store's checkout customization:

1. Shopify Admin -> Settings -> Checkout -> Customize
2. Switch page selector to **Thank you**
3. Add block: **RetainerPal Intake Prompt** (`intake-prompt`)
4. Place above “Continue shopping”
5. Save

Detailed guide: `docs/checkout-editor-setup.md`

## Scripts

- `npm run dev`: run Shopify app dev workflow
- `npm run build`: build app/extensions
- `npm run deploy`: deploy app/extensions
- `npm run info`: show app info from Shopify CLI
- `npm run generate`: generate app resources

## Troubleshooting

### Block not visible in Checkout Editor

- Confirm app is installed in target store
- Confirm deploy completed without errors
- Wait a minute for propagation and refresh editor

### Button not shown after order

- Check order metafield `retainerpal.intake_token`
- Verify backend webhook/job processing and queue health
- Confirm fallback API endpoint is reachable and returns expected status

### Wrong intake URL

- Ensure the backend domain used by the extension is correct
- Avoid hardcoded temporary tunnel URLs in production

## Security Notes

- Do not commit secrets or private tokens
- Keep backend endpoint and token validation logic protected
- See `SECURITY.md` for reporting guidelines
