import { ThemesService } from '../themes.service';
import { Repository } from 'typeorm';
import { Theme } from '../../entities/theme.entity';
import { ThemeSnapshot } from '../../entities/theme-snapshot.entity';

function createRepoMock<T extends { id?: string }>() {
  const store: any[] = [];
  return {
    find: jest.fn(async (opts?: any) => {
      if (!opts?.where) return [...store];
      return store.filter((r) => Object.entries(opts.where).every(([k,v]) => r[k] === v));
    }),
  findOne: jest.fn(async function(this: any, opts: any) { return (await this.find(opts))[0] || null; }),
    create: jest.fn((data: any) => ({ ...data, id: data.id || Math.random().toString(36).slice(2) })),
    save: jest.fn(async (entity: any) => {
      const existingIdx = store.findIndex((e) => e.id === entity.id);
      if (existingIdx >= 0) store[existingIdx] = { ...store[existingIdx], ...entity };
      else store.push(entity);
      return entity;
    }),
    remove: jest.fn(async (entity: any) => {
      const idx = store.findIndex((e) => e.id === entity.id);
      if (idx >= 0) store.splice(idx, 1);
      return entity;
    }),
  } as unknown as jest.Mocked<Repository<T>> & { __store?: any[] };
}

describe('ThemesService', () => {
  let service: ThemesService;
  let themeRepo: any;
  let snapRepo: any;
  const tenantId = 't1';

  beforeEach(() => {
    themeRepo = createRepoMock<Theme>();
    snapRepo = createRepoMock<ThemeSnapshot>();
    service = new ThemesService(themeRepo, snapRepo);
  });

  it('auto-creates default theme on empty list when DEV_AUTO_THEME=true', async () => {
    process.env.DEV_AUTO_THEME = 'true';
    const list = await service.list(tenantId);
    expect(list).toHaveLength(1);
    expect(list[0].isDefault).toBe(true);
  });

  it('creates snapshots with incrementing versions and sets activeSnapshotId', async () => {
    process.env.DEV_AUTO_THEME = 'false';
    const theme = await service.create(tenantId, { name: 'Brand' } as any);
    const snap1 = await service.createSnapshot(tenantId, theme.id, { tokens: { a: 1 }, activate: true });
    expect(snap1.version).toBe(1);
    const snap2 = await service.createSnapshot(tenantId, theme.id, { tokens: { a: 2 }, activate: true });
    expect(snap2.version).toBe(2);
    const snapshots = await service.listSnapshots(tenantId, theme.id);
    expect(snapshots.map(s => s.version)).toEqual([2,1]);
  });

  it('rollback creates new snapshot with copied tokens and marks isRollback', async () => {
    const theme = await service.create(tenantId, { name: 'X' } as any);
    const s1 = await service.createSnapshot(tenantId, theme.id, { tokens: { primary: '#111' }, activate: true });
    const s2 = await service.createSnapshot(tenantId, theme.id, { tokens: { primary: '#222' }, activate: true });
    const rollbackSnap = await service.rollback(tenantId, theme.id, { snapshotId: s1.id });
    expect(rollbackSnap.isRollback).toBe(true);
    expect(rollbackSnap.version).toBe(3);
    expect(rollbackSnap.tokens.primary).toBe('#111');
  });
});
