import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

export interface ListQuery {
  page: number;
  limit: number;
  sort?: { field: string; direction: 'asc' | 'desc' }[];
  filters: Record<string, string | number | boolean | (string | number | boolean)[]>;
  raw: Record<string, any>;
}

@Injectable()
export class ListQueryPipe implements PipeTransform<any, ListQuery> {
  transform(value: Record<string, any>, _metadata: ArgumentMetadata): ListQuery {
    const q = value || {};
    const page = clampInt(q.page, 1, 1);
    const limit = clampInt(q.limit, 50, 1, 200);
    const sort: { field: string; direction: 'asc' | 'desc' }[] = [];
    if (q.sort) {
      const parts = Array.isArray(q.sort) ? q.sort : String(q.sort).split(',');
      for (const p of parts) {
        const [field, dirRaw] = p.split(':');
        if (!field) continue;
        const direction = dirRaw === 'desc' ? 'desc' : 'asc';
        sort.push({ field: field.trim(), direction });
      }
    }
    const filters: Record<string, any> = {};
    for (const [k, v] of Object.entries(q)) {
      if (['page', 'limit', 'sort'].includes(k)) continue;
      if (k.startsWith('filter[') && k.endsWith(']')) {
        const key = k.substring(7, k.length - 1);
        if (!key) continue;
        if (typeof v === 'string' && v.includes(',')) {
          filters[key] = v.split(',').map(parseFilterPrimitive);
        } else if (Array.isArray(v)) {
          filters[key] = v.map(parseFilterPrimitive);
        } else {
          filters[key] = parseFilterPrimitive(v as any);
        }
      }
    }
    return { page, limit, sort: sort.length ? sort : undefined, filters, raw: q };
  }
}

function clampInt(val: any, def: number, min = 1, max = 100): number {
  const n = parseInt(val, 10);
  if (isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function parseFilterPrimitive(v: string | number | boolean): string | number | boolean {
  if (typeof v !== 'string') return v;
  const lower = v.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  const num = Number(v);
  if (!isNaN(num) && v.trim() !== '') return num;
  return v;
}
