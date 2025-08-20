import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
// Resource customization removed due to version mismatch; rely on OTEL_SERVICE_NAME env

// Allow disabling via env
if (process.env.OTEL_DISABLED === 'true') {
  console.log('[otel] Disabled via OTEL_DISABLED=true');
} else {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT; // e.g. http://otel-collector:4318/v1/traces
  const headers = process.env.OTEL_EXPORTER_OTLP_HEADERS; // k=v,k2=v2
  let parsedHeaders: Record<string, string> | undefined;
  if (headers) {
    parsedHeaders = {};
    for (const pair of headers.split(',')) {
      const [k, v] = pair.split('=');
      if (k && v) parsedHeaders[k.trim()] = v.trim();
    }
  }
  const exporter = endpoint
    ? new OTLPTraceExporter({
        url: endpoint,
        headers: parsedHeaders,
      })
    : undefined;

  const sdk = new NodeSDK({
    traceExporter: exporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          ignoreIncomingRequestHook: (req) => !!req.url && req.url.includes('/health'),
        },
        '@opentelemetry/instrumentation-pg': { enabled: true },
        '@opentelemetry/instrumentation-ioredis': { enabled: true },
      }),
    ],
  });
  try {
    sdk.start();

    console.log('[otel] tracing initialized');
  } catch (err) {
    console.error('[otel] init error', err);
  }

  process.on('SIGTERM', () => {
    void sdk.shutdown().finally(() => process.exit(0));
  });
}
