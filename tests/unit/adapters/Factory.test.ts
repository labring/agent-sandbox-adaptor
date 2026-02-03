import { describe, expect, it } from 'vitest';
import { MinimalProviderAdapter } from '@/adapters/MinimalProviderAdapter';
import { OpenSandboxAdapter } from '@/adapters/OpenSandboxAdapter';
import { createSandbox } from '@/index';

describe('createSandbox', () => {
  it('should create OpenSandbox adapter', () => {
    const sandbox = createSandbox({
      provider: 'opensandbox',
      config: {
        baseUrl: 'http://localhost:8080',
        apiKey: 'test-key'
      }
    });

    expect(sandbox).toBeInstanceOf(OpenSandboxAdapter);
    expect(sandbox.provider).toBe('opensandbox');
  });

  it('should create minimal provider adapter', () => {
    const sandbox = createSandbox({
      provider: 'minimal',
      config: {}
    });

    expect(sandbox).toBeInstanceOf(MinimalProviderAdapter);
    expect(sandbox.provider).toBe('minimal');
  });

  it('should throw error for unknown provider', () => {
    const invalidConfig = {
      provider: 'unknown',
      config: {}
    } as unknown as Parameters<typeof createSandbox>[0];

    expect(() => createSandbox(invalidConfig)).toThrow('Unknown provider');
  });
});
