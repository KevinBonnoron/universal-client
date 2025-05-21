import { describe, expect, it } from 'bun:test';
import { universalClient } from './universal-client';

describe('universalClient', () => {
  it('should create a client with a single feature', () => {
    const featureA = () => ({ propA: 'valueA' });
    const client = universalClient(featureA);

    expect(client).toEqual({ propA: 'valueA' });
  });

  it('should merge multiple features', () => {
    const featureA = () => ({ propA: 'valueA' });
    const featureB = () => ({ propB: 'valueB' });
    const client = universalClient(featureA, featureB);

    expect(client).toEqual({
      propA: 'valueA',
      propB: 'valueB',
    });
  });

  it('should pass input from first feature to subsequent features', () => {
    const featureA = () => ({ propA: 'valueA' });
    const featureB = (input: { propA: string }) => ({
      propB: `valueB-${input.propA}`,
    });
    const client = universalClient(featureA, featureB);

    expect(client).toEqual({
      propA: 'valueA',
      propB: 'valueB-valueA',
    });
  });

  it('should handle three features with proper merging', () => {
    const featureA = () => ({ propA: 'valueA' });
    const featureB = (input: { propA: string }) => ({
      propB: `valueB-${input.propA}`,
    });
    const featureC = (input: { propA: string; propB: string }) => ({
      propC: `valueC-${input.propA}-${input.propB}`,
    });
    const client = universalClient(featureA, featureB, featureC);

    expect(client).toEqual({
      propA: 'valueA',
      propB: 'valueB-valueA',
      propC: 'valueC-valueA-valueB-valueA',
    });
  });

  it('should handle property overriding in later features', () => {
    const featureA = () => ({ prop: 'valueA' });
    const featureB = () => ({ prop: 'valueB' });
    const client = universalClient(featureA, featureB);

    expect(client).toEqual({ prop: 'valueB' });
  });

  it('should remove onInit hook from result', () => {
    const featureWithHook = () => ({
      prop: 'value',
      onInit: () => {},
    });

    const client = universalClient(featureWithHook);

    // @ts-expect-error - onInit is removed from the result
    expect(client).toEqual({ prop: 'value' });
    expect('onInit' in client).toBe(false);
  });

  it('should handle multiple features with onInit hooks', () => {
    const featureA = () => ({
      propA: 'valueA',
      onInit: () => {},
    });
    const featureB = () => ({
      propB: 'valueB',
      onInit: () => {},
    });

    const client = universalClient(featureA, featureB);

    // @ts-expect-error - onInit is removed from the result
    expect(client).toEqual({ propA: 'valueA', propB: 'valueB' });
    expect('onInit' in client).toBe(false);
  });

  it('should handle empty features array', () => {
    const client = universalClient();
    expect(client).toEqual({});
  });

  it('should handle features that return empty objects', () => {
    const featureA = () => ({});
    const featureB = () => ({ prop: 'value' });
    const client = universalClient(featureA, featureB);

    expect(client).toEqual({ prop: 'value' });
  });
});
