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

type Offer = {
  id: string;
  name: string;
  geo: string;
  brand: string | null;
  vertical: string | null;
};

type AdAccount = {
  id: string;
  account_name: string;
  agency_id: string | null;
  buyer_id: string | null;
  geo: string | null;
  status: string | null;
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
};

type ReportRow = {
  name: string;
  spend: number;
  leads: number;
  ftds: number;
  revenue: number;
  cpl: number;
  cpa: number;
  profit: number;
  roi: number;
};

type ReportType = 'geo' | 'buyer' | 'agency' | 'offer' | 'account';

const today = new Date().toISOString().slice(0, 10);

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

function yyyyMmDd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? '');

  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [dailySpend, setDailySpend] = useState<DailySpend[]>([]);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState<ReportType>('geo');

  async function loadReportsData() {
    setLoading(true);
    setMessage('');

    const [spendResult, accountsResult, agenciesResult, buyersResult, offersResult] =
      await Promise.all([
        supabase.from('daily_spend').select('*').order('date', { ascending: false }),
        supabase.from('ad_accounts').select('id, account_name, agency_id, buyer_id, geo, status'),
        supabase.from('agencies').select('id, name'),
        supabase.from('buyers').select('id, name'),
        supabase.from('offers').select('id, name, geo, brand, vertical')
      ]);

    if (spendResult.error) {
      setMessage(`Failed to load daily spend: ${spendResult.error.message}`);
      setLoading(false);
      return;
    }

    if (accountsResult.error || agenciesResult.error || buyersResult.error || offersResult.error) {
      setMessage('Failed to load report reference data.');
      setLoading(false);
      return;
    }

    setDailySpend((spendResult.data || []) as DailySpend[]);
    setAccounts((accountsResult.data || []) as AdAccount[]);
    setAgencies((agenciesResult.data || []) as Agency[]);
    setBuyers((buyersResult.data || []) as Buyer[]);
    setOffers((offersResult.data || []) as Offer[]);
    setLoading(false);
  }

  useEffect(() => {
    loadReportsData();
  }, []);

  function getAccountName(id: string | null) {
    return accounts.find((account) => account.id === id)?.account_name || 'No Account';
  }

  function getAgencyName(id: string | null) {
    return agencies.find((agency) => agency.id === id)?.name || 'No Agency';
  }

  function getBuyerName(id: string | null) {
    return buyers.find((buyer) => buyer.id === id)?.name || 'No Buyer';
  }

  function getOfferName(id: string | null) {
    return offers.find((offer) => offer.id === id)?.name || 'No Offer';
  }

  function setQuickRange(range: 'today' | 'yesterday' | 'last7' | 'month' | 'all') {
    const now = new Date();

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

  const filteredSpend = useMemo(() => {
    return dailySpend.filter((entry) => {
      if (startDate && entry.date < startDate) return false;
      if (endDate && entry.date > endDate) return false;
      return true;
    });
  }, [dailySpend, startDate, endDate]);

  const totals = useMemo(() => {
    const spend = filteredSpend.reduce((sum, entry) => sum + Number(entry.spend || 0), 0);
    const leads = filteredSpend.reduce((sum, entry) => sum + Number(entry.leads || 0), 0);
    const ftds = filteredSpend.reduce((sum, entry) => sum + Number(entry.ftds || 0), 0);
    const revenue = filteredSpend.reduce((sum, entry) => sum + Number(entry.revenue || 0), 0);
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
  }, [filteredSpend]);

  const reportRows = useMemo(() => {
    const map = new Map<string, ReportRow>();

    filteredSpend.forEach((entry) => {
      let name = entry.geo || 'No Geo';

      if (reportType === 'buyer') {
        name = getBuyerName(entry.buyer_id);
      }

      if (reportType === 'agency') {
        name = getAgencyName(entry.agency_id);
      }

      if (reportType === 'offer') {
        name = getOfferName(entry.offer_id);
      }

      if (reportType === 'account') {
        name = getAccountName(entry.ad_account_id);
      }

      const existing = map.get(name) || {
        name,
        spend: 0,
        leads: 0,
        ftds: 0,
        revenue: 0,
        cpl: 0,
        cpa: 0,
        profit: 0,
        roi: 0
      };

      existing.spend += Number(entry.spend || 0);
      existing.leads += Number(entry.leads || 0);
      existing.ftds += Number(entry.ftds || 0);
      existing.revenue += Number(entry.revenue || 0);

      map.set(name, existing);
    });

    return Array.from(map.values())
      .map((row) => {
        const profit = row.revenue - row.spend;

        return {
          ...row,
          cpl: row.leads > 0 ? row.spend / row.leads : 0,
          cpa: row.ftds > 0 ? row.spend / row.ftds : 0,
          profit,
          roi: row.spend > 0 ? (profit / row.spend) * 100 : 0
        };
      })
      .sort((a, b) => b.spend - a.spend);
  }, [filteredSpend, reportType, accounts, agencies, buyers, offers]);

  const bestRows = [...reportRows]
    .filter((row) => row.spend > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  const worstRows = [...reportRows]
    .filter((row) => row.spend > 0)
    .sort((a, b) => a.profit - b.profit)
    .slice(0, 5);

  function exportReportCsv() {
    const header = [
      'name',
      'spend',
      'leads',
      'cpl',
      'ftds',
      'cpa',
      'revenue',
      'profit',
      'roi'
    ];

    const body = reportRows.map((row) => [
      row.name,
      row.spend,
      row.leads,
      row.cpl,
      row.ftds,
      row.cpa,
      row.revenue,
      row.profit,
      row.roi
    ]);

    const csv = [header, ...body]
      .map((row) => row.map(csvEscape).join(','))
      .join('\n');

    downloadFile(`${reportType}-report.csv`, csv);
  }

  function reportTitle() {
    if (reportType === 'geo') return 'Geo Report';
    if (reportType === 'buyer') return 'Buyer Report';
    if (reportType === 'agency') return 'Agency Report';
    if (reportType === 'offer') return 'Offer Report';
    return 'Account Report';
  }

  return (
    <>
      <PageTitle
        title="Reports"
        subtitle="Supabase-powered performance reports by geo, buyer, agency, offer and account."
      />

      <div className="card" style={{ marginBottom: 18 }}>
        <h2>Report Filters</h2>

        <div className="filter-bar">
          <label>
            Report Type
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
            >
              <option value="geo">Geo</option>
              <option value="buyer">Buyer</option>
              <option value="agency">Agency</option>
              <option value="offer">Offer</option>
              <option value="account">Account</option>
            </select>
          </label>

          <label>
            Start Date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label>
            End Date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>

          <button className="btn small secondary" type="button" onClick={() => setQuickRange('today')}>
            Today
          </button>

          <button className="btn small secondary" type="button" onClick={() => setQuickRange('yesterday')}>
            Yesterday
          </button>

          <button className="btn small secondary" type="button" onClick={() => setQuickRange('last7')}>
            Last 7 Days
          </button>

          <button className="btn small secondary" type="button" onClick={() => setQuickRange('month')}>
            This Month
          </button>

          <button className="btn small secondary" type="button" onClick={() => setQuickRange('all')}>
            All Time
          </button>

          <button className="btn small" type="button" onClick={loadReportsData}>
            Refresh
          </button>

          <button className="btn small" type="button" onClick={exportReportCsv}>
            Export CSV
          </button>
        </div>

        {message && <p className="negative">{message}</p>}
      </div>

      {loading ? (
        <div className="card">
          <h2>Loading reports from Supabase...</h2>
        </div>
      ) : (
        <>
          <section className="grid grid-4">
            <div className="card metric-card">
              <p className="metric-label">Total Spend</p>
              <h2 className="metric-value">{money(totals.spend)}</h2>
              <p className="metric-sub">Selected date range</p>
            </div>

            <div className="card metric-card">
              <p className="metric-label">Leads</p>
              <h2 className="metric-value">{totals.leads}</h2>
              <p className="metric-sub">Average CPL {money(totals.cpl)}</p>
            </div>

            <div className="card metric-card">
              <p className="metric-label">FTDs / Sales</p>
              <h2 className="metric-value">{totals.ftds}</h2>
              <p className="metric-sub">Average CPA {money(totals.cpa)}</p>
            </div>

            <div className="card metric-card">
              <p className="metric-label">Profit / ROI</p>
              <h2 className="metric-value">{money(totals.profit)}</h2>
              <p className="metric-sub">{pct(totals.roi)}</p>
            </div>
          </section>

          <section className="grid grid-2" style={{ marginTop: 18 }}>
            <div className="card table-wrap">
              <h2>Top Performers</h2>

              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Spend</th>
                    <th>Leads</th>
                    <th>CPL</th>
                    <th>Profit</th>
                    <th>ROI</th>
                  </tr>
                </thead>

                <tbody>
                  {bestRows.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No data yet.</td>
                    </tr>
                  ) : (
                    bestRows.map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        <td>{money(row.spend)}</td>
                        <td>{row.leads}</td>
                        <td>{money(row.cpl)}</td>
                        <td className={row.profit >= 0 ? 'positive' : 'negative'}>
                          {money(row.profit)}
                        </td>
                        <td>{pct(row.roi)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="card table-wrap">
              <h2>Weakest Performers</h2>

              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Spend</th>
                    <th>Leads</th>
                    <th>CPL</th>
                    <th>Profit</th>
                    <th>ROI</th>
                  </tr>
                </thead>

                <tbody>
                  {worstRows.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No data yet.</td>
                    </tr>
                  ) : (
                    worstRows.map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        <td>{money(row.spend)}</td>
                        <td>{row.leads}</td>
                        <td>{money(row.cpl)}</td>
                        <td className={row.profit >= 0 ? 'positive' : 'negative'}>
                          {money(row.profit)}
                        </td>
                        <td>{pct(row.roi)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ marginTop: 18 }}>
            <div className="card table-wrap">
              <h2>{reportTitle()}</h2>

              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Spend</th>
                    <th>Leads</th>
                    <th>CPL</th>
                    <th>FTDs</th>
                    <th>CPA</th>
                    <th>Revenue</th>
                    <th>Profit</th>
                    <th>ROI</th>
                  </tr>
                </thead>

                <tbody>
                  {reportRows.length === 0 ? (
                    <tr>
                      <td colSpan={9}>No report data for this date range.</td>
                    </tr>
                  ) : (
                    reportRows.map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        <td>{money(row.spend)}</td>
                        <td>{row.leads}</td>
                        <td>{money(row.cpl)}</td>
                        <td>{row.ftds}</td>
                        <td>{money(row.cpa)}</td>
                        <td>{money(row.revenue)}</td>
                        <td className={row.profit >= 0 ? 'positive' : 'negative'}>
                          {money(row.profit)}
                        </td>
                        <td>{pct(row.roi)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}