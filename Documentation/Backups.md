# Backups & Restore Runbook

Status: Implemented (pg_dump + optional AES-256 encryption + retention pruning).

## Backup Types
| Type | Implemented | Tool |
|------|-------------|------|
| Logical Full | Yes | `pg_dump` |
| Physical / WAL PITR | No (future) | - |

## Process
1. Cron (01:00 server TZ) triggers backup service when `ENABLE_BACKUPS=true`.
2. Constructs filename: `backup-YYYY-MM-DD-HH-mm-ss.sql[.enc]`.
3. Executes `pg_dump` with schema + data.
4. If `BACKUP_ENCRYPT_PASSPHRASE` set: pipes through `openssl enc -aes-256-cbc -pbkdf2`.
5. Writes file to `BACKUP_DIR` (default `./backups`).
6. Retention worker deletes files older than `BACKUP_RETENTION_DAYS` (both `.sql` & `.sql.enc`).

## Encryption Details
| Aspect | Value |
|--------|-------|
| Cipher | AES-256-CBC |
| KDF | PBKDF2 (OpenSSL default with -pbkdf2) |
| Passphrase Source | `BACKUP_ENCRYPT_PASSPHRASE` env |
| Rotation | Provide new passphrase & re-encrypt future dumps; old files require old passphrase (consider vault) |

## Restore Procedure
### Encrypted File
```bash
openssl enc -d -aes-256-cbc -pbkdf2 -in backup-2025-01-15-01-00-00.sql.enc -out restore.sql
psql -h <host> -U <user> -d <database> -f restore.sql
```

### Plain File
```bash
psql -h <host> -U <user> -d <database> -f backup-2025-01-15-01-00-00.sql
```

Or use provided script:
```bash
pnpm -F g5-core-api backup:restore backup-2025-01-15-01-00-00.sql[.enc]
```

## Panel Integration
- Backups list view: filename, size, createdAt, encrypted (bool), age, retention status.
- Download action (authorized roles: OWNER only) – generate pre-signed link (future S3 storage).
- Restore action (danger) gated by confirmation + `backup.restore` permission.
- Retention policy summary banner (current days, next purge schedule).

## Monitoring & Alerts
| Aspect | Metric / Check |
|--------|----------------|
| Freshness | Latest backup age < 26h |
| Size Anomaly | Size deviation +-30% vs 7-day median |
| Failures | Cron logs error event | 

Trigger alert if freshness or failure anomaly.

## Security Considerations
| Risk | Mitigation |
|------|-----------|
| Passphrase leakage | Store in secret manager separate from DB creds |
| Unencrypted at rest | Enable encryption in non-dev environments |
| Unauthorized restore | Restrict restore endpoint (not implemented yet) + audit trail |
| Large file exfiltration | Consider streaming + chunk-based download logs |

## Future Enhancements
| Feature | Value |
|---------|-------|
| PITR (WAL archiving) | Reduce RPO significantly |
| Incremental / Differential | Smaller daily footprint |
| Cloud Object Storage | Durable offsite retention |
| Integrity Verification | Periodic checksum compare & test restores |
| Encryption Key Rotation | KMS-managed envelope keys |

## Testing Strategy
| Test | Purpose |
|------|---------|
| Backup run stub in dev | Validates command invocation |
| Encrypted backup decrypt | Ensures passphrase correctness |
| Retention deletes old file | TTL enforcement |
| Restore script with sample backup | Valid restore path |

