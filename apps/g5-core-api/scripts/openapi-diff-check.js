const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

function fail(msg){ console.error('[OPENAPI_DIFF_FAIL]', msg); process.exit(1); }
const openapiPath = path.join(__dirname, '..', 'openapi', 'openapi.json');
if(!fs.existsSync(openapiPath)) fail('Missing existing openapi/openapi.json before diff');

// Create temp dir
const tmpDir = fs.mkdtempSync(path.join(process.cwd(), '.openapi-diff-'));
const tmpFile = path.join(tmpDir, 'openapi.json');

// Regenerate swagger minimally by invoking artifacts runtime in a cheap mode: reuse existing build if dist present.
console.log('[OPENAPI_DIFF] Regenerating current spec to temp for comparison');
const result = spawnSync('node', ['scripts/gen-artifacts-runtime.js'], { env: { ...process.env, FULL_INFRA_FOR_DOCS: '1' }, stdio: 'inherit' });
if(result.status !== 0){ fail('Artifacts runtime failed during diff regen'); }
if(!fs.existsSync(openapiPath)) fail('OpenAPI missing after regen');
// Copy regenerated file snapshot (same path) to tmp for comparison BEFORE potential modifications? We can just hash current vs git HEAD.

// Load current file contents
const current = fs.readFileSync(openapiPath, 'utf8').replace(/\r\n/g,'\n');

// Get git version (HEAD) of file
const gitShow = spawnSync('git', ['show', `HEAD:${path.relative(process.cwd(), openapiPath).replace(/\\/g,'/')}`], { encoding: 'utf8' });
if(gitShow.status !== 0){
  console.log('[OPENAPI_DIFF] File not in HEAD (probably first commit with spec) - passing');
  process.exit(0);
}
const headContent = gitShow.stdout.replace(/\r\n/g,'\n');
if(current === headContent){
  console.log('[OPENAPI_DIFF_OK] No changes in OpenAPI spec');
  process.exit(0);
}
// Produce unified diff snippet (simple)
function simpleDiff(a, b){
  const al = a.split(/\n/); const bl = b.split(/\n/);
  const max = Math.max(al.length, bl.length);
  const out = [];
  for(let i=0;i<max;i++){
    if(al[i] !== bl[i]){
      out.push(`-HEAD:${al[i]||''}`);
      out.push(`+CURR:${bl[i]||''}`);
      if(out.length>200){ out.push('...(diff truncated)'); break; }
    }
  }
  return out.join('\n');
}
const diff = simpleDiff(headContent, current);
fail('OpenAPI spec changed but openapi.json not committed separately. Run pnpm -F g5-core-api artifacts:runtime and commit the updated file. Diff:\n'+diff);
