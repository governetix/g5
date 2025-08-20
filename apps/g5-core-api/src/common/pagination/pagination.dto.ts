export interface PaginationQuery {
  limit?: number; // max items to return
  cursor?: string; // opaque cursor (base64 encoded)
  sort?: string; // e.g. createdAt:desc or name:asc
  filter?: Record<string, any>; // simple equality filters
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string | null;
  total?: number; // optional
}
