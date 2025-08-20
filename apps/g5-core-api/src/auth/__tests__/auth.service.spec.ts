import { Test } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Membership } from '../../entities/membership.entity';
import { Tenant } from '../../entities/tenant.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { Repository } from 'typeorm';
import { EventsService } from '../../events/events.service';

// Simple in-memory mocks
function createRepoMock<T extends { id?: string }>() {
  const store: any[] = [];
  return {
    findOne: jest.fn((opts: any) => {
      if (!opts?.where) return Promise.resolve(undefined);
      return Promise.resolve(
        store.find((e) => Object.entries(opts.where).every(([k, v]) => e[k] === v)),
      );
    }),
    find: jest.fn((opts: any) => {
      if (!opts?.where) return Promise.resolve(store);
      return Promise.resolve(
        store.filter((e) => Object.entries(opts.where).every(([k, v]) => e[k] === v)),
      );
    }),
    save: jest.fn((e: any) => {
      if (Array.isArray(e)) {
        return Promise.all(
          e.map((x) => ((x.id ||= 'id_' + Math.random().toString(36).slice(2)), store.push(x), x)),
        );
      }
      if (!e.id) e.id = 'id_' + Math.random().toString(36).slice(2);
      const existing = store.find((x) => x.id === e.id);
      if (!existing) store.push(e);
      return Promise.resolve(e);
    }),
    create: jest.fn((d: any) => ({ ...d })),
    delete: jest.fn((id: string) => {
      const idx = store.findIndex((x) => x.id === id);
      if (idx >= 0) store.splice(idx, 1);
      return Promise.resolve();
    }),
  } as unknown as Repository<T>;
}

describe('AuthService', () => {
  let service: AuthService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        AuthService,
        { provide: JwtService, useValue: new JwtService({ secret: 'testsecret' }) },
        { provide: EventsService, useValue: { emit: jest.fn() } },
        { provide: getRepositoryToken(User), useValue: createRepoMock<User>() },
        { provide: getRepositoryToken(Membership), useValue: createRepoMock<Membership>() },
        { provide: getRepositoryToken(Tenant), useValue: createRepoMock<Tenant>() },
        { provide: getRepositoryToken(RefreshToken), useValue: createRepoMock<RefreshToken>() },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: createRepoMock<PasswordResetToken>(),
        },
      ],
    }).compile();
    service = module.get(AuthService);
    // seed tenant for registration
    const tenantRepo = module.get<Repository<Tenant>>(getRepositoryToken(Tenant));
    await tenantRepo.save({ slug: 'demo', id: 'tenant_demo' } as any);
  });

  it('registers new user without issuing tokens (current behavior)', async () => {
    const result = await service.register({
      email: 'test@example.com',
      password: 'Secret123!',
      tenantSlug: 'demo',
    });
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
  });

  it('logs in user and returns access & refresh tokens', async () => {
    const loginRes = await service.login({
      email: 'test@example.com',
      password: 'Secret123!',
      tenantSlug: 'demo',
    });
    expect(loginRes.accessToken).toBeDefined();
    expect(loginRes.refreshToken).toBeDefined();
    expect(loginRes.user.email).toBe('test@example.com');
  });
});
