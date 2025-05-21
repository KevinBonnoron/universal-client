import { describe, expect, it } from 'bun:test';
import { withHooks } from './with-hooks.feature';

describe('withHooks', () => {
  it('should create hooks', () => {
    const feature = withHooks({ onInit: () => {} });

    expect(feature({})).toEqual({
      onInit: expect.any(Function),
    });
  });
});
