'use client';

import { useEffect, useMemo, useState } from 'react';
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
  agency_id: string | null;
  buyer_id: string | null;
  geo: string | null;
};

type TopUpRequest = {
  id: string;
  request_date: string;
  agency_id: string | null;
  buyer_id: string | null;
  ad_account_id: string | null;
  amount: number;
  currency: string | null;
  payment_method: string | null;
  payment_hash: string | null;
  priority: string | null;
  status: string | null;
  requested_by: string | null;
  approved_by: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at?: string;
};

type RequestForm = {
  request_date: string;
  agency_id: string;
  buyer_id: string;
  ad_account_id: string;
  amount: string;
  currency: string;
  payment_method: string;
  payment_hash: string;
  priority: string;
  status: string;
  requested_by: string;
  approved_by: string;
  paid_at: string;
  notes: string;
};

const today = new Date().toISOString().slice(0, 10);

const emptyForm: RequestForm = {
  request_date: today,
  agency_id: '',
  buyer_id: '',
  ad_account_id: '',
  amount: '0',
  currency: 'USD',
  payment_method: '',
  payment_hash: '',
  priority: 'normal',
  status: 'pending',
  requested_by: '',
  approved_by: '',
  paid_at: '',
  notes: ''
};

function money(value: number | null | undefined, currency = 'USD') {
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';

  return `${symbol}${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function statusClass(status: string | null | undefined) {
  const s = String(status || '').toLowerCase();

  if (s === 'approved' || s === 'paid' || s === 'completed') return 'green';
  if (s === 'pending' || s === 'review') return 'amber';
  if (s === 'rejected' || s === 'cancelled') return 'red';

  return 'blue';
}

function priorityClass(priority: string | null | undefined) {
  const p = String(priority || '').toLowerCase();

  if (p === 'urgent' || p === 'high') return 'red';
  if (p === 'normal') return 'blue';
  if (p === 'low') return 'green';

  return 'blue';
}

export default function TopUpRequestsPage() {
  const [requests, setRequests] = useState<TopUpRequest[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);

  const [form, setForm] = useState<RequestForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');

  async function loadData() {
    setLoading(true);
    setMessage('');

    const [requestsResult, agenciesResult, buyersResult, accountsResult] =
      await Promise.all([
        supabase
          .from('top_up_requests')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('agencies')
          .select('id, name')
          .order('name', { ascending: true }),

        supabase
          .from('buyers')
          .select('id, name')
          .order('name', { ascending: true }),

        supabase
          .from('ad_accounts')
          .select('id, account_name, agency_id, buyer_id, geo')
          .order('account_name', { ascending: true })
      ]);

    if (requestsResult.error) {
      setMessage(`Failed to load top up requests: ${requestsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (agenciesResult.error || buyersResult.error || accountsResult.error) {
      setMessage('Failed to load agencies, buyers or accounts.');
      setLoading(false);
      return;
    }

    setRequests((requestsResult.data || []) as TopUpRequest[]);
    setAgencies((agenciesResult.data || []) as Agency[]);
    setBuyers((buyersResult.data || []) as Buyer[]);
    setAccounts((accountsResult.data || []) as AdAccount[]);

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

  function getAccountName(id: string | null) {
    return accounts.find((account) => account.id === id)?.account_name || '-';
  }

  function updateField(field: keyof RequestForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleAccountChange(accountId: string) {
    const account = accounts.find((item) => item.id === accountId);

    setForm((current) => ({
      ...current,
      ad_account_id: accountId,
      agency_id: account?.agency_id || current.agency_id,
      buyer_id: account?.buyer_id || current.buyer_id
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage('');
  }

  function editRequest(request: TopUpRequest) {
    setEditingId(request.id);

    setForm({
      request_date: request.request_date || today,
      agency_id: request.agency_id || '',
      buyer_id: request.buyer_id || '',
      ad_account_id: request.ad_account_id || '',
      amount: String(request.amount || 0),
      currency: request.currency || 'USD',
      payment_method: request.payment_method || '',
      payment_hash: request.payment_hash || '',
      priority: request.priority || 'normal',
      status: request.status || 'pending',
      requested_by: request.requested_by || '',
      approved_by: request.approved_by || '',
      paid_at: request.paid_at ? request.paid_at.slice(0, 16) : '',
      notes: request.notes || ''
    });

    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveRequest() {
    if (!form.request_date) {
      setMessage('Request date is required.');
      return;
    }

    if (Number(form.amount || 0) <= 0) {
      setMessage('Amount must be greater than 0.');
      return;
    }

    setSaving(true);
    setMessage('');

    const payload = {
      request_date: form.request_date,
      agency_id: form.agency_id || null,
      buyer_id: form.buyer_id || null,
      ad_account_id: form.ad_account_id || null,
      amount: Number(form.amount || 0),
      currency: form.currency || 'USD',
      payment_method: form.payment_method.trim() || null,
      payment_hash: form.payment_hash.trim() || null,
      priority: form.priority || 'normal',
      status: form.status || 'pending',
      requested_by: form.requested_by.trim() || null,
      approved_by: form.approved_by.trim() || null,
      paid_at: form.paid_at ? new Date(form.paid_at).toISOString() : null,
      notes: form.notes.trim() || null
    };

    if (editingId) {
      const { error } = await supabase
        .from('top_up_requests')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        setMessage(`Failed to update request: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage('Top up request updated successfully.');
    } else {
      const { error } = await supabase
        .from('top_up_requests')
        .insert(payload);

      if (error) {
        setMessage(`Failed to create request: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage('Top up request created successfully.');
    }

    setSaving(false);
    setForm(emptyForm);
    setEditingId(null);
    await loadData();
  }

  async function updateStatus(id: string, status: string) {
    const payload: {
      status: string;
      paid_at?: string;
      payment_hash?: string | null;
    } = {
      status
    };

    if (status === 'paid') {
      const hash = window.prompt('Add payment hash / transaction ID:');

      if (!hash || !hash.trim()) {
        setMessage('Payment hash is required when marking a request as paid.');
        return;
      }

      payload.paid_at = new Date().toISOString();
      payload.payment_hash = hash.trim();
    }

    const { error } = await supabase
      .from('top_up_requests')
      .update(payload)
      .eq('id', id);

    if (error) {
      setMessage(`Failed to update status: ${error.message}`);
      return;
    }

    setMessage(`Request marked as ${status}.`);
    await loadData();
  }

  async function deleteRequest(id: string) {
    const confirmed = window.confirm('Delete this top up request?');

    if (!confirmed) return;

    const { error } = await supabase
      .from('top_up_requests')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage(`Failed to delete request: ${error.message}`);
      return;
    }

    setMessage('Top up request deleted successfully.');
    await loadData();
  }

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;

    return requests.filter((request) => request.status === statusFilter);
  }, [requests, statusFilter]);

  const totals = useMemo(() => {
    const pending = requests
      .filter((request) => request.status === 'pending')
      .reduce((sum, request) => sum + Number(request.amount || 0), 0);

    const approved = requests
      .filter((request) => request.status === 'approved')
      .reduce((sum, request) => sum + Number(request.amount || 0), 0);

    const paid = requests
      .filter((request) => request.status === 'paid')
      .reduce((sum, request) => sum + Number(request.amount || 0), 0);

    const total = requests.reduce((sum, request) => sum + Number(request.amount || 0), 0);

    return {
      total,
      pending,
      approved,
      paid,
      count: requests.length
    };
  }, [requests]);

  return (
    <>
      <PageTitle
        title="Top Up Requests"
        subtitle="Track budget top up requests for agencies, buyers and ad accounts."
      />

      <section className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="card metric-card">
          <p className="metric-label">Total Requested</p>
          <h2 className="metric-value">{money(totals.total)}</h2>
          <p className="metric-sub">{totals.count} total requests</p>
        </div>

        <div className="card metric-card">
          <p className="metric-label">Pending</p>
          <h2 className="metric-value">{money(totals.pending)}</h2>
          <p className="metric-sub">Waiting for approval</p>
        </div>

        <div className="card metric-card">
          <p className="metric-label">Approved</p>
          <h2 className="metric-value">{money(totals.approved)}</h2>
          <p className="metric-sub">Approved but not paid</p>
        </div>

        <div className="card metric-card">
          <p className="metric-label">Paid</p>
          <h2 className="metric-value">{money(totals.paid)}</h2>
          <p className="metric-sub">Completed top ups</p>
        </div>
      </section>

      <div className="grid grid-2">
        <div className="card">
          <h2>{editingId ? 'Edit Top Up Request' : 'Create Top Up Request'}</h2>

          <label>
            Request Date
            <input
              type="date"
              value={form.request_date}
              onChange={(e) => updateField('request_date', e.target.value)}
            />
          </label>

          <label>
            Ad Account
            <select
              value={form.ad_account_id}
              onChange={(e) => handleAccountChange(e.target.value)}
            >
              <option value="">No account selected</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name}
                  {account.geo ? ` — ${account.geo}` : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <label>
              Agency
              <select
                value={form.agency_id}
                onChange={(e) => updateField('agency_id', e.target.value)}
              >
                <option value="">No agency</option>
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
                <option value="">No buyer</option>
                {buyers.map((buyer) => (
                  <option key={buyer.id} value={buyer.id}>
                    {buyer.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <label>
              Amount
              <input
                type="number"
                value={form.amount}
                onChange={(e) => updateField('amount', e.target.value)}
              />
            </label>

            <label>
              Currency
              <select
                value={form.currency}
                onChange={(e) => updateField('currency', e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </label>
          </div>

          <label>
            Payment Method
            <input
              value={form.payment_method}
              onChange={(e) => updateField('payment_method', e.target.value)}
              placeholder="Bank transfer / Card / Wise / Crypto"
            />
          </label>

          <label>
            Payment Hash / Transaction ID
            <input
              value={form.payment_hash}
              onChange={(e) => updateField('payment_hash', e.target.value)}
              placeholder="TX hash, bank reference, Wise transfer ID..."
            />
          </label>

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <label>
              Priority
              <select
                value={form.priority}
                onChange={(e) => updateField('priority', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>

            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <label>
              Requested By
              <input
                value={form.requested_by}
                onChange={(e) => updateField('requested_by', e.target.value)}
                placeholder="Name"
              />
            </label>

            <label>
              Approved By
              <input
                value={form.approved_by}
                onChange={(e) => updateField('approved_by', e.target.value)}
                placeholder="Name"
              />
            </label>
          </div>

          <label>
            Paid At
            <input
              type="datetime-local"
              value={form.paid_at}
              onChange={(e) => updateField('paid_at', e.target.value)}
            />
          </label>

          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={4}
              placeholder="Reason, urgency, payment details, approval notes..."
            />
          </label>

          <br />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={saveRequest} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Request' : 'Create Request'}
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
          <h2>Requests</h2>

          <label>
            Status Filter
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <br />

          {loading ? (
            <p className="muted">Loading top up requests from Supabase...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Agency</th>
                  <th>Buyer</th>
                  <th>Amount</th>
                  <th>Payment Hash</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9}>No top up requests yet.</td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.request_date}</td>
                      <td>{getAccountName(request.ad_account_id)}</td>
                      <td>{getAgencyName(request.agency_id)}</td>
                      <td>{getBuyerName(request.buyer_id)}</td>
                      <td>{money(request.amount, request.currency || 'USD')}</td>
                      <td>{request.payment_hash || '-'}</td>
                      <td>
                        <span className={`badge ${priorityClass(request.priority)}`}>
                          {request.priority || 'normal'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statusClass(request.status)}`}>
                          {request.status || 'pending'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            className="btn small"
                            type="button"
                            onClick={() => editRequest(request)}
                          >
                            Edit
                          </button>

                          {request.status !== 'approved' && (
                            <button
                              className="btn small secondary"
                              type="button"
                              onClick={() => updateStatus(request.id, 'approved')}
                            >
                              Approve
                            </button>
                          )}

                          {request.status !== 'paid' && (
                            <button
                              className="btn small"
                              type="button"
                              onClick={() => updateStatus(request.id, 'paid')}
                            >
                              Paid
                            </button>
                          )}

                          {request.status !== 'rejected' && (
                            <button
                              className="btn small danger"
                              type="button"
                              onClick={() => updateStatus(request.id, 'rejected')}
                            >
                              Reject
                            </button>
                          )}

                          <button
                            className="btn small danger"
                            type="button"
                            onClick={() => deleteRequest(request.id)}
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