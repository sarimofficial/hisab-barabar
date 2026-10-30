import { computeBalances, computeSettlement, formatPKR, toPaisa } from './src/settlement.js'

function assert(cond, msg) { if (!cond) { console.error('FAIL:', msg); process.exit(1) } }

// 3 members, 3 expenses — the demo-group scenario
const members = [
  { id: 'ali', name: 'Ali' },
  { id: 'sara', name: 'Sara' },
  { id: 'ahmed', name: 'Ahmed' },
]
const expenses = [
  { id: 'e1', description: 'Dinner', amountPaisa: toPaisa(3000), paidById: 'ali', splitAmongIds: ['ali', 'sara', 'ahmed'] },
  { id: 'e2', description: 'Taxi', amountPaisa: toPaisa(1500), paidById: 'sara', splitAmongIds: ['sara', 'ahmed'] },
  { id: 'e3', description: 'Groceries', amountPaisa: toPaisa(900), paidById: 'ahmed', splitAmongIds: ['ali', 'sara', 'ahmed'] },
]
const balances = computeBalances(members, expenses)
console.log('Balances:')
balances.forEach((b) => console.log(`  ${b.name}: paid ${formatPKR(b.paidPaisa)}, share ${formatPKR(b.sharePaisa)}, balance ${formatPKR(b.balancePaisa)}`))
// Expected: total 5400. Shares: Ali 1300, Sara 2050, Ahmed 2050.
// Paid: Ali 3000, Sara 1500, Ahmed 900. Balances: Ali +1700, Sara -550, Ahmed -1150.
const byId = Object.fromEntries(balances.map((b) => [b.id, b]))
assert(byId.ali.balancePaisa === toPaisa(1700), 'Ali balance should be +1700')
assert(byId.sara.balancePaisa === toPaisa(-550), 'Sara balance should be -550')
assert(byId.ahmed.balancePaisa === toPaisa(-1150), 'Ahmed balance should be -1150')
assert(balances.reduce((s, b) => s + b.balancePaisa, 0) === 0, 'Balances must sum to zero')

const payments = computeSettlement(balances)
console.log('Settlement:')
payments.forEach((p) => console.log(`  ${p.fromName} pays ${p.toName} ${formatPKR(p.amountPaisa)}`))
assert(payments.length === 2, 'Should be exactly 2 payments (minimum, not 3)')
assert(payments.reduce((s, p) => s + p.amountPaisa, 0) === toPaisa(1700), 'Payments must total Rs 1700 owed to Ali')
assert(payments.every((p) => p.toName === 'Ali'), 'All payments should go to Ali, the only creditor')

// Edge: everyone settled (equal split, equal pay) -> no payments
const settled = computeSettlement(computeBalances(
  [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
  [{ id: 'x', description: 'Lunch', amountPaisa: toPaisa(1000), paidById: 'a', splitAmongIds: ['a', 'b'] },
   { id: 'y', description: 'Snacks', amountPaisa: toPaisa(1000), paidById: 'b', splitAmongIds: ['a', 'b'] }],
))
assert(settled.length === 0, 'Equal case should need no payments')

// Edge: uneven split remainder sums exactly to the expense
const balances2 = computeBalances(
  [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }],
  [{ id: 'z', description: 'Bill Rs 100', amountPaisa: toPaisa(100), paidById: 'a', splitAmongIds: ['a', 'b', 'c'] }],
)
assert(balances2.reduce((s, b) => s + b.sharePaisa, 0) === toPaisa(100), 'Shares must sum to the expense amount')
console.log('All settlement tests passed.')
