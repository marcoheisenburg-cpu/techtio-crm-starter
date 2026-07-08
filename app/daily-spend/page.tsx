'use client';

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { DailySpend, money, pct, statusClass, totals } from '@/lib/mock-data';
import { useCrmDatabase } from '@/lib/local-db';

const today = new Date().toISOString().slice(0, 10);
const monthStart = today.slice(0, 8) + '01';

const csvHeaders = ['date', 'buyer', 'agency', 'account', 'geo', 'offer', 'spend', 'leads', 'ftds', 'revenue', 'status'] as const;

type SortKey = keyof Pick<DailySpend, 'date' | 'buyer' | 'agency' | 'account' | 'geo' | 'offer' | 'spend' | 'leads' | 'ftds' | 'revenue' | 'status'> | 'cpl' | 'profit';
type SortDirection = 'asc' | 'desc';

type SpendRowWithIndex = DailySpend & {
  originalIndex: number;
  cpl: number;
  profit: number;
};

type SpendForm = {
  date: string;
  account: string;
  agency: string;
  buyer: string;
  geo: string;
  offer: string;
  spend: string;
  leads: string;
  ftds: string;
  revenue: string;
};

const emptyForm: SpendForm = {
  date: today,
  account: '',
  agency: '',
  buyer: '',
  geo: '',
  offer: '',
  spend: '',
  leads: '',
  ftds: '',
  revenue: ''
};

function sortValue(row: SpendRowWithIndex, key: SortKey) {
  if (key === 'cpl') return row.cpl;
  if (key === 'profit') return row.profit;
  return row[key];
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function escapeCsvValue(value: string | number) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(rows: DailySpend[]) {
  const lines = [csvHeaders.join(',')];

  rows.forEach((row) => {
    lines.push(csvHeaders.map((header) => escapeCsvValue(row[header])).join(','));
  });

  return lines.join('\n');
}

function downloadTextFile(filename: string, content: string, type = 'text/csv;charset=utf-8;') {
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

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseSpendCsv(csv: string) {
  const lines = csv
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    return {
      date: row.date,
      buyer: row.buyer,
      agency: row.agency,
      account: row.account,
      geo: row.geo,
      offer: row.offer,
      spend: Number(row.spend || 0),
      leads: Number(row.leads || 0),
      ftds: Number(row.ftds || 0),
      revenue: Number(row.revenue || 0),
      status: row.status as DailySpend['status']
    };
  });
}

function SortButton({
  label,
  sortKey,
  activeKey,
  direction,
  onSort
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      style={{
        border: 0,
        background: 'transparent',
        padding: 0,
        color: 'inherit',
        font: 'inherit',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '.04em',
        cursor: 'pointer'
      }}
      title={`Sort by ${label}`}
    >
      {label} {active ? (direction === 'asc' ? '↑' : '↓') : ''}
    </button>
  );
}

