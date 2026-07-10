'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { supabase } from '@/lib/supabase-client';

type SpendProofFolder = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
};

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

type SpendProof = {
  id: string;
  folder_id: string | null;
  proof_date: string;
  platform: string | null;
  agency_id: string | null;
  buyer_id: string | null;
  ad_account_id: string | null;
  campaign_name: string | null;
  spend_amount: number | null;
  currency: string | null;
  screenshot_url: string;
  screenshot_path: string | null;
  notes: string | null;
  created_at: string;
};

const today = new Date().toISOString().slice(0, 10);

function money(value: number, currency = 'USD') {
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';

  return `${symbol}${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function SpendProofsPage() {
  const [folders, setFolders] = useState<SpendProofFolder[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [proofs, setProofs] = useState<SpendProof[]>([]);

  const [folderId, setFolderId] = useState('');
  const [proofDate, setProofDate] = useState(today);
  const [platform, setPlatform] = useState('facebook');
  const [agencyId, setAgencyId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [spendAmount, setSpendAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#2563eb');

  const [filterFolderId, setFilterFolderId] = useState('');
  const [filterAgencyId, setFilterAgencyId] = useState('');
  const [filterBuyerId, setFilterBuyerId] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadData() {
    setLoading(true);
    setMessage('');

    const [foldersResult, agenciesResult, buyersResult, accountsResult, proofsResult] =
      await Promise.all([
        supabase
          .from('spend_proof_folders')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('agencies').select('id, name').order('name', { ascending: true }),
        supabase.from('buyers').select('id, name').order('name', { ascending: true }),
        supabase
          .from('ad_accounts')
          .select('id, account_name, agency_id, buyer_id, geo')
          .order('account_name', { ascending: true }),
        supabase
          .from('spend_proofs')
          .select('*')
          .order('proof_date', { ascending: false })
          .order('created_at', { ascending: false })
      ]);

    if (foldersResult.error) {
      setMessage(`Failed to load folders: ${foldersResult.error.message}`);
      setLoading(false);
      return;
    }

    if (agenciesResult.error) {
      setMessage(`Failed to load agencies: ${agenciesResult.error.message}`);
      setLoading(false);
      return;
    }

    if (buyersResult.error) {
      setMessage(`Failed to load buyers: ${buyersResult.error.message}`);
      setLoading(false);
      return;
    }

    if (accountsResult.error) {
      setMessage(`Failed to load accounts: ${accountsResult.error.message}`);
      setLoading(false);
      return;
    }

    if (proofsResult.error) {
      setMessage(`Failed to load spend proofs: ${proofsResult.error.message}`);
      setLoading(false);
      return;
    }

    setFolders((foldersResult.data || []) as SpendProofFolder[]);
    setAgencies((agenciesResult.data || []) as Agency[]);
    setBuyers((buyersResult.data || []) as Buyer[]);
    setAccounts((accountsResult.data || []) as AdAccount[]);
    setProofs((proofsResult.data || []) as SpendProof[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function getFolderName(id: string | null) {
    return folders.find((folder) => folder.id === id)?.name || 'Unfiled';
  }

  function getAgencyName(id: string | null) {
    return agencies.find((agency) => agency.id === id)?.name || '-';
  }

  function getBuyerName(id: string | null) {
    return buyers.find((buyer) => buyer.id === id)?.name || '-';
  }

  function getAccountName(id: string | null) {
    return accounts.find((account) => account.id === id)?.account_name || '-';
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith('image/')
    );

    setFiles(selected);
  }

  function handleAccountSelect(accountId: string) {
    setAdAccountId(accountId);

    const account = accounts.find((item) => item.id === accountId);

    if (account?.agency_id) {
      setAgencyId(account.agency_id);
    }

    if (account?.buyer_id) {
      setBuyerId(account.buyer_id);
    }
  }

  async function createFolder() {
    if (!newFolderName.trim()) {
      setMessage('Folder name is required.');
      return;
    }

    setMessage('');

    const { data, error } = await supabase
      .from('spend_proof_folders')
      .insert({
        name: newFolderName.trim(),
        description: newFolderDescription.trim() || null,
        color: newFolderColor || '#2563eb'
      })
      .select()
      .single();

    if (error) {
      setMessage(`Failed to create folder: ${error.message}`);
      return;
    }

    setFolderId(data.id);
    setFilterFolderId(data.id);
    setNewFolderName('');
    setNewFolderDescription('');
    setNewFolderColor('#2563eb');
    setMessage('Folder created successfully.');
    await loadData();
  }

  async function deleteFolder(folder: SpendProofFolder) {
    const confirmed = window.confirm(
      `Delete folder "${folder.name}"? Screenshots will not be deleted, they will become unfiled.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('spend_proof_folders')
      .delete()
      .eq('id', folder.id);

    if (error) {
      setMessage(`Failed to delete folder: ${error.message}`);
      return;
    }

    if (folderId === folder.id) setFolderId('');
    if (filterFolderId === folder.id) setFilterFolderId('');

    setMessage('Folder deleted.');
    await loadData();
  }

  async function uploadProofs() {
    if (files.length === 0) {
      setMessage('Select at least one screenshot.');
      return;
    }

    if (!proofDate) {
      setMessage('Proof date is required.');
      return;
    }

    if (!agencyId) {
      setMessage('Agency is required for each screenshot.');
      return;
    }

    if (!buyerId) {
      setMessage('Buyer is required for each screenshot.');
      return;
    }

    if (!adAccountId) {
      setMessage('Ad account is required for each screenshot.');
      return;
    }

    setUploading(true);
    setMessage('');

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const folderPath = folderId || 'unfiled';
      const path = `${folderPath}/${proofDate}/${Date.now()}-${index}-${safeFileName(file.name)}`;

      const uploadResult = await supabase.storage
        .from('spend-proofs')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadResult.error) {
        setMessage(`Upload failed: ${uploadResult.error.message}`);
        setUploading(false);
        return;
      }

      const publicUrlResult = supabase.storage
        .from('spend-proofs')
        .getPublicUrl(path);

      const screenshotUrl = publicUrlResult.data.publicUrl;

      const insertResult = await supabase.from('spend_proofs').insert({
        folder_id: folderId || null,
        proof_date: proofDate,
        platform,
        agency_id: agencyId,
        buyer_id: buyerId,
        ad_account_id: adAccountId,
        campaign_name: campaignName.trim() || null,
        spend_amount: Number(spendAmount || 0),
        currency,
        screenshot_url: screenshotUrl,
        screenshot_path: path,
        notes: notes.trim() || null
      });

      if (insertResult.error) {
        setMessage(`Failed to save proof: ${insertResult.error.message}`);
        setUploading(false);
        return;
      }
    }

    setFiles([]);
    setCampaignName('');
    setSpendAmount('');
    setNotes('');
    setMessage('Spend proof uploaded successfully.');
    setUploading(false);
    await loadData();
  }

  async function deleteProof(proof: SpendProof) {
    const confirmed = window.confirm('Delete this spend proof screenshot?');

    if (!confirmed) return;

    if (proof.screenshot_path) {
      await supabase.storage
        .from('spend-proofs')
        .remove([proof.screenshot_path]);
    }

    const { error } = await supabase
      .from('spend_proofs')
      .delete()
      .eq('id', proof.id);

    if (error) {
      setMessage(`Failed to delete proof: ${error.message}`);
      return;
    }

    setMessage('Spend proof deleted.');
    await loadData();
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage('Screenshot URL copied.');
  }

  const filteredAccountsForUpload = useMemo(() => {
    return accounts.filter((account) => {
      if (agencyId && account.agency_id !== agencyId) return false;
      if (buyerId && account.buyer_id !== buyerId) return false;
      return true;
    });
  }, [accounts, agencyId, buyerId]);

  const filteredProofs = useMemo(() => {
    return proofs.filter((proof) => {
      if (filterFolderId === 'unfiled' && proof.folder_id) return false;
      if (filterFolderId && filterFolderId !== 'unfiled' && proof.folder_id !== filterFolderId) return false;
      if (filterAgencyId && proof.agency_id !== filterAgencyId) return false;
      if (filterBuyerId && proof.buyer_id !== filterBuyerId) return false;
      if (filterAccountId && proof.ad_account_id !== filterAccountId) return false;
      if (filterPlatform && proof.platform !== filterPlatform) return false;
      if (filterStartDate && proof.proof_date < filterStartDate) return false;
      if (filterEndDate && proof.proof_date > filterEndDate) return false;

      return true;
    });
  }, [
    proofs,
    filterFolderId,
    filterAgencyId,
    filterBuyerId,
    filterAccountId,
    filterPlatform,
    filterStartDate,
    filterEndDate
  ]);

  const totalProofSpend = filteredProofs.reduce(
    (sum, proof) => sum + Number(proof.spend_amount || 0),
    0
  );

  const folderStats = useMemo(() => {
    return folders.map((folder) => {
      const folderProofs = proofs.filter((proof) => proof.folder_id === folder.id);
      const spend = folderProofs.reduce(
        (sum, proof) => sum + Number(proof.spend_amount || 0),
        0
      );

      return {
        folder,
        count: folderProofs.length,
        spend
      };
    });
  }, [folders, proofs]);

  const unfiledProofs = proofs.filter((proof) => !proof.folder_id);

  const previewUrls = useMemo(() => {
    return files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file)
    }));
  }, [files]);

  return (
    <>
      <PageTitle
        title="Spend Proofs"
        subtitle="Upload Facebook screenshots into folders with date, buyer, agency and ad account proof."
      />

      <div className="grid grid-2">
        <div className="card">
          <h2>Upload Spend Screenshot</h2>

          <label>
            Folder
            <select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
              <option value="">Unfiled</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-2">
            <label>
              Date
              <input
                type="date"
                value={proofDate}
                onChange={(e) => setProofDate(e.target.value)}
              />
            </label>

            <label>
              Platform
              <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="meta">Meta</option>
                <option value="tiktok">TikTok</option>
                <option value="google">Google</option>
                <option value="propellerads">PropellerAds</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <div className="grid grid-2">
            <label>
              Agency
              <select
                value={agencyId}
                onChange={(e) => {
                  setAgencyId(e.target.value);
                  setAdAccountId('');
                }}
              >
                <option value="">Select agency</option>
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
                value={buyerId}
                onChange={(e) => {
                  setBuyerId(e.target.value);
                  setAdAccountId('');
                }}
              >
                <option value="">Select buyer</option>
                {buyers.map((buyer) => (
                  <option key={buyer.id} value={buyer.id}>
                    {buyer.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Ad Account
            <select value={adAccountId} onChange={(e) => handleAccountSelect(e.target.value)}>
              <option value="">Select ad account</option>
              {filteredAccountsForUpload.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name}
                  {account.geo ? ` — ${account.geo}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label>
            Campaign Name
            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Campaign / ad set / spend proof note"
            />
          </label>

          <div className="grid grid-2">
            <label>
              Spend Amount
              <input
                type="number"
                value={spendAmount}
                onChange={(e) => setSpendAmount(e.target.value)}
                placeholder="500"
              />
            </label>

            <label>
              Currency
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </label>
          </div>

          <label>
            Screenshots
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              multiple
              onChange={handleFiles}
            />
          </label>

          <label>
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Example: Facebook Ads Manager screenshot for PH campaign."
            />
          </label>

          {previewUrls.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p className="muted">Selected screenshots:</p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: 10,
                  marginTop: 10
                }}
              >
                {previewUrls.map((preview) => (
                  <div key={preview.url}>
                    <img
                      src={preview.url}
                      alt={preview.name}
                      style={{
                        width: '100%',
                        height: 110,
                        objectFit: 'cover',
                        borderRadius: 14,
                        border: '1px solid #e5e7eb'
                      }}
                    />
                    <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                      {preview.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <br />

          <button className="btn" type="button" onClick={uploadProofs} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Proof'}
          </button>

          {message && (
            <p className="muted" style={{ marginTop: 12 }}>
              {message}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Folders</h2>

          <label>
            New Folder Name
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="July PH Facebook Spend / Zeydoo BD / Internovus BR"
            />
          </label>

          <label>
            Folder Description
            <textarea
              value={newFolderDescription}
              onChange={(e) => setNewFolderDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes for this folder..."
            />
          </label>

          <label>
            Folder Color
            <input
              type="color"
              value={newFolderColor}
              onChange={(e) => setNewFolderColor(e.target.value)}
            />
          </label>

          <button className="btn" type="button" onClick={createFolder}>
            Create Folder
          </button>

          <br />
          <br />

          <h2>Proof Summary</h2>

          <div className="grid grid-2">
            <div>
              <p className="muted">Proofs Uploaded</p>
              <h2>{filteredProofs.length}</h2>
            </div>

            <div>
              <p className="muted">Proof Spend</p>
              <h2>{money(totalProofSpend)}</h2>
            </div>
          </div>

          <br />

          <h2>Folder Overview</h2>

          <table>
            <tbody>
              <tr>
                <td>
                  <strong>Unfiled</strong>
                </td>
                <td>{unfiledProofs.length} proofs</td>
                <td>
                  <button
                    className="btn small secondary"
                    type="button"
                    onClick={() => setFilterFolderId('unfiled')}
                  >
                    View
                  </button>
                </td>
              </tr>

              {folderStats.map((item) => (
                <tr key={item.folder.id}>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: item.folder.color || '#2563eb',
                        marginRight: 8
                      }}
                    />
                    <strong>{item.folder.name}</strong>
                  </td>
                  <td>
                    {item.count} proofs / {money(item.spend)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn small secondary"
                        type="button"
                        onClick={() => setFilterFolderId(item.folder.id)}
                      >
                        View
                      </button>

                      <button
                        className="btn small danger"
                        type="button"
                        onClick={() => deleteFolder(item.folder)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h2>Filters</h2>

        <div className="filter-bar">
          <label>
            Folder
            <select value={filterFolderId} onChange={(e) => setFilterFolderId(e.target.value)}>
              <option value="">All folders</option>
              <option value="unfiled">Unfiled</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Start Date
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </label>

          <label>
            End Date
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </label>

          <label>
            Platform
            <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
              <option value="">All platforms</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="meta">Meta</option>
              <option value="tiktok">TikTok</option>
              <option value="google">Google</option>
              <option value="propellerads">PropellerAds</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label>
            Agency
            <select value={filterAgencyId} onChange={(e) => setFilterAgencyId(e.target.value)}>
              <option value="">All agencies</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Buyer
            <select value={filterBuyerId} onChange={(e) => setFilterBuyerId(e.target.value)}>
              <option value="">All buyers</option>
              {buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ad Account
            <select value={filterAccountId} onChange={(e) => setFilterAccountId(e.target.value)}>
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name}
                  {account.geo ? ` — ${account.geo}` : ''}
                </option>
              ))}
            </select>
          </label>

          <button className="btn small secondary" type="button" onClick={loadData}>
            Refresh
          </button>
        </div>
      </div>

      <div className="card table-wrap" style={{ marginTop: 18 }}>
        <h2>Uploaded Spend Proofs</h2>

        {loading ? (
          <p className="muted">Loading spend proofs...</p>
        ) : filteredProofs.length === 0 ? (
          <p className="muted">No spend proofs uploaded yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Screenshot</th>
                <th>Folder</th>
                <th>Date</th>
                <th>Platform</th>
                <th>Agency</th>
                <th>Buyer</th>
                <th>Ad Account</th>
                <th>Campaign</th>
                <th>Spend</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredProofs.map((proof) => (
                <tr key={proof.id}>
                  <td>
                    <a href={proof.screenshot_url} target="_blank" rel="noreferrer">
                      <img
                        src={proof.screenshot_url}
                        alt="Spend proof"
                        style={{
                          width: 90,
                          height: 70,
                          objectFit: 'cover',
                          borderRadius: 12,
                          border: '1px solid #e5e7eb'
                        }}
                      />
                    </a>
                  </td>
                  <td>{getFolderName(proof.folder_id)}</td>
                  <td>{proof.proof_date}</td>
                  <td>{proof.platform || '-'}</td>
                  <td>{getAgencyName(proof.agency_id)}</td>
                  <td>{getBuyerName(proof.buyer_id)}</td>
                  <td>{getAccountName(proof.ad_account_id)}</td>
                  <td>{proof.campaign_name || '-'}</td>
                  <td>{money(Number(proof.spend_amount || 0), proof.currency || 'USD')}</td>
                  <td>{proof.notes || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <a
                        className="btn small secondary"
                        href={proof.screenshot_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>

                      <button
                        className="btn small secondary"
                        type="button"
                        onClick={() => copyUrl(proof.screenshot_url)}
                      >
                        Copy URL
                      </button>

                      <button
                        className="btn small danger"
                        type="button"
                        onClick={() => deleteProof(proof)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}