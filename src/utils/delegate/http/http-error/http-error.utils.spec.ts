import { describe, expect, it } from 'bun:test';
import { HttpError } from './http-error.utils';

describe('HttpError', () => {
  it('should expose the constructor arguments as readonly fields', () => {
    const headers = new Headers({ 'X-Trace-Id': 'abc' });
    const body = { code: 'BAD_REQUEST' };
    const error = new HttpError('HTTP 400: Bad Request', 400, 'Bad Request', headers, body);

    expect(error.message).toBe('HTTP 400: Bad Request');
    expect(error.status).toBe(400);
    expect(error.statusText).toBe('Bad Request');
    expect(error.headers).toBe(headers);
    expect(error.body).toBe(body);
  });

  it('should extend Error and identify itself as HttpError', () => {
    const error = new HttpError('boom', 500, 'Internal Server Error', new Headers(), null);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.name).toBe('HttpError');
  });

  it('should be catchable as Error and preserve the message', () => {
    try {
      throw new HttpError('not found', 404, 'Not Found', new Headers(), null);
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('not found');
    }
  });
});
