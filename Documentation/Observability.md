# Metrics & Observability

Status: Implemented (Prometheus + partial OTEL) – extensible.

## Components
| Component | Responsibility |
|----------|---------------|
| prom-client Registry | Collects counters/histograms/gauges |
| Metrics Endpoint `/metrics` | Exposes Prometheus scrape output |
| OpenTelemetry Auto-Instrumentation | Traces (HTTP, PG, Redis) when OTLP endpoint configured |
| Custom HTTP Interceptor | Records per-request duration & status classification |
| Webhook Dispatcher Instrumentation | Latency + outcome metrics |
| Alerts Service | Consumes metrics to derive alert states (error rate, latency percentiles) |

## Exported Metrics (Current)
| Name | Type | Labels | Description |
|------|------|--------|-------------|
| `http_requests_total` | counter | method, route, status | Request volume |
| `http_request_duration_seconds` | histogram | method, route, status | Request latency |
| `http_4xx_total` | counter | route | 4xx responses count |
| `http_5xx_total` | counter | route | 5xx responses count |
| `webhook_deliveries_total` | counter | status | Webhook delivery outcomes |
| `webhook_delivery_duration_seconds` | histogram | status | Webhook delivery latency |
| `webhook_dlq_size` | gauge | - | Current DLQ size |
| `rate_limit_rejections_total` | counter | bucket | Throttled requests |

(Exact naming may differ slightly; ensure consistent prefix conventions.)

## Histogram Buckets
- HTTP latency: targeted sub-second buckets (e.g., 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5) – chosen to support P95/P99 extraction for alerting.

## Tracing (OTEL)
| Span Source | Attributes |
|-------------|-----------|
| HTTP Server | route, method, status_code, tenantId (if safe) |
| PG Client | db.statement (sanitized), db.operation, duration |
| Redis | command, duration |

Conditional activation when `OTEL_EXPORTER_OTLP_ENDPOINT` & not disabled via `OTEL_DISABLED`.

## Panel Integration
### Metrics Dashboard Panels
| Panel | Source |
|-------|--------|
| HTTP P95 / P99 latency | `histogram_quantile` over http_request_duration_seconds |
| Error Rate (5m) | increase(http_5xx_total[5m]) / increase(http_requests_total[5m]) |
| Webhook Success Rate | rate(webhook_deliveries_total{status="success"}[5m]) / sum by () of rate(webhook_deliveries_total[5m]) |
| DLQ Size | webhook_dlq_size gauge |
| Rate Limit Rejections | rate(rate_limit_rejections_total[5m]) |

### Drill-Down
- Clicking a route row surfaces per-route latency & error trends.
- Webhook latency heat chart (bucket distribution) from delivery histogram.

## Percentile Computation (Alerts)
- Extracted by reading histogram cumulative buckets & deriving Δ counts; implementation approximates P95/P99 offline— panel should prefer PromQL `histogram_quantile`.

## Cardinality Management
| Risk | Mitigation |
|------|-----------|
| Route label explosion | Use normalized route templates (no raw IDs) |
| Tenant label high cardinality | Avoid per-tenant metrics; use sampling or top-K export if needed |

## Logging
- Pino structured logs enriched with `traceId` & optionally `tenantId`.
- Panel could stream tail subset for troubleshooting (websocket) – future.

## Correlation Workflow
1. User sees error entry with `traceId`.
2. Panel queries logs by traceId (future log API) or constructs link to external log explorer.
3. Cross-link to spans in tracing UI (if OTEL exporter + collector present).

## Future Enhancements
| Feature | Benefit |
|---------|--------|
| RED metrics coverage (requests, errors, duration) per internal service module | Faster anomaly isolation |
| SLO Burn Rate Alerts | Multi-window multi-burn evaluation logic |
| Exemplars | Link histograms to trace IDs in Prometheus / Grafana |
| Profiling Integration | Continuous CPU/Heap profiling for hotspots |
| Structured Event Export | Ship metrics to centralized TSDB / aggregator |

## Testing Strategy
| Test | Purpose |
|------|---------|
| Metrics endpoint scrapes OK | Ensures no registry errors |
| Histogram bucket monotonicity | Bucket counts non-decreasing |
| Error counters increment on 5xx | Validation of classification |
| DLQ gauge updates | Reflects queue size changes |

