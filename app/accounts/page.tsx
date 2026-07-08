'use client';

import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { supabase } from '@/lib/supabase-client';

type Agency = {
  id: string;
  name: string;
};

type Buyer = {
  id: string;
  name: string;
};

type AdAccount = {
  id: string;
  account_name: string;
  account_external_id: string | null;
  platform: string | null;
  agency_id: string | null;
  buyer_id: string | null;
  business_manager: string | null;
  geo: string | null;
  vertical: string | null;
  status: string | null;
  currency: string | null;
  timezone: string | null;
  daily_limit: number | null;
  daily_budget: number | null;
  monthly_budget: number | null;
  spend_limit: number | null;
  lifetime_spend: number | null;
  ban_date: string | null;
  ban_reason: string | null;
  replacement_needed: boolean | null;
  notes: string | null;
  created_at?: string;
};

type AccountForm = {
  account_name: string;
  account_external_id: string;
  platform: string;
  agency_id: string;
  buyer_id: string;
  business_manager: string;
  geo: string;
  vertical: string;
  status: string;
  currency: string;
  timezone: string;
  daily_limit: string;
  daily_budget: string;
  monthly_budget: string;
  spend_limit: string;
  lifetime_spend: string;
  ban_date: string;
  ban_reason: string;
  replacement_needed: boolean;
  notes: string;
};

