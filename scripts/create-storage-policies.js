// Create Storage RLS policies via Supabase SQL API
// Uses the /pg/query endpoint or falls back to creating a temporary function
// service_role 密钥绝不硬编码：从环境变量读取
const SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!SVC_KEY) {
  console.error('ERROR: 请先设置环境变量 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const SUPABASE_URL = 'https://qxehkfucvmx.supabase.co';

const sql = `
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('bioquest-ebooks', 'bioquest-ebooks', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800, allowed_mime_types = ARRAY['application/pdf'];

CREATE POLICY IF NOT EXISTS "ebook_upload_auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bioquest-ebooks');
CREATE POLICY IF NOT EXISTS "ebook_update_auth" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'bioquest-ebooks') WITH CHECK (bucket_id = 'bioquest-ebooks');
CREATE POLICY IF NOT EXISTS "ebook_read_public" ON storage.objects FOR SELECT TO public USING (bucket_id = 'bioquest-ebooks');
CREATE POLICY IF NOT EXISTS "ebook_delete_auth" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'bioquest-ebooks');
`;

async function run() {
  // Method 1: Try the pg endpoint (Supabase internal)
  console.log('Trying /pg endpoint...');
  try {
    const resp = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'apikey': SVC_KEY,
        'Authorization': `Bearer ${SVC_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    });
    console.log(`  Status: ${resp.status}`);
    const text = await resp.text();
    console.log(`  Response: ${text.slice(0, 300)}`);
    if (resp.ok) {
      console.log('  SUCCESS!');
      return;
    }
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }

  // Method 2: Create a temporary function to exec SQL
  console.log('\nTrying exec_sql function...');
  try {
    // First create the function
    const createFn = `CREATE OR REPLACE FUNCTION _exec_sql(q TEXT) RETURNS VOID AS $$ BEGIN EXECUTE q; END; $$ LANGUAGE plpgsql SECURITY DEFINER;`;
    const resp1 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SVC_KEY,
        'Authorization': `Bearer ${SVC_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ q: createFn })
    });
    console.log(`  Create function status: ${resp1.status}`);
    const text1 = await resp1.text();
    console.log(`  Response: ${text1.slice(0, 200)}`);

    if (resp1.ok || resp1.status === 406) {
      // Now execute the actual SQL
      const resp2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SVC_KEY,
          'Authorization': `Bearer ${SVC_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ q: sql })
      });
      console.log(`  Exec SQL status: ${resp2.status}`);
      const text2 = await resp2.text();
      console.log(`  Response: ${text2.slice(0, 300)}`);
    }
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }

  // Test upload after policies
  console.log('\n--- Testing upload with anon key ---');
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4ZWhrZnVjdm14dW9qamtkYXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjU2ODUsImV4cCI6MjEwMjIwMTY4NX0.lbiJxhFvy0t_J4qSeoP6K0r53M4KaEDSKkRlZu03ze8';
  const testBlob = new Blob(['test-pdf-content'], { type: 'application/pdf' });
  const upResp = await fetch(`${SUPABASE_URL}/storage/v1/object/bioquest-ebooks/test-rls-check.pdf`, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true'
    },
    body: testBlob
  });
  console.log(`Anon upload status: ${upResp.status}`);
  const upText = await upResp.text();
  console.log(`Response: ${upText.slice(0, 300)}`);
}

run().catch(e => console.log('Fatal:', e.message));
