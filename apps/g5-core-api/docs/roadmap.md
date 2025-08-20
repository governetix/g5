# Roadmap

## Near Term (0-2 months)
- Webhook Outbox Pattern: Persist outbound events before queueing for guaranteed delivery.
- Enhanced API Key Analytics: Per-key request counts, last used timestamp, anomaly detection.
- Configurable Rate Plans: Tier-based rate limits & burst buckets.
- Automated Secret Rotation: Schedule + grace periods for API keys & webhooks secrets.
- Troubleshooting Expansion: Add more scenario playbooks (DB failover test, Redis eviction impact).

## Mid Term (2-6 months)
- Field-Level Encryption: Transparent encryption for PII columns (envelope keys + KMS).
- Multi-Region Read Replicas: Read scaling + low-latency regional access.
- Queue Abstraction Layer: Standard interface for BullMQ alternative or managed service.
- Pluggable Auth Providers: OAuth / SSO (SAML, OIDC) adapters.
- Usage Quotas & Soft Limits: Pre-expiry alerts, hard cap enforcement.
- Webhook Signature Versioning: Allow rotating algorithms (v1 HMAC-SHA256 → v2 HMAC-SHA512, etc.).

## Long Term (6-12 months)
- Event Sourcing (Selective): For critical audit-heavy domains.
- Data Residency Controls: Per-tenant region pinning & export tooling.
- Advanced Anomaly Detection: ML-assisted detection on auth failures & traffic spikes.
- Audit Log Integrity Chain: Hash-chain with periodic anchoring to external ledger.
- Self-Service Tenant Provisioning: Automated onboarding + billing integration.

## Research / Exploratory
- Wasm-Based Policy Engine: Evaluate OPA / Cedar for fine-grained auth beyond RBAC.
- Streaming Export: Server-sent events or WebSockets for near-real-time tenant updates.
- Cost Attribution: Per-tenant resource & queue time attribution for internal chargeback.

## Quality & DX Improvements
- Codegen Clients: OpenAPI -> TS/Go client generation pipeline.
- Error Taxonomy Refinement: Namespace & categorize non-2xx responses.
- Scenario Performance Tests: K6 suites for auth bursts, webhook storms, pagination depth.
- Lint Rule Hardening: Re-enable any suppressed rules where possible.

## Deprecations (Planned)
- Direct DLQ Replay Endpoint (once Outbox adopted) in favor of idempotent outbox re-dispatch.

---
Last updated: 2025-08-20
