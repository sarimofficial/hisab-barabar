// Pure settlement logic for Hisab Barabar — no React, so it can be unit-tested with node.
// Money is handled in paisa (integer cents) to avoid float errors. Displayed as PKR rupees.

export function toPaisa(rupees) {
  return Math.round(Number(rupees) * 100)
}

export function toRupees(paisa) {
  return paisa / 100
}

export function formatPKR(paisa) {
  const sign = paisa < 0 ? '-' : ''
  const abs = Math.abs(paisa)
  const rupees = Math.floor(abs / 100)
  const cents = abs % 100
  const grouped = rupees.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return cents === 0 ? `${sign}Rs ${grouped}` : `${sign}Rs ${grouped}.${String(cents).padStart(2, '0')}`
}

// Split one expense (in paisa) equally among splitAmongIds.
// Remainder paisa go to the first members in order, so shares always sum to the amount.
export function splitExpense(amountPaisa, splitAmongIds) {
  if (!splitAmongIds.length) return {}
  const base = Math.floor(amountPaisa / splitAmongIds.length)
  const remainder = amountPaisa - base * splitAmongIds.length
  const shares = {}
  splitAmongIds.forEach((id, i) => {
    shares[id] = base + (i < remainder ? 1 : 0)
  })
  return shares
}

// balances: [{ id, name, paidPaisa, sharePaisa }]
// Returns [{ fromId, fromName, toId, toName, amountPaisa }]
// Greedy largest-debtor -> largest-creditor matching. This yields at most
// (n - 1) payments for n people with non-zero balances, i.e. the minimum
// possible upper bound for a settlement plan (no redundant payments).
export function computeBalances(members, expenses) {
  const paid = {}
  const share = {}
  members.forEach((m) => { paid[m.id] = 0; share[m.id] = 0 })
  expenses.forEach((e) => {
    if (paid[e.paidById] !== undefined) paid[e.paidById] += e.amountPaisa
    const shares = splitExpense(e.amountPaisa, e.splitAmongIds)
    Object.entries(shares).forEach(([id, s]) => {
      if (share[id] !== undefined) share[id] += s
    })
  })
  return members.map((m) => ({
    id: m.id,
    name: m.name,
    paidPaisa: paid[m.id] || 0,
    sharePaisa: share[m.id] || 0,
    balancePaisa: (paid[m.id] || 0) - (share[m.id] || 0),
  }))
}

export function computeSettlement(balances) {
  const debtors = balances
    .filter((b) => b.balancePaisa < 0)
    .map((b) => ({ ...b, remaining: -b.balancePaisa }))
    .sort((a, b) => b.remaining - a.remaining)
  const creditors = balances
    .filter((b) => b.balancePaisa > 0)
    .map((b) => ({ ...b, remaining: b.balancePaisa }))
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
        amountPaisa: amount,
      })
    }
    d.remaining -= amount
    c.remaining -= amount
    if (d.remaining === 0) i++
    if (c.remaining === 0) j++
  }
  return payments
}

export function settlementSummaryText(groupName, totalPaisa, balances, payments) {
  const lines = []
  lines.push(`Hisab Barabar — ${groupName || 'My Group'}`)
  lines.push(`Total spent: ${formatPKR(totalPaisa)}`)
  lines.push('')
  lines.push('Per person:')
  balances.forEach((b) => {
    const status = b.balancePaisa > 0
      ? `is owed ${formatPKR(b.balancePaisa)}`
      : b.balancePaisa < 0
        ? `owes ${formatPKR(-b.balancePaisa)}`
        : 'is settled'
    lines.push(`- ${b.name}: paid ${formatPKR(b.paidPaisa)}, share ${formatPKR(b.sharePaisa)} — ${status}`)
  })
  lines.push('')
  if (!payments.length) {
    lines.push('Everyone is settled up. No payments needed.')
  } else {
    lines.push('Settle up (fewest payments):')
    payments.forEach((p) => lines.push(`- ${p.fromName} pays ${p.toName} ${formatPKR(p.amountPaisa)}`))
  }
  return lines.join('\n')
}
