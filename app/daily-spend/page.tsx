'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
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

type Offer = {
  id: string;
  name: string;
  geo: string;
};

type AdAccount = {
  id: string;
  account_name: string;
  agency_id: string | null;
  buyer_id: string | null;
  geo: string | null;
};

type DailySpend = {
  id: string;
  date: string;
  ad_account_id: string | null;
  buyer_id: string | null;
  agency_id: string | null;
  offer_id: string | null;
  geo: string;
  spend: number;
  leads: number;
  ftds: number;
  revenue: number;
  notes: string | null;
  created_at?: string;
};

type SpendForm = {
  date: string;
  ad_account_id: string;
  agency_id: string;
  buyer_id: string;
  offer_id: string;
  geo: string;
  spend: string;
  leads: string;
  ftds: string;
  revenue: string;
  notes: string;
};

type SortKey =
  | 'date'
  | 'account'
  | 'agency'
  | 'buyer'
  | 'geo'
  | 'offer'
  | 'spend'
  | 'leads'
  | 'cpl'
  | 'ftds'
  | 'cpa'
  | 'revenue'
  | 'profit'
  | 'roi';

type SortDirection = 'asc' | 'desc';

const today = new Date().toISOString().slice(0, 10);

const emptyForm: SpendForm = {
  date: today,
  ad_account_id: '',
  agency_id: '',
  buyer_id: '',
  offer_id: '',
  geo: '',
  spend: '0',
  leads: '0',
  ftds: '0',
  revenue: '0',
  notes: ''
};

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function pct(value: number) {
  return `${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })}%`;
}

function toNumber(value: string | number | null | undefined) {
  return Number(value || 0);
}

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadFile(filename: string, content: string, type = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  row.push(current.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);

  return rows;
}

