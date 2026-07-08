'use client';

import {
  DailySpend,
  accounts as seedAccounts,
  agencies as seedAgencies,
  budgetPool as seedBudgetPool,
  buyerBudgets as seedBuyerBudgets,
  dailySpend as seedDailySpend,
  offers as seedOffers,
  totals
} from '@/lib/mock-data';
import { useEffect, useMemo, useState } from 'react';

export type AccountStatus = 'Active' | 'Warming' | 'Limited' | 'Disabled' | 'Banned' | 'Paused';

export type Account = {
  name: string;
  platform: string;
  agency: string;
  buyer: string;
  geo: string;
  status: AccountStatus | string;
  dailyLimit: number;
  monthlyBudget: number;
  spendLimit: number;
  lifetimeSpend: number;
  banDate: string;
  banReason: string;
  replacementNeeded: boolean;
  notes: string;
};

export type Agency = typeof seedAgencies[number];
export type Offer = typeof seedOffers[number];
export type BuyerBudget = typeof seedBuyerBudgets[number];
export type BudgetPool = typeof seedBudgetPool;

export type CrmDatabase = {
  dailySpend: DailySpend[];
  accounts: Account[];
  agencies: Agency[];
  offers: Offer[];
  buyerBudgets: BuyerBudget[];
  budgetPool: BudgetPool;
};

export const CRM_STORAGE_KEY = 'techtio_crm_database_v1';

function getSpendStatus(spend: number, revenue: number): DailySpend['status'] {
  if (revenue > spend) return 'Profitable';
  if (revenue === 0 || revenue < spend) return 'Loss';
  return 'Watch';
}

function normalizeAccount(account: Partial<Account> & { name: string }): Account {
  return {
    name: account.name || '',
    platform: account.platform || 'Facebook',
    agency: account.agency || '',
    buyer: account.buyer || '',
    geo: account.geo || '',
    status: account.status || 'Active',
    dailyLimit: Number(account.dailyLimit || 0),
    monthlyBudget: Number(account.monthlyBudget || 0),
    spendLimit: Number(account.spendLimit || 0),
    lifetimeSpend: Number(account.lifetimeSpend || 0),
    banDate: account.banDate || '',
    banReason: account.banReason || '',
    replacementNeeded: Boolean(account.replacementNeeded),
    notes: account.notes || ''
  };
}

function normalizeDailySpend(row: Partial<DailySpend>): DailySpend {
  const spend = Number(row.spend || 0);
  const revenue = Number(row.revenue || 0);
  const status = row.status || getSpendStatus(spend, revenue);

  return {
    date: row.date || new Date().toISOString().slice(0, 10),
    buyer: row.buyer || '',
    agency: row.agency || '',
    account: row.account || '',
    geo: row.geo || '',
    offer: row.offer || '',
    spend,
    leads: Number(row.leads || 0),
    ftds: Number(row.ftds || 0),
    revenue,
    status: status === 'Profitable' || status === 'Watch' || status === 'Loss' ? status : getSpendStatus(spend, revenue)
  };
}

const defaultDatabase: CrmDatabase = {
  dailySpend: seedDailySpend.map(normalizeDailySpend),
  accounts: seedAccounts.map(normalizeAccount),
  agencies: seedAgencies,
  offers: seedOffers,
  buyerBudgets: seedBuyerBudgets,
  budgetPool: seedBudgetPool
};

function normalizeDatabase(database: Partial<CrmDatabase>): CrmDatabase {
  return {
    dailySpend: Array.isArray(database.dailySpend) ? database.dailySpend.map(normalizeDailySpend) : defaultDatabase.dailySpend,
    accounts: Array.isArray(database.accounts) ? database.accounts.map((account) => normalizeAccount(account as Partial<Account> & { name: string })) : defaultDatabase.accounts,
    agencies: Array.isArray(database.agencies) ? database.agencies : defaultDatabase.agencies,
    offers: Array.isArray(database.offers) ? database.offers : defaultDatabase.offers,
    buyerBudgets: Array.isArray(database.buyerBudgets) ? database.buyerBudgets : defaultDatabase.buyerBudgets,
    budgetPool: database.budgetPool || defaultDatabase.budgetPool
  };
}

function loadDatabase(): CrmDatabase {
  if (typeof window === 'undefined') return defaultDatabase;

  const stored = window.localStorage.getItem(CRM_STORAGE_KEY);
  if (!stored) return defaultDatabase;

  try {
    return normalizeDatabase(JSON.parse(stored) as Partial<CrmDatabase>);
  } catch {
    window.localStorage.removeItem(CRM_STORAGE_KEY);
    return defaultDatabase;
  }
}

function saveDatabase(database: CrmDatabase) {
  window.localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(database));
}

function replaceAtIndex<T>(rows: T[], index: number, nextRow: T) {
  return rows.map((row, rowIndex) => (rowIndex === index ? nextRow : row));
}

