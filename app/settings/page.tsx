'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { money } from '@/lib/mock-data';
import { BuyerBudget, CrmDatabase, useCrmDatabase } from '@/lib/local-db';

const today = new Date().toISOString().slice(0, 10);

function downloadTextFile(filename: string, content: string, type = 'application/json;charset=utf-8;') {
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
  const {
    database,
    saveBudgetPool,
    addBuyerBudget,
    updateBuyerBudget,
    deleteBuyerBudget,
    exportDatabase,
    importDatabase,
    resetDemoData
  } = useCrmDatabase();

  const restoreInputRef = useRef<HTMLInputElement | null>(null);
  const [poolForm, setPoolForm] = useState({
    name: database.budgetPool.name,
    period: database.budgetPool.period,
    totalBudget: String(database.budgetPool.totalBudget),
    warningThresholdPct: String(database.budgetPool.warningThresholdPct)
  });
  const [buyerForm, setBuyerForm] = useState<BuyerBudget>({ buyer: '', poolBudget: 0 });
  const [editingBuyerIndex, setEditingBuyerIndex] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setPoolForm({
      name: database.budgetPool.name,
      period: database.budgetPool.period,
      totalBudget: String(database.budgetPool.totalBudget),
      warningThresholdPct: String(database.budgetPool.warningThresholdPct)
    });
  }, [database.budgetPool]);

  function showMessage(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(''), 3500);
  }

  function syncPoolFormFromDatabase() {
    setPoolForm({
      name: database.budgetPool.name,
      period: database.budgetPool.period,
      totalBudget: String(database.budgetPool.totalBudget),
      warningThresholdPct: String(database.budgetPool.warningThresholdPct)
    });
  }

  function savePool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    saveBudgetPool({
      name: poolForm.name.trim() || 'Media Buying Pool',
      period: poolForm.period.trim() || today.slice(0, 7),
      totalBudget: Number(poolForm.totalBudget || 0),
      warningThresholdPct: Number(poolForm.warningThresholdPct || 80)
    });

    showMessage('Budget pool saved.');
  }

  function saveBuyerBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: BuyerBudget = {
      buyer: buyerForm.buyer.trim(),
      poolBudget: Number(buyerForm.poolBudget || 0)
    };

    if (!payload.buyer) return;

    if (editingBuyerIndex === null) {
      addBuyerBudget(payload);
      showMessage('Buyer allocation added.');
    } else {
      updateBuyerBudget(editingBuyerIndex, payload);
      showMessage('Buyer allocation updated.');
    }

    setBuyerForm({ buyer: '', poolBudget: 0 });
    setEditingBuyerIndex(null);
  }

  function startEditBuyer(index: number) {
    setEditingBuyerIndex(index);
    setBuyerForm(database.buyerBudgets[index]);
  }

  function exportBackup() {
    downloadTextFile(`techtio-crm-backup-${today}.json`, exportDatabase());
  }

  function handleRestore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}')) as Partial<CrmDatabase>;
        importDatabase(parsed);
        showMessage('Backup restored successfully.');
        syncPoolFormFromDatabase();
      } catch {
        showMessage('Could not restore backup. Please select a valid CRM backup JSON file.');
      } finally {
        if (restoreInputRef.current) restoreInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  }

  function resetData() {
    const confirmed = window.confirm('Reset the CRM back to the demo data? This will replace your local saved data in this browser.');
    if (!confirmed) return;

    resetDemoData();
    syncPoolFormFromDatabase();
    showMessage('Demo data restored.');
  }

  return (
    <>
      <PageTitle title="Settings" subtitle="System settings, budget pools, backup/restore, API connections and alert rules." />

      {message && (
        <div className="card" style={{ marginBottom: 18 }}>
          <p className="positive">{message}</p>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <h2>Budget Pool</h2>
          <p className="muted">Manual MVP settings for the shared media buying pool.</p>

          <form className="form" onSubmit={savePool}>
            <label>
              Pool Name
              <input value={poolForm.name} onChange={(event) => setPoolForm({ ...poolForm, name: event.target.value })} />
            </label>

            <label>
              Period
              <input value={poolForm.period} onChange={(event) => setPoolForm({ ...poolForm, period: event.target.value })} />
            </label>

            <label>
              Total Pool Budget
              <input type="number" min="0" step="0.01" value={poolForm.totalBudget} onChange={(event) => setPoolForm({ ...poolForm, totalBudget: event.target.value })} />
            </label>

            <label>
              Warning Threshold %
              <input type="number" min="0" max="100" step="1" value={poolForm.warningThresholdPct} onChange={(event) => setPoolForm({ ...poolForm, warningThresholdPct: event.target.value })} />
            </label>

            <div className="actions" style={{ alignSelf: 'end' }}>
              <button className="btn" type="submit">Save Budget Settings</button>
            </div>
          </form>
        </div>

        <div className="card">
          <h2>Backup / Restore</h2>
          <p className="muted">Export all local CRM data before major changes, or restore it from a backup JSON file.</p>

          <div className="actions" style={{ flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={exportBackup}>Export Full Backup</button>
            <button className="btn secondary" type="button" onClick={() => restoreInputRef.current?.click()}>Restore Backup</button>
            <button className="btn secondary" type="button" onClick={resetData}>Reset Demo Data</button>
            <input ref={restoreInputRef} type="file" accept=".json,application/json" onChange={handleRestore} style={{ display: 'none' }} />
          </div>
        </div>

        <div className="card table-wrap">
          <h2>Buyer Pool Allocation</h2>

          <form className="form" onSubmit={saveBuyerBudget} style={{ marginBottom: 18 }}>
            <label>
              Buyer
              <input value={buyerForm.buyer} onChange={(event) => setBuyerForm({ ...buyerForm, buyer: event.target.value })} placeholder="Marco" required />
            </label>

            <label>
              Allocated Budget
              <input type="number" min="0" step="0.01" value={buyerForm.poolBudget} onChange={(event) => setBuyerForm({ ...buyerForm, poolBudget: Number(event.target.value || 0) })} required />
            </label>

            <div className="actions" style={{ alignSelf: 'end' }}>
              <button className="btn" type="submit">{editingBuyerIndex === null ? 'Add Allocation' : 'Save Allocation'}</button>
              {editingBuyerIndex !== null && (
                <button className="btn secondary" type="button" onClick={() => { setEditingBuyerIndex(null); setBuyerForm({ buyer: '', poolBudget: 0 }); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <table>
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Allocated Budget</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {database.buyerBudgets.map((b, index) => (
                <tr key={`${b.buyer}-${index}`}>
                  <td>{b.buyer}</td>
                  <td>{money(b.poolBudget)}</td>
                  <td>
                    <div className="actions">
                      <button className="btn secondary" type="button" onClick={() => startEditBuyer(index)}>Edit</button>
                      <button className="btn secondary" type="button" onClick={() => deleteBuyerBudget(index)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Integrations</h2>
          <p>Next steps: connect Supabase, Keitaro, Trackbox and Telegram.</p>

          <label>
            Keitaro API URL
            <input placeholder="https://tracker.example.com/admin_api/v1" />
          </label>

          <br />

          <label>
            Telegram Bot Token
            <input placeholder="Bot token" />
          </label>

          <br />

          <label>
            Telegram Chat ID
            <input placeholder="-100..." />
          </label>
        </div>

        <div className="card">
          <h2>Alert Rules</h2>
          <p>Example: alert when CPL is 30% higher than 7-day average, spend has no leads, or pool budget reaches the warning threshold.</p>

          <label>
            Max CPL Increase %
            <input defaultValue="30" />
          </label>

          <br />

          <label>
            No-lead Spend Threshold
            <input defaultValue="100" />
          </label>

          <br />

          <label>
            Pool Budget Warning %
            <input value={poolForm.warningThresholdPct} readOnly />
          </label>

          <br />

          <button className="btn" type="button">Save Alert Settings</button>
        </div>
      </div>
    </>
  );
}