export default function DailySpendPage() {
  const [entries, setEntries] = useState<DailySpend[]>([]);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [form, setForm] = useState<SpendForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  async function loadData() {
    setLoading(true);
    setMessage('');

    const [spendResult, accountsResult, agenciesResult, buyersResult, offersResult] = await Promise.all([
      supabase.from('daily_spend').select('*').order('date', { ascending: false }),
      supabase.from('ad_accounts').select('id, account_name, agency_id, buyer_id, geo').order('account_name', { ascending: true }),
      supabase.from('agencies').select('id, name').order('name', { ascending: true }),
      supabase.from('buyers').select('id, name').order('name', { ascending: true }),
      supabase.from('offers').select('id, name, geo').order('name', { ascending: true })
    ]);

    if (spendResult.error) {
      setMessage(`Failed to load daily spend: ${spendResult.error.message}`);
      setLoading(false);
      return;
    }

    if (accountsResult.error || agenciesResult.error || buyersResult.error || offersResult.error) {
      setMessage('Failed to load accounts, agencies, buyers or offers from Supabase.');
      setLoading(false);
      return;
    }

    setEntries((spendResult.data || []) as DailySpend[]);
    setAccounts((accountsResult.data || []) as AdAccount[]);
    setAgencies((agenciesResult.data || []) as Agency[]);
    setBuyers((buyersResult.data || []) as Buyer[]);
    setOffers((offersResult.data || []) as Offer[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function getAccountName(id: string | null) {
    return accounts.find((account) => account.id === id)?.account_name || '-';
  }

  function getAgencyName(id: string | null) {
    return agencies.find((agency) => agency.id === id)?.name || '-';
  }

  function getBuyerName(id: string | null) {
    return buyers.find((buyer) => buyer.id === id)?.name || '-';
  }

  function getOfferName(id: string | null) {
    return offers.find((offer) => offer.id === id)?.name || '-';
  }

  function updateField(field: keyof SpendForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleAccountChange(accountId: string) {
    const selectedAccount = accounts.find((account) => account.id === accountId);

    setForm((current) => ({
      ...current,
      ad_account_id: accountId,
      agency_id: selectedAccount?.agency_id || '',
      buyer_id: selectedAccount?.buyer_id || '',
      geo: selectedAccount?.geo || current.geo
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage('');
  }

  function editEntry(entry: DailySpend) {
    setEditingId(entry.id);
    setForm({
      date: entry.date,
      ad_account_id: entry.ad_account_id || '',
      agency_id: entry.agency_id || '',
      buyer_id: entry.buyer_id || '',
      offer_id: entry.offer_id || '',
      geo: entry.geo || '',
      spend: String(entry.spend || 0),
      leads: String(entry.leads || 0),
      ftds: String(entry.ftds || 0),
      revenue: String(entry.revenue || 0),
      notes: entry.notes || ''
    });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveEntry() {
    if (!form.date) {
      setMessage('Date is required.');
      return;
    }

    if (!form.ad_account_id) {
      setMessage('Ad account is required.');
      return;
    }

    if (!form.geo.trim()) {
      setMessage('Geo is required.');
      return;
    }

    setSaving(true);
    setMessage('');

    const payload = {
      date: form.date,
      ad_account_id: form.ad_account_id || null,
      agency_id: form.agency_id || null,
      buyer_id: form.buyer_id || null,
      offer_id: form.offer_id || null,
      geo: form.geo.trim(),
      spend: Number(form.spend || 0),
      leads: Number(form.leads || 0),
      ftds: Number(form.ftds || 0),
      revenue: Number(form.revenue || 0),
      notes: form.notes.trim() || null
    };

    if (editingId) {
      const { error } = await supabase
        .from('daily_spend')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        setMessage(`Failed to update entry: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage('Daily spend entry updated successfully.');
    } else {
      const { error } = await supabase
        .from('daily_spend')
        .insert(payload);

      if (error) {
        setMessage(`Failed to add entry: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage('Daily spend entry added successfully.');
    }

    setSaving(false);
    setForm(emptyForm);
    setEditingId(null);
    await loadData();
  }

  async function deleteEntry(id: string) {
    const confirmed = window.confirm('Delete this daily spend entry? This cannot be undone.');
    if (!confirmed) return;

    const { error } = await supabase
      .from('daily_spend')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage(`Failed to delete entry: ${error.message}`);
      return;
    }

    setMessage('Daily spend entry deleted successfully.');
    await loadData();
  }

  function setQuickRange(range: 'today' | 'yesterday' | 'last7' | 'month' | 'all') {
    const now = new Date();
    const yyyyMmDd = (date: Date) => date.toISOString().slice(0, 10);

    if (range === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (range === 'today') {
      const d = yyyyMmDd(now);
      setStartDate(d);
      setEndDate(d);
      return;
    }

    if (range === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const d = yyyyMmDd(yesterday);
      setStartDate(d);
      setEndDate(d);
      return;
    }

    if (range === 'last7') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      setStartDate(yyyyMmDd(start));
      setEndDate(yyyyMmDd(now));
      return;
    }

    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(yyyyMmDd(start));
    setEndDate(yyyyMmDd(now));
  }

  const visibleOffers = useMemo(() => {
    const sameGeoOffers = offers.filter((offer) =>
      form.geo ? offer.geo.toLowerCase() === form.geo.toLowerCase() : true
    );

    const otherOffers = offers.filter((offer) =>
      form.geo ? offer.geo.toLowerCase() !== form.geo.toLowerCase() : false
    );

    return [...sameGeoOffers, ...otherOffers];
  }, [offers, form.geo]);

  const filteredEntries = useMemo(() => {
    const filtered = entries.filter((entry) => {
      if (startDate && entry.date < startDate) return false;
      if (endDate && entry.date > endDate) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const cplA = a.leads > 0 ? a.spend / a.leads : 0;
      const cplB = b.leads > 0 ? b.spend / b.leads : 0;
      const cpaA = a.ftds > 0 ? a.spend / a.ftds : 0;
      const cpaB = b.ftds > 0 ? b.spend / b.ftds : 0;
      const profitA = a.revenue - a.spend;
      const profitB = b.revenue - b.spend;
      const roiA = a.spend > 0 ? (profitA / a.spend) * 100 : 0;
      const roiB = b.spend > 0 ? (profitB / b.spend) * 100 : 0;

      const values: Record<SortKey, [string | number, string | number]> = {
        date: [a.date, b.date],
        account: [getAccountName(a.ad_account_id), getAccountName(b.ad_account_id)],
        agency: [getAgencyName(a.agency_id), getAgencyName(b.agency_id)],
        buyer: [getBuyerName(a.buyer_id), getBuyerName(b.buyer_id)],
        geo: [a.geo, b.geo],
        offer: [getOfferName(a.offer_id), getOfferName(b.offer_id)],
        spend: [a.spend, b.spend],
        leads: [a.leads, b.leads],
        cpl: [cplA, cplB],
        ftds: [a.ftds, b.ftds],
        cpa: [cpaA, cpaB],
        revenue: [a.revenue, b.revenue],
        profit: [profitA, profitB],
        roi: [roiA, roiB]
      };

      const [valueA, valueB] = values[sortKey];

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }

      return sortDirection === 'asc'
        ? String(valueA).localeCompare(String(valueB))
        : String(valueB).localeCompare(String(valueA));
    });

    return sorted;
  }, [entries, startDate, endDate, sortKey, sortDirection, accounts, agencies, buyers, offers]);

  const totals = useMemo(() => {
    const spend = filteredEntries.reduce((sum, entry) => sum + toNumber(entry.spend), 0);
    const leads = filteredEntries.reduce((sum, entry) => sum + toNumber(entry.leads), 0);
    const ftds = filteredEntries.reduce((sum, entry) => sum + toNumber(entry.ftds), 0);
    const revenue = filteredEntries.reduce((sum, entry) => sum + toNumber(entry.revenue), 0);
    const profit = revenue - spend;

    return {
      spend,
      leads,
      ftds,
      revenue,
      profit,
      cpl: leads > 0 ? spend / leads : 0,
      cpa: ftds > 0 ? spend / ftds : 0,
      roi: spend > 0 ? (profit / spend) * 100 : 0
    };
  }, [filteredEntries]);

  function exportCsv(rows: DailySpend[], filename: string) {
    const header = [
      'date',
      'account',
      'agency',
      'buyer',
      'geo',
      'offer',
      'spend',
      'leads',
      'ftds',
      'revenue',
      'notes'
    ];

    const body = rows.map((entry) => [
      entry.date,
      getAccountName(entry.ad_account_id),
      getAgencyName(entry.agency_id),
      getBuyerName(entry.buyer_id),
      entry.geo,
      getOfferName(entry.offer_id),
      entry.spend,
      entry.leads,
      entry.ftds,
      entry.revenue,
      entry.notes || ''
    ]);

    const csv = [header, ...body]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');

    downloadFile(filename, csv);
  }

  function downloadTemplate() {
    const header = 'date,account,offer,spend,leads,ftds,revenue,notes';
    const sample = `${today},Example Account,Example Offer,100,10,1,250,Imported from CSV`;
    downloadFile('daily-spend-import-template.csv', `${header}\n${sample}`);
  }

  async function handleCsvImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const rows = parseCsv(text);
    const [header, ...body] = rows;

    if (!header) {
      setMessage('CSV file is empty.');
      return;
    }

    const index = (name: string) => header.findIndex((cell) => cell.toLowerCase() === name.toLowerCase());
    const dateIndex = index('date');
    const accountIndex = index('account');
    const offerIndex = index('offer');
    const spendIndex = index('spend');
    const leadsIndex = index('leads');
    const ftdsIndex = index('ftds');
    const revenueIndex = index('revenue');
    const notesIndex = index('notes');

    if (dateIndex === -1 || accountIndex === -1 || offerIndex === -1) {
      setMessage('CSV must include date, account and offer columns.');
      event.target.value = '';
      return;
    }

    const payload = body
      .map((row) => {
        const accountName = row[accountIndex];
        const offerName = row[offerIndex];
        const account = accounts.find((item) => item.account_name.toLowerCase() === accountName.toLowerCase());
        const offer = offers.find((item) => item.name.toLowerCase() === offerName.toLowerCase());

        if (!account || !offer) return null;

        return {
          date: row[dateIndex],
          ad_account_id: account.id,
          agency_id: account.agency_id,
          buyer_id: account.buyer_id,
          offer_id: offer.id,
          geo: account.geo || offer.geo,
          spend: Number(row[spendIndex] || 0),
          leads: Number(row[leadsIndex] || 0),
          ftds: Number(row[ftdsIndex] || 0),
          revenue: Number(row[revenueIndex] || 0),
          notes: notesIndex > -1 ? row[notesIndex] || null : null
        };
      })
      .filter(Boolean);

    if (payload.length === 0) {
      setMessage('No valid rows imported. Make sure account and offer names match existing CRM records.');
      event.target.value = '';
      return;
    }

    const { error } = await supabase.from('daily_spend').insert(payload);

    if (error) {
      setMessage(`CSV import failed: ${error.message}`);
      event.target.value = '';
      return;
    }

    setMessage(`Imported ${payload.length} daily spend rows.`);
    event.target.value = '';
    await loadData();
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection(key === 'date' ? 'desc' : 'asc');
  }

  function sortLabel(key: SortKey, label: string) {
    return `${label}${sortKey === key ? (sortDirection === 'asc' ? ' ↑' : ' ↓') : ''}`;
  }

  return (
    <>
      <PageTitle
        title="Daily Spend"
        subtitle="Track daily media buying spend, leads, FTDs, revenue and CPL. This page is now connected to Supabase."
      />

      <div className="grid grid-2">
        <div className="card">
          <h2>{editingId ? 'Edit Spend Entry' : 'Add Spend Entry'}</h2>

          <label>
            Date
            <input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} />
          </label>

          <label>
            Ad Account
            <select value={form.ad_account_id} onChange={(e) => handleAccountChange(e.target.value)}>
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.account_name}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <label>
              Agency
              <select value={form.agency_id} onChange={(e) => updateField('agency_id', e.target.value)}>
                <option value="">No agency</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>{agency.name}</option>
                ))}
              </select>
            </label>

            <label>
              Buyer
              <select value={form.buyer_id} onChange={(e) => updateField('buyer_id', e.target.value)}>
                <option value="">No buyer</option>
                {buyers.map((buyer) => (
                  <option key={buyer.id} value={buyer.id}>{buyer.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Geo
            <input value={form.geo} onChange={(e) => updateField('geo', e.target.value)} placeholder="Brazil" />
          </label>

          <label>
            Offer
            <select value={form.offer_id} onChange={(e) => updateField('offer_id', e.target.value)}>
              <option value="">Select offer</option>
              {visibleOffers.map((offer) => (
                <option key={offer.id} value={offer.id}>{offer.name} — {offer.geo}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <label>
              Spend
              <input type="number" value={form.spend} onChange={(e) => updateField('spend', e.target.value)} />
            </label>
            <label>
              Leads
              <input type="number" value={form.leads} onChange={(e) => updateField('leads', e.target.value)} />
            </label>
            <label>
              FTDs / Sales
              <input type="number" value={form.ftds} onChange={(e) => updateField('ftds', e.target.value)} />
            </label>
            <label>
              Revenue
              <input type="number" value={form.revenue} onChange={(e) => updateField('revenue', e.target.value)} />
            </label>
          </div>

          <label>
            Notes
            <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={4} />
          </label>

          <br />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={saveEntry} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Entry' : 'Add Entry'}
            </button>
            {editingId && <button className="btn secondary" type="button" onClick={resetForm}>Cancel Edit</button>}
          </div>

          {message && <p className="muted" style={{ marginTop: 12 }}>{message}</p>}
        </div>

        <div className="card">
          <h2>Filtered Totals</h2>
          <div className="grid grid-2">
            <div><p className="muted">Spend</p><h2>{money(totals.spend)}</h2></div>
            <div><p className="muted">Leads</p><h2>{totals.leads}</h2></div>
            <div><p className="muted">CPL</p><h2>{money(totals.cpl)}</h2></div>
            <div><p className="muted">FTDs</p><h2>{totals.ftds}</h2></div>
            <div><p className="muted">CPA</p><h2>{money(totals.cpa)}</h2></div>
            <div><p className="muted">Revenue</p><h2>{money(totals.revenue)}</h2></div>
            <div><p className="muted">Profit</p><h2 className={totals.profit >= 0 ? 'positive' : 'negative'}>{money(totals.profit)}</h2></div>
            <div><p className="muted">ROI</p><h2>{pct(totals.roi)}</h2></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Filters, Sorting and CSV</h2>

        <div className="filter-bar">
          <label>
            Start Date
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label>
            End Date
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <label>
            Sort By
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
              <option value="date">Date</option>
              <option value="account">Account</option>
              <option value="agency">Agency</option>
              <option value="buyer">Buyer</option>
              <option value="geo">Geo</option>
              <option value="offer">Offer</option>
              <option value="spend">Spend</option>
              <option value="leads">Leads</option>
              <option value="cpl">CPL</option>
              <option value="profit">Profit</option>
              <option value="roi">ROI</option>
            </select>
          </label>
          <label>
            Direction
            <select value={sortDirection} onChange={(e) => setSortDirection(e.target.value as SortDirection)}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn small secondary" type="button" onClick={() => setQuickRange('today')}>Today</button>
          <button className="btn small secondary" type="button" onClick={() => setQuickRange('yesterday')}>Yesterday</button>
          <button className="btn small secondary" type="button" onClick={() => setQuickRange('last7')}>Last 7 Days</button>
          <button className="btn small secondary" type="button" onClick={() => setQuickRange('month')}>This Month</button>
          <button className="btn small secondary" type="button" onClick={() => setQuickRange('all')}>All Time</button>
          <button className="btn small" type="button" onClick={() => exportCsv(filteredEntries, 'daily-spend-filtered.csv')}>Export Filtered CSV</button>
          <button className="btn small" type="button" onClick={() => exportCsv(entries, 'daily-spend-all.csv')}>Export All CSV</button>
          <button className="btn small secondary" type="button" onClick={downloadTemplate}>Download Template</button>
          <label className="btn small secondary" style={{ marginTop: 0 }}>
            Import CSV
            <input type="file" accept=".csv" onChange={handleCsvImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      <div className="card table-wrap" style={{ marginTop: 18 }}>
        <h2>Daily Spend Entries</h2>

        {loading ? (
          <p className="muted">Loading daily spend from Supabase...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('date')}>{sortLabel('date', 'Date')}</th>
                <th onClick={() => handleSort('account')}>{sortLabel('account', 'Account')}</th>
                <th onClick={() => handleSort('agency')}>{sortLabel('agency', 'Agency')}</th>
                <th onClick={() => handleSort('buyer')}>{sortLabel('buyer', 'Buyer')}</th>
                <th onClick={() => handleSort('geo')}>{sortLabel('geo', 'Geo')}</th>
                <th onClick={() => handleSort('offer')}>{sortLabel('offer', 'Offer')}</th>
                <th onClick={() => handleSort('spend')}>{sortLabel('spend', 'Spend')}</th>
                <th onClick={() => handleSort('leads')}>{sortLabel('leads', 'Leads')}</th>
                <th onClick={() => handleSort('cpl')}>{sortLabel('cpl', 'CPL')}</th>
                <th onClick={() => handleSort('ftds')}>{sortLabel('ftds', 'FTDs')}</th>
                <th onClick={() => handleSort('cpa')}>{sortLabel('cpa', 'CPA')}</th>
                <th onClick={() => handleSort('revenue')}>{sortLabel('revenue', 'Revenue')}</th>
                <th onClick={() => handleSort('profit')}>{sortLabel('profit', 'Profit')}</th>
                <th onClick={() => handleSort('roi')}>{sortLabel('roi', 'ROI')}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr><td colSpan={15}>No daily spend entries for this date range.</td></tr>
              ) : (
                filteredEntries.map((entry) => {
                  const cpl = entry.leads > 0 ? entry.spend / entry.leads : 0;
                  const cpa = entry.ftds > 0 ? entry.spend / entry.ftds : 0;
                  const profit = entry.revenue - entry.spend;
                  const roi = entry.spend > 0 ? (profit / entry.spend) * 100 : 0;

                  return (
                    <tr key={entry.id}>
                      <td>{entry.date}</td>
                      <td>{getAccountName(entry.ad_account_id)}</td>
                      <td>{getAgencyName(entry.agency_id)}</td>
                      <td>{getBuyerName(entry.buyer_id)}</td>
                      <td>{entry.geo}</td>
                      <td>{getOfferName(entry.offer_id)}</td>
                      <td>{money(entry.spend)}</td>
                      <td>{entry.leads}</td>
                      <td>{money(cpl)}</td>
                      <td>{entry.ftds}</td>
                      <td>{money(cpa)}</td>
                      <td>{money(entry.revenue)}</td>
                      <td className={profit >= 0 ? 'positive' : 'negative'}>{money(profit)}</td>
                      <td>{pct(roi)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="btn small" type="button" onClick={() => editEntry(entry)}>Edit</button>
                          <button className="btn small danger" type="button" onClick={() => deleteEntry(entry.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
