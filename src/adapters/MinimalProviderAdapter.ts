import { CommandPolyfillService } from '@/polyfill/CommandPolyfillService';
import { ConnectionError } from '../errors';
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

  close(): Promise<void>;
}

export type MinimalProviderConfig = {
  connectionFactory?: () => Promise<MinimalProviderConnection>;
};

/**
 * Minimal provider adapter.
 *
 * Adapts a provider with minimal capabilities (only command execution)
 * to the full ISandbox interface using the CommandPolyfillService.
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
    this.polyfillService = new CommandPolyfillService(this);
  }

  get id(): SandboxId {
    return this._id;
  }

  // ==================== Lifecycle Methods ====================

  async create(config: SandboxConfig): Promise<void> {
    if (!this.config?.connectionFactory) {
      throw new ConnectionError('Connection factory not provided');
    }

    try {
      this._status = { state: 'Creating' };
      this.connection = await this.config.connectionFactory();
      this._id = this.connection.id;
      this._status = { state: 'Running' };

      if (config.entrypoint && config.entrypoint.length > 0) {
        await this.execute(config.entrypoint.join(' '));
      }
    } catch (error) {
      this._status = { state: 'Error', message: String(error) };
      throw new ConnectionError('Failed to create sandbox', undefined, error);
    }
  }

  async connect(connection: MinimalProviderConnection): Promise<void> {
    this.connection = connection;
    this._id = connection.id;
    this._status = await connection.getStatus();
  }

  async start(): Promise<void> {
    this._status = { state: 'Running' };
  }

  async stop(): Promise<void> {
    await this.execute('exit 0').catch(() => {
      // Expected to fail as connection closes
    });
    await this.connection?.close();
    this._status = { state: 'Stopped' };
  }

  async delete(): Promise<void> {
    await this.stop();
    this._status = { state: 'UnExist' };
  }

  async getInfo(): Promise<SandboxInfo | null> {
    if (!this.connection) return null;

    return {
      id: this._id,
      image: { repository: 'minimal', tag: 'latest' },
      entrypoint: [],
      status: this._status,
      createdAt: new Date()
    };
  }

  // ==================== Command Execution ====================

  async execute(command: string, options?: ExecuteOptions): Promise<ExecuteResult> {
    if (!this.connection) {
      throw new Error('Not connected to minimal provider');
    }

    let finalCommand = command;
    if (options?.workingDirectory) {
      finalCommand = `cd "${options.workingDirectory}" && ${command}`;
    }

    if (options?.timeoutMs && options.timeoutMs > 0) {
      const timeoutSec = Math.ceil(options.timeoutMs / 1000);
      finalCommand = `timeout ${timeoutSec} sh -c '${finalCommand.replace(/'/g, "'\"'\"'")}'`;
    }

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
