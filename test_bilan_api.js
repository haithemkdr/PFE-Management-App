const http = require('http');

function httpReq(method, path, body, headers) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 5000,
      path, method,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request(opts, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Login as agent
  console.log('=== Login ===');
  const login = await httpReq('POST', '/api/auth/login', {
    email: 'kherfi@univ-oran.dz',
    mot_de_passe: 'admin123'
  });
  console.log('Status:', login.status, login.body.message || '');
  if (login.status !== 200) {
    console.log('FAILED - trying password123');
    const login2 = await httpReq('POST', '/api/auth/login', {
      email: 'kherfi@univ-oran.dz',
      mot_de_passe: 'password123'
    });
    console.log('Status:', login2.status, login2.body.message || '');
    if (login2.status !== 200) { console.log('Cannot login!'); process.exit(1); }
    login.body = login2.body;
  }
  const token = login.body.token;
  console.log('Role:', login.body.utilisateur?.role);
  const auth = { Authorization: 'Bearer ' + token };

  // Test each endpoint
  console.log('\n=== session-active ===');
  const s = await httpReq('GET', '/api/agent/session-active', null, auth);
  console.log('Status:', s.status, typeof s.body === 'string' ? s.body.substring(0,200) : JSON.stringify(s.body).substring(0,200));

  console.log('\n=== formations ===');
  const f = await httpReq('GET', '/api/agent/formations', null, auth);
  console.log('Status:', f.status, typeof f.body === 'string' ? f.body.substring(0,200) : JSON.stringify(f.body).substring(0,200));

  console.log('\n=== bilan-semestre L3/S5 ===');
  const b = await httpReq('GET', '/api/agent/bilan-semestre?niveau=L3&semestre=S5', null, auth);
  console.log('Status:', b.status, typeof b.body === 'string' ? b.body.substring(0,500) : JSON.stringify(b.body).substring(0,500));

  process.exit(0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
