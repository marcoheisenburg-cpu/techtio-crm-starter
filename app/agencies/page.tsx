'use client';

import { FormEvent, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { money, statusClass } from '@/lib/mock-data';
import { Agency, useCrmDatabase } from '@/lib/local-db';

const emptyAgency: Agency = {
  name: '',
  contact: '',
  activeAccounts: 0,
  disabledAccounts: 0,
  spend: 0,
  avgCpl: 0,
  quality: 'Medium'
};

export default function AgenciesPage() {
  const { database, addAgency, updateAgency, deleteAgency } = useCrmDatabase();
  const [form, setForm] = useState<Agency>(emptyAgency);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function updateField(field: keyof Agency, value: string) {
    setForm((current) => ({
      ...current,
      [field]: ['activeAccounts', 'disabledAccounts', 'spend', 'avgCpl'].includes(field)
        ? Number(value)
        : value
    }));
  }

  function submitAgency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;

    const cleanAgency = {
      ...form,
      name: form.name.trim(),
      contact: form.contact.trim()
    };

    if (editingIndex === null) {
      addAgency(cleanAgency);
    } else {
      updateAgency(editingIndex, cleanAgency);
    }

    setForm(emptyAgency);
    setEditingIndex(null);
  }

  function editAgency(index: number) {
    setForm(database.agencies[index]);
    setEditingIndex(index);
  }

  function cancelEdit() {
    setForm(emptyAgency);
    setEditingIndex(null);
  }

  return (
    <>
      <PageTitle title="Agencies" subtitle="Add, edit and compare account suppliers by survival, spend, CPL and quality." />

      <div className="card" style={{ marginBottom: 18 }}>
        <h2>{editingIndex === null ? 'Add Agency' : 'Edit Agency'}</h2>

        <form className="form" onSubmit={submitAgency}>
          <label>
            Agency Name
            <input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Agency A" />
          </label>

          <label>
            Contact
            <input value={form.contact} onChange={(e) => updateField('contact', e.target.value)} placeholder="@telegram or email" />
          </label>

          <label>
            Active Accounts
            <input type="number" value={form.activeAccounts} onChange={(e) => updateField('activeAccounts', e.target.value)} />
          </label>

          <label>
            Disabled Accounts
            <input type="number" value={form.disabledAccounts} onChange={(e) => updateField('disabledAccounts', e.target.value)} />
          </label>

          <label>
            Total Spend
            <input type="number" value={form.spend} onChange={(e) => updateField('spend', e.target.value)} />
          </label>

          <label>
            Average CPL
            <input type="number" value={form.avgCpl} onChange={(e) => updateField('avgCpl', e.target.value)} />
          </label>

          <label>
            Quality
            <select value={form.quality} onChange={(e) => updateField('quality', e.target.value)}>
              <option>Strong</option>
              <option>Medium</option>
              <option>Watch</option>
              <option>Bad</option>
            </select>
          </label>

          <div className="actions" style={{ alignSelf: 'end' }}>
            <button className="btn" type="submit">{editingIndex === null ? 'Save Agency' : 'Update Agency'}</button>
            {editingIndex !== null && <button className="btn secondary" type="button" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Agency</th><th>Contact</th><th>Active Accounts</th><th>Disabled</th><th>Total Spend</th><th>Average CPL</th><th>Quality</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {database.agencies.map((a, index) => (
              <tr key={`${a.name}-${index}`}>
                <td>{a.name}</td>
                <td>{a.contact}</td>
                <td>{a.activeAccounts}</td>
                <td>{a.disabledAccounts}</td>
                <td>{money(a.spend)}</td>
                <td>{money(a.avgCpl)}</td>
                <td><span className={`badge ${statusClass(a.quality)}`}>{a.quality}</span></td>
                <td>
                  <div className="actions">
                    <button className="btn secondary" type="button" onClick={() => editAgency(index)}>Edit</button>
                    <button className="btn secondary" type="button" onClick={() => deleteAgency(index)}>Delete</button>
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
