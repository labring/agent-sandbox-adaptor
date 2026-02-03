import { describe, expect, it } from 'vitest';
import { FeatureNotSupportedError } from '@/errors';
import { BaseSandboxAdapter } from '@/adapters/BaseSandboxAdapter';
import { MockSandboxAdapter } from '../../mocks/MockSandboxAdapter';
import type { ExecuteResult, SandboxConfig, SandboxInfo } from '@/types';

class FallbackAdapter extends BaseSandboxAdapter {
  readonly id = 'fallback-id';
  readonly provider = 'fallback';

  async create(_config: SandboxConfig): Promise<void> {}
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  async pause(): Promise<void> {}
  async resume(): Promise<void> {}
  async delete(): Promise<void> {}
  async getInfo(): Promise<SandboxInfo> {
    return {
      id: this.id,
      image: { repository: 'fallback', tag: 'latest' },
      entrypoint: [],
      status: this._status,
      createdAt: new Date()
    };
  }
  async close(): Promise<void> {}

  async execute(_command: string): Promise<ExecuteResult> {
    return {
      stdout: 'fallback-stdout',
      stderr: '',
      exitCode: 0,
      truncated: false
    };
  }
}

class NoPolyfillAdapter extends FallbackAdapter {
  constructor() {
    super();
    this.polyfillService = undefined;
  }
}

describe('BaseSandboxAdapter', () => {
  it('should fallback executeStream to execute', async () => {
    const adapter = new FallbackAdapter();
    const stdoutChunks: string[] = [];

    await adapter.executeStream('echo test', {
      onStdout: (msg) => {
        stdoutChunks.push(msg.text);
      }
    });

    expect(stdoutChunks).toEqual(['fallback-stdout']);
  });

  it('should throw for executeBackground by default', async () => {
    const adapter = new FallbackAdapter();

    await expect(adapter.executeBackground('sleep 10')).rejects.toBeInstanceOf(
      FeatureNotSupportedError
    );
  });

  it('should throw when polyfill service is missing', async () => {
    const adapter = new NoPolyfillAdapter();

    await expect(adapter.readFiles(['/any.txt'])).rejects.toBeInstanceOf(FeatureNotSupportedError);
  });

  it('should resolve waitUntilReady when ping succeeds', async () => {
    const adapter = new MockSandboxAdapter();
    await adapter.waitUntilReady(5000);
    expect(true).toBe(true);
  });

  it('should throw FeatureNotSupportedError for unsupported pause', async () => {
    const adapter = new MockSandboxAdapter({ supportsPauseResume: false });

    try {
      await adapter.pause();
      expect(false).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(FeatureNotSupportedError);
      expect((error as FeatureNotSupportedError).feature).toBe('pause');
    }
  });
});
