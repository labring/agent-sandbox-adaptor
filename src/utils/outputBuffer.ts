/**
 * Bounded, append-only text buffer that keeps only the tail when the total
 * byte count exceeds `maxBytes`. The head is dropped first, because for
 * command output the tail is almost always the most useful part (error
 * messages, summaries, stack traces, final lines).
 *
 * Chunks are stored as UTF-8 `Buffer`s so byte counting is O(1) per chunk
 * and slicing is exact. Decoding only happens in {@link toString}, which
 * gracefully handles any broken leading multi-byte sequence created by a
 * mid-character slice.
 *
 * Memory is O(maxBytes) regardless of how much data is appended over the
 * lifetime of the buffer.
 */
export class BoundedOutputBuffer {
  private chunks: Buffer[] = [];
  private currentBytes = 0;
  private _totalBytes = 0;
  private _truncated = false;

  constructor(private readonly maxBytes: number) {
    if (!(maxBytes > 0)) {
      throw new Error(`BoundedOutputBuffer: maxBytes must be > 0 (got ${maxBytes})`);
    }
  }

  append(text: string): void {
    if (!text) return;

    const chunk = Buffer.from(text, 'utf8');
    this._totalBytes += chunk.length;
    this.chunks.push(chunk);
    this.currentBytes += chunk.length;

    if (this.currentBytes <= this.maxBytes) return;

    this._truncated = true;
    // Drop oldest chunks that fit entirely within the overflow.
    while (this.chunks.length > 1 && this.currentBytes - this.chunks[0].length >= this.maxBytes) {
      this.currentBytes -= this.chunks[0].length;
      this.chunks.shift();
    }

    // Trim the head of the oldest remaining chunk if needed.
    if (this.currentBytes > this.maxBytes && this.chunks.length > 0) {
      const overflow = this.currentBytes - this.maxBytes;
      this.chunks[0] = this.chunks[0].subarray(overflow);
      this.currentBytes -= overflow;
    }
  }

  /** Total bytes appended over the buffer's lifetime (not just the bytes currently stored). */
  get totalBytes(): number {
    return this._totalBytes;
  }

  /** True once any data has been dropped. */
  get truncated(): boolean {
    return this._truncated;
  }

  toString(): string {
    if (this.chunks.length === 0) return '';
    // Buffer.concat + toString('utf8') replaces any broken leading multi-byte
    // sequence (from a mid-character head trim) with U+FFFD automatically.
    return Buffer.concat(this.chunks, this.currentBytes).toString('utf8');
  }
}
