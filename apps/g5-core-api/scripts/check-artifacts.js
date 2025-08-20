const fs = require('fs');
const path = require('path');

function fail(msg){ console.error('[ARTIFACT_CHECK_FAIL]', msg); process.exit(1); }

const openapiPath = path.join(__dirname, '..', 'openapi', 'openapi.json');
if(!fs.existsSync(openapiPath)) fail('Missing openapi.json');
const stat = fs.statSync(openapiPath);
if(stat.size < 1000) fail('openapi.json too small / invalid');

const clientPath = path.join(__dirname, '..', '..', '..', 'packages', 'plugin-sdk', 'src', 'client', 'index.ts');
if(!fs.existsSync(clientPath)) fail('Missing generated client index.ts');
const clientStat = fs.statSync(clientPath);
if(clientStat.size < 2000) fail('Generated client too small / invalid');

console.log('[ARTIFACT_CHECK_OK] openapi.json bytes=', stat.size, 'client bytes=', clientStat.size);
