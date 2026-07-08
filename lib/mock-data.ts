export type DailySpend = {
  date: string;
  buyer: string;
  agency: string;
  account: string;
  geo: string;
  offer: string;
  spend: number;
  leads: number;
  ftds: number;
  revenue: number;
  status: 'Profitable' | 'Watch' | 'Loss';
};

export const dailySpend: DailySpend[] = [
  { date: '2026-07-07', buyer: 'Marco', agency: 'Agency A', account: 'FB-BR-221', geo: 'Brazil', offer: 'Brazil WBS', spend: 520, leads: 43, ftds: 4, revenue: 1200, status: 'Profitable' },
  { date: '2026-07-07', buyer: 'Marinos', agency: 'Agency B', account: 'FB-VN-118', geo: 'Vietnam', offer: 'BrainTrade', spend: 310, leads: 29, ftds: 1, revenue: 280, status: 'Loss' },
  { date: '2026-07-07', buyer: 'Anna', agency: 'Agency A', account: 'FB-BR-308', geo: 'Brazil', offer: 'Brazil Zenstox', spend: 760, leads: 58, ftds: 5, revenue: 1500, status: 'Profitable' },
  { date: '2026-07-06', buyer: 'Marco', agency: 'Agency C', account: 'FB-SE-044', geo: 'Sweden', offer: 'AvanzaPro', spend: 410, leads: 18, ftds: 2, revenue: 640, status: 'Watch' },
  { date: '2026-07-06', buyer: 'Anna', agency: 'Agency B', account: 'FB-BD-901', geo: 'Bangladesh', offer: 'Sweepstake Wheel', spend: 220, leads: 67, ftds: 0, revenue: 0, status: 'Watch' }
];

export const accounts = [
  { name: 'FB-BR-221', platform: 'Facebook', agency: 'Agency A', buyer: 'Marco', geo: 'Brazil', status: 'Active', dailyLimit: 1000, lifetimeSpend: 18400 },
  { name: 'FB-VN-118', platform: 'Facebook', agency: 'Agency B', buyer: 'Marinos', geo: 'Vietnam', status: 'Active', dailyLimit: 500, lifetimeSpend: 9200 },
  { name: 'FB-BR-308', platform: 'Facebook', agency: 'Agency A', buyer: 'Anna', geo: 'Brazil', status: 'Limited', dailyLimit: 1200, lifetimeSpend: 26100 },
  { name: 'FB-SE-044', platform: 'Facebook', agency: 'Agency C', buyer: 'Marco', geo: 'Sweden', status: 'Warming', dailyLimit: 300, lifetimeSpend: 3100 }
];

export const agencies = [
  { name: 'Agency A', contact: '@agency_a', activeAccounts: 12, disabledAccounts: 3, spend: 44500, avgCpl: 12.4, quality: 'Strong' },
  { name: 'Agency B', contact: '@agency_b', activeAccounts: 7, disabledAccounts: 5, spend: 21800, avgCpl: 10.7, quality: 'Medium' },
  { name: 'Agency C', contact: '@agency_c', activeAccounts: 4, disabledAccounts: 1, spend: 9400, avgCpl: 22.8, quality: 'Watch' }
];

export const offers = [
  { name: 'Brazil WBS', geo: 'Brazil', vertical: 'Investment', crm: 'Trackbox', payout: 300, status: 'Active', cap: 20 },
  { name: 'Brazil Zenstox', geo: 'Brazil', vertical: 'Investment', crm: 'Trackbox', payout: 300, status: 'Active', cap: 20 },
  { name: 'BrainTrade', geo: 'Vietnam', vertical: 'Investment', crm: 'Trackbox', payout: 280, status: 'Active', cap: 50 },
  { name: 'Sweepstake Wheel', geo: 'Bangladesh', vertical: 'Sweepstakes', crm: 'Offer Redirect', payout: 0, status: 'Testing', cap: 0 }
];


export const budgetPool = {
  name: 'July Media Buying Pool',
  period: '2026-07',
  totalBudget: 25000,
  warningThresholdPct: 80
};

export const buyerBudgets = [
  { buyer: 'Marco', poolBudget: 9000 },
  { buyer: 'Anna', poolBudget: 8500 },
  { buyer: 'Marinos', poolBudget: 7500 }
];

export function budgetUsage(rows = dailySpend) {
  const t = totals(rows);
  const remaining = budgetPool.totalBudget - t.spend;
  return {
    totalBudget: budgetPool.totalBudget,
    spent: t.spend,
    remaining,
    usedPct: budgetPool.totalBudget ? (t.spend / budgetPool.totalBudget) * 100 : 0,
    status: remaining < 0 ? 'Over Budget' : (t.spend / budgetPool.totalBudget) * 100 >= budgetPool.warningThresholdPct ? 'Near Limit' : 'Healthy'
  };
}

export function buyerBudgetUsage() {
  return buyerBudgets.map((budget) => {
    const rows = dailySpend.filter((r) => r.buyer === budget.buyer);
    const t = totals(rows);
    const remaining = budget.poolBudget - t.spend;
    return {
      buyer: budget.buyer,
      poolBudget: budget.poolBudget,
      spent: t.spend,
      remaining,
      usedPct: budget.poolBudget ? (t.spend / budget.poolBudget) * 100 : 0,
      leads: t.leads,
      cpl: t.cpl,
      profit: t.profit,
      roi: t.roi,
      status: remaining < 0 ? 'Over Budget' : (t.spend / budget.poolBudget) * 100 >= budgetPool.warningThresholdPct ? 'Near Limit' : 'Healthy'
    };
  });
}

export function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
}

export function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export function totals(rows = dailySpend) {
  const spend = rows.reduce((sum, r) => sum + r.spend, 0);
  const leads = rows.reduce((sum, r) => sum + r.leads, 0);
  const ftds = rows.reduce((sum, r) => sum + r.ftds, 0);
  const revenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  const profit = revenue - spend;
  return {
    spend,
    leads,
    ftds,
    revenue,
    profit,
    cpl: leads ? spend / leads : 0,
    cpa: ftds ? spend / ftds : 0,
    roi: spend ? (profit / spend) * 100 : 0
  };
}

export function statusClass(status: string) {
  if (['Active', 'Profitable', 'Strong', 'Healthy'].includes(status)) return 'green';
  if (['Limited', 'Warming', 'Watch', 'Testing', 'Medium', 'Near Limit'].includes(status)) return 'amber';
  return 'red';
}
