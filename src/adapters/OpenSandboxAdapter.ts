import { ConnectionConfig, ExecutionHandlers, Sandbox } from '@alibaba-group/opensandbox';
import {
  CommandExecutionError,
  ConnectionError,
  FeatureNotSupportedError,
  SandboxStateError
} from '../errors';
import type {
  ExecuteOptions,
  ExecuteResult,
  ImageSpec,
  ResourceLimits,
  SandboxConfig,
  SandboxId,
  SandboxInfo,
  SandboxMetrics,
  SandboxState,
  SandboxStatus,
  StreamHandlers
} from '../types';
import { BaseSandboxAdapter } from './BaseSandboxAdapter';

/**
 * Sandbox runtime type.
 * - docker: Full-featured runtime with pause/resume support
 * - kubernetes: Container orchestration runtime
 */
export type SandboxRuntimeType = 'docker' | 'kubernetes';

/**
 * Connection configuration options for OpenSandboxAdapter.
 */
export interface OpenSandboxConnectionConfig {
  /** Base URL for the OpenSandbox API */
  baseUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /**
   * Sandbox runtime type.
   * @default 'docker'
   */
  runtime?: SandboxRuntimeType;
}

/**
 * OpenSandbox provider adapter.
 *
 * Full native support for all features via the OpenSandbox TypeScript SDK.
 *
 * @example
 * ```typescript
 * const adapter = new OpenSandboxAdapter({
 *   baseUrl: 'https://api.opensandbox.example.com',
 *   apiKey: 'your-api-key'
 * });
 *
 * await adapter.create({
 *   image: { repository: 'node', tag: '18-alpine' }
 * });
 *
 * const result = await adapter.execute('node --version');
 * console.log(result.stdout); // v18.x.x
 * ```
 */
export class OpenSandboxAdapter extends BaseSandboxAdapter {
  readonly provider = 'opensandbox' as const;
  readonly runtime: SandboxRuntimeType;

  private _sandbox?: Sandbox;
  private _connection: ConnectionConfig;
  private _id: SandboxId = '';

  constructor(private connectionConfig: OpenSandboxConnectionConfig = {}) {
    super();
    this.runtime = connectionConfig.runtime ?? 'docker';
    this._connection = this.createConnectionConfig();
  }

  get id(): SandboxId {
    return this._id;
  }

  private get sandbox(): Sandbox {
    if (!this._sandbox) {
      throw new SandboxStateError(
        'Sandbox not initialized. Call create() or connect() first.',
        'UnExist',
        'Running'
      );
    }
    return this._sandbox;
  }

  private createConnectionConfig(): ConnectionConfig {
    const { baseUrl, apiKey } = this.connectionConfig;

    if (!baseUrl) {
      return new ConnectionConfig({ apiKey });
    }

    return new ConnectionConfig({
      domain: baseUrl,
      apiKey
    });
  }

  // ==================== Status Mapping ====================

  private static readonly STATE_MAP: Record<string, SandboxState> = {
    running: 'Running',
    creating: 'Creating',
    starting: 'Starting',
    stopping: 'Stopping',
    stopped: 'Stopped',
    deleting: 'Deleting',
    error: 'Error',
    paused: 'Stopped',
    deleted: 'UnExist'
  };

  private mapStatus(sdkStatus: {
    state: string;
    reason?: string;
    message?: string;
  }): SandboxStatus {
    const state = OpenSandboxAdapter.STATE_MAP[sdkStatus.state.toLowerCase()] ?? 'Error';
    return {
      state,
      reason: sdkStatus.reason,
      message: sdkStatus.message
    };
  }

  // ==================== Image and Resource Conversion ====================

  private convertImageSpec(image: ImageSpec): string {
    const parts: string[] = [image.repository];
    if (image.tag) {
      parts.push(':', image.tag);
    }
    if (image.digest) {
      parts.push('@', image.digest);
    }
    return parts.join('');
  }

  private parseImageSpec(image: string): ImageSpec {
    const atIndex = image.indexOf('@');
    if (atIndex > -1) {
      return { repository: image.slice(0, atIndex), digest: image.slice(atIndex + 1) };
    }

    const colonIndex = image.indexOf(':');
    if (colonIndex > -1) {
      return { repository: image.slice(0, colonIndex), tag: image.slice(colonIndex + 1) };
    }

    return { repository: image };
  }

  private convertResourceLimits(
    resourceLimits?: ResourceLimits
  ): Record<string, string> | undefined {
    if (!resourceLimits) return undefined;

    const result: Record<string, string> = {};
    if (resourceLimits.cpuCount !== undefined) {
      result.cpu = resourceLimits.cpuCount.toString();
    }
    if (resourceLimits.memoryMiB !== undefined) {
      result.memory = `${resourceLimits.memoryMiB}Mi`;
    }
    if (resourceLimits.diskGiB !== undefined) {
      result.disk = `${resourceLimits.diskGiB}Gi`;
    }
    return result;
  }

