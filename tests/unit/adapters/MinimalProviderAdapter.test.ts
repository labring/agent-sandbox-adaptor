import { beforeEach, describe, expect, it } from 'vitest';
import {
  MinimalProviderAdapter,
  type MinimalProviderConnection
} from '@/adapters/MinimalProviderAdapter';
import { FeatureNotSupportedError } from '@/errors';

// Mock connection for testing
class MockConnection implements MinimalProviderConnection {
  id = 'mock-minimal-id';
  private shouldFail = false;

  setShouldFail(fail: boolean): void {
    this.shouldFail = fail;
  }

  async execute(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (this.shouldFail) {
      return { stdout: '', stderr: 'Connection failed', exitCode: 1 };
    }

    // Simulate various command responses
    if (command.includes('echo PING')) {
      return { stdout: 'PING', stderr: '', exitCode: 0 };
    }

    if (command.includes('nproc')) {
      return { stdout: '2', stderr: '', exitCode: 0 };
    }

    if (command.includes('/proc/meminfo')) {
      const stdout = 'MemTotal: 4096000 kB\nMemFree: 2048000 kB\nMemAvailable: 3072000 kB';
      return {
        stdout,
        stderr: '',
        exitCode: 0
      };
    }

    if (command.includes('cat ')) {
      // Simulate file read via base64
      if (command.includes('test.txt')) {
        // "Hello" in base64
        return { stdout: 'SGVsbG8=', stderr: '', exitCode: 0 };
      }
      return { stdout: '', stderr: 'cat: No such file', exitCode: 1 };
    }

    if (command.includes('mkdir -p')) {
      return { stdout: '', stderr: '', exitCode: 0 };
    }

    if (command.includes('base64 -d')) {
      // Simulate write success
      return { stdout: '', stderr: '', exitCode: 0 };
    }

    if (command.includes('ls -la')) {
      return {
        stdout: `total 8
drwxr-xr-x 2 user group 4096 2024-01-15T10:00:00 .
drwxr-xr-x 3 user group 4096 2024-01-15T10:00:00 ..
-rw-r--r-- 1 user group  100 2024-01-15T10:30:00 file.txt`,
        stderr: '',
        exitCode: 0
      };
    }

    // Default response
    return { stdout: `Executed: ${command}`, stderr: '', exitCode: 0 };
  }

  async getStatus() {
    return { state: 'Running' as const };
  }

  async close(): Promise<void> {
    // No-op
  }
}

describe('MinimalProviderAdapter', () => {
  let adapter: MinimalProviderAdapter;
  let mockConnection: MockConnection;

  beforeEach(() => {
    mockConnection = new MockConnection();
    adapter = new MinimalProviderAdapter();
  });

  describe('connect', () => {
    it('should connect and initialize polyfill', async () => {
      await adapter.connect(mockConnection);

      expect(adapter.id).toBe('mock-minimal-id');
      expect(adapter.status.state).toBe('Running');
    });
  });

  describe('create', () => {
    it('should create sandbox via connection factory', async () => {
      const adapterWithFactory = new MinimalProviderAdapter({
        connectionFactory: async () => mockConnection
      });

      await adapterWithFactory.create({ image: { repository: 'alpine' } });

      expect(adapterWithFactory.id).toBe('mock-minimal-id');
      expect(adapterWithFactory.status.state).toBe('Running');
    });
  });

  describe('execute', () => {
    beforeEach(async () => {
      await adapter.connect(mockConnection);
    });

    it('should execute commands through connection', async () => {
      const result = await adapter.execute('echo hello');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Executed');
    });

    it('should handle workingDirectory option', async () => {
      const result = await adapter.execute('pwd', { workingDirectory: '/tmp' });
      expect(result.exitCode).toBe(0);
    });
  });

  describe('filesystem operations (via polyfill)', () => {
    beforeEach(async () => {
      await adapter.connect(mockConnection);
    });

    it('should read files via polyfill', async () => {
      const results = await adapter.readFiles(['/test.txt']);
      expect(results).toBeDefined();
      expect(results[0].content).toBeInstanceOf(Uint8Array);
    });

    it('should list directories via polyfill', async () => {
      const entries = await adapter.listDirectory('/home');
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].name).toBe('file.txt');
    });

    it('should write files via polyfill', async () => {
      const results = await adapter.writeFiles([{ path: '/test.txt', data: 'content' }]);
      expect(results).toBeDefined();
      expect(results[0].error).toBeNull();
    });
  });

  describe('lifecycle operations', () => {
    beforeEach(async () => {
      await adapter.connect(mockConnection);
    });

    it('should start successfully', async () => {
      await adapter.start();
      expect(adapter.status.state).toBe('Running');
    });

    it('should stop successfully', async () => {
      await adapter.stop();
      expect(adapter.status.state).toBe('Stopped');
    });

    it('should delete successfully', async () => {
      await adapter.delete();
      expect(adapter.status.state).toBe('UnExist');
    });

    it('should return sandbox info', async () => {
      const info = await adapter.getInfo();
      expect(info).not.toBeNull();
      expect(info?.id).toBe('mock-minimal-id');
    });

    it('should return null for getInfo when not connected', async () => {
      const disconnectedAdapter = new MinimalProviderAdapter();
      const info = await disconnectedAdapter.getInfo();
      expect(info).toBeNull();
    });
  });

  describe('unsupported operations', () => {
    beforeEach(async () => {
      await adapter.connect(mockConnection);
    });

    it('should throw FeatureNotSupportedError for renewExpiration', async () => {
      await expect(adapter.renewExpiration(3600)).rejects.toThrow(FeatureNotSupportedError);
    });

    it('should throw FeatureNotSupportedError for executeBackground', async () => {
      await expect(adapter.executeBackground('sleep 100')).rejects.toThrow(
        FeatureNotSupportedError
      );
    });

    it('should throw FeatureNotSupportedError for interrupt', async () => {
      await expect(adapter.interrupt('session-id')).rejects.toThrow(FeatureNotSupportedError);
    });
  });

  describe('health check (via polyfill)', () => {
    beforeEach(async () => {
      await adapter.connect(mockConnection);
    });

    it('should ping via polyfill', async () => {
      const result = await adapter.ping();
      expect(result).toBe(true);
    });

    it('should get metrics via polyfill', async () => {
      const metrics = await adapter.getMetrics();
      expect(metrics.cpuCount).toBe(2);
      expect(metrics.memoryTotalMiB).toBe(4000);
    });
  });

  describe('executeStream fallback', () => {
    beforeEach(async () => {
      await adapter.connect(mockConnection);
    });

    it('should fallback to execute when streaming not supported', async () => {
      const stdoutChunks: string[] = [];

      await adapter.executeStream('echo test', {
        onStdout: (msg) => {
          stdoutChunks.push(msg.text);
        }
      });

      expect(stdoutChunks.length).toBeGreaterThan(0);
    });
  });

  describe('Provider', () => {
    it('should have correct provider name', () => {
      expect(adapter.provider).toBe('minimal');
    });
  });
});
