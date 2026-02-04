import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FastGPTSandboxAdapter, type FastGPTSandboxConfig } from '@/adapters/FastGPTSandboxAdapter';
import type { SandboxConfig } from '@/types';

/**
 * Integration tests for FastGPTSandboxAdapter.
 *
 * These tests require a running FastGPT Sandbox Server.
 * Set the following environment variables to run:
 *   - FASTGPT_SANDBOX_SERVER_URL
 *   - FASTGPT_SANDBOX_SERVER_TOKEN
 */

const SANDBOX_URL = process.env.FASTGPT_SANDBOX_SERVER_URL;
const SANDBOX_TOKEN = process.env.FASTGPT_SANDBOX_SERVER_TOKEN;

// Skip all tests if environment variables are not set
const shouldRun = Boolean(SANDBOX_URL && SANDBOX_TOKEN);

describe.skipIf(!shouldRun)('FastGPTSandboxAdapter Integration Tests', () => {
  let adapter: FastGPTSandboxAdapter;
  const randomThreeDigits = Math.floor(100 + Math.random() * 900);
  const containerName = `test-${Date.now()}-${randomThreeDigits}`;

  const config: FastGPTSandboxConfig = {
    baseUrl: SANDBOX_URL!,
    token: SANDBOX_TOKEN!,
    containerName
  };

  const sandboxConfig: SandboxConfig = {
    image: { repository: 'node', tag: '18' }
  };

  beforeAll(async () => {
    adapter = new FastGPTSandboxAdapter(config);
  });

  afterAll(async () => {
    // Cleanup: delete the test container
    try {
      await adapter.delete();
    } catch {
      // Ignore errors during cleanup
    }
  });

  // ==================== 1. Container Lifecycle Operations ====================
  describe('Container Lifecycle Operations', () => {
    describe('initialization', () => {
      it('should initialize with correct values', () => {
        expect(adapter.provider).toBe('fastgpt');
        expect(adapter.id).toBe(containerName);
      });
    });

    describe('create()', () => {
      it('should create a new container', async () => {
        await adapter.create(sandboxConfig);

        expect(adapter.status.state).toBe('Running');
      });

      it('should skip creation if container already exists', async () => {
        // Second call should not throw
        await expect(adapter.create(sandboxConfig)).resolves.toBeUndefined();
      });
    });

    describe('getInfo()', () => {
      it('should return sandbox info', async () => {
        const info = await adapter.getInfo();

        expect(info).not.toBeNull();
        expect(info?.id).toBe(containerName);
        expect(info?.status.state).toBe('Running');
      });
    });

    describe('ping()', () => {
      it('should return true when container is healthy', async () => {
        const result = await adapter.ping();

        expect(result).toBe(true);
      });
    });

    describe('pause() and resume()', () => {
      it('should pause the container', async () => {
        await adapter.pause();

        expect(adapter.status.state).toBe('Paused');
      });

      it('should resume the container', async () => {
        await adapter.resume();

        expect(adapter.status.state).toBe('Running');
      });
    });

    describe('stop() and start()', () => {
      it('should stop the container', async () => {
        await adapter.stop();

        expect(adapter.status.state).toBe('Paused');
      });

      it('should start the container', async () => {
        await adapter.start();

        expect(adapter.status.state).toBe('Running');
      });
    });

    describe('waitUntilReady()', () => {
      it('should resolve when container is ready', async () => {
        await expect(adapter.waitUntilReady(30000)).resolves.toBeUndefined();
      });
    });
  });

  // ==================== 2. Command Operations ====================
  describe('Command Operations', () => {
    describe('execute()', () => {
      it('should execute a simple command', async () => {
        const result = await adapter.execute('echo "Hello, World!"');

        expect(result.stdout.trim()).toBe('Hello, World!');
        expect(result.exitCode).toBe(0);
      });

      it(
        'should execute command with working directory',
        async () => {
          const result = await adapter.execute('pwd', { workingDirectory: '/tmp' });

          expect(result.stdout.trim()).toBe('/tmp');
          expect(result.exitCode).toBe(0);
        },
        { retry: 2 }
      );

      it('should capture stderr output', async () => {
        const result = await adapter.execute('echo "error" >&2');

        expect(result.stderr.trim()).toBe('error');
        expect(result.exitCode).toBe(0);
      });

      it('should return non-zero exit code on failure', async () => {
        const result = await adapter.execute('exit 1');

        expect(result.exitCode).toBe(1);
      });

      it('should handle complex shell commands', async () => {
        const result = await adapter.execute('echo "a b c" | wc -w');

        expect(result.stdout.trim()).toBe('3');
        expect(result.exitCode).toBe(0);
      });

      it('should handle environment variables', async () => {
        const result = await adapter.execute('echo $HOME');

        expect(result.stdout.trim()).not.toBe('');
        expect(result.exitCode).toBe(0);
      });

      it('should execute node commands', async () => {
        const result = await adapter.execute('node -e "console.log(1+1)"');

        expect(result.stdout.trim()).toBe('2');
        expect(result.exitCode).toBe(0);
      });
    });

    describe('executeStream()', () => {
      it('should stream stdout to handler', async () => {
        const chunks: string[] = [];

        await adapter.executeStream('echo "streamed"', {
          onStdout: (msg) => {
            chunks.push(msg.text);
          }
        });

        expect(chunks.join('')).toContain('streamed');
      });

      it('should stream stderr to handler', async () => {
        const chunks: string[] = [];

        await adapter.executeStream('echo "error" >&2', {
          onStderr: (msg) => {
            chunks.push(msg.text);
          }
        });

        expect(chunks.join('')).toContain('error');
      });

      it('should call onComplete with result', async () => {
        let exitCode: number | null | undefined;

        await adapter.executeStream('echo done', {
          onComplete: (result) => {
            exitCode = result.exitCode;
          }
        });

        expect(exitCode).toBe(0);
      });
    });
  });

  // ==================== 3. File Operations ====================
  describe('File Operations', () => {
    const testDir = '/tmp/test-files';
    const testFile = `${testDir}/test.txt`;
    const testContent = 'Hello, FastGPT!';

    beforeAll(async () => {
      // Create test directory
      await adapter.createDirectories([testDir]);
    });

    afterAll(async () => {
      // Cleanup test directory
      try {
        await adapter.deleteDirectories([testDir], { recursive: true, force: true });
      } catch {
        // Ignore
      }
    });

    describe('writeFiles()', () => {
      it('should write string content to file', async () => {
        const results = await adapter.writeFiles([{ path: testFile, data: testContent }]);

        expect(results).toHaveLength(1);
        expect(results[0].error).toBeNull();
        expect(results[0].bytesWritten).toBeGreaterThan(0);
      });

      it('should write binary content to file', async () => {
        const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
        const results = await adapter.writeFiles([
          { path: `${testDir}/binary.bin`, data: binaryData }
        ]);

        expect(results[0].error).toBeNull();
        expect(results[0].bytesWritten).toBe(5);
      });

      it('should write multiple files', async () => {
        const results = await adapter.writeFiles([
          { path: `${testDir}/file1.txt`, data: 'content1' },
          { path: `${testDir}/file2.txt`, data: 'content2' }
        ]);

        expect(results).toHaveLength(2);
        expect(results.every((r) => r.error === null)).toBe(true);
      });
    });

    describe('readFiles()', () => {
      it('should read file content', async () => {
        const results = await adapter.readFiles([testFile]);

        expect(results).toHaveLength(1);
        expect(results[0].error).toBeNull();

        const content = new TextDecoder().decode(results[0].content);
        // Polyfill may add trailing newline, use trim() for comparison
        expect(content.trim()).toBe(testContent);
      });

      it('should handle non-existent file', async () => {
        const results = await adapter.readFiles([`${testDir}/nonexistent.txt`]);

        expect(results).toHaveLength(1);
        // Polyfill returns empty content for non-existent file (no error thrown)
        // Check either error is set OR content is empty
        const hasError = results[0].error !== null;
        const isEmpty = results[0].content.length === 0;
        expect(hasError || isEmpty).toBe(true);
      });

      it('should read multiple files', async () => {
        const results = await adapter.readFiles([`${testDir}/file1.txt`, `${testDir}/file2.txt`]);

        expect(results).toHaveLength(2);
      });
    });

    describe('listDirectory()', () => {
      it('should list directory contents', async () => {
        const entries = await adapter.listDirectory(testDir);

        expect(entries.length).toBeGreaterThan(0);
        expect(entries.some((e) => e.name === 'test.txt')).toBe(true);
      });

      it('should return empty array for empty directory', async () => {
        await adapter.createDirectories([`${testDir}/empty`]);
        const entries = await adapter.listDirectory(`${testDir}/empty`);

        expect(entries).toEqual([]);
      });
    });

    describe('getFileInfo()', () => {
      it('should get file info', async () => {
        const infoMap = await adapter.getFileInfo([testFile]);

        expect(infoMap.has(testFile)).toBe(true);
        const info = infoMap.get(testFile);
        expect(info?.size).toBeGreaterThan(0);
        expect(info?.isFile).toBe(true);
      });
    });

    describe('moveFiles()', () => {
      it('should move file', async () => {
        const source = `${testDir}/to-move.txt`;
        const dest = `${testDir}/moved.txt`;

        await adapter.writeFiles([{ path: source, data: 'move me' }]);
        await adapter.moveFiles([{ source, destination: dest }]);

        const results = await adapter.readFiles([dest]);
        expect(results[0].error).toBeNull();

        const content = new TextDecoder().decode(results[0].content);
        // Polyfill may add trailing newline
        expect(content.trim()).toBe('move me');
      });
    });

    describe('replaceContent()', () => {
      it('should replace content in file', async () => {
        const file = `${testDir}/replace.txt`;
        await adapter.writeFiles([{ path: file, data: 'Hello World' }]);

        await adapter.replaceContent([{ path: file, oldContent: 'World', newContent: 'FastGPT' }]);

        const results = await adapter.readFiles([file]);
        const content = new TextDecoder().decode(results[0].content);
        // Polyfill may add trailing newline
        expect(content.trim()).toBe('Hello FastGPT');
      });
    });

    describe('deleteFiles()', () => {
      it('should delete file', async () => {
        const file = `${testDir}/to-delete.txt`;
        await adapter.writeFiles([{ path: file, data: 'delete me' }]);

        const results = await adapter.deleteFiles([file]);

        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(true);

        // Verify file is deleted by checking content is empty or error is set
        const readResults = await adapter.readFiles([file]);
        const hasError = readResults[0].error !== null;
        const isEmpty = readResults[0].content.length === 0;
        expect(hasError || isEmpty).toBe(true);
      });
    });

    describe('createDirectories()', () => {
      it('should create nested directories', async () => {
        const nestedDir = `${testDir}/nested/deep/dir`;
        await adapter.createDirectories([nestedDir]);

        // Verify by writing a file
        await adapter.writeFiles([{ path: `${nestedDir}/file.txt`, data: 'test' }]);
        const results = await adapter.readFiles([`${nestedDir}/file.txt`]);
        expect(results[0].error).toBeNull();
      });
    });

    describe('deleteDirectories()', () => {
      it('should delete directory recursively', async () => {
        const dir = `${testDir}/to-delete-dir`;
        await adapter.createDirectories([dir]);
        await adapter.writeFiles([{ path: `${dir}/file.txt`, data: 'test' }]);

        await adapter.deleteDirectories([dir], { recursive: true });

        // Verify directory is deleted
        const entries = await adapter.listDirectory(testDir);
        expect(entries.some((e) => e.name === 'to-delete-dir')).toBe(false);
      });
    });

    describe('search()', () => {
      it('should search for files by pattern', async () => {
        const results = await adapter.search('*.txt', testDir);

        expect(results.length).toBeGreaterThan(0);
        expect(results.some((r) => r.path.endsWith('.txt'))).toBe(true);
      });
    });

    describe('getMetrics()', () => {
      it('should get sandbox metrics', async () => {
        const metrics = await adapter.getMetrics();

        expect(metrics.cpuCount).toBeGreaterThan(0);
        expect(metrics.memoryTotalMiB).toBeGreaterThan(0);
        expect(metrics.timestamp).toBeGreaterThan(0);
      });
    });
  });

  // ==================== Cleanup Test ====================
  describe('Container Cleanup', () => {
    it('should delete the container', async () => {
      await adapter.delete();

      expect(adapter.status.state).toBe('Deleted');
    });
  });
});
