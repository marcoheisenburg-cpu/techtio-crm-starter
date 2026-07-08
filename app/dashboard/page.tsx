'use client';

import { useMemo, useState } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { PageTitle } from '@/components/PageTitle';
import { DailySpend, money, pct, statusClass, totals } from '@/lib/mock-data';
import { useCrmDatabase } from '@/lib/local-db';

const today = new Date().toISOString().slice(0, 10);
const monthStart = today.slice(0, 8) + '01';

function getPastDate(daysBack: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
}

type GroupMetric = {
  name: string;
  spend: number;
  leads: number;
  ftds: number;
  revenue: number;
  profit: number;
  cpl: number;
  cpa: number;
  roi: number;
};

function groupRows(rows: DailySpend[], key: keyof Pick<DailySpend, 'geo' | 'offer' | 'agency' | 'buyer'>): GroupMetric[] {
  const groups = rows.reduce<Record<string, DailySpend[]>>((acc, row) => {
    const name = String(row[key] || 'Unknown');
    acc[name] = acc[name] || [];
    acc[name].push(row);
    return acc;
  }, {});

  return Object.entries(groups)
    .map(([name, groupRows]) => {
      const t = totals(groupRows);
      return { name, ...t };
    })
    .sort((a, b) => b.spend - a.spend);
}

