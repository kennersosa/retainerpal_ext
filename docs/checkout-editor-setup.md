# Checkout Editor Setup — intake-prompt Block

One-time setup required after the app is deployed.

## Prerequisites

- Access to the Shopify Admin for `retainerpal-2.myshopify.com`
- The RetainerPal app has been installed and `shopify app deploy` has been run

---

## Steps

### 1. Open Checkout Settings

1. In Shopify Admin, go to **Settings → Checkout**
2. Click **Customize** next to the active checkout template

### 2. Navigate to the Thank You Page

1. In the top bar of the editor, click the page selector dropdown (defaults to "Checkout")
2. Select **Thank you** from the list

### 3. Add the intake-prompt Block

1. In the left panel, click **Add block** (or the **+** icon in the "Order details" section)
2. Search for **intake-prompt** in the block picker
3. Click it to add it to the page

> If the block does not appear, confirm the RetainerPal app is installed
> and that `shopify app deploy` completed without errors.

### 4. Position the Block

- Drag the **intake-prompt** block above the "Continue shopping" button so it is prominently visible
- The block renders nothing if the intake form is already completed, so it is safe to leave it in place permanently

### 5. Save

- Click **Save** in the top-right corner of the editor

---

## What the Block Does

| Scenario                                  | What the customer sees                                   |
| ----------------------------------------- | -------------------------------------------------------- |
| Metafield not yet written (webhook delay) | Spinner + "check your email" message                     |
| Token available                           | Blue info Banner with "Complete My Intake Form →" button |
| Intake already completed                  | Nothing — block is invisible                             |

The block polls for the metafield up to 5 times with exponential backoff
(2s, 4s, 8s, 16s, 32s) before falling back to the email message.
Total maximum wait before fallback: ~62 seconds.

---

## Troubleshooting

**Block not appearing in the editor picker**

- Verify the app is installed: Shopify Admin → Apps → RetainerPal
- Verify deploy succeeded: check CLI output for any errors
- Wait 1–2 minutes after deploy for propagation, then refresh the editor

**Button links to wrong URL**

- The token is written by the `ProcessNewOrder` job via webhook
- Check Laravel Horizon for failed jobs on the `shopify` queue
- Inspect the order's metafields in Shopify Admin → Orders → [order] → Metafields
