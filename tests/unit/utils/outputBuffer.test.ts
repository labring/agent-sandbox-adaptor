import { describe, expect, it } from 'vitest';
import { BoundedOutputBuffer } from '@/utils/outputBuffer';

describe('BoundedOutputBuffer', () => {
  it('retains all output below the limit and reports not truncated', () => {
    const buf = new BoundedOutputBuffer(100);
    buf.append('hello ');
    buf.append('world');
    expect(buf.toString()).toBe('hello world');
    expect(buf.truncated).toBe(false);
    expect(buf.totalBytes).toBe(Buffer.byteLength('hello world', 'utf8'));
  });

  it('drops oldest chunks when exceeding the limit', () => {
    const buf = new BoundedOutputBuffer(10);
    buf.append('aaaaa'); // 5 bytes
    buf.append('bbbbb'); // 10 bytes cumulative
    buf.append('ccccc'); // 15 bytes → drop oldest "aaaaa"
    expect(buf.toString()).toBe('bbbbbccccc');
    expect(buf.truncated).toBe(true);
    expect(buf.totalBytes).toBe(15);
  });

  it('truncates the remaining chunk when a single append exceeds the limit', () => {
    const buf = new BoundedOutputBuffer(5);
    buf.append('0123456789'); // 10 bytes, needs to slice tail of length 5
    expect(buf.toString()).toBe('56789');
    expect(buf.truncated).toBe(true);
    expect(buf.totalBytes).toBe(10);
  });

  it('counts multi-byte UTF-8 bytes correctly', () => {
    const buf = new BoundedOutputBuffer(6);
    // "中" is 3 bytes in UTF-8
    buf.append('中文');
    expect(buf.toString()).toBe('中文');
    expect(buf.truncated).toBe(false);

    buf.append('中'); // now 9 bytes → must drop
    expect(buf.truncated).toBe(true);
    expect(Buffer.byteLength(buf.toString(), 'utf8')).toBeLessThanOrEqual(6);
  });

  it('ignores empty appends', () => {
    const buf = new BoundedOutputBuffer(10);
    buf.append('');
    expect(buf.toString()).toBe('');
    expect(buf.truncated).toBe(false);
    expect(buf.totalBytes).toBe(0);
  });

  it('throws for non-positive maxBytes', () => {
    expect(() => new BoundedOutputBuffer(0)).toThrow();
    expect(() => new BoundedOutputBuffer(-1)).toThrow();
  });
});
