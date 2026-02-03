import { FeatureNotSupportedError } from '../errors';
import type {
  ExecuteOptions,
  ExecuteResult,
  SandboxConfig,
  SandboxId,
  SandboxInfo,
  SandboxStatus
} from '../types';
import { BaseSandboxAdapter } from './BaseSandboxAdapter';

/**
 * Connection interface for minimal providers.
 * Represents a provider that only supports basic command execution.
 */
export interface MinimalProviderConnection {
  /** Unique identifier for the sandbox */
  id: string;

  /** Execute a command and return result */
  execute(command: string): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;

  /** Get current status */
  getStatus(): Promise<SandboxStatus>;

  /** Close the connection */
  close(): Promise<void>;
}

export type MinimalProviderConfig = {
  connectionFactory?: () => Promise<MinimalProviderConnection>;
};

/**
 * Minimal provider adapter.
 *
 * This demonstrates how to adapt a provider with minimal capabilities
 * (only command execution) to the full ISandbox interface using
 * the CommandPolyfillService.
 *
 * Use case: Legacy SSH-based sandboxes, custom container providers,
 * or any provider that only exposes a shell interface.
 */
export class MinimalProviderAdapter extends BaseSandboxAdapter {
  readonly provider = 'minimal';

  private _id: SandboxId = '';
  private connection?: MinimalProviderConnection;

  constructor(private config?: MinimalProviderConfig) {
    super();
  }

  get id(): SandboxId {
    return this._id;
  }

  get status(): SandboxStatus {
    return this._status;
  }

  // ==================== Lifecycle Methods ====================

  async create(config: SandboxConfig): Promise<void> {
    // Minimal provider assumes sandbox is created externally
    // This would typically involve calling an API to create the sandbox
    if (this.config?.connectionFactory) {
      this.connection = await this.config.connectionFactory();
      this._id = this.connection.id;
      this._status = { state: 'Running' };

      // Run any setup commands from config
      if (config.entrypoint && config.entrypoint.length > 0) {
        await this.execute(config.entrypoint.join(' '));
      }
    } else {
      throw new Error('Connection factory not provided');
    }
  }

  async connect(connection: MinimalProviderConnection): Promise<void> {
    this.connection = connection;
    this._id = connection.id;
    this._status = await connection.getStatus();
  }

  async start(): Promise<void> {
    // No-op: minimal provider doesn't support explicit start
    this._status = { state: 'Running' };
  }

  async stop(): Promise<void> {
    // Execute shutdown command
    await this.execute('exit 0').catch(() => {
      // Expected to fail as connection closes
    });
    this._status = { state: 'Deleted' };
  }

  async pause(): Promise<void> {
    throw new FeatureNotSupportedError(
      'Pause not supported by minimal provider',
      'pause',
      this.provider
    );
  }

  async resume(): Promise<void> {
    throw new FeatureNotSupportedError(
      'Resume not supported by minimal provider',
      'resume',
      this.provider
    );
  }

  async delete(): Promise<void> {
    await this.stop();
    await this.connection?.close();
  }

  async getInfo(): Promise<SandboxInfo> {
    return {
      id: this._id,
      image: { repository: 'minimal', tag: 'latest' },
      entrypoint: [],
      status: this._status,
      createdAt: new Date()
    };
  }

  async close(): Promise<void> {
    await this.connection?.close();
  }

  // ==================== Command Execution ====================

  async execute(command: string, options?: ExecuteOptions): Promise<ExecuteResult> {
    if (!this.connection) {
      throw new Error('Not connected to minimal provider');
    }

    // Handle working directory option
    let finalCommand = command;
    if (options?.workingDirectory) {
      finalCommand = `cd "${options.workingDirectory}" && ${command}`;
    }

    // Handle timeout via timeout command
    if (options?.timeoutMs && options.timeoutMs > 0) {
      const timeoutSec = Math.ceil(options.timeoutMs / 1000);
      finalCommand = `timeout ${timeoutSec} sh -c '${finalCommand.replace(/'/g, "'\"'\"'")}'`;
    }

    // Handle environment variables
    if (options?.env && Object.keys(options.env).length > 0) {
      const envVars = Object.entries(options.env)
        .map(([k, v]) => `${k}="${v.replace(/"/g, '"')}"`)
        .join(' ');
      finalCommand = `export ${envVars} && ${finalCommand}`;
    }

    const result = await this.connection.execute(finalCommand);

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode
    };
  }
}
