const http     = require('http');
const fs       = require('fs');
const path     = require('path');
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3456;

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fmkymlktirvcsdoxjsvm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_secret_yjI4rhjNaOc_JMkCfutr3w__gG_wg9Z';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── UTILS ─────────────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, data, status=200) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((res, rej) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => res(Buffer.concat(chunks)));
    req.on('error', rej);
  });
}

// Multipart parser para upload de fotos
function parseMultipart(body, boundary) {
  const delim = Buffer.from('--' + boundary);
  const parts = [];
  let pos = indexOfBuf(body, delim);
  while (pos !== -1) {
    const start = pos + delim.length + 2;
    let next = indexOfBuf(body, delim, start);
    if (next === -1) break;
    const part = body.slice(start, next - 2);
    const hdEnd = indexOfBuf(part, Buffer.from('\r\n\r\n'));
    if (hdEnd !== -1) parts.push({ headers: part.slice(0, hdEnd).toString(), content: part.slice(hdEnd + 4) });
    pos = next;
  }
  return parts;
}
function indexOfBuf(buf, search, start=0) {
  for (let i=start; i<=buf.length-search.length; i++)
    if (buf.slice(i,i+search.length).equals(search)) return i;
  return -1;
}

const MIME = {
  '.html':'text/html;charset=utf-8','.js':'application/javascript',
  '.css':'text/css','.json':'application/json',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png',
  '.webp':'image/webp','.gif':'image/gif'
};

function serveFile(res, filename) {
  const fp = path.join(__dirname, filename);
  if (!fs.existsSync(fp)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'text/html' });
  fs.createReadStream(fp).pipe(res);
}

// ── SERVIDOR ──────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url    = req.url.split('?')[0];
  const method = req.method;

  // Arquivos estáticos
  if (method==='GET' && url==='/')            return serveFile(res, 'admin.html');
  if (method==='GET' && url==='/app')         return serveFile(res, 'app.html');
  if (method==='GET' && url==='/logo.png')    return serveFile(res, 'logo.png');
  if (method==='GET' && url==='/manifest.json') return serveFile(res, 'manifest.json');

  // ── STATUS ────────────────────────────────────────────────────────────────
  if (method==='GET' && url==='/api/status') {
    return json(res, { ok:true, mode:'cloud', supabase: SUPABASE_URL });
  }

  // ── PRODUCTS ──────────────────────────────────────────────────────────────
  if (method==='GET' && url==='/api/products') {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error) return json(res, { error: error.message }, 500);
    return json(res, data || []);
  }

  if (method==='POST' && url==='/api/products') {
    const body = JSON.parse((await readBody(req)).toString());
    body.id = uid();
    const now = new Date();
    body.created_at = now.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}).split('/').reverse().join('-');
    const { data, error } = await supabase.from('products').insert([body]).select().single();
    if (error) return json(res, { error: error.message }, 500);
    return json(res, data, 201);
  }

  if (method==='PUT' && url.startsWith('/api/products/')) {
    const id   = url.split('/').pop();
    const body = JSON.parse((await readBody(req)).toString());
    const { data, error } = await supabase.from('products').update(body).eq('id', id).select().single();
    if (error) return json(res, { error: error.message }, 500);
    return json(res, data);
  }

  if (method==='DELETE' && url.startsWith('/api/products/')) {
    const id = url.split('/').pop();
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return json(res, { error: error.message }, 500);
    return json(res, { ok: true });
  }

  // ── SALES ─────────────────────────────────────────────────────────────────
  if (method==='GET' && url==='/api/sales') {
    const { data, error } = await supabase.from('sales').select('*').order('date', { ascending: false });
    if (error) return json(res, { error: error.message }, 500);
    return json(res, data || []);
  }

  if (method==='POST' && url==='/api/sales') {
    const body = JSON.parse((await readBody(req)).toString());
    body.id   = uid();
    body.date = new Date().toISOString().slice(0,10);
    const { data, error } = await supabase.from('sales').insert([body]).select().single();
    if (error) return json(res, { error: error.message }, 500);
    return json(res, data, 201);
  }

  if (method==='PUT' && url.startsWith('/api/sales/')) {
    const id   = url.split('/').pop();
    const body = JSON.parse((await readBody(req)).toString());
    const { data, error } = await supabase.from('sales').update(body).eq('id', id).select().single();
    if (error) return json(res, { error: error.message }, 500);
    return json(res, data);
  }

  if (method==='DELETE' && url.startsWith('/api/sales/')) {
    const id = url.split('/').pop();
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) return json(res, { error: error.message }, 500);
    return json(res, { ok: true });
  }

  // ── IMPORTERS ─────────────────────────────────────────────────────────────
  if (method==='GET' && url==='/api/importers') {
    const { data, error } = await supabase.from('importers').select('*').order('nome');
    if (error) return json(res, { error: error.message }, 500);
    return json(res, data || []);
  }

  if (method==='POST' && url==='/api/importers') {
    const body = JSON.parse((await readBody(req)).toString());
    body.id = uid();
    const { data, error } = await supabase.from('importers').insert([body]).select().single();
    if (error) return json(res, { error: error.message }, 500);
    return json(res, data, 201);
  }

  if (method==='PUT' && url.startsWith('/api/importers/')) {
    const id   = url.split('/').pop();
    const body = JSON.parse((await readBody(req)).toString());
    const { data, error } = await supabase.from('importers').update(body).eq('id', id).select().single();
    if (error) return json(res, { error: error.message }, 500);
    return json(res, data);
  }

  if (method==='DELETE' && url.startsWith('/api/importers/')) {
    const id = url.split('/').pop();
    const { error } = await supabase.from('importers').delete().eq('id', id);
    if (error) return json(res, { error: error.message }, 500);
    return json(res, { ok: true });
  }

  // ── UPLOAD FOTO → Supabase Storage ────────────────────────────────────────
  if (method==='POST' && url==='/api/upload') {
    const body = await readBody(req);
    const ct   = req.headers['content-type'] || '';
    const bm   = ct.match(/boundary=(.+)$/);
    if (!bm) return json(res, { ok:false, erro:'sem boundary' }, 400);

    const parts = parseMultipart(body, bm[1].trim());
    const urls  = [];

    for (const part of parts) {
      if (!part.headers.includes('filename=')) continue;
      const nameMatch = part.headers.match(/filename="([^"]+)"/);
      const ext  = nameMatch ? path.extname(nameMatch[1]) : '.jpg';
      const name = 'fotos/' + uid() + ext;
      const mime = ext==='.png'?'image/png':ext==='.webp'?'image/webp':'image/jpeg';

      const { error } = await supabase.storage
        .from('mi-importa')
        .upload(name, part.content, { contentType: mime, upsert: true });

      if (!error) {
        const { data: pub } = supabase.storage.from('mi-importa').getPublicUrl(name);
        urls.push(pub.publicUrl);
      }
    }
    return json(res, { ok: true, urls });
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ MI Importa rodando na porta ${PORT}`);
  console.log(`   Supabase: ${SUPABASE_URL}\n`);
});
