import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { errorHandler } from '../src/middleware/errorHandler.js';

type MockReq = {
  method: string;
  originalUrl: string;
};

type MockRes = {
  headersSent: boolean;
  statusCode?: number;
  body?: unknown;
  text?: unknown;
  status(this: MockRes, code: number): MockRes;
  json(this: MockRes, payload: unknown): MockRes;
  send(this: MockRes, payload: unknown): MockRes;
};

function createRes(): MockRes {
  return {
    headersSent: false,
    statusCode: undefined,
    body: undefined,
    text: undefined,
    status(this: MockRes, code: number) {
      this.statusCode = code;
      return this;
    },
    json(this: MockRes, payload: unknown) {
      this.body = payload;
      return this;
    },
    send(this: MockRes, payload: unknown) {
      this.text = payload;
      return this;
    },
  };
}

describe('M4 error handler sanitization', () => {
  const prevNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = prevNodeEnv;
  });

  it('default /api envelope: non espone err.message in production', () => {
    const err = new Error('SUPER_SECRET_DETAILS');
    const req: MockReq = { method: 'GET', originalUrl: '/api/engine/state' };
    const res = createRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ ok: false, error: 'INTERNAL_ERROR' });
  });

  it('parser /api/parser envelope: non include Message in production', () => {
    const err = new Error('PARSER_INTERNAL_DETAILS');
    const req: MockReq = { method: 'POST', originalUrl: '/api/parser/parse' };
    const res = createRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ IsValid: false, Error: 'INTERNAL' });
  });

  it('legacy /api/run-tests path: usa envelope /api standard in production', () => {
    const err = new Error('LEGACY_ENDPOINT_INTERNAL');
    const req: MockReq = { method: 'POST', originalUrl: '/api/run-tests' };
    const res = createRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ ok: false, error: 'INTERNAL_ERROR' });
  });
});
