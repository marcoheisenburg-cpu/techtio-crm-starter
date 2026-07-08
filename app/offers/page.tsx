'use client';

import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { supabase } from '@/lib/supabase-client';

type Offer = {
  id: string;
  name: string;
  brand: string | null;
  geo: string;
  vertical: string;
  payout: number | null;
  crm: string | null;
  status: string | null;
  daily_cap: number | null;
  notes: string | null;
  created_at?: string;
};

type OfferForm = {
  name: string;
  brand: string;
  geo: string;
  vertical: string;
  payout: string;
  crm: string;
  status: string;
  daily_cap: string;
  notes: string;
};

const emptyForm: OfferForm = {
  name: '',
  brand: '',
  geo: '',
  vertical: '',
  payout: '0',
  crm: '',
  status: 'active',
  daily_cap: '0',
  notes: ''
};

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [form, setForm] = useState<OfferForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadOffers() {
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setMessage(`Failed to load offers: ${error.message}`);
      setLoading(false);
      return;
    }

    setOffers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadOffers();
  }, []);

  function updateField(field: keyof OfferForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage('');
  }

  function editOffer(offer: Offer) {
    setEditingId(offer.id);
    setForm({
      name: offer.name || '',
      brand: offer.brand || '',
      geo: offer.geo || '',
      vertical: offer.vertical || '',
      payout: String(offer.payout || 0),
      crm: offer.crm || '',
      status: offer.status || 'active',
      daily_cap: String(offer.daily_cap || 0),
      notes: offer.notes || ''
    });
    setMessage('');
  }

  async function saveOffer() {
    if (!form.name.trim()) {
      setMessage('Offer name is required.');
      return;
    }

    if (!form.geo.trim()) {
      setMessage('Geo is required.');
      return;
    }

    if (!form.vertical.trim()) {
      setMessage('Vertical is required.');
      return;
    }

    setSaving(true);
    setMessage('');

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      geo: form.geo.trim(),
      vertical: form.vertical.trim(),
      payout: Number(form.payout || 0),
      crm: form.crm.trim() || null,
      status: form.status || 'active',
      daily_cap: Number(form.daily_cap || 0),
      notes: form.notes.trim() || null
    };

    if (editingId) {
      const { error } = await supabase
        .from('offers')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        setMessage(`Failed to update offer: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage('Offer updated successfully.');
    } else {
      const { error } = await supabase
        .from('offers')
        .insert(payload);

      if (error) {
        setMessage(`Failed to add offer: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage('Offer added successfully.');
    }

    setSaving(false);
    setForm(emptyForm);
    setEditingId(null);
    await loadOffers();
  }

  async function deleteOffer(id: string) {
    const confirmed = window.confirm('Delete this offer? This cannot be undone.');

    if (!confirmed) return;

    setMessage('');

    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage(`Failed to delete offer: ${error.message}`);
      return;
    }

    setMessage('Offer deleted successfully.');
    await loadOffers();
  }

  return (
    <>
      <PageTitle
        title="Offers"
        subtitle="Manage offers, brands, geos, payouts and CRM destinations. This page is now connected to Supabase."
      />

      <div className="grid grid-2">
        <div className="card">
          <h2>{editingId ? 'Edit Offer' : 'Add Offer'}</h2>

          <label>
            Offer Name
            <input
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Brazil Zenstox"
            />
          </label>

          <br />

          <label>
            Brand
            <input
              value={form.brand}
              onChange={(e) => updateField('brand', e.target.value)}
              placeholder="Zenstox / WBS / BrainTrade"
            />
          </label>

          <br />

          <label>
            Geo
            <input
              value={form.geo}
              onChange={(e) => updateField('geo', e.target.value)}
              placeholder="Brazil"
            />
          </label>

          <br />

          <label>
            Vertical
            <input
              value={form.vertical}
              onChange={(e) => updateField('vertical', e.target.value)}
              placeholder="Investment / Sweepstakes / iGaming"
            />
          </label>

          <br />

          <label>
            Payout
            <input
              type="number"
              value={form.payout}
              onChange={(e) => updateField('payout', e.target.value)}
            />
          </label>

          <br />

          <label>
            CRM
            <input
              value={form.crm}
              onChange={(e) => updateField('crm', e.target.value)}
              placeholder="Trackbox / Zeydoo / Internal"
            />
          </label>

          <br />

          <label>
            Daily Cap
            <input
              type="number"
              value={form.daily_cap}
              onChange={(e) => updateField('daily_cap', e.target.value)}
            />
          </label>

          <br />

          <label>
            Status
            <select
              value={form.status}
              onChange={(e) => updateField('status', e.target.value)}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="closed">Closed</option>
              <option value="testing">Testing</option>
            </select>
          </label>

          <br />

          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Restrictions, caps, quality notes..."
              rows={4}
            />
          </label>

          <br />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={saveOffer} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Offer' : 'Add Offer'}
            </button>

            {editingId && (
              <button className="btn secondary" type="button" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
          </div>

          {message && (
            <p className="muted" style={{ marginTop: 12 }}>
              {message}
            </p>
          )}
        </div>

        <div className="card table-wrap">
          <h2>Offer List</h2>

          {loading ? (
            <p className="muted">Loading offers from Supabase...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Offer</th>
                  <th>Brand</th>
                  <th>Geo</th>
                  <th>Vertical</th>
                  <th>Payout</th>
                  <th>CRM</th>
                  <th>Cap</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {offers.length === 0 ? (
                  <tr>
                    <td colSpan={9}>No offers yet.</td>
                  </tr>
                ) : (
                  offers.map((offer) => (
                    <tr key={offer.id}>
                      <td>{offer.name}</td>
                      <td>{offer.brand || '-'}</td>
                      <td>{offer.geo}</td>
                      <td>{offer.vertical}</td>
                      <td>{money(offer.payout)}</td>
                      <td>{offer.crm || '-'}</td>
                      <td>{offer.daily_cap || 0}</td>
                      <td>
                        <span className="badge green">
                          {offer.status || 'active'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            className="btn small"
                            type="button"
                            onClick={() => editOffer(offer)}
                          >
                            Edit
                          </button>

                          <button
                            className="btn small danger"
                            type="button"
                            onClick={() => deleteOffer(offer.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}