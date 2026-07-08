'use client';

import { FormEvent, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { money, pct, statusClass } from '@/lib/mock-data';
import { BuyerBudget, useCrmDatabase } from '@/lib/local-db';

const emptyBuyer: BuyerBudget = {
  buyer: '',
  poolBudget: 0
};

export default function BuyersPage() {
  const {
    database,
    buyerBudgetUsage: buyers,
    addBuyerBudget,
    updateBuyerBudget,
    deleteBuyerBudget
  } = useCrmDatabase();

  const [form, setForm] = useState<BuyerBudget>(emptyBuyer);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function updateField(field: keyof BuyerBudget, value: string) {
    setForm((current) => ({
      ...current,
      [field]: field === 'poolBudget' ? Number(value) : value
    }));
  }

  function submitBuyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.buyer.trim()) return;

    const cleanBuyer = {
      buyer: form.buyer.trim(),
      poolBudget: form.poolBudget
    };

    if (editingIndex === null) {
      addBuyerBudget(cleanBuyer);
    } else {
      updateBuyerBudget(editingIndex, cleanBuyer);
    }

    setForm(emptyBuyer);
    setEditingIndex(null);
  }

  function editBuyer(index: number) {
    setForm(database.buyerBudgets[index]);
    setEditingIndex(index);
  }

  function cancelEdit() {
    setForm(emptyBuyer);
    setEditingIndex(null);
  }

  return (
    <>
      <PageTitle title="Buyers" subtitle="Add media buyers, set pool budgets, and track who is scaling profitably." />

      <div className="card" style={{ marginBottom: 18 }}>
        <h2>{editingIndex === null ? 'Add Buyer' : 'Edit Buyer'}</h2>

        <form className="form" onSubmit={submitBuyer}>
          <label>
            Buyer Name
            <input value={form.buyer} onChange={(e) => updateField('buyer', e.target.value)} placeholder="Marco" />
          </label>

          <label>
            Pool Budget
            <input type="number" value={form.poolBudget} onChange={(e) => updateField('poolBudget', e.target.value)} />
          </label>

          <div className="actions" style={{ alignSelf: 'end' }}>
            <button className="btn" type="submit">{editingIndex === null ? 'Save Buyer' : 'Update Buyer'}</button>
            {editingIndex !== null && <button className="btn secondary" type="button" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Buyer</th><th>Pool Budget</th><th>Spent</th><th>Remaining</th><th>Used</th><th>Leads</th><th>CPL</th><th>Profit</th><th>ROI</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {buyers.map((b, index) => (
              <tr key={`${b.buyer}-${index}`}>
                <td>{b.buyer}</td>
                <td>{money(b.poolBudget)}</td>
                <td>{money(b.spent)}</td>
                <td className={b.remaining >= 0 ? 'positive' : 'negative'}>{money(b.remaining)}</td>
                <td>
                  <div className="progress-cell">
                    <div className="progress-bar"><span style={{ width: `${Math.min(b.usedPct, 100)}%` }} /></div>
                    <strong>{pct(b.usedPct)}</strong>
                  </div>
                </td>
                <td>{b.leads}</td>
                <td>{money(b.cpl)}</td>
                <td className={b.profit >= 0 ? 'positive' : 'negative'}>{money(b.profit)}</td>
                <td>{pct(b.roi)}</td>
                <td><span className={`badge ${statusClass(b.status)}`}>{b.status}</span></td>
                <td>
                  <div className="actions">
                    <button className="btn secondary" type="button" onClick={() => editBuyer(index)}>Edit</button>
                    <button className="btn secondary" type="button" onClick={() => deleteBuyerBudget(index)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
