'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { supabase } from '@/lib/supabase-client';

type Buyer = {
  id: string;
  name: string;
};

type Offer = {
  id: string;
  name: string;
  geo: string | null;
};

type AdAccount = {
  id: string;
  account_name: string;
  geo: string | null;
};

type CreativeFolder = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
};

type Creative = {
  id: string;
  name: string;
  image_url: string;
  image_path: string | null;
  buyer_id: string | null;
  offer_id: string | null;
  ad_account_id: string | null;
  geo: string | null;
  platform: string | null;
  angle: string | null;
  status: string | null;
  spend: number | null;
  leads: number | null;
  folder_id: string | null;
  primary_text: string | null;
  headline: string | null;
  description: string | null;
  cta: string | null;
  hook: string | null;
  notes: string | null;
  created_at: string;
};

type CreativeForm = {
  name: string;
  buyer_id: string;
  offer_id: string;
  ad_account_id: string;
  geo: string;
  platform: string;
  angle: string;
  status: string;
  spend: string;
  leads: string;
  folder_id: string;
  primary_text: string;
  headline: string;
  description: string;
  cta: string;
  hook: string;
  notes: string;
};

const emptyForm: CreativeForm = {
  name: '',
  buyer_id: '',
  offer_id: '',
  ad_account_id: '',
  geo: '',
  platform: 'facebook',
  angle: '',
  status: 'testing',
  spend: '0',
  leads: '0',
  folder_id: '',
  primary_text: '',
  headline: '',
  description: '',
  cta: 'Learn More',
  hook: '',
  notes: ''
};

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function getCpl(spend: number | null | undefined, leads: number | null | undefined) {
  const s = Number(spend || 0);
  const l = Number(leads || 0);

  if (!l) return '-';

  return money(s / l);
}

function statusClass(status: string | null | undefined) {
  const s = String(status || '').toLowerCase();

  if (s === 'winner' || s === 'active') return 'green';
  if (s === 'testing') return 'amber';
  if (s === 'paused') return 'blue';
  if (s === 'rejected' || s === 'failed') return 'red';

  return 'blue';
}

