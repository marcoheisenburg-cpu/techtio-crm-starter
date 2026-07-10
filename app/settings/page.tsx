'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { supabase } from '@/lib/supabase-client';

type Buyer = {
  id: string;
  name: string;
};

type BudgetPool = {
  id: string;
  project_name: string | null;
  name: string;
  period: string;
  total_budget: number | null;
  currency: string | null;
  warning_threshold_pct: number | null;
  status: string | null;
  notes: string | null;
  created_at?: string;
};

type BuyerAllocation = {
  id: string;
  budget_pool_id: string;
  buyer_id: string;
  allocated_budget: number;
  notes: string | null;
};

type PoolForm = {
  project_name: string;
  name: string;
  period: string;
  total_budget: string;
  currency: string;
  warning_threshold_pct: string;
  status: string;
  notes: string;
};

const currentPeriod = new Date().toISOString().slice(0, 7);

const emptyPoolForm: PoolForm = {
  project_name: '',
  name: '',
  period: currentPeriod,
  total_budget: '0',
  currency: 'USD',
  warning_threshold_pct: '80',
  status: 'active',
  notes: ''
};

function money(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function downloadFile(filename: string, content: string, type = 'application/json;charset=utf-8;') {
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

export default function SettingsPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [budgetPools, setBudgetPools] = useState<BudgetPool[]>([]);
  const [allocations, setAllocations] = useState<BuyerAllocation[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [poolForm, setPoolForm] = useState<PoolForm>(emptyPoolForm);
  const [allocationDrafts, setAllocationDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadSettingsData(preferredPoolId?: string) {
    setLoading(true);
    setMessage('');

    const [buyersResult, poolsResult, allocationsResult] = await Promise.all([
      supabase.from('buyers').select('id, name').order('name', { ascending: true }),
      supabase.from('budget_pools').select('*').order('created_at', { ascending: false }),
      supabase.from('buyer_budget_allocations').select('*')
    ]);

    if (buyersResult.error) {
      setMessage(`Failed to load buyers: ${buyersResult.error.message}`);
      setLoading(false);
      return;
    }

    if (poolsResult.error) {
      setMessage(`Failed to load budget pools: ${poolsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (allocationsResult.error) {
      setMessage(`Failed to load buyer allocations: ${allocationsResult.error.message}`);
      setLoading(false);
      return;
    }

    const loadedBuyers = (buyersResult.data || []) as Buyer[];
    const loadedPools = (poolsResult.data || []) as BudgetPool[];
    const loadedAllocations = (allocationsResult.data || []) as BuyerAllocation[];

    setBuyers(loadedBuyers);
    setBudgetPools(loadedPools);
    setAllocations(loadedAllocations);

    const poolToSelect =
      loadedPools.find((pool) => pool.id === preferredPoolId) ||
      loadedPools.find((pool) => pool.id === selectedPoolId) ||
      loadedPools[0];

    if (poolToSelect) {
      setSelectedPoolId(poolToSelect.id);

      setPoolForm({
        project_name: poolToSelect.project_name || '',
        name: poolToSelect.name || '',
        period: poolToSelect.period || currentPeriod,
        total_budget: String(poolToSelect.total_budget ?? 0),
        currency: poolToSelect.currency || 'USD',
        warning_threshold_pct: String(poolToSelect.warning_threshold_pct ?? 80),
        status: poolToSelect.status || 'active',
        notes: poolToSelect.notes || ''
      });

      const drafts: Record<string, string> = {};

      loadedBuyers.forEach((buyer) => {
        const allocation = loadedAllocations.find(
          (item) => item.budget_pool_id === poolToSelect.id && item.buyer_id === buyer.id
        );

        drafts[buyer.id] = String(allocation?.allocated_budget ?? 0);
      });

      setAllocationDrafts(drafts);
    } else {
      setSelectedPoolId('');
      setPoolForm(emptyPoolForm);

      const drafts: Record<string, string> = {};

      loadedBuyers.forEach((buyer) => {
        drafts[buyer.id] = '0';
      });

      setAllocationDrafts(drafts);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSettingsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updatePoolField(field: keyof PoolForm, value: string) {
    setPoolForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function startNewPool() {
    setSelectedPoolId('');

    setPoolForm({
      ...emptyPoolForm,
      period: currentPeriod
    });

    const drafts: Record<string, string> = {};

    buyers.forEach((buyer) => {
      drafts[buyer.id] = '0';
    });

    setAllocationDrafts(drafts);
    setMessage('Creating a new project pool.');
  }

  function handlePoolSelect(poolId: string) {
    setSelectedPoolId(poolId);

    const pool = budgetPools.find((item) => item.id === poolId);

    if (!pool) return;

    setPoolForm({
      project_name: pool.project_name || '',
      name: pool.name || '',
      period: pool.period || currentPeriod,
      total_budget: String(pool.total_budget ?? 0),
      currency: pool.currency || 'USD',
      warning_threshold_pct: String(pool.warning_threshold_pct ?? 80),
      status: pool.status || 'active',
      notes: pool.notes || ''
    });

    const drafts: Record<string, string> = {};

    buyers.forEach((buyer) => {
      const allocation = allocations.find(
        (item) => item.budget_pool_id === pool.id && item.buyer_id === buyer.id
      );

      drafts[buyer.id] = String(allocation?.allocated_budget ?? 0);
    });

    setAllocationDrafts(drafts);
    setMessage('');
  }

  async function saveBudgetPool() {
    if (!poolForm.name.trim()) {
      setMessage('Pool name is required.');
      return;
    }

    if (!poolForm.period.trim()) {
      setMessage('Period is required. Example: 2026-07');
      return;
    }

    setSaving(true);
    setMessage('');

    const payload = {
      project_name: poolForm.project_name.trim() || null,
      name: poolForm.name.trim(),
      period: poolForm.period.trim(),
      total_budget: Number(poolForm.total_budget || 0),
      currency: poolForm.currency.trim() || 'USD',
      warning_threshold_pct: poolForm.warning_threshold_pct.trim()
        ? Number(poolForm.warning_threshold_pct)
        : 80,
      status: poolForm.status || 'active',
      notes: poolForm.notes.trim() || null
    };

    if (selectedPoolId) {
      const { error } = await supabase
        .from('budget_pools')
        .update(payload)
        .eq('id', selectedPoolId);

      if (error) {
        setMessage(`Failed to update budget pool: ${error.message}`);
        setSaving(false);
        return;
      }

      setSaving(false);
      setMessage('Budget pool updated successfully.');
      await loadSettingsData(selectedPoolId);
      return;
    }

    const { data, error } = await supabase
      .from('budget_pools')
      .insert(payload)
      .select()
      .single();

    if (error) {
      setMessage(`Failed to create budget pool: ${error.message}`);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSelectedPoolId(data.id);
    setMessage('Budget pool created successfully.');
    await loadSettingsData(data.id);
  }

  async function saveAllocations() {
    if (!selectedPoolId) {
      setMessage('Create or select a budget pool first.');
      return;
    }

    setSaving(true);
    setMessage('');

    for (const buyer of buyers) {
      const existing = allocations.find(
        (item) => item.budget_pool_id === selectedPoolId && item.buyer_id === buyer.id
      );

      const payload = {
        budget_pool_id: selectedPoolId,
        buyer_id: buyer.id,
        allocated_budget: Number(allocationDrafts[buyer.id] || 0),
        notes: null
      };

      if (existing) {
        const { error } = await supabase
          .from('buyer_budget_allocations')
          .update(payload)
          .eq('id', existing.id);

        if (error) {
          setMessage(`Failed to update allocation for ${buyer.name}: ${error.message}`);
          setSaving(false);
          return;
        }
      } else {
        const { error } = await supabase
          .from('buyer_budget_allocations')
          .insert(payload);

        if (error) {
          setMessage(`Failed to create allocation for ${buyer.name}: ${error.message}`);
          setSaving(false);
          return;
        }
      }
    }

    setSaving(false);
    setMessage('Buyer allocations saved successfully.');
    await loadSettingsData(selectedPoolId);
  }

  async function deleteBudgetPool() {
    if (!selectedPoolId) {
      setMessage('No budget pool selected.');
      return;
    }

    const confirmed = window.confirm('Delete this budget pool and its buyer allocations?');

    if (!confirmed) return;

    await supabase
      .from('buyer_budget_allocations')
      .delete()
      .eq('budget_pool_id', selectedPoolId);

    const { error } = await supabase
      .from('budget_pools')
      .delete()
      .eq('id', selectedPoolId);

    if (error) {
      setMessage(`Failed to delete budget pool: ${error.message}`);
      return;
    }

    setSelectedPoolId('');
    setMessage('Budget pool deleted successfully.');
    await loadSettingsData();
  }

  async function exportSupabaseBackup() {
    setMessage('Preparing Supabase backup...');

    const [
      agenciesResult,
      buyersResult,
      offersResult,
      accountsResult,
      spendResult,
      poolsResult,
      allocationsResult
    ] = await Promise.all([
      supabase.from('agencies').select('*'),
      supabase.from('buyers').select('*'),
      supabase.from('offers').select('*'),
      supabase.from('ad_accounts').select('*'),
      supabase.from('daily_spend').select('*'),
      supabase.from('budget_pools').select('*'),
      supabase.from('buyer_budget_allocations').select('*')
    ]);

    const backup = {
      exported_at: new Date().toISOString(),
      agencies: agenciesResult.data || [],
      buyers: buyersResult.data || [],
      offers: offersResult.data || [],
      ad_accounts: accountsResult.data || [],
      daily_spend: spendResult.data || [],
      budget_pools: poolsResult.data || [],
      buyer_budget_allocations: allocationsResult.data || []
    };

    downloadFile(
      `techtio-crm-supabase-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(backup, null, 2)
    );

    setMessage('Backup exported successfully.');
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const confirmed = window.confirm(
      'This will insert rows from the backup into Supabase. Continue?'
    );

    if (!confirmed) {
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      setSaving(true);
      setMessage('Restoring backup...');

      const tables = [
        'agencies',
        'buyers',
        'offers',
        'ad_accounts',
        'budget_pools',
        'buyer_budget_allocations',
        'daily_spend'
      ];

      for (const table of tables) {
        const rows = backup[table];

        if (Array.isArray(rows) && rows.length > 0) {
          const { error } = await supabase
            .from(table)
            .upsert(rows);

          if (error) {
            setMessage(`Restore failed on ${table}: ${error.message}`);
            setSaving(false);
            event.target.value = '';
            return;
          }
        }
      }

      setSaving(false);
      setMessage('Backup restored successfully.');
      event.target.value = '';
      await loadSettingsData();
    } catch {
      setMessage('Invalid backup file.');
      event.target.value = '';
      setSaving(false);
    }
  }

  const totalAllocated = Object.values(allocationDrafts).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  const poolTotal = Number(poolForm.total_budget || 0);
  const unallocated = poolTotal - totalAllocated;

  const selectedPool = budgetPools.find((pool) => pool.id === selectedPoolId);

  return (
    <>
      <PageTitle
        title="Settings"
        subtitle="Manage project budget pools, buyer allocations, integrations and Supabase backups."
      />

      {loading ? (
        <div className="card">
          <h2>Loading settings from Supabase...</h2>
        </div>
      ) : (
        <div className="grid grid-2">
          <div className="card">
            <h2>{selectedPoolId ? 'Edit Project Pool' : 'Create Project Pool'}</h2>

            <button
              className="btn small secondary"
              type="button"
              onClick={startNewPool}
              style={{ marginBottom: 12 }}
            >
              New Project Pool
            </button>

            {budgetPools.length > 0 && (
              <label>
                Select Existing Pool
                <select
                  value={selectedPoolId}
                  onChange={(e) => handlePoolSelect(e.target.value)}
                >
                  <option value="">Create new pool</option>

                  {budgetPools.map((pool) => (
                    <option key={pool.id} value={pool.id}>
                      {pool.project_name ? `${pool.project_name} — ` : ''}
                      {pool.name} — {pool.period}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {selectedPool && (
              <p className="muted" style={{ marginTop: 10 }}>
                Editing:{' '}
                <strong>
                  {selectedPool.project_name ? `${selectedPool.project_name} — ` : ''}
                  {selectedPool.name}
                </strong>
              </p>
            )}

            {!selectedPoolId && (
              <p className="muted" style={{ marginTop: 10 }}>
                New pool mode is active. Saving will create a separate project pool.
              </p>
            )}

            <label>
              Project Name
              <input
                value={poolForm.project_name}
                onChange={(e) => updatePoolField('project_name', e.target.value)}
                placeholder="Zeydoo PH + BD / Internovus Brazil / Monstrack Brazil"
              />
            </label>

            <label>
              Pool Name
              <input
                value={poolForm.name}
                onChange={(e) => updatePoolField('name', e.target.value)}
                placeholder="July Testing Pool"
              />
            </label>

            <label>
              Period
              <input
                value={poolForm.period}
                onChange={(e) => updatePoolField('period', e.target.value)}
                placeholder="2026-07"
              />
            </label>

            <label>
              Total Pool Budget
              <input
                type="number"
                value={poolForm.total_budget}
                onChange={(e) => updatePoolField('total_budget', e.target.value)}
              />
            </label>

            <label>
              Currency
              <input
                value={poolForm.currency}
                onChange={(e) => updatePoolField('currency', e.target.value)}
                placeholder="USD"
              />
            </label>

            <label>
              Warning Threshold %
              <input
                type="number"
                value={poolForm.warning_threshold_pct}
                onChange={(e) => updatePoolField('warning_threshold_pct', e.target.value)}
              />
            </label>

            <label>
              Status
              <select
                value={poolForm.status}
                onChange={(e) => updatePoolField('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
            </label>

            <label>
              Notes
              <textarea
                value={poolForm.notes}
                onChange={(e) => updatePoolField('notes', e.target.value)}
                rows={4}
                placeholder="Notes for this project pool..."
              />
            </label>

            <br />

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn" type="button" onClick={saveBudgetPool} disabled={saving}>
                {saving ? 'Saving...' : selectedPoolId ? 'Update Pool' : 'Create Pool'}
              </button>

              {selectedPoolId && (
                <button className="btn danger" type="button" onClick={deleteBudgetPool}>
                  Delete Pool
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
            <h2>Buyer Budget Allocations</h2>

            <p className="muted">
              These allocations belong only to the selected project pool.
            </p>

            <div className="grid grid-3" style={{ marginBottom: 16, marginTop: 12 }}>
              <div>
                <p className="muted">Pool Budget</p>
                <h2>{money(poolTotal)}</h2>
              </div>

              <div>
                <p className="muted">Allocated</p>
                <h2>{money(totalAllocated)}</h2>
              </div>

              <div>
                <p className="muted">Unallocated</p>
                <h2 className={unallocated >= 0 ? 'positive' : 'negative'}>
                  {money(unallocated)}
                </h2>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Allocated Budget</th>
                </tr>
              </thead>

              <tbody>
                {buyers.length === 0 ? (
                  <tr>
                    <td colSpan={2}>No buyers yet. Add buyers first.</td>
                  </tr>
                ) : (
                  buyers.map((buyer) => (
                    <tr key={buyer.id}>
                      <td>{buyer.name}</td>
                      <td>
                        <input
                          type="number"
                          value={allocationDrafts[buyer.id] || '0'}
                          onChange={(e) =>
                            setAllocationDrafts((current) => ({
                              ...current,
                              [buyer.id]: e.target.value
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <br />

            <button className="btn" type="button" onClick={saveAllocations} disabled={saving}>
              {saving ? 'Saving...' : 'Save Buyer Allocations'}
            </button>
          </div>

          <div className="card">
            <h2>Supabase Backup</h2>

            <p className="muted">
              Export a full JSON backup from Supabase or restore a previous backup.
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn" type="button" onClick={exportSupabaseBackup}>
                Export Supabase Backup
              </button>

              <label className="btn secondary" style={{ marginTop: 0 }}>
                Restore Backup
                <input
                  type="file"
                  accept=".json"
                  onChange={restoreBackup}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <div className="card">
            <h2>Integrations</h2>

            <p className="muted">
              Next integrations: Keitaro, Trackbox, Telegram alerts and Meta API later.
            </p>

            <label>
              Keitaro API URL
              <input placeholder="https://tracker.example.com/admin_api/v1" />
            </label>

            <label>
              Telegram Bot Token
              <input placeholder="Bot token" />
            </label>

            <label>
              Telegram Chat ID
              <input placeholder="-100..." />
            </label>

            <br />

            <button className="btn secondary" type="button">
              Save Integration Settings Later
            </button>
          </div>
        </div>
      )}
    </>
  );
}