export function useCrmDatabase() {
  const [database, setDatabase] = useState<CrmDatabase>(defaultDatabase);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDatabase(loadDatabase());
    setReady(true);
  }, []);

  function updateDatabase(nextDatabase: CrmDatabase) {
    const normalized = normalizeDatabase(nextDatabase);
    setDatabase(normalized);
    saveDatabase(normalized);
  }

  function saveBudgetPool(budgetPool: BudgetPool) {
    updateDatabase({ ...database, budgetPool });
  }

  function saveBuyerBudgets(buyerBudgets: BuyerBudget[]) {
    updateDatabase({ ...database, buyerBudgets });
  }

  function addBuyerBudget(buyerBudget: BuyerBudget) {
    updateDatabase({ ...database, buyerBudgets: [buyerBudget, ...database.buyerBudgets] });
  }

  function updateBuyerBudget(index: number, buyerBudget: BuyerBudget) {
    updateDatabase({ ...database, buyerBudgets: replaceAtIndex(database.buyerBudgets, index, buyerBudget) });
  }

  function deleteBuyerBudget(index: number) {
    updateDatabase({ ...database, buyerBudgets: database.buyerBudgets.filter((_, i) => i !== index) });
  }

  function addAgency(agency: Agency) {
    updateDatabase({ ...database, agencies: [agency, ...database.agencies] });
  }

  function updateAgency(index: number, agency: Agency) {
    updateDatabase({ ...database, agencies: replaceAtIndex(database.agencies, index, agency) });
  }

  function deleteAgency(index: number) {
    updateDatabase({ ...database, agencies: database.agencies.filter((_, i) => i !== index) });
  }

  function addAccount(account: Account) {
    updateDatabase({ ...database, accounts: [normalizeAccount(account), ...database.accounts] });
  }

  function updateAccount(index: number, account: Account) {
    updateDatabase({ ...database, accounts: replaceAtIndex(database.accounts, index, normalizeAccount(account)) });
  }

  function deleteAccount(index: number) {
    updateDatabase({ ...database, accounts: database.accounts.filter((_, i) => i !== index) });
  }

  function addOffer(offer: Offer) {
    updateDatabase({ ...database, offers: [offer, ...database.offers] });
  }

  function updateOffer(index: number, offer: Offer) {
    updateDatabase({ ...database, offers: replaceAtIndex(database.offers, index, offer) });
  }

  function deleteOffer(index: number) {
    updateDatabase({ ...database, offers: database.offers.filter((_, i) => i !== index) });
  }

  function addDailySpend(entry: Omit<DailySpend, 'status'>) {
    const newEntry = normalizeDailySpend(entry);

    updateDatabase({
      ...database,
      dailySpend: [newEntry, ...database.dailySpend]
    });
  }

  function importDailySpend(entries: Partial<DailySpend>[]) {
    const normalizedEntries = entries.map(normalizeDailySpend);
    updateDatabase({
      ...database,
      dailySpend: [...normalizedEntries, ...database.dailySpend]
    });
  }

  function replaceDailySpend(entries: Partial<DailySpend>[]) {
    updateDatabase({
      ...database,
      dailySpend: entries.map(normalizeDailySpend)
    });
  }

  function deleteDailySpend(index: number) {
    updateDatabase({
      ...database,
      dailySpend: database.dailySpend.filter((_, i) => i !== index)
    });
  }

  function importDatabase(nextDatabase: Partial<CrmDatabase>) {
    updateDatabase(normalizeDatabase(nextDatabase));
  }

  function exportDatabase() {
    return JSON.stringify(database, null, 2);
  }

  function resetDemoData() {
    updateDatabase(defaultDatabase);
  }

  const budgetUsage = useMemo(() => {
    const t = totals(database.dailySpend);
    const remaining = database.budgetPool.totalBudget - t.spend;
    const usedPct = database.budgetPool.totalBudget ? (t.spend / database.budgetPool.totalBudget) * 100 : 0;

    return {
      totalBudget: database.budgetPool.totalBudget,
      spent: t.spend,
      remaining,
      usedPct,
      status:
        remaining < 0
          ? 'Over Budget'
          : usedPct >= database.budgetPool.warningThresholdPct
            ? 'Near Limit'
            : 'Healthy'
    };
  }, [database]);

  const buyerBudgetUsage = useMemo(() => {
    return database.buyerBudgets.map((budget) => {
      const rows = database.dailySpend.filter((r) => r.buyer === budget.buyer);
      const t = totals(rows);
      const remaining = budget.poolBudget - t.spend;
      const usedPct = budget.poolBudget ? (t.spend / budget.poolBudget) * 100 : 0;

      return {
        buyer: budget.buyer,
        poolBudget: budget.poolBudget,
        spent: t.spend,
        remaining,
        usedPct,
        leads: t.leads,
        cpl: t.cpl,
        profit: t.profit,
        roi: t.roi,
        status:
          remaining < 0
            ? 'Over Budget'
            : usedPct >= database.budgetPool.warningThresholdPct
              ? 'Near Limit'
              : 'Healthy'
      };
    });
  }, [database]);

  return {
    ready,
    database,
    budgetUsage,
    buyerBudgetUsage,
    addDailySpend,
    importDailySpend,
    replaceDailySpend,
    deleteDailySpend,
    saveBudgetPool,
    saveBuyerBudgets,
    addBuyerBudget,
    updateBuyerBudget,
    deleteBuyerBudget,
    addAgency,
    updateAgency,
    deleteAgency,
    addAccount,
    updateAccount,
    deleteAccount,
    addOffer,
    updateOffer,
    deleteOffer,
    importDatabase,
    exportDatabase,
    resetDemoData
  };
}
