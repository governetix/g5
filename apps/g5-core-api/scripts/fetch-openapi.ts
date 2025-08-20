import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

(async () => {
  const port = 4010;
  const proc = spawn('node', ['dist/src/main.js'], { env: { ...process.env, PORT: String(port) } });
  let ready = false;
  proc.stdout.on('data', (d) => {
    const s = d.toString();
    if (/Nest application/.test(s)) ready = true;
    process.stdout.write(d);
  });
  proc.stderr.on('data', (d) => process.stderr.write(d));
  const started = Date.now();
  while (!ready && Date.now() - started < 15000) await new Promise(r => setTimeout(r, 300));
  if (!ready) console.warn('Proceeding without readiness signal');
  const swagger = await new Promise<string>((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/docs-json`, res => {
      let data='';
      res.on('data', c=>data+=c);
      res.on('end', ()=>resolve(data));
    }).on('error', reject);
  });
  fs.mkdirSync('openapi', { recursive: true });
  fs.writeFileSync('openapi/openapi.json', swagger);
  proc.kill('SIGTERM');
  console.log('Fetched openapi/openapi.json');
})();
