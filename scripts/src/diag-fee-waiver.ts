import { Pool } from 'pg';
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

const API = 'http://localhost:80';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const res = await pool.query(`
  INSERT INTO cases (user_id, title, plaintiff_name, plaintiff_address, plaintiff_city, plaintiff_state, plaintiff_zip, plaintiff_phone, plaintiff_email, county_id, case_number)
  VALUES ('diag-test', 'Diag Test', 'Jane Smith', '456 Oak Ave', 'Tampa', 'FL', '33601', '(813) 555-9876', 'jane@test.com', 'fl-hillsborough', 'SC-TEST-999')
  RETURNING id
`);
const caseId = res.rows[0].id;

const tokRes = await pool.query(`
  INSERT INTO form_download_tokens (case_id, user_id, form_id, token, expires_at)
  VALUES ($1, 'diag-test', 'FL-FEE-WAIVER', gen_random_uuid()::text, NOW() + INTERVAL '1 hour')
  RETURNING token
`, [caseId]);
const token = tokRes.rows[0].token;

const r = await fetch(`${API}/api/cases/${caseId}/forms/fl/fee-waiver?token=${token}`);
if (!r.ok) throw new Error('HTTP ' + r.status);
const bytes = await r.arrayBuffer();
writeFileSync('/tmp/fw-generated.pdf', Buffer.from(bytes));
console.log('Generated PDF: ' + bytes.byteLength + ' bytes');

const out = execSync('pdftotext -bbox-layout /tmp/fw-generated.pdf -', { encoding: 'utf8' });
// Show ALL words with y positions so we can see where our fill text landed
const lines = out.split('\n').filter(l => /word/.test(l));
console.log('\n=== ALL placed text (full page) ===');
for (const l of lines) {
  const m = l.match(/xMin="([\d.]+)"[^>]*yMin="([\d.]+)"[^>]*yMax="([\d.]+)">([^<]+)/);
  if (m) {
    const yMinN = parseFloat(m[2]);
    const yMaxN = parseFloat(m[3]);
    const word = m[4].trim();
    // Only show content that looks like our filled data (not template text)
    if (/Jane|Smith|Tampa|33601|813|555|9876|jane|test\.com|Oak Ave|SC-TEST|2026|\//.test(word)) {
      console.log(`  x=${m[1].padEnd(8)} yMin=${m[2].padEnd(10)} yMax=${m[3].padEnd(10)} "${word}"`);
    }
  }
}

await pool.query('DELETE FROM form_download_tokens WHERE token = $1', [token]);
await pool.query('DELETE FROM cases WHERE id = $1', [caseId]);
await pool.end();
