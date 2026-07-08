'use client';

import { useEffect, useMemo, useState } from 'react';
import { MetricCard } from '@/components/MetricCard';
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
};

type AdAccount = {
  id: string;
  account_name: string;
  agency_id: string | null;
  buyer_id: string | null;
  geo: string | null;
  status: string | null;
  daily_budget: number | null;
  monthly_budget: number | null;
  spend_limit: number | null;
  replacement_needed: boolean | null;
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

type BudgetPool = {
  id: string;
  name: string;
  period: string;
  total_budget: number;
  warning_threshold_pct: number | null;
};

type BuyerAllocation = {
  id: string;
  budget_pool_id: string;
  buyer_id: string;
  allocated_budget: number;
};

type RangeType = 'today' | 'yesterday' | 'last7' | 'month' | 'all';

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

function statusClass(status: string | null | undefined) {
  const s = String(status || '').toLowerCase();

  if (s.includes('active') || s.includes('healthy') || s.includes('scale')) return 'green';
  if (s.includes('warming') || s.includes('watch')) return 'blue';
  if (s.includes('limited') || s.includes('paused') || s.includes('near')) return 'amber';
  if (s.includes('disabled') || s.includes('banned') || s.includes('over') || s.includes('loss')) return 'red';

  return 'blue';
}

export default function DashboardPage() {
  const [dailySpend, setDailySpend] = useState<DailySpend[]>([]);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [budgetPools, setBudgetPools] = useState<BudgetPool[]>([]);
  const [buyerAllocations, setBuyerAllocations] = useState<BuyerAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [rangeLabel, setRangeLabel] = useState('Today');

  async function loadDashboardData() {
    setLoading(true);
    setMessage('');

    const [
      spendResult,
      accountsResult,
      agenciesResult,
      buyersResult,
      offersResult,
      poolsResult,
      allocationsResult
    ] = await Promise.all([
      supabase.from('daily_spend').select('*').order('date', { ascending: false }),
      supabase.from('ad_accounts').select('*').order('account_name', { ascending: true }),
      supabase.from('agencies').select('id, name').order('name', { ascending: true }),
      supabase.from('buyers').select('id, name').order('name', { ascending: true }),
      supabase.from('offers').select('id, name, geo, brand').order('name', { ascending: true }),
      supabase.from('budget_pools').select('*').order('created_at', { ascending: false }),
      supabase.from('buyer_budget_allocations').select('*')
    ]);

    if (spendResult.error) {
      setMessage(`Failed to load daily spend: ${spendResult.error.message}`);
      setLoading(false);
      return;
    }

    if (accountsResult.error) {
      setMessage(`Failed to load accounts: ${accountsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (agenciesResult.error || buyersResult.error || offersResult.error) {
      setMessage('Failed to load agencies, buyers or offers.');
      setLoading(false);
      return;
    }

    setDailySpend((spendResult.data || []) as DailySpend[]);
    setAccounts((accountsResult.data || []) as AdAccount[]);
    setAgencies((agenciesResult.data || []) as Agency[]);
    setBuyers((buyersResult.data || []) as Buyer[]);
    setOffers((offersResult.data || []) as Offer[]);
    setBudgetPools((poolsResult.data || []) as BudgetPool[]);
    setBuyerAllocations((allocationsResult.data || []) as BuyerAllocation[]);

    setLoading(false);
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  function setQuickRange(range: RangeType) {
    const now = new Date();

    if (range === 'today') {
      const d = yyyyMmDd(now);
      setStartDate(d);
      setEndDate(d);
      setRangeLabel('Today');
      return;
    }

    if (range === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const d = yyyyMmDd(yesterday);
      setStartDate(d);
      setEndDate(d);
      setRangeLabel('Yesterday');
      return;
    }

    if (range === 'last7') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      setStartDate(yyyyMmDd(start));
      setEndDate(yyyyMmDd(now));
      setRangeLabel('Last 7 Days');
      return;
    }

    if (range === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(yyyyMmDd(start));
      setEndDate(yyyyMmDd(now));
      setRangeLabel('This Month');
      return;
    }

    setStartDate('');
    setEndDate('');
    setRangeLabel('All Time');
  }

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

  const currentBudgetPool = budgetPools[0];

  const poolBudget =
    Number(currentBudgetPool?.total_budget || 0) ||
    buyerAllocations.reduce((sum, allocation) => sum + Number(allocation.allocated_budget || 0), 0) ||
    25000;

  const warningThreshold = Number(currentBudgetPool?.warning_threshold_pct || 80);
  const poolSpent = totals.spend;
  const poolRemaining = poolBudget - poolSpent;
  const poolUsedPct = poolBudget > 0 ? (poolSpent / poolBudget) * 100 : 0;

  const poolStatus =
    poolRemaining < 0
      ? 'Over Budget'
      : poolUsedPct >= warningThreshold
        ? 'Near Limit'
        : 'Healthy';

  const buyerUsage = useMemo(() => {
    return buyers.map((buyer) => {
      const buyerEntries = filteredSpend.filter((entry) => entry.buyer_id === buyer.id);
      const allocation = buyerAllocations.find((item) => item.buyer_id === buyer.id);
      const allocated = Number(allocation?.allocated_budget || 0);

      const spend = buyerEntries.reduce((sum, entry) => sum + Number(entry.spend || 0), 0);
      const leads = buyerEntries.reduce((sum, entry) => sum + Number(entry.leads || 0), 0);
      const ftds = buyerEntries.reduce((sum, entry) => sum + Number(entry.ftds || 0), 0);
      const revenue = buyerEntries.reduce((sum, entry) => sum + Number(entry.revenue || 0), 0);
      const profit = revenue - spend;

      const usedPct = allocated > 0 ? (spend / allocated) * 100 : 0;

      const status =
        allocated > 0 && spend > allocated
          ? 'Over Budget'
          : allocated > 0 && usedPct >= warningThreshold
            ? 'Near Limit'
            : profit < 0 && spend > 0
              ? 'Loss'
              : 'Healthy';

      return {
        buyer: buyer.name,
        allocated,
        spend,
        remaining: allocated - spend,
        usedPct,
        leads,
        ftds,
        cpl: leads > 0 ? spend / leads : 0,
        revenue,
        profit,
        roi: spend > 0 ? (profit / spend) * 100 : 0,
        status
      };
    });
  }, [buyers, filteredSpend, buyerAllocations, warningThreshold]);

  function groupPerformance(
    keyGetter: (entry: DailySpend) => string,
    fallbackLabel = 'Unknown'
  ) {
    const map = new Map<string, {
      name: string;
      spend: number;
      leads: number;
      ftds: number;
      revenue: number;
    }>();

    filteredSpend.forEach((entry) => {
      const key = keyGetter(entry) || fallbackLabel;
      const existing = map.get(key) || {
        name: key,
        spend: 0,
        leads: 0,
        ftds: 0,
        revenue: 0
      };

      existing.spend += Number(entry.spend || 0);
      existing.leads += Number(entry.leads || 0);
      existing.ftds += Number(entry.ftds || 0);
      existing.revenue += Number(entry.revenue || 0);

      map.set(key, existing);
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
  }

  const geoPerformance = groupPerformance((entry) => entry.geo, 'No Geo');
  const offerPerformance = groupPerformance((entry) => getOfferName(entry.offer_id), 'No Offer');
  const agencyPerformance = groupPerformance((entry) => getAgencyName(entry.agency_id), 'No Agency');

  const accountHealth = useMemo(() => {
    return accounts.map((account) => {
      const accountEntries = filteredSpend.filter((entry) => entry.ad_account_id === account.id);

      const spend = accountEntries.reduce((sum, entry) => sum + Number(entry.spend || 0), 0);
      const leads = accountEntries.reduce((sum, entry) => sum + Number(entry.leads || 0), 0);
      const revenue = accountEntries.reduce((sum, entry) => sum + Number(entry.revenue || 0), 0);
      const profit = revenue - spend;

      const spendLimit = Number(account.spend_limit || 0);
      const usedPct = spendLimit > 0 ? (spend / spendLimit) * 100 : 0;

      const budgetStatus =
        account.replacement_needed
          ? 'Replacement Needed'
          : spendLimit > 0 && spend > spendLimit
            ? 'Over Limit'
            : spendLimit > 0 && usedPct >= 80
              ? 'Near Limit'
              : account.status || 'active';

      return {
        account,
        spend,
        leads,
        cpl: leads > 0 ? spend / leads : 0,
        revenue,
        profit,
        usedPct,
        budgetStatus
      };
    });
  }, [accounts, filteredSpend]);

  const latestEntries = [...filteredSpend]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  return (
    <>
      <PageTitle
        title="Dashboard"
        subtitle="Real-time performance dashboard connected to Supabase daily spend data."
      />

      <div className="card" style={{ marginBottom: 18 }}>
        <h2>Date Range</h2>

        <div className="filter-bar">
          <label>
            Start Date
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setRangeLabel('Custom Range');
              }}
            />
          </label>

          <label>
            End Date
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setRangeLabel('Custom Range');
              }}
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

          <button className="btn small" type="button" onClick={loadDashboardData}>
            Refresh
          </button>
        </div>

        <p className="muted">
          Current view: <strong>{rangeLabel}</strong>
        </p>

        {message && <p className="negative">{message}</p>}
      </div>

      {loading ? (
        <div className="card">
          <h2>Loading dashboard from Supabase...</h2>
        </div>
      ) : (
        <>
          <section className="grid grid-4">
            <MetricCard label="Total Spend" value={money(totals.spend)} sub="Selected date range" />
            <MetricCard label="Leads" value={String(totals.leads)} sub={`Average CPL ${money(totals.cpl)}`} />
            <MetricCard label="FTDs / Sales" value={String(totals.ftds)} sub={`Average CPA ${money(totals.cpa)}`} />
            <MetricCard label="Profit / ROI" value={money(totals.profit)} sub={pct(totals.roi)} />
          </section>

          <section className="grid grid-4" style={{ marginTop: 18 }}>
            <MetricCard label="Pool Budget" value={money(poolBudget)} sub={currentBudgetPool?.name || 'Default pool'} />
            <MetricCard label="Pool Spent" value={money(poolSpent)} sub={`${pct(poolUsedPct)} used`} />
            <MetricCard label="Remaining Pool" value={money(poolRemaining)} sub={poolRemaining >= 0 ? 'Available budget' : 'Over budget'} />
            <MetricCard label="Budget Status" value={poolStatus} sub={`Warning at ${warningThreshold}%`} />
          </section>

          <section className="grid grid-4" style={{ marginTop: 18 }}>
            <MetricCard label="Active Accounts" value={String(accounts.filter((a) => a.status === 'active').length)} sub="Currently active" />
            <MetricCard label="Limited / Banned" value={String(accounts.filter((a) => ['limited', 'disabled', 'banned'].includes(String(a.status))).length)} sub="Need attention" />
            <MetricCard label="Replacement Needed" value={String(accounts.filter((a) => a.replacement_needed).length)} sub="Accounts marked for replacement" />
            <MetricCard label="Spend Entries" value={String(filteredSpend.length)} sub="Rows in selected range" />
          </section>

          <section style={{ marginTop: 18 }}>
            <div className="card table-wrap">
              <h2>Media Buyer Budget Usage</h2>

              <table>
                <thead>
                  <tr>
                    <th>Buyer</th>
                    <th>Allocated</th>
                    <th>Spent</th>
                    <th>Remaining</th>
                    <th>Used</th>
                    <th>Leads</th>
                    <th>CPL</th>
                    <th>FTDs</th>
                    <th>Profit</th>
                    <th>ROI</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {buyerUsage.length === 0 ? (
                    <tr>
                      <td colSpan={11}>No buyers yet.</td>
                    </tr>
                  ) : (
                    buyerUsage.map((buyer) => (
                      <tr key={buyer.buyer}>
                        <td>{buyer.buyer}</td>
                        <td>{money(buyer.allocated)}</td>
                        <td>{money(buyer.spend)}</td>
                        <td className={buyer.remaining >= 0 ? 'positive' : 'negative'}>
                          {money(buyer.remaining)}
                        </td>
                        <td>
                          <div className="progress-cell">
                            <div className="progress-bar">
                              <span style={{ width: `${Math.min(buyer.usedPct, 100)}%` }} />
                            </div>
                            <strong>{pct(buyer.usedPct)}</strong>
                          </div>
                        </td>
                        <td>{buyer.leads}</td>
                        <td>{money(buyer.cpl)}</td>
                        <td>{buyer.ftds}</td>
                        <td className={buyer.profit >= 0 ? 'positive' : 'negative'}>
                          {money(buyer.profit)}
                        </td>
                        <td>{pct(buyer.roi)}</td>
                        <td>
                          <span className={`badge ${statusClass(buyer.status)}`}>
                            {buyer.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-3" style={{ marginTop: 18 }}>
            <PerformanceTable title="Geo Performance" rows={geoPerformance} />
            <PerformanceTable title="Offer Performance" rows={offerPerformance} />
            <PerformanceTable title="Agency Performance" rows={agencyPerformance} />
          </section>

          <section style={{ marginTop: 18 }}>
            <div className="card table-wrap">
              <h2>Account Health</h2>

              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Geo</th>
                    <th>Status</th>
                    <th>Spend</th>
                    <th>Leads</th>
                    <th>CPL</th>
                    <th>Profit</th>
                    <th>Limit Used</th>
                    <th>Budget Status</th>
                  </tr>
                </thead>

                <tbody>
                  {accountHealth.length === 0 ? (
                    <tr>
                      <td colSpan={9}>No accounts yet.</td>
                    </tr>
                  ) : (
                    accountHealth.map((row) => (
                      <tr key={row.account.id}>
                        <td>{row.account.account_name}</td>
                        <td>{row.account.geo || '-'}</td>
                        <td>
                          <span className={`badge ${statusClass(row.account.status)}`}>
                            {row.account.status || 'active'}
                          </span>
                        </td>
                        <td>{money(row.spend)}</td>
                        <td>{row.leads}</td>
                        <td>{money(row.cpl)}</td>
                        <td className={row.profit >= 0 ? 'positive' : 'negative'}>
                          {money(row.profit)}
                        </td>
                        <td>{pct(row.usedPct)}</td>
                        <td>
                          <span className={`badge ${statusClass(row.budgetStatus)}`}>
                            {row.budgetStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-2" style={{ marginTop: 18 }}>
            <div className="card table-wrap">
              <h2>Latest Spend Entries</h2>

              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Account</th>
                    <th>Buyer</th>
                    <th>Geo</th>
                    <th>Offer</th>
                    <th>Spend</th>
                    <th>Leads</th>
                    <th>CPL</th>
                  </tr>
                </thead>

                <tbody>
                  {latestEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8}>No spend entries in this range.</td>
                    </tr>
                  ) : (
                    latestEntries.map((entry) => {
                      const cpl = entry.leads > 0 ? entry.spend / entry.leads : 0;

                      return (
                        <tr key={entry.id}>
                          <td>{entry.date}</td>
                          <td>{getAccountName(entry.ad_account_id)}</td>
                          <td>{getBuyerName(entry.buyer_id)}</td>
                          <td>{entry.geo}</td>
                          <td>{getOfferName(entry.offer_id)}</td>
                          <td>{money(entry.spend)}</td>
                          <td>{entry.leads}</td>
                          <td>{money(cpl)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="card">
              <h2>Immediate Alerts</h2>

              <table>
                <tbody>
                  <tr>
                    <td>
                      <span className={`badge ${statusClass(poolStatus)}`}>Budget</span>
                    </td>
                    <td>Shared pool has {money(poolRemaining)} remaining.</td>
                  </tr>

                  {buyerUsage
                    .filter((buyer) => buyer.status !== 'Healthy')
                    .slice(0, 4)
                    .map((buyer) => (
                      <tr key={buyer.buyer}>
                        <td>
                          <span className={`badge ${statusClass(buyer.status)}`}>
                            {buyer.status}
                          </span>
                        </td>
                        <td>
                          {buyer.buyer}: spent {money(buyer.spend)}, profit {money(buyer.profit)}.
                        </td>
                      </tr>
                    ))}

                  {accountHealth
                    .filter((row) => row.budgetStatus !== 'active' && row.budgetStatus !== 'Healthy')
                    .slice(0, 4)
                    .map((row) => (
                      <tr key={row.account.id}>
                        <td>
                          <span className={`badge ${statusClass(row.budgetStatus)}`}>
                            Account
                          </span>
                        </td>
                        <td>
                          {row.account.account_name}: {row.budgetStatus}.
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function PerformanceTable({
  title,
  rows
}: {
  title: string;
  rows: {
    name: string;
    spend: number;
    leads: number;
    ftds: number;
    revenue: number;
    cpl: number;
    cpa: number;
    profit: number;
    roi: number;
  }[];
}) {
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
            <th>Profit</th>
            <th>ROI</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7}>No data in this range.</td>
            </tr>
          ) : (
            rows.slice(0, 10).map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{money(row.spend)}</td>
                <td>{row.leads}</td>
                <td>{money(row.cpl)}</td>
                <td>{row.ftds}</td>
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
  );
}