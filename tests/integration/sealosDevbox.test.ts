import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SealosDevboxAdapter, type SealosDevboxConfig } from '@/adapters/SealosDevboxAdapter';
import { sandboxTestData } from './data';

/**
 * Integration tests for SealosDevboxAdapter.
 *
 * These tests require a running Sealos Devbox Server.
 * Set the following environment variables to run:
 *   - SEALOS_DEVBOX_SERVER_URL
 *   - SEALOS_DEVBOX_SERVER_TOKEN
 */

const SANDBOX_URL = process.env.SEALOS_DEVBOX_SERVER_URL;
const SANDBOX_TOKEN = process.env.SEALOS_DEVBOX_SERVER_TOKEN;

// Skip all tests if environment variables are not set
const shouldRun = Boolean(SANDBOX_URL && SANDBOX_TOKEN);

describe.skipIf(!shouldRun)('SealosDevboxAdapter Integration Tests', () => {
  const devboxName = `test-devbox`;

  const config: SealosDevboxConfig = {
    baseUrl: SANDBOX_URL!,
    token: SANDBOX_TOKEN!,
    sandboxId: devboxName
  };

  const adapter = new SealosDevboxAdapter(config);

  beforeAll(async () => {
    await adapter.ensureRunning();
    expect(adapter.status.state).toBe('Running');

    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Cleanup: delete the test container
    try {
      await adapter.delete();
    } catch (error) {
      console.error('Error during cleanup', error);
    }
  });

  // 基本测试
  describe('Basic Tests', () => {
    it('should initialize with correct values', () => {
      expect(adapter.provider).toBe('sealosdevbox');
      expect(adapter.id).toBe(devboxName);
    });
  });

  // 通用测试
  sandboxTestData(adapter);
});
