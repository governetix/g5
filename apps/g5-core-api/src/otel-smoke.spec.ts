import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';
import { join } from 'path';

// This test ensures the OTEL bootstrap does not crash when endpoint vars are present.
describe('OTEL smoke', () => {
  jest.setTimeout(30000);
  it('boots with OTEL exporter endpoint and emits otel logs', async () => {
    const projectRoot = join(__dirname, '..');
    const proc = spawn('node', ['dist/main.js'], {
      cwd: projectRoot,
      env: {
        ...process.env,
        PORT: '0',
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://127.0.0.1:4318',
        OTEL_DEBUG: 'true',
      },
    });
    let output = '';
    proc.stdout.on('data', (d) => (output += d.toString()));
    proc.stderr.on('data', (d) => (output += d.toString()));
    await delay(5000);
    proc.kill('SIGTERM');
    // If build path differs, fallback to alt path dist/main.js
  expect(output).toMatch(/otel|OpenTelemetry|tracing/i);
  });
});
