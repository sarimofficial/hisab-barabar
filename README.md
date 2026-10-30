# Hisab Barabar

Split group bills fairly — and settle up in the fewest payments.

A brand-new project built for **Next Byte Hacks V5** (Devpost, Oct 6–31, 2026).
No login, no backend, no API keys. All data is saved in the browser (localStorage).

## What it does

1. Create a group and add members (names only).
2. Add expenses in USD: description, amount, who paid, and who shares it equally.
3. Dashboard shows total spent and, per person, paid / share / balance.
4. **Auto settlement:** a greedy largest-debtor → largest-creditor plan that
   settles the group in at most (n − 1) payments — e.g. `John pays Alex $23`.
5. Start empty, or press **Load demo group** for a ready New York Trip example
   (Alex, Sara, John; Dinner $60, Taxi $30, Groceries $18).
6. **Copy settlement summary** copies a plain-text summary for sharing.

## A note from the maker — Why I built this

After a weekend trip to New York, my friends and I spent more time arguing about who owed what for dinner and taxis than we spent enjoying the trip. I tried a note on my phone, then a spreadsheet, then I just gave up and paid extra to avoid the awkward conversation. That felt wrong, so I built Hisab Barabar: type who paid, tick who shared it, and it tells you, in plain words, who pays whom — in as few payments as possible.

— Muhammad Sarim · USA, built for Next Byte Hacks V5

## Run locally

```bash
npm install
npm run dev      # local development server
npm run build    # production build -> dist/
```

## Settlement test

The pure settlement logic lives in `src/settlement.js` and is tested without
a browser:

```bash
node test-settlement.mjs
```

Demo-group expectation (verified by that test):

- Total $108. Shares: Alex $26, Sara $41, John $41.
- Balances: Alex +$34, Sara −$11, John −$23.
- Settlement (2 payments, the minimum): John pays Alex $23;
  Sara pays Alex $11.

## Built with

React + Vite, plain CSS. Money is stored in integer cents to avoid float errors.