function PerformanceTable({ title, rows }: { title: string; rows: GroupMetric[] }) {
  return (
    <div className="card table-wrap">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Spend</th>
            <th>Leads</th>
            <th>CPL</th>
            <th>FTDs</th>
            <th>Revenue</th>
            <th>Profit</th>
            <th>ROI</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="muted">No data in this date range.</td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.name}>
              <td>{row.name}</td>
              <td>{money(row.spend)}</td>
              <td>{row.leads}</td>
              <td>{money(row.cpl)}</td>
              <td>{row.ftds}</td>
              <td>{money(row.revenue)}</td>
              <td className={row.profit >= 0 ? 'positive' : 'negative'}>{money(row.profit)}</td>
              <td>{pct(row.roi)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type AccountHealthRow = {
  name: string;
  agency: string;
  buyer: string;
  geo: string;
  status: string;
  monthlyBudget: number;
  spend: number;
  remaining: number;
  usedPct: number;
  budgetStatus: string;
  replacementNeeded: boolean;
  banDate: string;
};

function AccountHealthTable({ rows }: { rows: AccountHealthRow[] }) {
  return (
    <div className="card table-wrap">
      <h2>Account Health</h2>
      <p className="muted">Status, monthly budget usage and replacement needs for the selected date range.</p>
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Agency</th>
            <th>Buyer</th>
            <th>Geo</th>
            <th>Status</th>
            <th>Budget</th>
            <th>Spend</th>
            <th>Remaining</th>
            <th>Used</th>
            <th>Budget Status</th>
            <th>Replacement</th>
            <th>Ban Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td><strong>{row.name}</strong></td>
              <td>{row.agency || '-'}</td>
              <td>{row.buyer || '-'}</td>
              <td>{row.geo || '-'}</td>
              <td><span className={`badge ${statusClass(row.status)}`}>{row.status}</span></td>
              <td>{row.monthlyBudget ? money(row.monthlyBudget) : '-'}</td>
              <td>{money(row.spend)}</td>
              <td className={row.remaining >= 0 ? 'positive' : 'negative'}>{row.monthlyBudget ? money(row.remaining) : '-'}</td>
              <td>
                <div className="progress-cell">
                  <div className="progress-bar"><span style={{ width: `${Math.min(row.usedPct, 100)}%` }} /></div>
                  <strong>{row.monthlyBudget ? pct(row.usedPct) : '-'}</strong>
                </div>
              </td>
              <td><span className={`badge ${statusClass(row.budgetStatus)}`}>{row.budgetStatus}</span></td>
              <td>{row.replacementNeeded ? <span className="badge red">Yes</span> : <span className="badge green">No</span>}</td>
              <td>{row.banDate || '-'}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={12} className="muted">No accounts saved yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const { database } = useCrmDatabase();
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [rangeLabel, setRangeLabel] = useState('This Month');

  function applyRange(label: string, start: string, end: string) {
    setRangeLabel(label);
    setStartDate(start);
    setEndDate(end);
  }

  const filteredRows = useMemo(() => {
    return database.dailySpend
      .filter((row) => {
        if (startDate && row.date < startDate) return false;
        if (endDate && row.date > endDate) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [database.dailySpend, startDate, endDate]);

  const t = totals(filteredRows);

  const poolRemaining = database.budgetPool.totalBudget - t.spend;
  const poolUsedPct = database.budgetPool.totalBudget ? (t.spend / database.budgetPool.totalBudget) * 100 : 0;
  const poolStatus =
    poolRemaining < 0
      ? 'Over Budget'
      : poolUsedPct >= database.budgetPool.warningThresholdPct
        ? 'Near Limit'
        : 'Healthy';

  const buyerRows = useMemo(() => {
    return database.buyerBudgets.map((budget) => {
      const rows = filteredRows.filter((row) => row.buyer === budget.buyer);
      const buyerTotals = totals(rows);
      const remaining = budget.poolBudget - buyerTotals.spend;
      const usedPct = budget.poolBudget ? (buyerTotals.spend / budget.poolBudget) * 100 : 0;

      return {
        buyer: budget.buyer,
        poolBudget: budget.poolBudget,
        spent: buyerTotals.spend,
        remaining,
        usedPct,
        leads: buyerTotals.leads,
        cpl: buyerTotals.cpl,
        profit: buyerTotals.profit,
        roi: buyerTotals.roi,
        status:
          remaining < 0
            ? 'Over Budget'
            : usedPct >= database.budgetPool.warningThresholdPct
              ? 'Near Limit'
              : 'Healthy'
      };
    });
  }, [database.buyerBudgets, database.budgetPool.warningThresholdPct, filteredRows]);

  const geoRows = groupRows(filteredRows, 'geo');
  const offerRows = groupRows(filteredRows, 'offer');
  const agencyRows = groupRows(filteredRows, 'agency');
  const buyerPerformanceRows = groupRows(filteredRows, 'buyer');

  const accountHealthRows = useMemo<AccountHealthRow[]>(() => {
    return database.accounts.map((account) => {
      const rows = filteredRows.filter((row) => row.account === account.name);
      const accountTotals = totals(rows);
      const monthlyBudget = Number(account.monthlyBudget || account.spendLimit || 0);
      const remaining = monthlyBudget ? monthlyBudget - accountTotals.spend : 0;
      const usedPct = monthlyBudget ? (accountTotals.spend / monthlyBudget) * 100 : 0;
      const budgetStatus = !monthlyBudget
        ? 'No Budget'
        : remaining < 0
          ? 'Over Limit'
          : usedPct >= 80
            ? 'Near Limit'
            : 'Healthy';

      return {
        name: account.name,
        agency: account.agency,
        buyer: account.buyer,
        geo: account.geo,
        status: account.status,
        monthlyBudget,
        spend: accountTotals.spend,
        remaining,
        usedPct,
        budgetStatus,
        replacementNeeded: Boolean(account.replacementNeeded),
        banDate: account.banDate || ''
      };
    }).sort((a, b) => {
      const priority = (row: AccountHealthRow) => {
        if (row.replacementNeeded) return 5;
        if (['Banned', 'Disabled'].includes(row.status)) return 4;
        if (row.budgetStatus === 'Over Limit') return 3;
        if (row.budgetStatus === 'Near Limit') return 2;
        if (row.status === 'Limited') return 1;
        return 0;
      };

      return priority(b) - priority(a) || b.spend - a.spend;
    });
  }, [database.accounts, filteredRows]);

  const activeAccounts = database.accounts.filter((account) => account.status === 'Active').length;
  const limitedAccounts = database.accounts.filter((account) => ['Limited', 'Disabled', 'Banned'].includes(String(account.status))).length;
  const replacementNeeded = database.accounts.filter((account) => account.replacementNeeded).length;
  const nearLimitAccounts = accountHealthRows.filter((account) => ['Near Limit', 'Over Limit'].includes(account.budgetStatus)).length;

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Performance filtered by date range across spend, buyers, agencies, geos, offers and budget pool usage." />

      <div className="card" style={{ marginBottom: 18 }}>
        <h2>Date Range</h2>
        <p className="muted">Current view: {rangeLabel}</p>

        <div className="form">
          <label>
            Start Date
            <input
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setRangeLabel('Custom Range');
              }}
            />
          </label>

          <label>
            End Date
            <input
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setRangeLabel('Custom Range');
              }}
            />
          </label>
        </div>

        <div className="actions" style={{ marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn secondary" type="button" onClick={() => applyRange('Today', today, today)}>Today</button>
          <button className="btn secondary" type="button" onClick={() => applyRange('Yesterday', getPastDate(1), getPastDate(1))}>Yesterday</button>
          <button className="btn secondary" type="button" onClick={() => applyRange('Last 7 Days', getPastDate(6), today)}>Last 7 Days</button>
          <button className="btn secondary" type="button" onClick={() => applyRange('This Month', monthStart, today)}>This Month</button>
          <button className="btn secondary" type="button" onClick={() => applyRange('All Time', '', '')}>All Time</button>
        </div>
      </div>

      <section className="grid grid-4">
        <MetricCard label="Total Spend" value={money(t.spend)} sub={`${filteredRows.length} entries in range`} />
        <MetricCard label="Leads" value={String(t.leads)} sub={`Average CPL ${money(t.cpl)}`} />
        <MetricCard label="FTDs / Sales" value={String(t.ftds)} sub={`Average CPA ${money(t.cpa)}`} />
        <MetricCard label="Profit / ROI" value={money(t.profit)} sub={pct(t.roi)} />
      </section>

      <section className="grid grid-4" style={{ marginTop: 18 }}>
        <MetricCard label="Pool Budget" value={money(database.budgetPool.totalBudget)} sub={database.budgetPool.name} />
        <MetricCard label="Pool Spent" value={money(t.spend)} sub={`${pct(poolUsedPct)} used in range`} />
        <MetricCard label="Remaining Pool" value={money(poolRemaining)} sub={poolRemaining >= 0 ? 'Available after selected spend' : 'Over budget'} />
        <MetricCard label="Budget Status" value={poolStatus} sub={`Warning at ${database.budgetPool.warningThresholdPct}%`} />
      </section>

      <section className="grid grid-4" style={{ marginTop: 18 }}>
        <MetricCard label="Active Accounts" value={String(activeAccounts)} sub="Currently marked active" />
        <MetricCard label="Limited / Banned" value={String(limitedAccounts)} sub="Needs attention" />
        <MetricCard label="Near Account Limit" value={String(nearLimitAccounts)} sub="Budget usage warning" />
        <MetricCard label="Replacement Needed" value={String(replacementNeeded)} sub="Marked in Accounts" />
      </section>

      <section style={{ marginTop: 18 }}>
        <div className="card table-wrap">
          <h2>Media Buyer Budget Pool</h2>
          <p className="muted">Buyer spend and remaining allocation for the selected date range.</p>
          <table>
            <thead>
              <tr><th>Buyer</th><th>Pool Budget</th><th>Spent</th><th>Remaining</th><th>Used</th><th>Leads</th><th>CPL</th><th>Profit</th><th>Status</th></tr>
            </thead>
            <tbody>
              {buyerRows.map((b) => (
                <tr key={b.buyer}>
                  <td>{b.buyer}</td>
                  <td>{money(b.poolBudget)}</td>
                  <td>{money(b.spent)}</td>
                  <td className={b.remaining >= 0 ? 'positive' : 'negative'}>{money(b.remaining)}</td>
                  <td>
                    <div className="progress-cell">
                      <div className="progress-bar"><span style={{ width: `${Math.min(b.usedPct, 100)}%` }} /></div>
                      <strong>{pct(b.usedPct)}</strong>
                    </div>
                  </td>
                  <td>{b.leads}</td>
                  <td>{money(b.cpl)}</td>
                  <td className={b.profit >= 0 ? 'positive' : 'negative'}>{money(b.profit)}</td>
                  <td><span className={`badge ${statusClass(b.status)}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <AccountHealthTable rows={accountHealthRows} />
      </section>

      <section className="grid grid-2" style={{ marginTop: 18 }}>
        <PerformanceTable title="Geo Performance" rows={geoRows} />
        <PerformanceTable title="Offer Performance" rows={offerRows} />
      </section>

      <section className="grid grid-2" style={{ marginTop: 18 }}>
        <PerformanceTable title="Agency Performance" rows={agencyRows} />
        <PerformanceTable title="Buyer Performance" rows={buyerPerformanceRows} />
      </section>

      <section className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <h2>Latest Spend Entries</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Account</th><th>Geo</th><th>Offer</th><th>Spend</th><th>Leads</th><th>CPL</th><th>Status</th></tr></thead>
              <tbody>
                {filteredRows.slice(0, 8).map((r, index) => (
                  <tr key={`${r.date}-${r.account}-${r.offer}-${index}`}>
                    <td>{r.date}</td>
                    <td>{r.account}</td>
                    <td>{r.geo}</td>
                    <td>{r.offer}</td>
                    <td>{money(r.spend)}</td>
                    <td>{r.leads}</td>
                    <td>{money(r.leads ? r.spend / r.leads : 0)}</td>
                    <td><span className={`badge ${statusClass(r.status)}`}>{r.status}</span></td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr><td colSpan={8} className="muted">No spend entries in this date range.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>Immediate Alerts</h2>
          <table>
            <tbody>
              <tr><td><span className={`badge ${statusClass(poolStatus)}`}>Budget</span></td><td>Shared pool has {money(poolRemaining)} remaining after selected range spend.</td></tr>
              {accountHealthRows.filter((account) => account.replacementNeeded).slice(0, 3).map((account) => (
                <tr key={`${account.name}-replacement`}><td><span className="badge red">Account</span></td><td>{account.name} needs a replacement account.</td></tr>
              ))}
              {accountHealthRows.filter((account) => ['Near Limit', 'Over Limit'].includes(account.budgetStatus)).slice(0, 3).map((account) => (
                <tr key={`${account.name}-limit`}><td><span className="badge amber">Limit</span></td><td>{account.name} used {pct(account.usedPct)} of its account budget.</td></tr>
              ))}
              {filteredRows.filter((r) => r.status === 'Loss').slice(0, 3).map((r, index) => (
                <tr key={`${r.account}-${index}`}><td><span className="badge red">Loss</span></td><td>{r.geo} {r.offer} spent {money(r.spend)} with revenue of {money(r.revenue)}.</td></tr>
              ))}
              {filteredRows.filter((r) => r.status === 'Profitable').slice(0, 2).map((r, index) => (
                <tr key={`${r.account}-scale-${index}`}><td><span className="badge green">Scale</span></td><td>{r.geo} {r.offer} is profitable and can be reviewed for budget increase.</td></tr>
              ))}
              {filteredRows.length === 0 && (
                <tr><td><span className="badge amber">Empty</span></td><td>No data exists in this selected range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
