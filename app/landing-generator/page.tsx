'use client';

import { useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { supabase } from '@/lib/supabase-client';

type SavedLandingPage = {
  id: string;
  name: string;
  vertical: string | null;
  geo: string | null;
  language: string | null;
  offer_url: string | null;
  prompt: string | null;
  html: string;
  created_at: string;
};

function downloadHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename.endsWith('.html') ? filename : `${filename}.html`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export default function LandingGeneratorPage() {
  const [name, setName] = useState('PH Sweepstakes Mystery Funnel');
  const [vertical, setVertical] = useState('Sweepstakes');
  const [geo, setGeo] = useState('Philippines');
  const [language, setLanguage] = useState('Filipino');
  const [offerUrl, setOfferUrl] = useState('{offer}');
  const [style, setStyle] = useState('modern mobile-first, clean, premium, Material Icons');
  const [prompt, setPrompt] = useState(
    'Create a high-converting mobile prelander with urgency, today-only giveaway, interactive mechanic, sticky CTA, and redirect to the offer after the interaction.'
  );

  const [generatedHtml, setGeneratedHtml] = useState('');
  const [savedPages, setSavedPages] = useState<SavedLandingPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [message, setMessage] = useState('');

  async function generateLandingPage() {
    setLoading(true);
    setMessage('');
    setGeneratedHtml('');

    const response = await fetch('/api/landing-generator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        vertical,
        geo,
        language,
        offerUrl,
        style,
        prompt
      })
    });

    const data = await response.json();

