'use client';

import { FormEvent, useMemo, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { money, statusClass, totals } from '@/lib/mock-data';
import { Account, useCrmDatabase } from '@/lib/local-db';

const emptyAccount: Account = {
  name: '',
  platform: 'Facebook',
  agency: '',
  buyer: '',
  geo: '',
  status: 'Active',
  dailyLimit: 0,
  monthlyBudget: 0,
  spendLimit: 0,
  lifetimeSpend: 0,
  banDate: '',
  banReason: '',
  replacementNeeded: false,
  notes: ''
};

const accountStatuses = ['Active', 'Warming', 'Limited', 'Disabled', 'Banned', 'Paused'];
const platforms = ['Facebook', 'Google', 'TikTok', 'Native', 'Other'];

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function getAccountBudgetStatus(account: Account, monthlySpend: number) {
  const budget = Number(account.monthlyBudget || account.spendLimit || 0);
  if (!budget) return 'No Budget';
  const usedPct = (monthlySpend / budget) * 100;
  if (usedPct >= 100) return 'Over Limit';
  if (usedPct >= 80) return 'Near Limit';
  return 'Healthy';
}

export default function AccountsPage() {
  const { database, addAccount, updateAccount, deleteAccount } = useCrmDatabase();
  const [form, setForm] = useState<Account>(emptyAccount);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const savedAgencies = useMemo(() => unique(database.agencies.map((a) => a.name)), [database.agencies]);
  const savedBuyers = useMemo(() => unique(database.buyerBudgets.map((b) => b.buyer)), [database.buyerBudgets]);
  const savedGeos = useMemo(() => unique([
    ...database.accounts.map((a) => a.geo),
    ...database.offers.map((o) => o.geo),
    ...database.dailySpend.map((r) => r.geo)
  ]), [database.accounts, database.offers, database.dailySpend]);

  const accountRows = useMemo(() => {
    return database.accounts.map((account, index) => {
      const rows = database.dailySpend.filter((row) => row.account === account.name);
      const t = totals(rows);
      const monthlyBudget = Number(account.monthlyBudget || 0);
      const spendLimit = Number(account.spendLimit || 0);
      const budgetBase = monthlyBudget || spendLimit;
      const remaining = budgetBase ? budgetBase - t.spend : 0;
      const usedPct = budgetBase ? (t.spend / budgetBase) * 100 : 0;
      const budgetStatus = getAccountBudgetStatus(account, t.spend);

      return {
        account,
        index,
        spend: t.spend,
        leads: t.leads,
        cpl: t.cpl,
        profit: t.profit,
        remaining,
        usedPct,
        budgetStatus
      };
    });
  }, [database.accounts, database.dailySpend]);

  function updateField(field: keyof Account, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: ['dailyLimit', 'monthlyBudget', 'spendLimit', 'lifetimeSpend'].includes(field)
        ? Number(value || 0)
        : value
    }));
  }

  function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;

    const cleanAccount: Account = {
      ...form,
      name: form.name.trim(),
      platform: form.platform.trim() || 'Facebook',
      agency: form.agency.trim(),
      buyer: form.buyer.trim(),
      geo: form.geo.trim(),
      status: form.status || 'Active',
      dailyLimit: Number(form.dailyLimit || 0),
      monthlyBudget: Number(form.monthlyBudget || 0),
      spendLimit: Number(form.spendLimit || 0),
      lifetimeSpend: Number(form.lifetimeSpend || 0),
      banDate: form.banDate || '',
      banReason: form.banReason.trim(),
      replacementNeeded: Boolean(form.replacementNeeded),
      notes: form.notes.trim()
    };

    if (editingIndex === null) {
      addAccount(cleanAccount);
    } else {
      updateAccount(editingIndex, cleanAccount);
    }

    setForm(emptyAccount);
    setEditingIndex(null);
  }

  function editAccount(index: number) {
    setForm(database.accounts[index]);
    setEditingIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setForm(emptyAccount);
    setEditingIndex(null);
  }

  const activeAccounts = database.accounts.filter((a) => a.status === 'Active').length;
  const problemAccounts = database.accounts.filter((a) => ['Disabled', 'Banned', 'Limited'].includes(String(a.status))).length;
  const replacementNeeded = database.accounts.filter((a) => a.replacementNeeded).length;
  const totalMonthlyBudget = database.accounts.reduce((sum, account) => sum + Number(account.monthlyBudget || 0), 0);

  return (
    <>
      <PageTitle
        title="Accounts"
        subtitle="Track ad account ownership, budget limits, status, bans and replacement needs."
      />

      <section className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="metric-label">Active Accounts</div>
          <div className="metric-value">{activeAccounts}</div>
          <div className="metric-sub">Ready to spend</div>
        </div>
        <div className="card">
          <div className="metric-label">Problem Accounts</div>
          <div className="metric-value">{problemAccounts}</div>
          <div className="metric-sub">Limited, disabled or banned</div>
        </div>
        <div className="card">
          <div className="metric-label">Replacement Needed</div>
          <div className="metric-value">{replacementNeeded}</div>
          <div className="metric-sub">Accounts marked for replacement</div>
        </div>
        <div className="card">
          <div className="metric-label">Monthly Account Budget</div>
          <div className="metric-value">{money(totalMonthlyBudget)}</div>
          <div className="metric-sub">Total set across accounts</div>
        </div>
      </section>

      <div className="card" style={{ marginBottom: 18 }}>
        <h2>{editingIndex === null ? 'Add Account' : `Edit ${database.accounts[editingIndex]?.name || 'Account'}`}</h2>
        <form onSubmit={submitAccount}>
          <div className="form">
            <label>
              Account Name
              <input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="FB-BR-001" required />
            </label>

            <label>
              Platform
              <select value={form.platform} onChange={(e) => updateField('platform', e.target.value)}>
                {platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
              </select>
            </label>

            <label>
              Agency
              <input list="account-agency-list" value={form.agency} onChange={(e) => updateField('agency', e.target.value)} placeholder="Agency A" />
              <datalist id="account-agency-list">{savedAgencies.map((agency) => <option key={agency} value={agency} />)}</datalist>
            </label>

            <label>
              Buyer
              <input list="account-buyer-list" value={form.buyer} onChange={(e) => updateField('buyer', e.target.value)} placeholder="Marco" />
              <datalist id="account-buyer-list">{savedBuyers.map((buyer) => <option key={buyer} value={buyer} />)}</datalist>
            </label>

            <label>
              Geo
              <input list="account-geo-list" value={form.geo} onChange={(e) => updateField('geo', e.target.value)} placeholder="Brazil" />
              <datalist id="account-geo-list">{savedGeos.map((geo) => <option key={geo} value={geo} />)}</datalist>
            </label>

            <label>
              Status
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                {accountStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>

            <label>
              Daily Budget
              <input type="number" value={form.dailyLimit} onChange={(e) => updateField('dailyLimit', e.target.value)} />
            </label>

            <label>
              Monthly Budget
              <input type="number" value={form.monthlyBudget} onChange={(e) => updateField('monthlyBudget', e.target.value)} />
            </label>

            <label>
              Spend Limit
              <input type="number" value={form.spendLimit} onChange={(e) => updateField('spendLimit', e.target.value)} />
            </label>

            <label>
              Lifetime Spend
              <input type="number" value={form.lifetimeSpend} onChange={(e) => updateField('lifetimeSpend', e.target.value)} />
            </label>

            <label>
              Ban Date
              <input type="date" value={form.banDate} onChange={(e) => updateField('banDate', e.target.value)} />
            </label>

            <label>
              Replacement Needed
              <select value={form.replacementNeeded ? 'yes' : 'no'} onChange={(e) => updateField('replacementNeeded', e.target.value === 'yes')}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
          </div>

          <div className="form" style={{ marginTop: 14, gridTemplateColumns: '1fr 1fr' }}>
            <label>
              Ban / Limit Reason
              <textarea value={form.banReason} onChange={(e) => updateField('banReason', e.target.value)} placeholder="Payment issue, policy, disabled, limited, etc." />
            </label>

            <label>
              Notes
              <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Account quality, agency comments, warm-up notes, restrictions..." />
            </label>
          </div>

          <div className="actions" style={{ marginTop: 14 }}>
            <button className="btn" type="submit">{editingIndex === null ? 'Save Account' : 'Update Account'}</button>
            {editingIndex !== null && <button className="btn secondary" type="button" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card table-wrap">
        <h2>Account List</h2>
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Platform</th>
              <th>Agency</th>
              <th>Buyer</th>
              <th>Geo</th>
              <th>Status</th>
              <th>Daily</th>
              <th>Monthly</th>
              <th>Spend</th>
              <th>Remaining</th>
              <th>Used</th>
              <th>Budget Status</th>
              <th>Replacement</th>
              <th>Ban Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accountRows.map((row) => (
              <tr key={`${row.account.name}-${row.index}`}>
                <td><strong>{row.account.name}</strong></td>
                <td>{row.account.platform}</td>
                <td>{row.account.agency || '-'}</td>
                <td>{row.account.buyer || '-'}</td>
                <td>{row.account.geo || '-'}</td>
                <td><span className={`badge ${statusClass(row.account.status)}`}>{row.account.status}</span></td>
                <td>{money(row.account.dailyLimit || 0)}</td>
                <td>{money(row.account.monthlyBudget || 0)}</td>
                <td>{money(row.spend)}</td>
                <td className={row.remaining >= 0 ? 'positive' : 'negative'}>{row.account.monthlyBudget || row.account.spendLimit ? money(row.remaining) : '-'}</td>
                <td>
                  <div className="progress-cell">
                    <div className="progress-bar"><span style={{ width: `${Math.min(row.usedPct, 100)}%` }} /></div>
                    <strong>{row.account.monthlyBudget || row.account.spendLimit ? `${row.usedPct.toFixed(1)}%` : '-'}</strong>
                  </div>
                </td>
                <td><span className={`badge ${statusClass(row.budgetStatus)}`}>{row.budgetStatus}</span></td>
                <td>{row.account.replacementNeeded ? <span className="badge red">Yes</span> : <span className="badge green">No</span>}</td>
                <td>{row.account.banDate || '-'}</td>
                <td>
                  <div className="actions">
                    <button className="btn secondary" type="button" onClick={() => editAccount(row.index)}>Edit</button>
                    <button className="btn secondary" type="button" onClick={() => deleteAccount(row.index)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {accountRows.length === 0 && (
              <tr><td colSpan={15} className="muted">No accounts saved yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
