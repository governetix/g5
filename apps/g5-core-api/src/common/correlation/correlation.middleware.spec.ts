import { CorrelationMiddleware } from './correlation.middleware';

describe('CorrelationMiddleware', () => {
  it('adds correlationId to request and preserves existing header', () => {
    const mw = new CorrelationMiddleware();
    const req: any = { headers: {} };
    const res: any = { setHeader: jest.fn() };
    let nextCalled = false;
    mw.use(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.correlationId).toBeDefined();
    expect(typeof req.correlationId).toBe('string');
  });

  it('reuses provided x-correlation-id header', () => {
    const mw = new CorrelationMiddleware();
    const existing = 'abc-123';
    const req: any = { headers: { 'x-correlation-id': existing } };
    const res: any = { setHeader: jest.fn() };
    mw.use(req, res, () => {});
    expect(req.correlationId).toBe(existing);
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-Id', existing);
  });
});
