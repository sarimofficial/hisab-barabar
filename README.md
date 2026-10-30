# Hisab Barabar

Split group bills fairly — and settle up in the fewest payments.

A brand-new project built for **Next Byte Hacks V5** (Devpost, Oct 6–31, 2026).
No login, no backend, no API keys. All data is saved in the browser (localStorage).

## What it does

1. Create a group and add members (names only).
2. Add expenses in PKR: description, amount, who paid, and who shares it equally.
3. Dashboard shows total spent and, per person, paid / share / balance.
4. **Auto settlement:** a greedy largest-debtor → largest-creditor plan that
   settles the group in at most (n − 1) payments — e.g. `Ahmed pays Ali Rs 1,150`.
5. Start empty, or press **Load demo group** for a ready Murree Trip example
   (Ali, Sara, Ahmed; Dinner Rs 3,000, Taxi Rs 1,500, Groceries Rs 900).
6. **Copy settlement summary** copies a plain-text summary for WhatsApp / sharing.

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

- Total Rs 5,400. Shares: Ali Rs 1,300, Sara Rs 2,050, Ahmed Rs 2,050.
- Balances: Ali +Rs 1,700, Sara −Rs 550, Ahmed −Rs 1,150.
- Settlement (2 payments, the minimum): Ahmed pays Ali Rs 1,150;
  Sara pays Ali Rs 550.

## Built with

React + Vite, plain CSS. Money is stored in integer paisa to avoid float errors.