  private parseResourceLimits(resource?: Record<string, string>): ResourceLimits | undefined {
    if (!resource) return undefined;

    const result: ResourceLimits = {};

    const cpu = resource.cpu;
    if (cpu) {
      const cpuCount = Number.parseInt(cpu, 10);
      if (!Number.isNaN(cpuCount)) result.cpuCount = cpuCount;
    }

    const memory = resource.memory;
    if (memory) {
      const match = memory.match(/^(\d+)(Mi|Gi)$/);
      if (match) {
        const value = Number.parseInt(match[1] || '0', 10);
        result.memoryMiB = match[2] === 'Mi' ? value : value * 1024;
      }
    }

    const disk = resource.disk;
    if (disk) {
      const match = disk.match(/^(\d+)Gi$/);
      if (match) {
        result.diskGiB = Number.parseInt(match[1] || '0', 10);
      }
    }

    return result;
  }

  // ==================== Lifecycle Methods ====================

  async create(config: SandboxConfig): Promise<void> {
    try {
      this._status = { state: 'Creating' };

      const image = this.convertImageSpec(config.image);
      const resource = this.convertResourceLimits(config.resourceLimits);

      this._sandbox = await Sandbox.create({
        connectionConfig: this._connection,
        image,
        entrypoint: config.entrypoint,
        timeoutSeconds: config.timeout,
        resource,
        env: config.env,
        metadata: config.metadata
      });

      this._id = this._sandbox.id;
      this._status = { state: 'Running' };
    } catch (error) {
      this._status = { state: 'Error', message: String(error) };
      throw new ConnectionError('Failed to create sandbox', this.connectionConfig.baseUrl, error);
    }
  }

  async connect(sandboxId: string): Promise<void> {
    try {
      this._status = { state: 'Starting' };

      this._sandbox = await Sandbox.connect({
        sandboxId,
        connectionConfig: this._connection
      });

      this._id = this._sandbox.id;
      this._status = { state: 'Running' };
    } catch (error) {
      this._status = { state: 'Error', message: String(error) };
      throw new ConnectionError(
        `Failed to connect to sandbox ${sandboxId}`,
        this.connectionConfig.baseUrl,
        error
      );
    }
  }

