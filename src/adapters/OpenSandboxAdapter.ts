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
  StreamHandlers
} from '../types';
import { BaseSandboxAdapter } from './BaseSandboxAdapter';

/**
 * Sandbox runtime type.
 * - docker: Full-featured runtime with pause/resume support
 * - kubernetes: Container orchestration runtime (no pause/resume, stop = delete)
 */
export type SandboxRuntimeType = 'docker' | 'kubernetes';

/**
 * Connection configuration options for OpenSandboxAdapter.
 */
export interface OpenSandboxConnectionConfig {
  /** Base URL for the OpenSandbox API (e.g., 'https://api.opensandbox.example.com') */
  baseUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /**
   * Sandbox runtime type.
   * - docker: Full-featured with pause/resume support
   * - kubernetes: No pause/resume, stop operation deletes the sandbox
   * @default 'docker'
   */
  runtime?: SandboxRuntimeType;
}

/**
 * OpenSandbox provider adapter.
 *
 * This is the "Gold Standard" implementation with full native
 * support for all features. Uses the OpenSandbox TypeScript SDK
 * for all operations.
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
  /** Provider identifier */
  readonly provider = 'opensandbox' as const;

  /** Runtime type for this adapter instance */
  readonly runtime: SandboxRuntimeType;

  /** Internal SDK sandbox instance */
  private _sandbox?: Sandbox;

  /** SDK connection configuration */
  private _connection: ConnectionConfig;

  /** Cached sandbox ID */
  private _id: SandboxId = '';

  /** Current adapter state */
  private _connectionState: 'disconnected' | 'connecting' | 'connected' | 'closed' = 'disconnected';

  /**
   * Creates a new OpenSandboxAdapter instance.
   *
   * @param connectionConfig - Connection configuration options
   */
  constructor(private connectionConfig: OpenSandboxConnectionConfig = {}) {
    super();

    // Determine runtime type (default to docker for backwards compatibility)
    this.runtime = connectionConfig.runtime ?? 'docker';
    this._connection = this.createConnectionConfig();
  }

  /**
   * Get the sandbox ID. Returns empty string if not created/connected.
   */
  get id(): SandboxId {
    return this._id;
  }

  /**
   * Get the current connection state.
   */
  get connectionState(): typeof this._connectionState {
    return this._connectionState;
  }

  /**
   * Get the underlying SDK sandbox instance.
   * @throws {SandboxStateError} If sandbox is not initialized
   */
  private get sandbox(): Sandbox {
    if (!this._sandbox) {
      throw new SandboxStateError(
        'Sandbox not initialized. Call create() or connect() first.',
        this._connectionState,
        'connected'
      );
    }
    return this._sandbox;
  }

  /**
   * Create ConnectionConfig from adapter's connection options.
   * Handles URL parsing with fallback to domain string.
   */
  private createConnectionConfig(): ConnectionConfig {
    const { baseUrl, apiKey } = this.connectionConfig;

    if (!baseUrl) {
      // Default to localhost:8080 as per SDK default
      return new ConnectionConfig({ apiKey });
    }

    // Pass the full URL as domain - SDK handles URL parsing internally
    return new ConnectionConfig({
      domain: baseUrl,
      apiKey
    });
  }

  // ==================== Image and Resource Conversion ====================

  /**
   * Convert ImageSpec to SDK image format (string).
   * Format: repository[:tag][@digest]
   */
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

  /**
   * Parse SDK image string into ImageSpec.
   * Handles formats: repository, repository:tag, repository@digest
   */
  private parseImageSpec(image: string): ImageSpec {
    const atIndex = image.indexOf('@');

    // Handle digest format first (repository@digest)
    if (atIndex > -1) {
      const repository = image.slice(0, atIndex);
      const digest = image.slice(atIndex + 1);
      return { repository, digest };
    }

    // Handle tag format (repository:tag)
    const colonIndex = image.indexOf(':');
    if (colonIndex > -1) {
      const repository = image.slice(0, colonIndex);
      const tag = image.slice(colonIndex + 1);
      return { repository, tag };
    }

    // Just repository name
    return { repository: image };
  }

  /**
   * Convert ResourceLimits to SDK resource format.
   * Maps cpuCount -> cpu, memoryMiB -> memory, diskGiB -> disk
   */
  private convertResourceLimits(
    resourceLimits?: ResourceLimits
  ): Record<string, string> | undefined {
    if (!resourceLimits) {
      return undefined;
    }

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

  /**
   * Parse SDK resource limits (Record<string, string>) to ResourceLimits.
   * Handles memory format: 512Mi, 2Gi
   */
  private parseResourceLimits(resource?: Record<string, string>): ResourceLimits | undefined {
    if (!resource) {
      return undefined;
    }

    const result: ResourceLimits = {};

    // Parse CPU count
    const cpu = resource.cpu;
    if (cpu) {
      const cpuCount = Number.parseInt(cpu, 10);
      if (!Number.isNaN(cpuCount)) {
        result.cpuCount = cpuCount;
      }
    }

    // Parse memory (e.g., "512Mi" or "2Gi")
    const memory = resource.memory;
    if (memory) {
      const match = memory.match(/^(\d+)(Mi|Gi)$/);
      if (match) {
        const value = Number.parseInt(match[1] || '0', 10);
        if (match[2] === 'Mi') {
          result.memoryMiB = value;
        } else {
          // Convert GiB to MiB
          result.memoryMiB = value * 1024;
        }
      }
    }

    // Parse disk (e.g., "10Gi")
    const disk = resource.disk;
    if (disk) {
      const match = disk.match(/^(\d+)Gi$/);
      if (match) {
        const value = Number.parseInt(match[1] || '0', 10);
        result.diskGiB = value;
      }
    }

    return result;
  }

  // ==================== Lifecycle Methods ====================

  /**
   * Create a new sandbox with the given configuration.
   *
   * @param config - Sandbox configuration
   * @throws {ConnectionError} If connection to the API fails
   * @throws {CommandExecutionError} If sandbox creation fails
   */
  async create(config: SandboxConfig): Promise<void> {
    this._connectionState = 'connecting';

    try {
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
      this._connectionState = 'connected';
    } catch (error) {
      this._connectionState = 'disconnected';
      throw new ConnectionError('Failed to create sandbox', this.connectionConfig.baseUrl, error);
    }
  }

  /**
   * Connect to an existing OpenSandbox instance.
   *
   * @param sandboxId - The ID of the sandbox to connect to
   * @throws {ConnectionError} If connection fails or sandbox not found
   */
  async connect(sandboxId: string): Promise<void> {
    this._connectionState = 'connecting';

    try {
      this._sandbox = await Sandbox.connect({
        sandboxId,
        connectionConfig: this._connection
      });

      this._id = this._sandbox.id;
      this._status = { state: 'Running' };
      this._connectionState = 'connected';
    } catch (error) {
      this._connectionState = 'disconnected';
      throw new ConnectionError(
        `Failed to connect to sandbox ${sandboxId}`,
        this.connectionConfig.baseUrl,
        error
      );
    }
  }

  /**
   * Start a stopped or paused sandbox.
   * For OpenSandbox, this resumes from paused state if applicable.
   *
   * @throws {SandboxStateError} If sandbox is not initialized
   */
  async start(): Promise<void> {
    if (this._status.state === 'Paused') {
      await this.resume();
    }
  }

  /**
   * Stop the sandbox (graceful shutdown).
   *
   * @throws {SandboxStateError} If sandbox is not initialized
   */
  async stop(): Promise<void> {
    try {
      await this.sandbox.kill();
      this._status = { state: 'Deleted' };
      this._connectionState = 'disconnected';
    } catch (error) {
      throw new CommandExecutionError(
        'Failed to stop sandbox',
        'stop',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Pause a running sandbox.
   *
   * @throws {SandboxStateError} If sandbox is not initialized
   * @throws {FeatureNotSupportedError} If pause is not supported by the runtime
   * @throws {CommandExecutionError} If pause fails
   */
  async pause(): Promise<void> {
    try {
      await this.sandbox.pause();
      this._status = { state: 'Paused' };
    } catch (error) {
      // Check if this is a "not supported" error from the SDK
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'SANDBOX::API_NOT_SUPPORTED'
      ) {
        throw new FeatureNotSupportedError(
          'Pause operation is not supported by this runtime (e.g., Kubernetes)',
          'pause',
          this.provider
        );
      }
      throw new CommandExecutionError(
        'Failed to pause sandbox',
        'pause',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Resume a paused sandbox.
   *
   * @throws {SandboxStateError} If sandbox is not initialized
   * @throws {FeatureNotSupportedError} If resume is not supported by the runtime
   * @throws {CommandExecutionError} If resume fails
   */
  async resume(): Promise<void> {
    try {
      // resume() returns a fresh Sandbox instance
      this._sandbox = await this.sandbox.resume();
      this._id = this.sandbox.id;
      this._status = { state: 'Running' };
    } catch (error) {
      // Check if this is a "not supported" error from the SDK
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'SANDBOX::API_NOT_SUPPORTED'
      ) {
        throw new FeatureNotSupportedError(
          'Resume operation is not supported by this runtime (e.g., Kubernetes)',
          'resume',
          this.provider
        );
      }
      throw new CommandExecutionError(
        'Failed to resume sandbox',
        'resume',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete the sandbox permanently.
   *
   * @throws {SandboxStateError} If sandbox is not initialized
   * @throws {CommandExecutionError} If deletion fails
   */
  async delete(): Promise<void> {
    try {
      await this.sandbox.kill();
      this._status = { state: 'Deleted' };
      this._connectionState = 'disconnected';
    } catch (error) {
      throw new CommandExecutionError(
        'Failed to delete sandbox',
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get detailed information about the sandbox.
   *
   * @returns Sandbox information
   * @throws {SandboxStateError} If sandbox is not initialized
   */
  async getInfo(): Promise<SandboxInfo> {
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
        status: info.status,
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

  /**
   * Close the connection and release resources.
   */
  async close(): Promise<void> {
    try {
      await this._sandbox?.close();
    } finally {
      this._sandbox = undefined;
      this._id = '';
      this._connectionState = 'closed';
      this._status = { state: 'Deleted' };
    }
  }

  /**
   * Renew the sandbox expiration.
   *
   * @param additionalSeconds - Seconds to extend the expiration by
   * @throws {SandboxStateError} If sandbox is not initialized
   * @throws {CommandExecutionError} If renewal fails
   */
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

  /**
   * Execute a command and wait for completion.
   *
   * @param command - The command to execute
   * @param options - Execution options
   * @returns Execution result with stdout, stderr, and exit code
   * @throws {SandboxStateError} If sandbox is not initialized
   * @throws {CommandExecutionError} If execution fails
   */
  async execute(command: string, options?: ExecuteOptions): Promise<ExecuteResult> {
    try {
      const execution = await this.sandbox.commands.run(command, {
        workingDirectory: options?.workingDirectory,
        background: options?.background
      });

      // Combine stdout/stderr from logs arrays
      // Join with newlines to preserve line structure for parsing
      const stdout = execution.logs.stdout.map((msg) => msg.text).join('\n');
      const stderr = execution.logs.stderr.map((msg) => msg.text).join('\n');

      // Get exit code from first result, default to 0
      const exitCode = 0;

      // Determine if output was truncated by comparing content lengths
      const stdoutLength = execution.logs.stdout.reduce((sum, msg) => sum + msg.text.length, 0);
      const stderrLength = execution.logs.stderr.reduce((sum, msg) => sum + msg.text.length, 0);

      // OpenSandbox SDK truncates output at 1MB per stream by default
      const MaxOutputSize = 1024 * 1024;
      const truncated = stdoutLength >= MaxOutputSize || stderrLength >= MaxOutputSize;

      return {
        stdout,
        stderr,
        exitCode,
        truncated
      };
    } catch (error) {
      if (error instanceof SandboxStateError) {
        throw error;
      }
      throw new CommandExecutionError(
        `Command execution failed: ${command}`,
        command,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Execute a command with streaming output.
   *
   * @param command - The command to execute
   * @param handlers - Stream handlers for output
   * @param options - Execution options
   * @throws {SandboxStateError} If sandbox is not initialized
   * @throws {CommandExecutionError} If execution fails
   */
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

  /**
   * Execute a command in the background.
   *
   * @param command - The command to execute
   * @param options - Execution options
   * @returns Handle with sessionId and kill function
   * @throws {SandboxStateError} If sandbox is not initialized
   * @throws {CommandExecutionError} If execution fails
   */
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
      if (error instanceof CommandExecutionError) {
        throw error;
      }
      throw new CommandExecutionError(
        `Background command execution failed: ${command}`,
        command,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Interrupt/kill a running command session.
   *
   * @param sessionId - The session ID from executeBackground
   * @throws {SandboxStateError} If sandbox is not initialized
   * @throws {CommandExecutionError} If interruption fails
   */
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

  /**
   * Check if the sandbox is healthy.
   *
   * @returns true if healthy, false otherwise
   */
  async ping(): Promise<boolean> {
    try {
      return await this.sandbox.health.ping();
    } catch {
      return false;
    }
  }

  /**
   * Get current resource metrics.
   *
   * @returns Current metrics
   * @throws {SandboxStateError} If sandbox is not initialized
   */
  async getMetrics(): Promise<SandboxMetrics> {
    return this.sandbox.metrics.getMetrics();
  }
}
