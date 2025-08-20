# Alerting System

Status: Implemented (rolling 5xx error rate, latency percentiles, DLQ size, DB health) + Slack webhook.

## Architecture
| Component | Responsibility |
|----------|---------------|
| Metrics Collector | Provides source counters/histograms |
| Alert Evaluator (scheduled job) | Periodically computes conditions |
| Cooldown Manager | Prevents duplicate alert spam within window |
| Notifier (Slack) | Formats and sends alert messages |

## Evaluated Conditions
| Condition | Source | Threshold Env |
|-----------|--------|---------------|
| DLQ Size > N | `webhook_dlq_size` gauge | `ALERT_DLQ_THRESHOLD` |
| Rolling 5m 5xx Rate | 5xx / total window sample | `ALERT_ERROR_RATE_5M` |
| P95 Latency > X | http_request_duration histogram | `ALERT_P95_LATENCY` |
| P99 Latency > Y | http_request_duration histogram | `ALERT_P99_LATENCY` |
| DB Health Down | Connection check fail | (implicit) |

Percentiles derived from cumulative histogram buckets (approximation); panel can recompute using PromQL for accuracy.

## Slack Notification Format (Example)
```
[G5 ALERT] P95 latency breached
Service: core-api
P95: 1.02s (threshold 0.75s)
Trace Sample: <optional link>
Time: 2025-08-20T10:15:00Z
```

## Cooldown Behavior
- Keyed per condition (e.g., `latency_p95`).
- Suppresses repeats for `ALERTS_COOLDOWN_SEC` seconds (default 300).
- First recovery message (future) can be sent when metric returns below 80% threshold.

## Panel Integration
### Alerts Dashboard
Columns: condition, severity, current value, threshold, last fired, cooldown remaining.

### Alert Details
- Historical sparkline (pull from metrics store – panel side computation).
- Related recent deployments (if CI integration adds labels) – future.

### Configuration Management
- Editable thresholds (persistence not yet implemented; currently env-driven).
- Manual mute / silence per alert key (future: ephemeral store w/ expiry).

## Severity Mapping (Suggested)
| Condition | Severity |
|-----------|----------|
| DB Down | Critical |
| P99 over threshold | High |
| P95 over threshold | Medium |
| 5xx rate > threshold | High |
| DLQ size > threshold | Medium |

## Future Enhancements
| Feature | Value |
|---------|-------|
| Multi-channel (email/pager) | Broader on-call integration |
| Burn Rate SLO alerts | More reliable noise-resistant paging |
| Anomaly Detection | Dynamic baselines vs static thresholds |
| Alert Correlation | Group related alerts into incident object |
| Recovery Notifications | Clear resolution path tracking |

## Testing Strategy
| Test | Purpose |
|------|---------|
| DLQ threshold breach | Triggers alert once + cooldown |
| P95 breach then cooldown | No duplicate within window |
| DB failure simulation | Produces critical alert |
| Slack send error | Logged & retried gracefully |

