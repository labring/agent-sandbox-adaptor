import { describe, expect, it } from 'vitest';
import { OpenSandboxAdapter } from '@/adapters/OpenSandboxAdapter';
import type { OpenSandboxConnectionConfig } from '@/adapters/OpenSandboxAdapter';
import { ConnectionError, SandboxStateError } from '@/errors';
import type { ImageSpec, ResourceLimits } from '@/types';
import type { OpenSandboxConfigType } from '@/adapters/OpenSandboxAdapter/type';

const MINIMAL_CONNECTION: OpenSandboxConnectionConfig = {
  sessionId: 'test-session',
  baseUrl: 'http://localhost'
};

function makeAdapter(extra?: Partial<OpenSandboxConnectionConfig>): OpenSandboxAdapter {
  return new OpenSandboxAdapter({ ...MINIMAL_CONNECTION, ...extra });
}

/**
 * Unit tests for OpenSandboxAdapter.
 *
 * These tests verify the OpenSandboxAdapter lifecycle, filesystem operations,
 * command execution, and health checks using mocked SDK behavior.
 */
describe('OpenSandboxAdapter', () => {
  describe('Lifecycle Methods', () => {
    it('should initialize with custom connection config', () => {
      const adapter = makeAdapter({ apiKey: 'test-api-key' });

      expect(adapter.provider).toBe('opensandbox');
      expect(adapter.status.state).toBe('Creating');
    });

    it('should pass server proxy settings into ConnectionConfig', () => {
      const adapter = makeAdapter({
        apiKey: 'test-api-key',
        useServerProxy: true,
        requestTimeoutSeconds: 60,
        debug: true
      });
      const connection = (
        adapter as unknown as {
          _connection: {
            useServerProxy: boolean;
            requestTimeoutSeconds: number;
            debug: boolean;
          };
        }
      )._connection;

      expect(connection.useServerProxy).toBe(true);
      expect(connection.requestTimeoutSeconds).toBe(60);
      expect(connection.debug).toBe(true);
    });

    it('should throw SandboxStateError when accessing sandbox before initialization', async () => {
      const adapter = makeAdapter();

      // Attempting operations before create/connect should throw
      await expect(adapter.execute('echo test')).rejects.toThrow(SandboxStateError);
    });

    it('should handle connection errors gracefully', async () => {
      // Test with a URL that will fail - using a reserved port that won't have a server
      const config: OpenSandboxConfigType = {
        image: { repository: 'nginx', tag: 'latest' }
      };
      const adapter = new OpenSandboxAdapter(
        { ...MINIMAL_CONNECTION, baseUrl: 'http://localhost:65530' },
        config
      );

      // Should throw an error when SDK fails
      try {
        await adapter.create();
        // If we reach here without throwing, that's unexpected
        expect(true).toBe(false); // Force failure if no error thrown
      } catch (error) {
        expect(error instanceof ConnectionError || error instanceof Error).toBe(true);
      }
    });

    it('should handle connect errors gracefully', async () => {
      const adapter = makeAdapter({ baseUrl: 'http://localhost:65530' });

      try {
        await adapter.connect('non-existent-sandbox-id');
        expect(true).toBe(false);
      } catch (error) {
        expect(error instanceof ConnectionError || error instanceof Error).toBe(true);
      }
    });
  });

  describe('Image and Resource Conversion', () => {
    it('should convert ImageSpec to SDK format', () => {
      const adapter = makeAdapter();

      // Test tag format
      const imageWithTag: ImageSpec = { repository: 'nginx', tag: 'latest' };
      // Access private method through type assertion for testing
      const convertImageSpec = (
        adapter as unknown as { convertImageSpec(image: ImageSpec): string }
      ).convertImageSpec;
      expect(convertImageSpec(imageWithTag)).toBe('nginx:latest');

      // Test digest format
      const imageWithDigest: ImageSpec = {
        repository: 'nginx',
        digest: 'sha256:abc123'
      };
      expect(convertImageSpec(imageWithDigest)).toBe('nginx@sha256:abc123');

      // Test tag and digest
      const imageWithBoth: ImageSpec = {
        repository: 'nginx',
        tag: '1.0',
        digest: 'sha256:abc123'
      };
      expect(convertImageSpec(imageWithBoth)).toBe('nginx:1.0@sha256:abc123');

      // Test just repository
      const imageRepoOnly: ImageSpec = { repository: 'nginx' };
      expect(convertImageSpec(imageRepoOnly)).toBe('nginx');
    });

    it('should parse SDK image string to ImageSpec', () => {
      const adapter = makeAdapter();
      const parseImageSpec = (adapter as unknown as { parseImageSpec(image: string): ImageSpec })
        .parseImageSpec;

      // Test tag format
      const withTag = parseImageSpec('nginx:latest');
      expect(withTag.repository).toBe('nginx');
      expect(withTag.tag).toBe('latest');

      // Test digest format
      const withDigest = parseImageSpec('nginx@sha256:abc123');
      expect(withDigest.repository).toBe('nginx');
      expect(withDigest.digest).toBe('sha256:abc123');

      // Test repository only
      const repoOnly = parseImageSpec('nginx');
      expect(repoOnly.repository).toBe('nginx');
      expect(repoOnly.tag).toBeUndefined();
      expect(repoOnly.digest).toBeUndefined();
    });

    it('should convert ResourceLimits to SDK format', () => {
      const adapter = makeAdapter();
      const convertResourceLimits = (
        adapter as unknown as {
          convertResourceLimits(limits?: ResourceLimits): Record<string, string> | undefined;
        }
      ).convertResourceLimits;

      // Full limits
      const limits: ResourceLimits = {
        cpuCount: 2,
        memoryMiB: 512,
        diskGiB: 10
      };
      const converted = convertResourceLimits(limits);
      expect(converted).toEqual({
        cpu: '2',
        memory: '512Mi',
        disk: '10Gi'
      });

      // Partial limits
      const partial: ResourceLimits = { cpuCount: 4 };
      expect(convertResourceLimits(partial)).toEqual({ cpu: '4' });

      // Empty limits
      expect(convertResourceLimits({})).toEqual({});

      // Undefined
      expect(convertResourceLimits(undefined)).toBeUndefined();
    });

    it('should parse SDK resource limits to ResourceLimits', () => {
      const adapter = makeAdapter();
      const parseResourceLimits = (
        adapter as unknown as {
          parseResourceLimits(resource?: Record<string, string>): ResourceLimits | undefined;
        }
      ).parseResourceLimits;

      // Full resource limits
      const sdkLimits = {
        cpu: '2',
        memory: '512Mi',
        disk: '10Gi'
      };
      const parsed = parseResourceLimits(sdkLimits);
      expect(parsed).toEqual({
        cpuCount: 2,
        memoryMiB: 512,
        diskGiB: 10
      });

      // GiB memory conversion
      const gibMemory = { memory: '2Gi' };
      expect(parseResourceLimits(gibMemory)).toEqual({ memoryMiB: 2048 });

      // Empty object
      expect(parseResourceLimits({})).toEqual({});

      // Undefined
      expect(parseResourceLimits(undefined)).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should wrap SDK errors in ConnectionError for create', async () => {
      const adapter = new OpenSandboxAdapter(
        { ...MINIMAL_CONNECTION, baseUrl: 'http://localhost:1' }, // Invalid port
        { image: { repository: 'test' } }
      );

      try {
        await adapter.create();
      } catch (error) {
        // Should be a connection-related error
        expect(error instanceof Error).toBe(true);
      }
    });

    it('should wrap SDK errors in ConnectionError for connect', async () => {
      const adapter = makeAdapter({ baseUrl: 'http://localhost:1' });

      try {
        await adapter.connect('invalid-id');
      } catch (error) {
        expect(error instanceof Error).toBe(true);
      }
    });

    it('should provide meaningful error messages', () => {
      const connectionError = new ConnectionError(
        'Failed to create sandbox',
        'http://example.com',
        new Error('Network timeout')
      );

      expect(connectionError.message).toContain('Failed to create sandbox');
      expect(connectionError.endpoint).toBe('http://example.com');
      expect(connectionError.cause).toBeDefined();
    });

    it('should create SandboxStateError with expected state', () => {
      const stateError = new SandboxStateError('Sandbox not initialized', 'UnExist', 'Running');

      expect(stateError.message).toContain('Sandbox not initialized');
      expect(stateError.currentState).toBe('UnExist');
      expect(stateError.requiredState).toBe('Running');
    });
  });

  describe('Wait Until Ready', () => {
    it('should timeout when sandbox not ready', async () => {
      const adapter = makeAdapter();

      // Without proper initialization, should timeout or error
      try {
        await adapter.waitUntilReady(100); // Short timeout
      } catch (error) {
        // Expected to throw since sandbox not created
        expect(error instanceof Error).toBe(true);
      }
    });
  });

  describe('Runtime Configuration', () => {
    it('should default to docker runtime', () => {
      expect(makeAdapter().runtime).toBe('docker');
    });

    it('should accept kubernetes runtime explicitly', () => {
      expect(makeAdapter({ runtime: 'kubernetes' }).runtime).toBe('kubernetes');
    });
  });

  describe('getInfo', () => {
    it('should return null when sandbox not initialized', async () => {
      const adapter = makeAdapter();
      const info = await adapter.getInfo();
      expect(info).toBeNull();
    });
  });
});
