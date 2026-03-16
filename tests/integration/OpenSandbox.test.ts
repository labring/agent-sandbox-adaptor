import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { describeSandboxContract } from './suites';
import {
  OpenSandboxAdapter,
  type OpenSandboxConfigType,
  type OpenSandboxConnectionConfig
} from '@/adapters';

const shouldRun = Boolean(process.env.OPENSANDBOX_BASE_URL);

describe.skipIf(!shouldRun).sequential('OpenSandboxAdapter Integration Tests', () => {
  const sessionId = crypto.randomUUID();
  const connectionConfig: OpenSandboxConnectionConfig = {
    baseUrl: process.env.OPENSANDBOX_BASE_URL,
    runtime: 'docker',
    useServerProxy: true,
    requestTimeoutSeconds: 60
  };
  const createConfig: OpenSandboxConfigType = {
    timeout: 600,
    readyTimeoutSeconds: 60,
    healthCheckPollingInterval: 500,
    image: {
      repository: 'fastgpt-agent-sandbox',
      tag: 'docker'
    },
    entrypoint: ['/opt/sync-agent/docker-entrypoint.sh'],
    env: {
      FASTGPT_SESSION_ID: sessionId,
      FASTGPT_MINIO_ENDPOINT: process.env.OPENSANDBOX_MINIO_ENDPOINT ?? 'http://fastgpt-minio:9000',
      FASTGPT_MINIO_ACCESS_KEY: process.env.OPENSANDBOX_MINIO_ACCESS_KEY ?? 'minioadmin',
      FASTGPT_MINIO_SECRET_KEY: process.env.OPENSANDBOX_MINIO_SECRET_KEY ?? 'minioadmin',
      FASTGPT_MINIO_BUCKET: process.env.OPENSANDBOX_MINIO_BUCKET ?? 'fastgpt-private',
      FASTGPT_WORKDIR: process.env.OPENSANDBOX_WORKDIR ?? '/home/sandbox/workspace',
      FASTGPT_SYNC_PATH: process.env.OPENSANDBOX_SYNC_PATH ?? '/home/sandbox/workspace',
      FASTGPT_ENABLE_CODE_SERVER: process.env.OPENSANDBOX_ENABLE_CODE_SERVER ?? 'true'
    },
    metadata: {
      skillId: crypto.randomUUID(),
      teamId: crypto.randomUUID(),
      sandboxType: 'editDebug',
      sessionId: sessionId
    }
  };

  const adapter = new OpenSandboxAdapter(connectionConfig, createConfig);

  beforeAll(async () => {
    await adapter.ensureRunning();
    expect(adapter.status.state).toBe('Running');
  }, 90_000);

  afterAll(async () => {
    try {
      await adapter.delete();
    } catch (error) {
      console.error('Error during cleanup', error);
    }
  }, 30_000);

  describe('Basic Tests', () => {
    it('should initialize with the expected OpenSandbox configuration', () => {
      expect(adapter.provider).toBe('opensandbox');
      expect(adapter.runtime).toBe('docker');
    });
  });

  describeSandboxContract({
    getAdapter: () => adapter
  });
});
