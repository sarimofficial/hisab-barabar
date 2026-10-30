// Pure settlement logic for Hisab Barabar — no React, so it can be unit-tested with node.
// Money is handled in integer cents to avoid float errors. Displayed in US dollars.

export function toCents(dollars) {
  return Math.round(Number(dollars) * 100)
}

export function toDollars(cents) {
  return cents / 100
}

export function formatUSD(cents) {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  const dollars = Math.floor(abs / 100)
  const remainder = abs % 100
  const grouped = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return remainder === 0 ? `${sign}$${grouped}` : `${sign}$${grouped}.${String(remainder).padStart(2, '0')}`
}

// Split one expense (in cents) equally among splitAmongIds.
// Remainder cents go to the first members in order, so shares always sum to the amount.
export function splitExpense(amountCents, splitAmongIds) {
  if (!splitAmongIds.length) return {}
  const base = Math.floor(amountCents / splitAmongIds.length)
  const remainder = amountCents - base * splitAmongIds.length
  const shares = {}
  splitAmongIds.forEach((id, i) => {
    shares[id] = base + (i < remainder ? 1 : 0)
  })
  return shares
}

// balances: [{ id, name, paidCents, shareCents }]
// Returns [{ fromId, fromName, toId, toName, amountCents }]
// Greedy largest-debtor -> largest-creditor matching. This yields at most
// (n - 1) payments for n people with non-zero balances, i.e. the minimum
// possible upper bound for a settlement plan (no redundant payments).
export function computeBalances(members, expenses) {
  const paid = {}
  const share = {}
  members.forEach((m) => { paid[m.id] = 0; share[m.id] = 0 })
  expenses.forEach((e) => {
    if (paid[e.paidById] !== undefined) paid[e.paidById] += e.amountCents
    const shares = splitExpense(e.amountCents, e.splitAmongIds)
    Object.entries(shares).forEach(([id, s]) => {
      if (share[id] !== undefined) share[id] += s
    })
  })
  return members.map((m) => ({
    id: m.id,
    name: m.name,
    paidCents: paid[m.id] || 0,
    shareCents: share[m.id] || 0,
    balanceCents: (paid[m.id] || 0) - (share[m.id] || 0),
  }))
}

export function computeSettlement(balances) {
  const debtors = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ ...b, remaining: -b.balanceCents }))
    .sort((a, b) => b.remaining - a.remaining)
  const creditors = balances
    .filter((b) => b.balanceCents > 0)
    .map((b) => ({ ...b, remaining: b.balanceCents }))
    .sort((a, b) => b.remaining - a.remaining)
  const payments = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]
    const c = creditors[j]
    const amount = Math.min(d.remaining, c.remaining)
    if (amount > 0) {
      payments.push({
        fromId: d.id, fromName: d.name,
        toId: c.id, toName: c.name,
        amountCents: amount,
      })
    }
    d.remaining -= amount
    c.remaining -= amount
    if (d.remaining === 0) i++
    if (c.remaining === 0) j++
  }
  return payments
}

export function settlementSummaryText(groupName, totalCents, balances, payments) {
  const lines = []
  lines.push(`Hisab Barabar — ${groupName || 'My Group'}`)
  lines.push(`Total spent: ${formatUSD(totalCents)}`)
  lines.push('')
  lines.push('Per person:')
  balances.forEach((b) => {
    const status = b.balanceCents > 0
      ? `is owed ${formatUSD(b.balanceCents)}`
      : b.balanceCents < 0
        ? `owes ${formatUSD(-b.balanceCents)}`
        : 'is settled'
    lines.push(`- ${b.name}: paid ${formatUSD(b.paidCents)}, share ${formatUSD(b.shareCents)} — ${status}`)
  })
  lines.push('')
  if (!payments.length) {
    lines.push('Everyone is settled up. No payments needed.')
  } else {
    lines.push('Settle up (fewest payments):')
    payments.forEach((p) => lines.push(`- ${p.fromName} pays ${p.toName} ${formatUSD(p.amountCents)}`))
  }
  return lines.join('\n')
}
