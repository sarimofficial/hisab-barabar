import { useEffect, useMemo, useState } from 'react'
import { computeBalances, computeSettlement, formatUSD, settlementSummaryText, toCents } from './settlement.js'

const STORAGE_KEY = 'hisab-barabar-v1'
const uid = () => Math.random().toString(36).slice(2, 9)

const DEMO = {
  groupName: 'New York Trip',
  members: [
    { id: 'alex', name: 'Alex' },
    { id: 'sara', name: 'Sara' },
    { id: 'john', name: 'John' },
  ],
  expenses: [
    { id: 'e1', description: 'Dinner', amountCents: toCents(60), paidById: 'alex', splitAmongIds: ['alex', 'sara', 'john'] },
    { id: 'e2', description: 'Taxi', amountCents: toCents(30), paidById: 'sara', splitAmongIds: ['sara', 'john'] },
    { id: 'e3', description: 'Groceries', amountCents: toCents(18), paidById: 'john', splitAmongIds: ['alex', 'sara', 'john'] },
  ],
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* start empty */ }
  return { groupName: '', members: [], expenses: [] }
}

export default function App() {
  const [data, setData] = useState(loadInitial)
  const [groupName, setGroupName] = useState(data.groupName)
  const [newMember, setNewMember] = useState('')
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [splitIds, setSplitIds] = useState([])
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* private mode */ }
  }, [data])

  const { members, expenses } = data
  const balances = useMemo(() => computeBalances(members, expenses), [members, expenses])
  const payments = useMemo(() => computeSettlement(balances), [balances])
  const total = expenses.reduce((s, e) => s + e.amountCents, 0)
  const memberName = (id) => members.find((m) => m.id === id)?.name || '—'

  useEffect(() => {
    if (members.length && !members.some((m) => m.id === paidBy)) setPaidBy(members[0].id)
    setSplitIds((prev) => prev.filter((id) => members.some((m) => m.id === id)))
  }, [members, paidBy])

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 3500) }

  const saveGroup = () => {
    setData((d) => ({ ...d, groupName: groupName.trim() || 'My Group' }))
    flash('Group name saved.')
  }

  const addMember = (e) => {
    e.preventDefault()
    const name = newMember.trim()
    if (!name) return
    if (members.some((m) => m.name.toLowerCase() === name.toLowerCase())) { flash('That member is already in the group.'); return }
    const member = { id: uid(), name }
    setData((d) => ({ ...d, members: [...d.members, member] }))
    if (!paidBy) setPaidBy(member.id)
    setSplitIds((prev) => [...prev, member.id])
    setNewMember('')
  }

  const addExpense = (e) => {
    e.preventDefault()
    const amt = Number(amount)
    if (!desc.trim() || !amt || amt <= 0) { flash('Add a description and an amount above $0.'); return }
    if (!paidBy) { flash('Add a member first, then choose who paid.'); return }
    const split = splitIds.length ? splitIds : members.map((m) => m.id)
    setData((d) => ({
      ...d,
      expenses: [{ id: uid(), description: desc.trim(), amountCents: toCents(amt), paidById: paidBy, splitAmongIds: split }, ...d.expenses],
    }))
    setDesc(''); setAmount(''); setSplitIds(members.map((m) => m.id))
  }

  const toggleSplit = (id) => setSplitIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const loadDemo = () => {
    setData(JSON.parse(JSON.stringify(DEMO)))
    setGroupName(DEMO.groupName)
    setPaidBy('alex')
    setSplitIds(DEMO.members.map((m) => m.id))
    flash('Demo group loaded — try the settlement plan below.')
  }

  const clearAll = () => {
    if (!window.confirm('Clear this group, all members and all expenses?')) return
    setData({ groupName: '', members: [], expenses: [] })
    setGroupName(''); setPaidBy(''); setSplitIds([])
  }

  const copySummary = async () => {
    const text = settlementSummaryText(data.groupName, total, balances, payments)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  const isEmpty = !members.length && !expenses.length

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">No login &middot; No backend &middot; Data stays in your browser</p>
          <h1>Hisab Barabar</h1>
          <p className="tagline">Split group bills fairly — and settle up in the fewest payments.</p>
        </div>
        <div className="hero-actions">
          <button className="btn primary" onClick={loadDemo}>Load demo group</button>
          {!isEmpty && <button className="btn ghost" onClick={clearAll}>Clear all</button>}
        </div>
      </header>

      {notice && <div className="notice" role="status">{notice}</div>}

      {isEmpty && (
        <section className="empty">
          <h2>Start in 30 seconds</h2>
          <ol>
            <li><strong>1.</strong> Name your group and add members.</li>
            <li><strong>2.</strong> Add an expense — who paid, and who shares it.</li>
            <li><strong>3.</strong> See who owes whom, in the fewest payments.</li>
          </ol>
          <p>Or press <strong>Load demo group</strong> above to see a finished New York Trip example instantly.</p>
        </section>
      )}

      <main className="grid">
        <section className="card">
          <h2>Group &amp; members</h2>
          <label className="field">
            <span>Group name</span>
            <div className="row">
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. New York Trip, Apartment 4B, Office Lunch" />
              <button className="btn" onClick={saveGroup}>Save</button>
            </div>
          </label>
          <form onSubmit={addMember} className="row">
            <input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="Member name, e.g. Alex" aria-label="Member name" />
            <button className="btn primary" type="submit">Add member</button>
          </form>
          {members.length > 0 ? (
            <ul className="chips">
              {members.map((m) => (
                <li key={m.id}>{m.name}
                  <button aria-label={`Remove ${m.name}`} onClick={() => setData((d) => ({
                    ...d,
                    members: d.members.filter((x) => x.id !== m.id),
                    expenses: d.expenses.filter((ex) => ex.paidById !== m.id).map((ex) => ({ ...ex, splitAmongIds: ex.splitAmongIds.filter((id) => id !== m.id) })),
                  }))}>&times;</button>
                </li>
              ))}
            </ul>
          ) : <p className="muted">No members yet.</p>}
        </section>

        <section className="card">
          <h2>Add expense (USD)</h2>
          {members.length === 0 ? (
            <p className="muted">Add at least one member first.</p>
          ) : (
            <form onSubmit={addExpense} className="expense-form">
              <label className="field"><span>What was it?</span>
                <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Dinner" />
              </label>
              <label className="field"><span>Amount ($)</span>
                <input type="number" min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 60" />
              </label>
              <label className="field"><span>Paid by</span>
                <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
              <fieldset className="field">
                <legend>Split equally among</legend>
                <div className="checks">
                  {members.map((m) => (
                    <label key={m.id} className="check">
                      <input type="checkbox" checked={splitIds.includes(m.id)} onChange={() => toggleSplit(m.id)} /> {m.name}
                    </label>
                  ))}
                </div>
                <p className="muted small">Leave all ticked to split among everyone. Untick someone to exclude them from this expense.</p>
              </fieldset>
              <button className="btn primary" type="submit">Add expense</button>
            </form>
          )}
        </section>
      </main>

      <section className="card dashboard">
        <div className="dash-head">
          <h2>{data.groupName || 'Your group'} — dashboard</h2>
          <div className="total">Total spent <strong>{formatUSD(total)}</strong></div>
        </div>
        {members.length === 0 ? (
          <p className="muted">Balances will appear here once members and expenses are added.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Person</th><th>Paid</th><th>Share</th><th>Balance</th></tr></thead>
              <tbody>
                {balances.map((b) => (
                  <tr key={b.id}>
                    <td>{b.name}</td>
                    <td>{formatUSD(b.paidCents)}</td>
                    <td>{formatUSD(b.shareCents)}</td>
                    <td className={b.balanceCents > 0 ? 'positive' : b.balanceCents < 0 ? 'negative' : ''}>
                      {b.balanceCents > 0 ? `+${formatUSD(b.balanceCents)} (is owed)` : b.balanceCents < 0 ? `${formatUSD(b.balanceCents)} (owes)` : 'Settled'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="settle">
          <h3>Settle up — fewest payments</h3>
          {payments.length === 0 ? (
            <p>{expenses.length ? 'Everyone is settled up. No payments needed.' : 'Add expenses to see the settlement plan.'}</p>
          ) : (
            <ol className="payments">
              {payments.map((p, i) => (
                <li key={i}><strong>{p.fromName}</strong> pays <strong>{p.toName}</strong> <strong className="amount">{formatUSD(p.amountCents)}</strong></li>
              ))}
            </ol>
          )}
          {expenses.length > 0 && <button className="btn" onClick={copySummary}>{copied ? 'Copied!' : 'Copy settlement summary'}</button>}
        </div>
      </section>

      {expenses.length > 0 && (
        <section className="card">
          <h2>Expenses ({expenses.length})</h2>
          <ul className="expenses">
            {expenses.map((ex) => (
              <li key={ex.id}>
                <div><strong>{ex.description}</strong> <span className="muted">— paid by {memberName(ex.paidById)}, split among {ex.splitAmongIds.map(memberName).join(', ')}</span></div>
                <div className="expense-right"><strong>{formatUSD(ex.amountCents)}</strong>
                  <button aria-label={`Delete ${ex.description}`} onClick={() => setData((d) => ({ ...d, expenses: d.expenses.filter((x) => x.id !== ex.id) }))}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card maker-note">
        <h2>A note from the maker — Why I built this</h2>
        <p>After a weekend trip to New York, my friends and I spent more time arguing about who owed what for dinner and taxis than we spent enjoying the trip. I tried a note on my phone, then a spreadsheet, then I just gave up and paid extra to avoid the awkward conversation. That felt wrong, so I built Hisab Barabar: type who paid, tick who shared it, and it tells you, in plain words, who pays whom — in as few payments as possible. No account, no server, your numbers stay in your browser.</p>
        <p className="maker-sign">— Muhammad Sarim · USA, built for Next Byte Hacks V5</p>
      </section>

      <footer className="muted small">
        Hisab Barabar is a brand-new project built for Next Byte Hacks V5. Your groups and expenses are saved only in this browser (localStorage) — nothing is sent to a server.
      </footer>
    </div>
  )
}