const emptyForm: AccountForm = {
  account_name: '',
  account_external_id: '',
  platform: 'Facebook',
  agency_id: '',
  buyer_id: '',
  business_manager: '',
  geo: '',
  vertical: '',
  status: 'active',
  currency: 'USD',
  timezone: '',
  daily_limit: '0',
  daily_budget: '0',
  monthly_budget: '0',
  spend_limit: '0',
  lifetime_spend: '0',
  ban_date: '',
  ban_reason: '',
  replacement_needed: false,
  notes: ''
};

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function statusClass(status: string | null | undefined) {
  const s = String(status || '').toLowerCase();

  if (s.includes('active')) return 'green';
  if (s.includes('warming')) return 'blue';
  if (s.includes('limited') || s.includes('paused')) return 'amber';
  if (s.includes('disabled') || s.includes('banned')) return 'red';

  return 'blue';
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadData() {
    setLoading(true);
    setMessage('');

    const [accountsResult, agenciesResult, buyersResult] = await Promise.all([
      supabase
        .from('ad_accounts')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('agencies')
        .select('id, name')
        .order('name', { ascending: true }),
      supabase
        .from('buyers')
        .select('id, name')
        .order('name', { ascending: true })
    ]);

    if (accountsResult.error) {
      setMessage(`Failed to load accounts: ${accountsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (agenciesResult.error) {
      setMessage(`Failed to load agencies: ${agenciesResult.error.message}`);
      setLoading(false);
      return;
    }

    if (buyersResult.error) {
      setMessage(`Failed to load buyers: ${buyersResult.error.message}`);
      setLoading(false);
      return;
    }

    setAccounts(accountsResult.data || []);
    setAgencies(agenciesResult.data || []);
    setBuyers(buyersResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function getAgencyName(id: string | null) {
    return agencies.find((agency) => agency.id === id)?.name || '-';
  }

  function getBuyerName(id: string | null) {
    return buyers.find((buyer) => buyer.id === id)?.name || '-';
  }

  function updateField(field: keyof AccountForm, value: string | boolean) {
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

  function editAccount(account: AdAccount) {
    setEditingId(account.id);

    setForm({
      account_name: account.account_name || '',
      account_external_id: account.account_external_id || '',
      platform: account.platform || 'Facebook',
      agency_id: account.agency_id || '',
      buyer_id: account.buyer_id || '',
      business_manager: account.business_manager || '',
      geo: account.geo || '',
      vertical: account.vertical || '',
      status: account.status || 'active',
      currency: account.currency || 'USD',
      timezone: account.timezone || '',
      daily_limit: String(account.daily_limit || 0),
      daily_budget: String(account.daily_budget || 0),
      monthly_budget: String(account.monthly_budget || 0),
      spend_limit: String(account.spend_limit || 0),
      lifetime_spend: String(account.lifetime_spend || 0),
      ban_date: account.ban_date || '',
      ban_reason: account.ban_reason || '',
      replacement_needed: Boolean(account.replacement_needed),
      notes: account.notes || ''
    });

    setMessage('');
  }

  async function saveAccount() {
    if (!form.account_name.trim()) {
      setMessage('Account name is required.');
      return;
    }

    setSaving(true);
    setMessage('');

    const payload = {
      account_name: form.account_name.trim(),
      account_external_id: form.account_external_id.trim() || null,
      platform: form.platform || 'Facebook',
      agency_id: form.agency_id || null,
      buyer_id: form.buyer_id || null,
      business_manager: form.business_manager.trim() || null,
      geo: form.geo.trim() || null,
      vertical: form.vertical.trim() || null,
      status: form.status || 'active',
      currency: form.currency.trim() || 'USD',
      timezone: form.timezone.trim() || null,
      daily_limit: Number(form.daily_limit || 0),
      daily_budget: Number(form.daily_budget || 0),
      monthly_budget: Number(form.monthly_budget || 0),
      spend_limit: Number(form.spend_limit || 0),
      lifetime_spend: Number(form.lifetime_spend || 0),
      ban_date: form.ban_date || null,
      ban_reason: form.ban_reason.trim() || null,
      replacement_needed: Boolean(form.replacement_needed),
      notes: form.notes.trim() || null
    };

    if (editingId) {
      const { error } = await supabase
        .from('ad_accounts')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        setMessage(`Failed to update account: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage('Account updated successfully.');
    } else {
      const { error } = await supabase
        .from('ad_accounts')
        .insert(payload);

      if (error) {
        setMessage(`Failed to add account: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage('Account added successfully.');
    }

    setSaving(false);
    setForm(emptyForm);
    setEditingId(null);
    await loadData();
  }

  async function deleteAccount(id: string) {
    const confirmed = window.confirm('Delete this account? This cannot be undone.');

    if (!confirmed) return;

    setMessage('');

    const { error } = await supabase
      .from('ad_accounts')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage(`Failed to delete account: ${error.message}`);
      return;
    }

    setMessage('Account deleted successfully.');
    await loadData();
  }

  return (
    <>
      <PageTitle
        title="Ad Accounts"
        subtitle="Manage ad accounts, agencies, buyers, budgets, statuses and replacement tracking. This page is now connected to Supabase."
      />

      <div className="grid grid-2">
        <div className="card">
          <h2>{editingId ? 'Edit Account' : 'Add Account'}</h2>

          <label>
            Account Name
            <input
              value={form.account_name}
              onChange={(e) => updateField('account_name', e.target.value)}
              placeholder="Brazil FB 01"
            />
          </label>

          <label>
            Account External ID
            <input
              value={form.account_external_id}
              onChange={(e) => updateField('account_external_id', e.target.value)}
              placeholder="act_123456789 or internal account ID"
            />
          </label>

          <label>
            Platform
            <select
              value={form.platform}
              onChange={(e) => updateField('platform', e.target.value)}
            >
              <option value="Facebook">Facebook</option>
              <option value="Google">Google</option>
              <option value="TikTok">TikTok</option>
              <option value="Native">Native</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            Agency
            <select
              value={form.agency_id}
              onChange={(e) => updateField('agency_id', e.target.value)}
            >
              <option value="">No agency selected</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Buyer
            <select
              value={form.buyer_id}
              onChange={(e) => updateField('buyer_id', e.target.value)}
            >
              <option value="">No buyer selected</option>
              {buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Business Manager
            <input
              value={form.business_manager}
              onChange={(e) => updateField('business_manager', e.target.value)}
              placeholder="BM name or ID"
            />
          </label>

          <label>
            Geo
            <input
              value={form.geo}
              onChange={(e) => updateField('geo', e.target.value)}
              placeholder="Brazil"
            />
          </label>

          <label>
            Vertical
            <input
              value={form.vertical}
              onChange={(e) => updateField('vertical', e.target.value)}
              placeholder="Investment / Sweepstakes / iGaming"
            />
          </label>

          <label>
            Status
            <select
              value={form.status}
              onChange={(e) => updateField('status', e.target.value)}
            >
              <option value="active">Active</option>
              <option value="warming">Warming</option>
              <option value="limited">Limited</option>
              <option value="disabled">Disabled</option>
              <option value="banned">Banned</option>
              <option value="paused">Paused</option>
            </select>
          </label>

          <label>
            Currency
            <input
              value={form.currency}
              onChange={(e) => updateField('currency', e.target.value)}
              placeholder="USD"
            />
          </label>

          <label>
            Timezone
            <input
              value={form.timezone}
              onChange={(e) => updateField('timezone', e.target.value)}
              placeholder="Europe/Nicosia"
            />
          </label>

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <label>
              Daily Limit
              <input
                type="number"
                value={form.daily_limit}
                onChange={(e) => updateField('daily_limit', e.target.value)}
              />
            </label>

            <label>
              Daily Budget
              <input
                type="number"
                value={form.daily_budget}
                onChange={(e) => updateField('daily_budget', e.target.value)}
              />
            </label>

            <label>
              Monthly Budget
              <input
                type="number"
                value={form.monthly_budget}
                onChange={(e) => updateField('monthly_budget', e.target.value)}
              />
            </label>

            <label>
              Spend Limit
              <input
                type="number"
                value={form.spend_limit}
                onChange={(e) => updateField('spend_limit', e.target.value)}
              />
            </label>
          </div>

          <label>
            Lifetime Spend
            <input
              type="number"
              value={form.lifetime_spend}
              onChange={(e) => updateField('lifetime_spend', e.target.value)}
            />
          </label>

          <label>
            Ban / Limit Date
            <input
              type="date"
              value={form.ban_date}
              onChange={(e) => updateField('ban_date', e.target.value)}
            />
          </label>

          <label>
            Ban / Limit Reason
            <input
              value={form.ban_reason}
              onChange={(e) => updateField('ban_reason', e.target.value)}
              placeholder="Payment issue / policy / disabled / limited"
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              checked={form.replacement_needed}
              onChange={(e) => updateField('replacement_needed', e.target.checked)}
              style={{ width: 'auto', marginTop: 0 }}
            />
            Replacement Needed
          </label>

          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Account quality, agency notes, limits, warnings..."
              rows={4}
            />
          </label>

          <br />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={saveAccount} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Account' : 'Add Account'}
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
          <h2>Account List</h2>

          {loading ? (
            <p className="muted">Loading accounts from Supabase...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>External ID</th>
                  <th>Platform</th>
                  <th>Agency</th>
                  <th>Buyer</th>
                  <th>Geo</th>
                  <th>Status</th>
                  <th>Daily Budget</th>
                  <th>Monthly Budget</th>
                  <th>Spend Limit</th>
                  <th>Replacement</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={12}>No accounts yet.</td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id}>
                      <td>{account.account_name}</td>
                      <td>{account.account_external_id || '-'}</td>
                      <td>{account.platform || '-'}</td>
                      <td>{getAgencyName(account.agency_id)}</td>
                      <td>{getBuyerName(account.buyer_id)}</td>
                      <td>{account.geo || '-'}</td>
                      <td>
                        <span className={`badge ${statusClass(account.status)}`}>
                          {account.status || 'active'}
                        </span>
                      </td>
                      <td>{money(account.daily_budget)}</td>
                      <td>{money(account.monthly_budget)}</td>
                      <td>{money(account.spend_limit)}</td>
                      <td>
                        {account.replacement_needed ? (
                          <span className="badge red">Needed</span>
                        ) : (
                          <span className="badge green">No</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            className="btn small"
                            type="button"
                            onClick={() => editAccount(account)}
                          >
                            Edit
                          </button>

                          <button
                            className="btn small danger"
                            type="button"
                            onClick={() => deleteAccount(account.id)}
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