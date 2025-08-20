import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { PaginationQuery, PaginatedResult } from './pagination.dto';

interface CursorPayload<TVal = unknown> {
  v: number;
  field: string;
  value: TVal;
  id?: string;
}

function encodeCursor<TVal>(payload: CursorPayload<TVal>): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}
function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    ) as Partial<CursorPayload>;
    if (typeof parsed !== 'object' || !parsed) return null;
    if (!parsed.field) return null;
    return parsed as CursorPayload;
  } catch {
    return null;
  }
}

export async function paginate<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  opts: PaginationQuery,
  defaultSortField = 'createdAt',
): Promise<PaginatedResult<T>> {
  const limit = Math.min(Math.max(opts.limit || 25, 1), 100);
  let sortField = defaultSortField;
  let direction: 'ASC' | 'DESC' = 'DESC';
  if (opts.sort) {
    const [f, dir] = opts.sort.split(':');
    if (f) sortField = f;
    if (dir && ['asc', 'desc'].includes(dir.toLowerCase()))
      direction = dir.toUpperCase() as 'ASC' | 'DESC';
  }
  qb.orderBy(`${qb.alias}.${sortField}`, direction).addOrderBy(`${qb.alias}.id`, direction);
  if (opts.cursor) {
    const decoded = decodeCursor(opts.cursor);
    if (decoded && decoded.field === sortField) {
      const op = direction === 'ASC' ? '>' : '<';
      // For stable ordering include tie-breaker id
      qb.andWhere(
        `(${qb.alias}.${sortField} ${op} :cv OR (${qb.alias}.${sortField} = :cv AND ${qb.alias}.id ${op} :cid))`,
        { cv: decoded.value, cid: decoded.id },
      );
    }
  }
  qb.limit(limit + 1); // fetch one extra to detect next cursor
  const rows = await qb.getMany();
  let nextCursor: string | undefined;
  if (rows.length > limit) {
    const last = rows[limit - 1] as Record<string, unknown> & { id?: string };
    const val = last[sortField];
    nextCursor = encodeCursor({ v: 1, field: sortField, value: val, id: last.id });
    rows.splice(limit); // trim extra
  }
  return { items: rows, nextCursor: nextCursor || null };
}
