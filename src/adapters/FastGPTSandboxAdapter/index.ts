import {
  createSDK,
  type ContainerInfo,
  type ExecResponse,
  type SandboxServerSDK
} from '@fastgpt-sdk/sandbox-server';
import { CommandExecutionError, ConnectionError } from '../../errors';
import type {
  ExecuteOptions,
  ExecuteResult,
  SandboxConfig,
  SandboxId,
  SandboxInfo,
  SandboxStatus
} from '../../types';
import { BaseSandboxAdapter } from '../BaseSandboxAdapter';

/**
 * Configuration for FastGPT Sandbox Adapter.
 */
export interface FastGPTSandboxConfig {
  /** Base URL for the FastGPT Sandbox Server API */
  baseUrl: string;
  /** Authentication token */
  token: string;
  /** Container name (used as sandbox ID) */
  containerName: string;
}

/**
 * Map SDK container state to adapter SandboxStatus
 */
function mapContainerStatus(state: ContainerInfo['status']['state']): SandboxStatus {
  switch (state) {
    case 'Running':
      return { state: 'Running' };
    case 'Creating':
      return { state: 'Creating' };
    case 'Paused':
      return { state: 'Paused' };
    case 'Error':
      return { state: 'Error' };
    case 'Unknown':
    default:
      return { state: 'Error', reason: 'Unknown state' };
  }
}

export class FastGPTSandboxAdapter extends BaseSandboxAdapter {
  /** Provider identifier */
  readonly provider = 'fastgpt' as const;

  /** SDK instance */
  private sdk: SandboxServerSDK;

  /** Container name (used as sandbox ID) */
  private _id: SandboxId = '';

  /**
   * Creates a new FastGPTSandboxAdapter instance.
   *
   * @param config - Connection configuration
   */
  constructor(private config: FastGPTSandboxConfig) {
    super();
    this.sdk = createSDK(config.baseUrl, config.token);
    this._id = config.containerName;
  }

  /**
   * Get the sandbox ID (container name).
   */
  get id(): SandboxId {
    return this._id;
  }

  // ==================== Lifecycle Methods ====================

  /**
   * Get detailed information about the sandbox.
   */
  async getInfo(): Promise<SandboxInfo | null> {
    try {
      const info = await this.sdk.container.get(this._id);
      if (!info) {
        return null;
      }

      this._status = mapContainerStatus(info.status.state);

      return {
        id: info.name,
        image: {
          repository: info.image.imageName
        },
        entrypoint: [],
        status: mapContainerStatus(info.status.state),
        createdAt: info.createdAt ? new Date(info.createdAt) : new Date()
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
   * Create a new sandbox container.
   *
   * Note: The FastGPT SDK only accepts container name for creation.
   * Image and resource configuration are handled server-side.
   *
   * @param _config - Sandbox configuration (not fully used by this SDK)
   */
  async create(_config: SandboxConfig): Promise<void> {
    try {
      // Check exists
      const exists = await this.getInfo();
      if (exists) {
        return;
      }

      this._status = { state: 'Creating' };
      await this.sdk.container.create({ name: this._id });

      // Wait for container to be ready
      await this.waitUntilReady();
      this._status = { state: 'Running' };
    } catch (error) {
      throw new ConnectionError('Failed to create sandbox', this.config.baseUrl, error);
    }
  }

  /**
   * Start a stopped or paused sandbox.
   * Uses SDK's start method which resumes paused containers.
   */
  async start(): Promise<void> {
    try {
      await this.sdk.container.start(this._id);
      this._status = { state: 'Running' };
    } catch (error) {
      throw new CommandExecutionError(
        'Failed to start sandbox',
        'start',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Stop the sandbox.
   * Note: FastGPT SDK uses pause instead of stop.
   */
  async stop(): Promise<void> {
    try {
      await this.sdk.container.pause(this._id);
      this._status = { state: 'Paused' };
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
   */
  async pause(): Promise<void> {
    try {
      await this.sdk.container.pause(this._id);
      this._status = { state: 'Paused' };
    } catch (error) {
      throw new CommandExecutionError(
        'Failed to pause sandbox',
        'pause',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Resume a paused sandbox.
   */
  async resume(): Promise<void> {
    try {
      await this.sdk.container.start(this._id);
      this._status = { state: 'Running' };
    } catch (error) {
      throw new CommandExecutionError(
        'Failed to resume sandbox',
        'resume',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Delete the sandbox permanently.
   */
  async delete(): Promise<void> {
    try {
      await this.sdk.container.delete(this._id);
      this._status = { state: 'Deleted' };
    } catch (error) {
      throw new CommandExecutionError(
        'Failed to delete sandbox',
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Close the connection and release resources.
   */
  async close(): Promise<void> {
    return this.delete();
  }

  // ==================== Command Execution ====================

  /**
   * Execute a command and wait for completion.
   *
   * @param command - The command to execute
   * @param options - Execution options
   * @returns Execution result with stdout, stderr, and exit code
   */
  async execute(command: string, options?: ExecuteOptions): Promise<ExecuteResult> {
    try {
      await this.waitUntilReady();

      const response: ExecResponse = await this.sdk.sandbox.exec(this._id, {
        command,
        cwd: options?.workingDirectory
      });

      return {
        stdout: response.stdout,
        stderr: response.stderr,
        exitCode: response.exitCode
      };
    } catch (error) {
      throw new CommandExecutionError(
        `Command execution failed: ${command}`,
        command,
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
      return await this.sdk.sandbox.health(this._id);
    } catch {
      return false;
    }
  }
}
