import { computeBalances, computeSettlement, formatUSD, toCents } from './src/settlement.js'

function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exit(1) } }

// 3 members, 3 expenses — the New York Trip demo-group scenario
const members = [
  { id: 'alex', name: 'Alex' },
  { id: 'sara', name: 'Sara' },
  { id: 'john', name: 'John' },
]
const expenses = [
  { id: 'e1', description: 'Dinner', amountCents: toCents(60), paidById: 'alex', splitAmongIds: ['alex', 'sara', 'john'] },
  { id: 'e2', description: 'Taxi', amountCents: toCents(30), paidById: 'sara', splitAmongIds: ['sara', 'john'] },
  { id: 'e3', description: 'Groceries', amountCents: toCents(18), paidById: 'john', splitAmongIds: ['alex', 'sara', 'john'] },
]
const balances = computeBalances(members, expenses)
console.log('Balances:')
balances.forEach((b) => console.log(`  ${b.name}: paid ${formatUSD(b.paidCents)}, share ${formatUSD(b.shareCents)}, balance ${formatUSD(b.balanceCents)}`))
// Expected: total $108. Shares: Alex $26, Sara $41, John $41.
// Paid: Alex $60, Sara $30, John $18. Balances: Alex +$34, Sara -$11, John -$23.
const byId = Object.fromEntries(balances.map((b) => [b.id, b]))
assert(byId.alex.balanceCents === toCents(34), 'Alex balance should be +$34')
assert(byId.sara.balanceCents === toCents(-11), 'Sara balance should be -$11')
assert(byId.john.balanceCents === toCents(-23), 'John balance should be -$23')
assert(balances.reduce((s, b) => s + b.balanceCents, 0) === 0, 'Balances must sum to zero')

const payments = computeSettlement(balances)
console.log('Settlement:')
payments.forEach((p) => console.log(`  ${p.fromName} pays ${p.toName} ${formatUSD(p.amountCents)}`))
assert(payments.length === 2, 'Should be exactly 2 payments (minimum, not 3)')
assert(payments.reduce((s, p) => s + p.amountCents, 0) === toCents(34), 'Payments must total $34 owed to Alex')
assert(payments.every((p) => p.toName === 'Alex'), 'All payments should go to Alex, the only creditor')

// Edge: everyone settled (equal split, equal pay) -> no payments
const settled = computeSettlement(computeBalances(
  [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
  [{ id: 'x', description: 'Lunch', amountCents: toCents(20), paidById: 'a', splitAmongIds: ['a', 'b'] },
   { id: 'y', description: 'Snacks', amountCents: toCents(20), paidById: 'b', splitAmongIds: ['a', 'b'] }],
))
assert(settled.length === 0, 'Equal case should need no payments')

// Edge: uneven split remainder sums exactly to the expense
const balances2 = computeBalances(
  [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }],
  [{ id: 'z', description: 'Bill $10', amountCents: toCents(10), paidById: 'a', splitAmongIds: ['a', 'b', 'c'] }],
)
assert(balances2.reduce((s, b) => s + b.shareCents, 0) === toCents(10), 'Shares must sum to the expense amount')
console.log('All settlement tests passed.')
