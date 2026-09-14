# Crate

Film a garage, closet, or storage unit. Crate pulls sellable pieces from the video, classifies them, prices them against typical online listings, files them in bins, and writes marketplace listings at a percentage of market you choose.

## What it does

- **Scan** a walkthrough video or stills — frames go to Grok, which names each piece, estimates used-market value, and suggests a bin
- **Storage** — filter by bin and status, add items by hand, move pieces between aisles
- **Sell tray** — check what you want to list, set a listing % of market (or override any price), see subtotal / fees / total
- **Listings** — generate title and body copy, copy to clipboard, mark sold

Inventory lives in the browser (localStorage). No account required.

## Run it

```bash
npm install
npm run dev
```

Then open the URL Vite prints. `XAI_API_KEY` is required on the server for scan and listing copy.

## Stack

React 19, TanStack Start, Tailwind v4, Zustand, xAI Grok for vision + listing copy.
