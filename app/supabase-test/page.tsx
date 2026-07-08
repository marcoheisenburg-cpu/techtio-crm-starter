'use client';

import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { supabase } from '@/lib/supabase-client';

export default function SupabaseTestPage() {
  const [status, setStatus] = useState('Testing connection...');
  const [details, setDetails] = useState('');

  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .limit(5);

      if (error) {
        setStatus('Connection failed');
        setDetails(error.message);
        return;
      }

      setStatus('Connection successful');
      setDetails(`Loaded ${data.length} agencies from Supabase.`);
    }

    testConnection();
  }, []);

  return (
    <>
      <PageTitle
        title="Supabase Test"
        subtitle="Check if the CRM can connect to the Supabase database."
      />

      <div className="card">
        <h2>{status}</h2>
        <p className="muted">{details}</p>
      </div>
    </>
  );
}