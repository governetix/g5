import { spawn } from 'child_process';
import { join } from 'path';
import { setTimeout as delay } from 'timers/promises';

describe('OTEL smoke', () => {
  jest.setTimeout(30000);
  it('boots with OTEL exporter endpoint and produces init log', async () => {
    const proc = spawn('node', ['dist/src/main.js'], {
      cwd: join(__dirname, '..'),
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
    expect(output).toMatch(/otel/i);
  });
});
