'use client';

import { FormEvent, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { money, statusClass } from '@/lib/mock-data';
import { Offer, useCrmDatabase } from '@/lib/local-db';

const emptyOffer: Offer = {
  name: '',
  geo: '',
  vertical: 'Investment',
  crm: 'Trackbox',
  payout: 0,
  status: 'Active',
  cap: 0
};

export default function OffersPage() {
  const { database, addOffer, updateOffer, deleteOffer } = useCrmDatabase();
  const [form, setForm] = useState<Offer>(emptyOffer);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function updateField(field: keyof Offer, value: string) {
    setForm((current) => ({
      ...current,
      [field]: ['payout', 'cap'].includes(field) ? Number(value) : value
    }));
  }

  function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return;

    const cleanOffer = {
      ...form,
      name: form.name.trim(),
      geo: form.geo.trim(),
      vertical: form.vertical.trim(),
      crm: form.crm.trim()
    };

    if (editingIndex === null) {
      addOffer(cleanOffer);
    } else {
      updateOffer(editingIndex, cleanOffer);
    }

    setForm(emptyOffer);
    setEditingIndex(null);
  }

  function editOffer(index: number) {
    setForm(database.offers[index]);
    setEditingIndex(index);
  }

  function cancelEdit() {
    setForm(emptyOffer);
    setEditingIndex(null);
  }

  return (
    <>
      <PageTitle title="Offers" subtitle="Add, edit and track brands, geo, CRM, payout, caps and offer status." />

      <div className="card" style={{ marginBottom: 18 }}>
        <h2>{editingIndex === null ? 'Add Offer' : 'Edit Offer'}</h2>

        <form className="form" onSubmit={submitOffer}>
          <label>
            Offer Name
            <input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Brazil WBS" />
          </label>

          <label>
            Geo
            <input value={form.geo} onChange={(e) => updateField('geo', e.target.value)} placeholder="Brazil" />
          </label>

          <label>
            Vertical
            <select value={form.vertical} onChange={(e) => updateField('vertical', e.target.value)}>
              <option>Investment</option>
              <option>Sweepstakes</option>
              <option>iGaming</option>
              <option>Crypto</option>
              <option>Other</option>
            </select>
          </label>

          <label>
            CRM / Network
            <input value={form.crm} onChange={(e) => updateField('crm', e.target.value)} placeholder="Trackbox" />
          </label>

          <label>
            Payout
            <input type="number" value={form.payout} onChange={(e) => updateField('payout', e.target.value)} />
          </label>

          <label>
            Status
            <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
              <option>Active</option>
              <option>Testing</option>
              <option>Paused</option>
              <option>Closed</option>
            </select>
          </label>

          <label>
            Daily Cap
            <input type="number" value={form.cap} onChange={(e) => updateField('cap', e.target.value)} />
          </label>

          <div className="actions" style={{ alignSelf: 'end' }}>
            <button className="btn" type="submit">{editingIndex === null ? 'Save Offer' : 'Update Offer'}</button>
            {editingIndex !== null && <button className="btn secondary" type="button" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Offer</th><th>Geo</th><th>Vertical</th><th>CRM</th><th>Payout</th><th>Status</th><th>Daily Cap</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {database.offers.map((o, index) => (
              <tr key={`${o.name}-${index}`}>
                <td>{o.name}</td>
                <td>{o.geo}</td>
                <td>{o.vertical}</td>
                <td>{o.crm}</td>
                <td>{money(o.payout)}</td>
                <td><span className={`badge ${statusClass(o.status)}`}>{o.status}</span></td>
                <td>{o.cap || '-'}</td>
                <td>
                  <div className="actions">
                    <button className="btn secondary" type="button" onClick={() => editOffer(index)}>Edit</button>
                    <button className="btn secondary" type="button" onClick={() => deleteOffer(index)}>Delete</button>
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