export default function DailySpendPage() {
  const { database, addDailySpend, importDailySpend, deleteDailySpend } = useCrmDatabase();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<SpendForm>(emptyForm);
  const [saved, setSaved] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const selectedAccount = database.accounts.find((account) => account.name === form.account);

  const availableOffers = useMemo(() => {
    const matchingGeoOffers = database.offers.filter((offer) => !form.geo || offer.geo === form.geo);
    return matchingGeoOffers.length ? matchingGeoOffers : database.offers;
  }, [database.offers, form.geo]);

  const savedBuyers = useMemo(() => unique(database.buyerBudgets.map((b) => b.buyer)), [database.buyerBudgets]);
  const savedAgencies = useMemo(() => unique(database.agencies.map((a) => a.name)), [database.agencies]);
  const savedGeos = useMemo(() => unique([
    ...database.accounts.map((a) => a.geo),
    ...database.offers.map((o) => o.geo),
    ...database.dailySpend.map((r) => r.geo)
  ]), [database.accounts, database.offers, database.dailySpend]);

  function updateField(field: keyof SpendForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function selectAccount(accountName: string) {
    const account = database.accounts.find((row) => row.name === accountName);

    if (!account) {
      setForm((current) => ({
        ...current,
        account: accountName
      }));
      return;
    }

    const firstMatchingOffer = database.offers.find((offer) => offer.geo === account.geo);

    setForm((current) => ({
      ...current,
      account: account.name,
      agency: account.agency,
      buyer: account.buyer,
      geo: account.geo,
      offer: current.offer && database.offers.some((offer) => offer.name === current.offer && offer.geo === account.geo)
        ? current.offer
        : firstMatchingOffer?.name || current.offer
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    addDailySpend({
      date: form.date || today,
      buyer: form.buyer.trim(),
      agency: form.agency.trim(),
      account: form.account.trim(),
      geo: form.geo.trim(),
      offer: form.offer.trim(),
      spend: Number(form.spend || 0),
      leads: Number(form.leads || 0),
      ftds: Number(form.ftds || 0),
      revenue: Number(form.revenue || 0)
    });

    setForm(emptyForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === 'date' ? 'desc' : 'asc');
  }

  function setLastDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1));
    setStartDate(date.toISOString().slice(0, 10));
    setEndDate(today);
  }

  const filteredRows = useMemo<SpendRowWithIndex[]>(() => {
    return database.dailySpend
      .map((row, originalIndex) => ({
        ...row,
        originalIndex,
        cpl: row.leads ? row.spend / row.leads : 0,
        profit: row.revenue - row.spend
      }))
      .filter((row) => {
        if (startDate && row.date < startDate) return false;
        if (endDate && row.date > endDate) return false;
        return true;
      })
      .sort((a, b) => {
        const valueA = sortValue(a, sortKey);
        const valueB = sortValue(b, sortKey);

        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }

        const comparison = String(valueA).localeCompare(String(valueB));
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [database.dailySpend, startDate, endDate, sortKey, sortDirection]);

  const filteredTotals = totals(filteredRows);

  function exportFilteredCsv() {
    const rows = filteredRows.map(({ originalIndex, cpl, profit, ...row }) => row);
    downloadTextFile(`daily-spend-${startDate || 'all'}-to-${endDate || 'all'}.csv`, rowsToCsv(rows));
  }

  function exportAllCsv() {
    downloadTextFile(`daily-spend-all-${today}.csv`, rowsToCsv(database.dailySpend));
  }

  function downloadTemplate() {
    const template = [
      csvHeaders.join(','),
      '2026-07-08,Marco,Agency A,FB-BR-221,Brazil,Brazil WBS,500,40,3,900,Profitable'
    ].join('\n');

    downloadTextFile('daily-spend-import-template.csv', template);
  }

  function handleCsvImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const rows = parseSpendCsv(String(reader.result || ''));

        if (!rows.length) {
          setImportMessage('No rows found in the CSV file.');
          return;
        }

        importDailySpend(rows);
        setImportMessage(`Imported ${rows.length} daily spend rows.`);
      } catch {
        setImportMessage('Could not import CSV. Please check the format and try again.');
      } finally {
        if (importInputRef.current) importInputRef.current.value = '';
        setTimeout(() => setImportMessage(''), 4000);
      }
    };

    reader.readAsText(file);
  }

  return (
    <>
      <PageTitle title="Daily Spend" subtitle="Select an account and the CRM will auto-fill the agency, buyer and geo. Then filter, sort, export or import spend data." />

      <div className="card" style={{ marginBottom: 18 }}>
        <h2>New Spend Entry</h2>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Date
            <input value={form.date} onChange={(e) => updateField('date', e.target.value)} type="date" required />
          </label>

          <label>
            Ad Account
            <select value={form.account} onChange={(e) => selectAccount(e.target.value)} required>
              <option value="">Select account</option>
              {database.accounts.map((account, index) => (
                <option key={`${account.name}-${index}`} value={account.name}>
                  {account.name} · {account.geo} · {account.buyer}
                </option>
              ))}
            </select>
          </label>

          <label>
            Agency
            <input list="daily-spend-agency-list" value={form.agency} onChange={(e) => updateField('agency', e.target.value)} placeholder="Auto-filled from account" required />
            <datalist id="daily-spend-agency-list">{savedAgencies.map((agency) => <option key={agency} value={agency} />)}</datalist>
          </label>

          <label>
            Buyer
            <input list="daily-spend-buyer-list" value={form.buyer} onChange={(e) => updateField('buyer', e.target.value)} placeholder="Auto-filled from account" required />
            <datalist id="daily-spend-buyer-list">{savedBuyers.map((buyer) => <option key={buyer} value={buyer} />)}</datalist>
          </label>

          <label>
            Geo
            <input list="daily-spend-geo-list" value={form.geo} onChange={(e) => updateField('geo', e.target.value)} placeholder="Auto-filled from account" required />
            <datalist id="daily-spend-geo-list">{savedGeos.map((geo) => <option key={geo} value={geo} />)}</datalist>
          </label>

          <label>
            Offer
            <select value={form.offer} onChange={(e) => updateField('offer', e.target.value)} required>
              <option value="">Select offer</option>
              {availableOffers.map((offer, index) => (
                <option key={`${offer.name}-${index}`} value={offer.name}>
                  {offer.name} · {offer.geo}
                </option>
              ))}
            </select>
          </label>

          <label>Spend<input value={form.spend} onChange={(e) => updateField('spend', e.target.value)} type="number" min="0" step="0.01" placeholder="500" required /></label>
          <label>Leads<input value={form.leads} onChange={(e) => updateField('leads', e.target.value)} type="number" min="0" step="1" placeholder="40" required /></label>
          <label>FTDs<input value={form.ftds} onChange={(e) => updateField('ftds', e.target.value)} type="number" min="0" step="1" placeholder="3" required /></label>
          <label>Revenue<input value={form.revenue} onChange={(e) => updateField('revenue', e.target.value)} type="number" min="0" step="0.01" placeholder="900" required /></label>

          <div className="actions" style={{ alignSelf: 'end' }}>
            <button className="btn" type="submit">Save Entry</button>
          </div>
        </form>

        {selectedAccount && (
          <p className="muted" style={{ marginTop: 12 }}>
            Selected account: <strong>{selectedAccount.name}</strong> from <strong>{selectedAccount.agency}</strong>, handled by <strong>{selectedAccount.buyer}</strong> for <strong>{selectedAccount.geo}</strong>.
          </p>
        )}

        {saved && <p className="positive" style={{ marginTop: 12 }}>Spend entry saved.</p>}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h2>Import / Export Daily Spend</h2>
        <p className="muted">Export the current filtered view or import spend rows from a CSV file.</p>

        <div className="actions" style={{ flexWrap: 'wrap' }}>
          <button className="btn" type="button" onClick={exportFilteredCsv}>Export Filtered CSV</button>
          <button className="btn secondary" type="button" onClick={exportAllCsv}>Export All CSV</button>
          <button className="btn secondary" type="button" onClick={downloadTemplate}>Download Import Template</button>
          <button className="btn secondary" type="button" onClick={() => importInputRef.current?.click()}>Import CSV</button>
          <input ref={importInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvImport} style={{ display: 'none' }} />
        </div>

        {importMessage && <p className="positive" style={{ marginTop: 12 }}>{importMessage}</p>}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h2>Date Range & Totals</h2>

        <div className="form">
          <label>
            Start Date
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>

          <label>
            End Date
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>

          <label>
            Sort By
            <select value={sortKey} onChange={(event) => handleSort(event.target.value as SortKey)}>
              <option value="date">Date</option>
              <option value="buyer">Buyer</option>
              <option value="agency">Agency</option>
              <option value="account">Account</option>
              <option value="geo">Geo</option>
              <option value="offer">Offer</option>
              <option value="spend">Spend</option>
              <option value="leads">Leads</option>
              <option value="cpl">CPL</option>
              <option value="ftds">FTDs</option>
              <option value="revenue">Revenue</option>
              <option value="profit">Profit</option>
              <option value="status">Status</option>
            </select>
          </label>

          <label>
            Direction
            <select value={sortDirection} onChange={(event) => setSortDirection(event.target.value as SortDirection)}>
              <option value="desc">High to Low / Newest First</option>
              <option value="asc">Low to High / Oldest First</option>
            </select>
          </label>
        </div>

        <div className="actions" style={{ marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn secondary" type="button" onClick={() => { setStartDate(today); setEndDate(today); }}>Today</button>
          <button className="btn secondary" type="button" onClick={() => setLastDays(7)}>Last 7 Days</button>
          <button className="btn secondary" type="button" onClick={() => { setStartDate(monthStart); setEndDate(today); }}>This Month</button>
          <button className="btn secondary" type="button" onClick={() => { setStartDate(''); setEndDate(''); }}>All Time</button>
        </div>

        <section className="grid grid-4" style={{ marginTop: 18 }}>
          <div><div className="metric-label">Filtered Spend</div><div className="metric-value">{money(filteredTotals.spend)}</div></div>
          <div><div className="metric-label">Filtered Leads</div><div className="metric-value">{filteredTotals.leads}</div><div className="metric-sub">CPL {money(filteredTotals.cpl)}</div></div>
          <div><div className="metric-label">Filtered FTDs</div><div className="metric-value">{filteredTotals.ftds}</div><div className="metric-sub">CPA {money(filteredTotals.cpa)}</div></div>
          <div><div className="metric-label">Filtered Profit / ROI</div><div className="metric-value">{money(filteredTotals.profit)}</div><div className="metric-sub">{pct(filteredTotals.roi)}</div></div>
        </section>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th><SortButton label="Date" sortKey="date" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
              <th><SortButton label="Buyer" sortKey="buyer" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
              <th><SortButton label="Agency" sortKey="agency" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
              <th><SortButton label="Account" sortKey="account" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
              <th><SortButton label="Geo" sortKey="geo" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
              <th><SortButton label="Offer" sortKey="offer" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
              <th><SortButton label="Spend" sortKey="spend" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
              <th><SortButton label="Leads" sortKey="leads" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
              <th><SortButton label="CPL" sortKey="cpl" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
              <th><SortButton label="FTDs" sortKey="ftds" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
              <th><SortButton label="Revenue" sortKey="revenue" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
              <th><SortButton label="Profit" sortKey="profit" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
              <th><SortButton label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={`${r.date}-${r.account}-${r.offer}-${r.originalIndex}`}>
                <td>{r.date}</td>
                <td>{r.buyer}</td>
                <td>{r.agency}</td>
                <td>{r.account}</td>
                <td>{r.geo}</td>
                <td>{r.offer}</td>
                <td>{money(r.spend)}</td>
                <td>{r.leads}</td>
                <td>{money(r.cpl)}</td>
                <td>{r.ftds}</td>
                <td>{money(r.revenue)}</td>
                <td className={r.profit >= 0 ? 'positive' : 'negative'}>{money(r.profit)}</td>
                <td><span className={`badge ${statusClass(r.status)}`}>{r.status}</span></td>
                <td><button className="btn secondary" type="button" onClick={() => deleteDailySpend(r.originalIndex)}>Delete</button></td>
              </tr>
            ))}

            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={14} className="muted">No spend entries found for this date range.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