export default function CreativesPage() {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [folders, setFolders] = useState<CreativeFolder[]>([]);

  const [form, setForm] = useState<CreativeForm>(emptyForm);
  const [files, setFiles] = useState<File[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState('');
  const [editingImagePath, setEditingImagePath] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [folderFilter, setFolderFilter] = useState('all');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkPlatform, setBulkPlatform] = useState('');
  const [bulkGeo, setBulkGeo] = useState('');
  const [bulkAngle, setBulkAngle] = useState('');
  const [bulkFolderId, setBulkFolderId] = useState('');

  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [previewCreative, setPreviewCreative] = useState<Creative | null>(null);

  async function loadData() {
    setLoading(true);
    setMessage('');

    const [creativesResult, buyersResult, offersResult, accountsResult, foldersResult] =
      await Promise.all([
        supabase
          .from('creatives')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('buyers')
          .select('id, name')
          .order('name', { ascending: true }),

        supabase
          .from('offers')
          .select('id, name, geo')
          .order('name', { ascending: true }),

        supabase
          .from('ad_accounts')
          .select('id, account_name, geo')
          .order('account_name', { ascending: true }),

        supabase
          .from('creative_folders')
          .select('id, name, description, color')
          .order('created_at', { ascending: false })
      ]);

    if (creativesResult.error) {
      setMessage(`Failed to load creatives: ${creativesResult.error.message}`);
      setLoading(false);
      return;
    }

    if (buyersResult.error || offersResult.error || accountsResult.error || foldersResult.error) {
      setMessage('Failed to load buyers, offers, accounts or folders.');
      setLoading(false);
      return;
    }

    setCreatives((creativesResult.data || []) as Creative[]);
    setBuyers((buyersResult.data || []) as Buyer[]);
    setOffers((offersResult.data || []) as Offer[]);
    setAccounts((accountsResult.data || []) as AdAccount[]);
    setFolders((foldersResult.data || []) as CreativeFolder[]);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateField(field: keyof CreativeForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleOfferChange(offerId: string) {
    const offer = offers.find((item) => item.id === offerId);

    setForm((current) => ({
      ...current,
      offer_id: offerId,
      geo: offer?.geo || current.geo
    }));
  }

  function handleAccountChange(accountId: string) {
    const account = accounts.find((item) => item.id === accountId);

    setForm((current) => ({
      ...current,
      ad_account_id: accountId,
      geo: account?.geo || current.geo
    }));
  }

  function getBuyerName(id: string | null) {
    return buyers.find((buyer) => buyer.id === id)?.name || '-';
  }

  function getOfferName(id: string | null) {
    return offers.find((offer) => offer.id === id)?.name || '-';
  }

  function getAccountName(id: string | null) {
    return accounts.find((account) => account.id === id)?.account_name || '-';
  }

  function getFolderName(id: string | null) {
    return folders.find((folder) => folder.id === id)?.name || 'No folder';
  }

  function resetForm() {
    setForm(emptyForm);
    setFiles([]);
    setEditingId(null);
    setEditingImageUrl('');
    setEditingImagePath('');
    setMessage('');
  }

  function editCreative(creative: Creative) {
    setEditingId(creative.id);
    setEditingImageUrl(creative.image_url || '');
    setEditingImagePath(creative.image_path || '');

    setForm({
      name: creative.name || '',
      buyer_id: creative.buyer_id || '',
      offer_id: creative.offer_id || '',
      ad_account_id: creative.ad_account_id || '',
      geo: creative.geo || '',
      platform: creative.platform || 'facebook',
      angle: creative.angle || '',
      status: creative.status || 'testing',
      spend: String(creative.spend || 0),
      leads: String(creative.leads || 0),
      folder_id: creative.folder_id || '',
      primary_text: creative.primary_text || '',
      headline: creative.headline || '',
      description: creative.description || '',
      cta: creative.cta || 'Learn More',
      hook: creative.hook || '',
      notes: creative.notes || ''
    });

    setFiles([]);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function uploadSingleImage(selectedFile: File, index: number) {
    const fileExt = selectedFile.name.split('.').pop();

    const safeName = form.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const originalName = selectedFile.name
      .replace(/\.[^/.]+$/, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const filePath = `${Date.now()}-${index}-${safeName || originalName || 'creative'}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('creatives')
      .upload(filePath, selectedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from('creatives')
      .getPublicUrl(filePath);

    return {
      imageUrl: data.publicUrl,
      imagePath: filePath,
      originalName: selectedFile.name.replace(/\.[^/.]+$/, '')
    };
  }

  async function saveCreative() {
    if (!form.name.trim() && files.length <= 1 && !editingId) {
      setMessage('Creative name is required.');
      return;
    }

    if (!editingId && files.length === 0) {
      setMessage('Please upload at least one creative image.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      if (editingId) {
        let imageUrl = editingImageUrl;
        let imagePath = editingImagePath || null;

        if (files.length > 0) {
          const uploaded = await uploadSingleImage(files[0], 0);
          imageUrl = uploaded.imageUrl;
          imagePath = uploaded.imagePath;
        }

        const payload = {
          name: form.name.trim(),
          image_url: imageUrl,
          image_path: imagePath,
          buyer_id: form.buyer_id || null,
          offer_id: form.offer_id || null,
          ad_account_id: form.ad_account_id || null,
          geo: form.geo.trim() || null,
          platform: form.platform || 'facebook',
          angle: form.angle.trim() || null,
          status: form.status || 'testing',
          spend: Number(form.spend || 0),
          leads: Number(form.leads || 0),
          folder_id: form.folder_id || null,
          primary_text: form.primary_text.trim() || null,
          headline: form.headline.trim() || null,
          description: form.description.trim() || null,
          cta: form.cta.trim() || null,
          hook: form.hook.trim() || null,
          notes: form.notes.trim() || null
        };

        const { error } = await supabase
          .from('creatives')
          .update(payload)
          .eq('id', editingId);

        if (error) throw new Error(error.message);

        setMessage('Creative updated successfully.');
      } else {
        const rows = [];

        for (let index = 0; index < files.length; index += 1) {
          const uploaded = await uploadSingleImage(files[index], index);

          rows.push({
            name:
              files.length === 1
                ? form.name.trim()
                : form.name.trim()
                  ? `${form.name.trim()} ${index + 1}`
                  : uploaded.originalName,
            image_url: uploaded.imageUrl,
            image_path: uploaded.imagePath,
            buyer_id: form.buyer_id || null,
            offer_id: form.offer_id || null,
            ad_account_id: form.ad_account_id || null,
            geo: form.geo.trim() || null,
            platform: form.platform || 'facebook',
            angle: form.angle.trim() || null,
            status: form.status || 'testing',
            spend: Number(form.spend || 0),
            leads: Number(form.leads || 0),
            folder_id: form.folder_id || null,
            primary_text: form.primary_text.trim() || null,
            headline: form.headline.trim() || null,
            description: form.description.trim() || null,
            cta: form.cta.trim() || null,
            hook: form.hook.trim() || null,
            notes: form.notes.trim() || null
          });
        }

        const { error } = await supabase
          .from('creatives')
          .insert(rows);

        if (error) throw new Error(error.message);

        setMessage(`${rows.length} creative image${rows.length === 1 ? '' : 's'} uploaded successfully.`);
      }

      setForm(emptyForm);
      setFiles([]);
      setEditingId(null);
      setEditingImageUrl('');
      setEditingImagePath('');

      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save creative.');
    }

    setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from('creatives')
      .update({ status })
      .eq('id', id);

    if (error) {
      setMessage(`Failed to update status: ${error.message}`);
      return;
    }

    setMessage(`Creative marked as ${status}.`);
    await loadData();
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function selectAllVisible() {
    setSelectedIds(filteredCreatives.map((creative) => creative.id));
  }

  function clearSelected() {
    setSelectedIds([]);
  }

  async function createFolder() {
    if (!newFolderName.trim()) {
      setMessage('Folder name is required.');
      return;
    }

    const { error } = await supabase
      .from('creative_folders')
      .insert({
        name: newFolderName.trim(),
        description: newFolderDescription.trim() || null
      });

    if (error) {
      setMessage(`Failed to create folder: ${error.message}`);
      return;
    }

    setMessage('Folder created successfully.');
    setNewFolderName('');
    setNewFolderDescription('');
    await loadData();
  }

  async function bulkUpdateCreatives() {
    if (selectedIds.length === 0) {
      setMessage('Select at least one creative first.');
      return;
    }

    const payload: {
      status?: string;
      platform?: string;
      geo?: string | null;
      angle?: string | null;
      folder_id?: string | null;
    } = {};

    if (bulkStatus) payload.status = bulkStatus;
    if (bulkPlatform) payload.platform = bulkPlatform;
    if (bulkGeo.trim()) payload.geo = bulkGeo.trim();
    if (bulkAngle.trim()) payload.angle = bulkAngle.trim();
    if (bulkFolderId) payload.folder_id = bulkFolderId === 'none' ? null : bulkFolderId;

    if (Object.keys(payload).length === 0) {
      setMessage('Choose at least one bulk edit field.');
      return;
    }

    const { error } = await supabase
      .from('creatives')
      .update(payload)
      .in('id', selectedIds);

    if (error) {
      setMessage(`Bulk update failed: ${error.message}`);
      return;
    }

    setMessage(`${selectedIds.length} creative${selectedIds.length === 1 ? '' : 's'} updated.`);
    setSelectedIds([]);
    setBulkStatus('');
    setBulkPlatform('');
    setBulkGeo('');
    setBulkAngle('');
    setBulkFolderId('');
    await loadData();
  }

  async function bulkDeleteCreatives() {
    if (selectedIds.length === 0) {
      setMessage('Select at least one creative first.');
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected creative${selectedIds.length === 1 ? '' : 's'}?`
    );

    if (!confirmed) return;

    const selectedCreatives = creatives.filter((creative) =>
      selectedIds.includes(creative.id)
    );

    const paths = selectedCreatives
      .map((creative) => creative.image_path)
      .filter(Boolean) as string[];

    if (paths.length > 0) {
      await supabase.storage
        .from('creatives')
        .remove(paths);
    }

    const { error } = await supabase
      .from('creatives')
      .delete()
      .in('id', selectedIds);

    if (error) {
      setMessage(`Bulk delete failed: ${error.message}`);
      return;
    }

    setMessage(`${selectedIds.length} creative${selectedIds.length === 1 ? '' : 's'} deleted.`);
    setSelectedIds([]);
    await loadData();
  }

  async function deleteCreative(creative: Creative) {
    const confirmed = window.confirm('Delete this creative?');

    if (!confirmed) return;

    if (creative.image_path) {
      await supabase.storage
        .from('creatives')
        .remove([creative.image_path]);
    }

    const { error } = await supabase
      .from('creatives')
      .delete()
      .eq('id', creative.id);

    if (error) {
      setMessage(`Failed to delete creative: ${error.message}`);
      return;
    }

    setMessage('Creative deleted successfully.');
    await loadData();
  }

  const filteredCreatives = useMemo(() => {
    return creatives.filter((creative) => {
      const matchesStatus =
        statusFilter === 'all' || creative.status === statusFilter;

      const matchesPlatform =
        platformFilter === 'all' || creative.platform === platformFilter;

      const matchesFolder =
        folderFilter === 'all' ||
        (folderFilter === 'none' && !creative.folder_id) ||
        creative.folder_id === folderFilter;

      return matchesStatus && matchesPlatform && matchesFolder;
    });
  }, [creatives, statusFilter, platformFilter, folderFilter]);

  const totals = useMemo(() => {
    const spend = creatives.reduce((sum, item) => sum + Number(item.spend || 0), 0);
    const leads = creatives.reduce((sum, item) => sum + Number(item.leads || 0), 0);
    const winners = creatives.filter((item) => item.status === 'winner').length;
    const testing = creatives.filter((item) => item.status === 'testing').length;

    return {
      spend,
      leads,
      winners,
      testing,
      cpl: leads ? spend / leads : 0
    };
  }, [creatives]);

  return (
    <>
      <PageTitle
        title="Creatives"
        subtitle="Upload creative images, organize folders, track ad copy, angles, status, spend, leads and CPL."
      />

      <section className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="card metric-card">
          <p className="metric-label">Total Creative Spend</p>
          <h2 className="metric-value">{money(totals.spend)}</h2>
          <p className="metric-sub">Across uploaded creatives</p>
        </div>

        <div className="card metric-card">
          <p className="metric-label">Total Leads</p>
          <h2 className="metric-value">{totals.leads}</h2>
          <p className="metric-sub">Tracked manually</p>
        </div>

        <div className="card metric-card">
          <p className="metric-label">Average CPL</p>
          <h2 className="metric-value">{totals.leads ? money(totals.cpl) : '-'}</h2>
          <p className="metric-sub">Spend divided by leads</p>
        </div>

        <div className="card metric-card">
          <p className="metric-label">Winners / Testing</p>
          <h2 className="metric-value">{totals.winners} / {totals.testing}</h2>
          <p className="metric-sub">Creative status</p>
        </div>
      </section>

      <div className="grid grid-2">
        <div className="card">
          <h2>{editingId ? 'Edit Creative' : 'Upload Creative'}</h2>

          <div className="folder-create-box">
            <strong>Create Folder</strong>

            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name, e.g. Bangladesh Lucky Wheel"
            />

            <input
              value={newFolderDescription}
              onChange={(e) => setNewFolderDescription(e.target.value)}
              placeholder="Optional description"
            />

            <button className="btn small secondary" type="button" onClick={createFolder}>
              Create Folder
            </button>
          </div>

          <label>
            Creative Name
            <input
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Brazil wheel angle 01"
            />
          </label>

          <label>
            Creative Images
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
          </label>

          <label>
            Upload Folder
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              multiple
              // @ts-expect-error webkitdirectory is supported by Chromium browsers
              webkitdirectory="true"
              onChange={(e) => {
                const selectedFiles = Array.from(e.target.files || []).filter((item) =>
                  item.type.startsWith('image/')
                );

                setFiles(selectedFiles);
              }}
            />
          </label>

          {files.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p className="muted">
                {files.length} image{files.length === 1 ? '' : 's'} selected.
              </p>

              <div className="selected-preview-grid">
                {files.slice(0, 12).map((selectedFile, index) => (
                  <div className="selected-preview-card" key={`${selectedFile.name}-${index}`}>
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt={selectedFile.name}
                    />
                    <span>{selectedFile.name}</span>
                  </div>
                ))}
              </div>

              {files.length > 12 && (
                <p className="muted" style={{ marginTop: 8 }}>
                  Showing first 12 previews. {files.length - 12} more selected.
                </p>
              )}
            </div>
          )}

          {editingImageUrl && files.length === 0 && (
            <div style={{ marginTop: 12 }}>
              <p className="muted">Current image:</p>
              <img
                src={editingImageUrl}
                alt={form.name}
                style={{
                  width: '100%',
                  maxWidth: 260,
                  borderRadius: 14,
                  border: '1px solid #e5e7eb'
                }}
              />
            </div>
          )}

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <label>
              Buyer
              <select
                value={form.buyer_id}
                onChange={(e) => updateField('buyer_id', e.target.value)}
              >
                <option value="">No buyer</option>
                {buyers.map((buyer) => (
                  <option key={buyer.id} value={buyer.id}>
                    {buyer.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Offer
              <select
                value={form.offer_id}
                onChange={(e) => handleOfferChange(e.target.value)}
              >
                <option value="">No offer</option>
                {offers.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.name}
                    {offer.geo ? ` — ${offer.geo}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Ad Account
            <select
              value={form.ad_account_id}
              onChange={(e) => handleAccountChange(e.target.value)}
            >
              <option value="">No account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name}
                  {account.geo ? ` — ${account.geo}` : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <label>
              GEO
              <input
                value={form.geo}
                onChange={(e) => updateField('geo', e.target.value)}
                placeholder="BR / PH / VN / SE"
              />
            </label>

            <label>
              Platform
              <select
                value={form.platform}
                onChange={(e) => updateField('platform', e.target.value)}
              >
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="google">Google</option>
                <option value="native">Native</option>
                <option value="push">Push</option>
              </select>
            </label>
          </div>

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <label>
              Angle
              <input
                value={form.angle}
                onChange={(e) => updateField('angle', e.target.value)}
                placeholder="UGC / bonus / news / wheel / premium"
              />
            </label>

            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
              >
                <option value="testing">Testing</option>
                <option value="active">Active</option>
                <option value="winner">Winner</option>
                <option value="paused">Paused</option>
                <option value="rejected">Rejected</option>
                <option value="failed">Failed</option>
              </select>
            </label>
          </div>

          <label>
            Folder
            <select
              value={form.folder_id}
              onChange={(e) => updateField('folder_id', e.target.value)}
            >
              <option value="">No folder</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <label>
              Spend
              <input
                type="number"
                value={form.spend}
                onChange={(e) => updateField('spend', e.target.value)}
              />
            </label>

            <label>
              Leads
              <input
                type="number"
                value={form.leads}
                onChange={(e) => updateField('leads', e.target.value)}
              />
            </label>
          </div>

          <label>
            Hook
            <input
              value={form.hook}
              onChange={(e) => updateField('hook', e.target.value)}
              placeholder="Main angle/hook, e.g. Spin & win, premium casino, shocking news..."
            />
          </label>

          <label>
            Primary Text
            <textarea
              value={form.primary_text}
              onChange={(e) => updateField('primary_text', e.target.value)}
              rows={3}
              placeholder="Main Meta/Facebook primary text..."
            />
          </label>

          <div className="grid grid-2" style={{ marginTop: 14 }}>
            <label>
              Headline
              <input
                value={form.headline}
                onChange={(e) => updateField('headline', e.target.value)}
                placeholder="Ad headline"
              />
            </label>

            <label>
              CTA
              <select
                value={form.cta}
                onChange={(e) => updateField('cta', e.target.value)}
              >
                <option value="Learn More">Learn More</option>
                <option value="Sign Up">Sign Up</option>
                <option value="Apply Now">Apply Now</option>
                <option value="Shop Now">Shop Now</option>
                <option value="Play Now">Play Now</option>
                <option value="Claim Now">Claim Now</option>
                <option value="Get Offer">Get Offer</option>
              </select>
            </label>
          </div>

          <label>
            Description
            <input
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Short ad description"
            />
          </label>

          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={4}
              placeholder="Result notes, reason why it worked or failed..."
            />
          </label>

          <br />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={saveCreative} disabled={saving}>
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Update Creative'
                  : files.length > 1
                    ? `Upload ${files.length} Creatives`
                    : 'Upload Creative'}
            </button>

            {editingId && (
              <button className="btn secondary" type="button" onClick={resetForm}>
                Cancel Edit
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
          <h2>Creative Library</h2>

          <div className="bulk-panel">
            <div className="bulk-panel-top">
              <strong>{selectedIds.length} selected</strong>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn small secondary" type="button" onClick={selectAllVisible}>
                  Select All Visible
                </button>

                <button className="btn small secondary" type="button" onClick={clearSelected}>
                  Clear
                </button>

                <button className="btn small danger" type="button" onClick={bulkDeleteCreatives}>
                  Bulk Delete
                </button>
              </div>
            </div>

            <div className="bulk-edit-grid">
              <label>
                Bulk Status
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                >
                  <option value="">No change</option>
                  <option value="testing">Testing</option>
                  <option value="active">Active</option>
                  <option value="winner">Winner</option>
                  <option value="paused">Paused</option>
                  <option value="rejected">Rejected</option>
                  <option value="failed">Failed</option>
                </select>
              </label>

              <label>
                Bulk Platform
                <select
                  value={bulkPlatform}
                  onChange={(e) => setBulkPlatform(e.target.value)}
                >
                  <option value="">No change</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                  <option value="google">Google</option>
                  <option value="native">Native</option>
                  <option value="push">Push</option>
                </select>
              </label>

              <label>
                Bulk GEO
                <input
                  value={bulkGeo}
                  onChange={(e) => setBulkGeo(e.target.value)}
                  placeholder="BR / PH / VN"
                />
              </label>

              <label>
                Bulk Angle
                <input
                  value={bulkAngle}
                  onChange={(e) => setBulkAngle(e.target.value)}
                  placeholder="UGC / bonus / wheel"
                />
              </label>

              <label>
                Bulk Folder
                <select
                  value={bulkFolderId}
                  onChange={(e) => setBulkFolderId(e.target.value)}
                >
                  <option value="">No change</option>
                  <option value="none">Remove folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button className="btn small" type="button" onClick={bulkUpdateCreatives}>
              Apply Bulk Edit
            </button>
          </div>

          <div className="grid grid-3" style={{ marginBottom: 14 }}>
            <label>
              Status Filter
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="testing">Testing</option>
                <option value="active">Active</option>
                <option value="winner">Winner</option>
                <option value="paused">Paused</option>
                <option value="rejected">Rejected</option>
                <option value="failed">Failed</option>
              </select>
            </label>

            <label>
              Platform Filter
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="google">Google</option>
                <option value="native">Native</option>
                <option value="push">Push</option>
              </select>
            </label>

            <label>
              Folder Filter
              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
              >
                <option value="all">All folders</option>
                <option value="none">No folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <p className="muted">Loading creatives from Supabase...</p>
          ) : (
            <div className="creative-grid">
              {filteredCreatives.length === 0 ? (
                <p className="muted">No creatives uploaded yet.</p>
              ) : (
                filteredCreatives.map((creative) => (
                  <div
                    className={`creative-card ${selectedIds.includes(creative.id) ? 'selected' : ''}`}
                    key={creative.id}
                  >
                    <div className="creative-select-row">
                      <label className="creative-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(creative.id)}
                          onChange={() => toggleSelected(creative.id)}
                        />
                        Select
                      </label>
                    </div>

                    <button
                      className="creative-image-button"
                      type="button"
                      onClick={() => setPreviewCreative(creative)}
                    >
                      <img src={creative.image_url} alt={creative.name} />
                    </button>

                    <div className="creative-card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <strong>{creative.name}</strong>
                        <span className={`badge ${statusClass(creative.status)}`}>
                          {creative.status || 'testing'}
                        </span>
                      </div>

                      <p className="muted">
                        {creative.platform || 'facebook'} · {creative.geo || '-'} · {creative.angle || '-'}
                        <br />
                        Folder: {getFolderName(creative.folder_id)}
                      </p>

                      {creative.headline && (
                        <p className="creative-copy-preview">
                          <strong>{creative.headline}</strong>
                          {creative.primary_text && (
                            <>
                              <br />
                              {creative.primary_text.slice(0, 90)}
                              {creative.primary_text.length > 90 ? '...' : ''}
                            </>
                          )}
                        </p>
                      )}

                      <div className="creative-stats">
                        <span>Spend: {money(creative.spend)}</span>
                        <span>Leads: {creative.leads || 0}</span>
                        <span>CPL: {getCpl(creative.spend, creative.leads)}</span>
                      </div>

                      <p className="muted">
                        Buyer: {getBuyerName(creative.buyer_id)}
                        <br />
                        Offer: {getOfferName(creative.offer_id)}
                        <br />
                        Account: {getAccountName(creative.ad_account_id)}
                      </p>

                      {creative.notes && (
                        <p className="muted">{creative.notes}</p>
                      )}

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          className="btn small"
                          type="button"
                          onClick={() => editCreative(creative)}
                        >
                          Edit
                        </button>

                        {creative.status !== 'winner' && (
                          <button
                            className="btn small secondary"
                            type="button"
                            onClick={() => updateStatus(creative.id, 'winner')}
                          >
                            Winner
                          </button>
                        )}

                        {creative.status !== 'paused' && (
                          <button
                            className="btn small secondary"
                            type="button"
                            onClick={() => updateStatus(creative.id, 'paused')}
                          >
                            Pause
                          </button>
                        )}

                        <button
                          className="btn small danger"
                          type="button"
                          onClick={() => deleteCreative(creative)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {previewCreative && (
        <div className="creative-modal-backdrop" onClick={() => setPreviewCreative(null)}>
          <div className="creative-modal" onClick={(e) => e.stopPropagation()}>
            <div className="creative-modal-header">
              <div>
                <h2>{previewCreative.name}</h2>
                <p className="muted">
                  {previewCreative.platform || 'facebook'} · {previewCreative.geo || '-'} · Folder: {getFolderName(previewCreative.folder_id)}
                </p>
              </div>

              <button
                className="btn small secondary"
                type="button"
                onClick={() => setPreviewCreative(null)}
              >
                Close
              </button>
            </div>

            <div className="creative-modal-grid">
              <div>
                <img
                  className="creative-modal-image"
                  src={previewCreative.image_url}
                  alt={previewCreative.name}
                />

                <div className="creative-modal-actions">
                  <button
                    className="btn small secondary"
                    type="button"
                    onClick={() => navigator.clipboard.writeText(previewCreative.image_url)}
                  >
                    Copy Image URL
                  </button>

                  <a
                    className="btn small"
                    href={previewCreative.image_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Image
                  </a>

                  <button
                    className="btn small"
                    type="button"
                    onClick={() => {
                      editCreative(previewCreative);
                      setPreviewCreative(null);
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className="btn small danger"
                    type="button"
                    onClick={() => {
                      setPreviewCreative(null);
                      deleteCreative(previewCreative);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="creative-modal-details">
                <div className="creative-detail-box">
                  <span>Status</span>
                  <strong>{previewCreative.status || 'testing'}</strong>
                </div>

                <div className="creative-detail-box">
                  <span>Angle</span>
                  <strong>{previewCreative.angle || '-'}</strong>
                </div>

                <div className="creative-detail-box">
                  <span>Spend</span>
                  <strong>{money(previewCreative.spend)}</strong>
                </div>

                <div className="creative-detail-box">
                  <span>Leads / CPL</span>
                  <strong>{previewCreative.leads || 0} / {getCpl(previewCreative.spend, previewCreative.leads)}</strong>
                </div>

                <div className="creative-ad-copy">
                  <h3>Ad Copy</h3>

                  <p>
                    <span>Hook</span>
                    {previewCreative.hook || '-'}
                  </p>

                  <p>
                    <span>Primary Text</span>
                    {previewCreative.primary_text || '-'}
                  </p>

                  <p>
                    <span>Headline</span>
                    {previewCreative.headline || '-'}
                  </p>

                  <p>
                    <span>Description</span>
                    {previewCreative.description || '-'}
                  </p>

                  <p>
                    <span>CTA</span>
                    {previewCreative.cta || '-'}
                  </p>
                </div>

                <div className="creative-ad-copy">
                  <h3>Linked Data</h3>

                  <p>
                    <span>Buyer</span>
                    {getBuyerName(previewCreative.buyer_id)}
                  </p>

                  <p>
                    <span>Offer</span>
                    {getOfferName(previewCreative.offer_id)}
                  </p>

                  <p>
                    <span>Account</span>
                    {getAccountName(previewCreative.ad_account_id)}
                  </p>

                  <p>
                    <span>Notes</span>
                    {previewCreative.notes || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}