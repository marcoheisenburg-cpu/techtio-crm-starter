'use client';

import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { supabase } from '@/lib/supabase-client';

type Agency = {
  id: string;
  name: string;
  contact_name: string | null;
  telegram: string | null;
  email: string | null;
  payment_terms: string | null;
  notes: string | null;
  created_at?: string;
};

type AgencyForm = {
  name: string;
  contact_name: string;
  telegram: string;
  email: string;
  payment_terms: string;
  notes: string;
};

const emptyForm: AgencyForm = {
  name: '',
  contact_name: '',
  telegram: '',
  email: '',
  payment_terms: '',
  notes: ''
};

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [form, setForm] = useState<AgencyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadAgencies() {
    setLoading(true);
    setMessage('');

    const { data, error } = await supabase
      .from('agencies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setMessage(`Failed to load agencies: ${error.message}`);
      setLoading(false);
      return;
    }

    setAgencies(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAgencies();
  }, []);

  function updateField(field: keyof AgencyForm, value: string) {
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

  function editAgency(agency: Agency) {
    setEditingId(agency.id);
    setForm({
      name: agency.name || '',
      contact_name: agency.contact_name || '',
      telegram: agency.telegram || '',
      email: agency.email || '',
      payment_terms: agency.payment_terms || '',
      notes: agency.notes || ''
    });
    setMessage('');
  }

  async function saveAgency() {
    if (!form.name.trim()) {
      setMessage('Agency name is required.');
      return;
    }

    setSaving(true);
    setMessage('');

    const payload = {
      name: form.name.trim(),
      contact_name: form.contact_name.trim() || null,
      telegram: form.telegram.trim() || null,
      email: form.email.trim() || null,
      payment_terms: form.payment_terms.trim() || null,
      notes: form.notes.trim() || null
    };

    if (editingId) {
      const { error } = await supabase
        .from('agencies')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        setMessage(`Failed to update agency: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage('Agency updated successfully.');
    } else {
      const { error } = await supabase
        .from('agencies')
        .insert(payload);

      if (error) {
        setMessage(`Failed to add agency: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage('Agency added successfully.');
    }

    setSaving(false);
    setForm(emptyForm);
    setEditingId(null);
    await loadAgencies();
  }

  async function deleteAgency(id: string) {
    const confirmed = window.confirm('Delete this agency? This cannot be undone.');

    if (!confirmed) return;

    setMessage('');

    const { error } = await supabase
      .from('agencies')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage(`Failed to delete agency: ${error.message}`);
      return;
    }

    setMessage('Agency deleted successfully.');
    await loadAgencies();
  }

  return (
    <>
      <PageTitle
        title="Agencies"
        subtitle="Manage agency partners and account suppliers. This page is now connected to Supabase."
      />

      <div className="grid grid-2">
        <div className="card">
          <h2>{editingId ? 'Edit Agency' : 'Add Agency'}</h2>

          <label>
            Agency Name
            <input
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Agency name"
            />
          </label>

          <br />

          <label>
            Contact Name
            <input
              value={form.contact_name}
              onChange={(e) => updateField('contact_name', e.target.value)}
              placeholder="Contact person"
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
            Email
            <input
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="email@example.com"
            />
          </label>

          <br />

          <label>
            Payment Terms
            <input
              value={form.payment_terms}
              onChange={(e) => updateField('payment_terms', e.target.value)}
              placeholder="Prepay / weekly / net terms"
            />
          </label>

          <br />

          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Agency notes"
              rows={4}
            />
          </label>

          <br />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={saveAgency} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Agency' : 'Add Agency'}
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
          <h2>Agency List</h2>

          {loading ? (
            <p className="muted">Loading agencies from Supabase...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Agency</th>
                  <th>Contact</th>
                  <th>Telegram</th>
                  <th>Email</th>
                  <th>Payment Terms</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {agencies.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No agencies yet.</td>
                  </tr>
                ) : (
                  agencies.map((agency) => (
                    <tr key={agency.id}>
                      <td>{agency.name}</td>
                      <td>{agency.contact_name || '-'}</td>
                      <td>{agency.telegram || '-'}</td>
                      <td>{agency.email || '-'}</td>
                      <td>{agency.payment_terms || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            className="btn small"
                            type="button"
                            onClick={() => editAgency(agency)}
                          >
                            Edit
                          </button>

                          <button
                            className="btn small danger"
                            type="button"
                            onClick={() => deleteAgency(agency.id)}
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