if (!response.ok) {
  console.log('Generator error:', data);

  setMessage(
    data.error ||
    data.details?.error?.message ||
    'Generation failed. Check server logs.'
  );

  setLoading(false);
  return;
}

    setGeneratedHtml(data.html || '');
    setMessage('Landing page generated successfully.');
    setLoading(false);
  }

  async function saveLandingPage() {
    if (!generatedHtml) {
      setMessage('Generate a landing page first.');
      return;
    }

    if (!name.trim()) {
      setMessage('Landing page name is required.');
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase.from('landing_pages').insert({
      name: name.trim(),
      vertical: vertical.trim() || null,
      geo: geo.trim() || null,
      language: language.trim() || null,
      offer_url: offerUrl.trim() || null,
      prompt: prompt.trim() || null,
      html: generatedHtml
    });

    if (error) {
      setMessage(`Failed to save landing page: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage('Landing page saved successfully.');
    setLoading(false);
    await loadSavedPages();
  }

  async function loadSavedPages() {
    setLoadingSaved(true);
    setMessage('');

    const { data, error } = await supabase
      .from('landing_pages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      setMessage(`Failed to load saved pages: ${error.message}`);
      setLoadingSaved(false);
      return;
    }

    setSavedPages((data || []) as SavedLandingPage[]);
    setLoadingSaved(false);
  }

  async function deleteSavedPage(id: string) {
    const confirmed = window.confirm('Delete this saved landing page?');

    if (!confirmed) return;

    const { error } = await supabase
      .from('landing_pages')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage(`Failed to delete page: ${error.message}`);
      return;
    }

    setMessage('Landing page deleted.');
    await loadSavedPages();
  }

  async function copyHtml() {
    if (!generatedHtml) {
      setMessage('No HTML to copy yet.');
      return;
    }

    await navigator.clipboard.writeText(generatedHtml);
    setMessage('HTML copied.');
  }

  return (
    <>
      <PageTitle
        title="Landing Page Generator"
        subtitle="Generate Keitaro-ready mobile landing pages from prompt, vertical, GEO and language."
      />

      <div className="grid grid-2">
        <div className="card">
          <h2>Generate Landing Page</h2>

          <label>
            Page Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="PH Sweepstakes Mystery Funnel"
            />
          </label>

          <div className="grid grid-2">
            <label>
              Vertical
              <select value={vertical} onChange={(e) => setVertical(e.target.value)}>
                <option value="Sweepstakes">Sweepstakes</option>
                <option value="Casino">Casino</option>
                <option value="iGaming">iGaming</option>
                <option value="Trading">Trading</option>
                <option value="Crypto">Crypto</option>
                <option value="Finance">Finance</option>
                <option value="Ecommerce">Ecommerce</option>
                <option value="Lead Generation">Lead Generation</option>
              </select>
            </label>

            <label>
              GEO
              <input
                value={geo}
                onChange={(e) => setGeo(e.target.value)}
                placeholder="Philippines"
              />
            </label>
          </div>

          <div className="grid grid-2">
            <label>
              Language
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="Filipino"
              />
            </label>

            <label>
              Offer URL / Keitaro Macro
              <input
                value={offerUrl}
                onChange={(e) => setOfferUrl(e.target.value)}
                placeholder="{offer}"
              />
            </label>
          </div>

          <label>
            Style
            <input
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="modern mobile-first, clean, premium"
            />
          </label>

          <label>
            Prompt
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={9}
              placeholder="Describe the landing page you want..."
            />
          </label>

          <br />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={generateLandingPage} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Page'}
            </button>

            <button className="btn secondary" type="button" onClick={copyHtml}>
              Copy HTML
            </button>

            <button
              className="btn secondary"
              type="button"
              onClick={() => downloadHtml('index.html', generatedHtml)}
              disabled={!generatedHtml}
            >
              Download index.html
            </button>

            <button className="btn secondary" type="button" onClick={saveLandingPage} disabled={!generatedHtml || loading}>
              Save
            </button>
          </div>

          {message && (
            <p className="muted" style={{ marginTop: 12 }}>
              {message}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Preview</h2>

          {!generatedHtml ? (
            <p className="muted">Generate a page to preview it here.</p>
          ) : (
            <iframe
              title="Landing page preview"
              srcDoc={generatedHtml}
              style={{
                width: '100%',
                height: 720,
                border: '1px solid #e5e7eb',
                borderRadius: 18,
                background: '#ffffff'
              }}
            />
          )}
        </div>
      </div>

      {generatedHtml && (
        <div className="card" style={{ marginTop: 18 }}>
          <h2>Generated HTML</h2>

          <textarea
            value={generatedHtml}
            onChange={(e) => setGeneratedHtml(e.target.value)}
            rows={18}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: 12
            }}
          />
        </div>
      )}

      <div className="card table-wrap" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <h2>Saved Landing Pages</h2>
            <p className="muted">Load, preview, download or delete saved generated pages.</p>
          </div>

          <button className="btn small secondary" type="button" onClick={loadSavedPages}>
            {loadingSaved ? 'Loading...' : 'Load Saved'}
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Vertical</th>
              <th>GEO</th>
              <th>Language</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {savedPages.length === 0 ? (
              <tr>
                <td colSpan={6}>No saved landing pages loaded.</td>
              </tr>
            ) : (
              savedPages.map((page) => (
                <tr key={page.id}>
                  <td>{page.name}</td>
                  <td>{page.vertical || '-'}</td>
                  <td>{page.geo || '-'}</td>
                  <td>{page.language || '-'}</td>
                  <td>{page.created_at?.slice(0, 10) || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn small secondary"
                        type="button"
                        onClick={() => {
                          setName(page.name);
                          setVertical(page.vertical || '');
                          setGeo(page.geo || '');
                          setLanguage(page.language || '');
                          setOfferUrl(page.offer_url || '{offer}');
                          setPrompt(page.prompt || '');
                          setGeneratedHtml(page.html);
                          setMessage('Saved page loaded.');
                        }}
                      >
                        Load
                      </button>

                      <button
                        className="btn small secondary"
                        type="button"
                        onClick={() => downloadHtml('index.html', page.html)}
                      >
                        Download
                      </button>

                      <button
                        className="btn small danger"
                        type="button"
                        onClick={() => deleteSavedPage(page.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}