  async start(): Promise<void> {
    try {
      this._status = { state: 'Starting' };
      // OpenSandbox resume returns a fresh Sandbox instance
      this._sandbox = await this.sandbox.resume();
      this._id = this.sandbox.id;
      this._status = { state: 'Running' };
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'SANDBOX::API_NOT_SUPPORTED'
      ) {
        throw new FeatureNotSupportedError(
          'Start/resume not supported by this runtime',
          'start',
          this.provider
        );
      }
      throw new CommandExecutionError(
        'Failed to start sandbox',
        'start',
        error instanceof Error ? error : undefined
      );
    }
  }

  async stop(): Promise<void> {
    try {
      this._status = { state: 'Stopping' };
      await this.sandbox.kill();
      this._status = { state: 'Stopped' };
    } catch (error) {
      throw new CommandExecutionError(
        'Failed to stop sandbox',
        'stop',
        error instanceof Error ? error : undefined
      );
    }
  }

  async delete(): Promise<void> {
    try {
      this._status = { state: 'Deleting' };
      await this.sandbox.kill();
      this._sandbox = undefined;
      this._id = '';
      this._status = { state: 'UnExist' };
    } catch (error) {
      throw new CommandExecutionError(
        'Failed to delete sandbox',
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getInfo(): Promise<SandboxInfo | null> {
    if (!this._sandbox) return null;

    try {
      const info = await this.sandbox.getInfo();
      return {
        id: info.id,
        image:
          typeof info.image === 'string'
            ? this.parseImageSpec(info.image)
            : 'uri' in info.image
              ? this.parseImageSpec(info.image.uri)
              : info.image,
        entrypoint: info.entrypoint,
        metadata: info.metadata,
        status: this.mapStatus(info.status as { state: string; reason?: string; message?: string }),
        createdAt: info.createdAt,
        expiresAt: info.expiresAt,
        resourceLimits: this.parseResourceLimits(
          (info as Record<string, unknown>).resourceLimits as Record<string, string> | undefined
        )
      };
    } catch (error) {
      throw new CommandExecutionError(
        'Failed to get sandbox info',
        'getInfo',
        error instanceof Error ? error : undefined
      );
    }
  }

  async renewExpiration(additionalSeconds: number): Promise<void> {
    try {
      await this.sandbox.renew(additionalSeconds);
    } catch (error) {
      throw new CommandExecutionError(
        'Failed to renew sandbox expiration',
        'renew',
        error instanceof Error ? error : undefined
      );
    }
  }

  // ==================== Command Execution ====================

  async execute(command: string, options?: ExecuteOptions): Promise<ExecuteResult> {
    try {
      const execution = await this.sandbox.commands.run(command, {
        workingDirectory: options?.workingDirectory,
        background: options?.background
      });

      const stdout = execution.logs.stdout.map((msg) => msg.text).join('\n');
      const stderr = execution.logs.stderr.map((msg) => msg.text).join('\n');
      const exitCode = 0;

      const stdoutLength = execution.logs.stdout.reduce((sum, msg) => sum + msg.text.length, 0);
      const stderrLength = execution.logs.stderr.reduce((sum, msg) => sum + msg.text.length, 0);
      const MaxOutputSize = 1024 * 1024;
      const truncated = stdoutLength >= MaxOutputSize || stderrLength >= MaxOutputSize;

      return { stdout, stderr, exitCode, truncated };
    } catch (error) {
      if (error instanceof SandboxStateError) throw error;
      throw new CommandExecutionError(
        `Command execution failed: ${command}`,
        command,
        error instanceof Error ? error : undefined
      );
    }
  }

  async executeStream(
    command: string,
    handlers: StreamHandlers,
    options?: ExecuteOptions
  ): Promise<void> {
    try {
      const sdkHandlers: ExecutionHandlers = {
        ...(handlers.onStderr ? { onStderr: handlers.onStderr } : {}),
        ...(handlers.onStdout ? { onStdout: handlers.onStdout } : {}),
        ...(handlers.onError
          ? {
              onError: async (err) => {
                const error = new Error(err.value || err.name || 'Execution error');
                error.name = err.name || 'ExecutionError';
                if (err.traceback?.length) {
                  error.stack = err.traceback.join('\n');
                }
                await handlers.onError?.(error);
              }
            }
          : {})
      };

      const execution = await this.sandbox.commands.run(
        command,
        {
          workingDirectory: options?.workingDirectory,
          background: options?.background
        },
        sdkHandlers
      );

      if (handlers.onComplete) {
        const stdout = execution.logs.stdout.map((msg) => msg.text).join('\n');
        const stderr = execution.logs.stderr.map((msg) => msg.text).join('\n');
        const exitCode = 0;

        const stdoutLength = execution.logs.stdout.reduce((sum, msg) => sum + msg.text.length, 0);
        const stderrLength = execution.logs.stderr.reduce((sum, msg) => sum + msg.text.length, 0);
        const MaxOutputSize = 1024 * 1024;
        const truncated = stdoutLength >= MaxOutputSize || stderrLength >= MaxOutputSize;

        await handlers.onComplete({ stdout, stderr, exitCode, truncated });
      }
    } catch (error) {
      throw new CommandExecutionError(
        `Streaming command execution failed: ${command}`,
        command,
        error instanceof Error ? error : undefined
      );
    }
  }

  async executeBackground(
    command: string,
    options?: ExecuteOptions
  ): Promise<{ sessionId: string; kill(): Promise<void> }> {
    try {
      const execution = await this.sandbox.commands.run(command, {
        workingDirectory: options?.workingDirectory,
        background: true
      });

      if (!execution.id) {
        throw new CommandExecutionError(
          'Background execution did not return a session ID',
          command
        );
      }

      const sessionId = execution.id;
      const sandbox = this.sandbox;

      return {
        sessionId,
        kill: async (): Promise<void> => {
          try {
            await sandbox.commands.interrupt(sessionId);
          } catch (error) {
            throw new CommandExecutionError(
              `Failed to kill background session ${sessionId}`,
              'interrupt',
              error instanceof Error ? error : undefined
            );
          }
        }
      };
    } catch (error) {
      if (error instanceof CommandExecutionError) throw error;
      throw new CommandExecutionError(
        `Background command execution failed: ${command}`,
        command,
        error instanceof Error ? error : undefined
      );
    }
  }

  async interrupt(sessionId: string): Promise<void> {
    try {
      await this.sandbox.commands.interrupt(sessionId);
    } catch (error) {
      throw new CommandExecutionError(
        `Failed to interrupt session ${sessionId}`,
        'interrupt',
        error instanceof Error ? error : undefined
      );
    }
  }

  // ==================== Health Check ====================

  async ping(): Promise<boolean> {
    try {
      return await this.sandbox.health.ping();
    } catch {
      return false;
    }
  }

  async getMetrics(): Promise<SandboxMetrics> {
    return this.sandbox.metrics.getMetrics();
  }
}
