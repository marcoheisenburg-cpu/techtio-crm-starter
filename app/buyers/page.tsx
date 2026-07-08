'use client';

import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { supabase } from '@/lib/supabase-client';

type Buyer = {
  id: string;
  name: string;
  email: string | null;
  telegram: string | null;
  status: string | null;
  created_at?: string;
};

type BuyerForm = {
  name: string;
  email: string;
  telegram: string;
  status: string;
};

const emptyForm: BuyerForm = {
  name: '',
  email: '',
  telegram: '',
  status: 'active'
};

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [form, setForm] = useState<BuyerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadBuyers() {
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setMessage(`Failed to load buyers: ${error.message}`);
      setLoading(false);
      return;
    }

    setBuyers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadBuyers();
  }, []);

  function updateField(field: keyof BuyerForm, value: string) {
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

  function editBuyer(buyer: Buyer) {
    setEditingId(buyer.id);
    setForm({
      name: buyer.name || '',
      email: buyer.email || '',
      telegram: buyer.telegram || '',
      status: buyer.status || 'active'
    });
    setMessage('');
  }

  async function saveBuyer() {
    if (!form.name.trim()) {
      setMessage('Buyer name is required.');
      return;
    }

    setSaving(true);
    setMessage('');

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      telegram: form.telegram.trim() || null,
      status: form.status || 'active'
    };

    if (editingId) {
      const { error } = await supabase
        .from('buyers')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        setMessage(`Failed to update buyer: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage('Buyer updated successfully.');
    } else {
      const { error } = await supabase
        .from('buyers')
        .insert(payload);

      if (error) {
        setMessage(`Failed to add buyer: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage('Buyer added successfully.');
    }

    setSaving(false);
    setForm(emptyForm);
    setEditingId(null);
    await loadBuyers();
  }

  async function deleteBuyer(id: string) {
    const confirmed = window.confirm('Delete this buyer? This cannot be undone.');

    if (!confirmed) return;

    setMessage('');

    const { error } = await supabase
      .from('buyers')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage(`Failed to delete buyer: ${error.message}`);
      return;
    }

    setMessage('Buyer deleted successfully.');
    await loadBuyers();
  }

  return (
    <>
      <PageTitle
        title="Buyers"
        subtitle="Manage media buyers. This page is now connected to Supabase."
      />

      <div className="grid grid-2">
        <div className="card">
          <h2>{editingId ? 'Edit Buyer' : 'Add Buyer'}</h2>

          <label>
            Buyer Name
            <input
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Buyer name"
            />
          </label>

          <br />

          <label>
            Email
            <input
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="buyer@example.com"
            />
          </label>

          <br />

          <label>
            Telegram
            <input
              value={form.telegram}
              onChange={(e) => updateField('telegram', e.target.value)}
              placeholder="@username"
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
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <br />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={saveBuyer} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Buyer' : 'Add Buyer'}
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
          <h2>Buyer List</h2>

          {loading ? (
            <p className="muted">Loading buyers from Supabase...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Email</th>
                  <th>Telegram</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {buyers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No buyers yet.</td>
                  </tr>
                ) : (
                  buyers.map((buyer) => (
                    <tr key={buyer.id}>
                      <td>{buyer.name}</td>
                      <td>{buyer.email || '-'}</td>
                      <td>{buyer.telegram || '-'}</td>
                      <td>
                        <span className="badge green">
                          {buyer.status || 'active'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            className="btn small"
                            type="button"
                            onClick={() => editBuyer(buyer)}
                          >
                            Edit
                          </button>

                          <button
                            className="btn small danger"
                            type="button"
                            onClick={() => deleteBuyer(buyer.id)}
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