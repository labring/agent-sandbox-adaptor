import { ISandbox } from '../interfaces';
import { FastGPTSandboxAdapter, type FastGPTSandboxConfig } from './FastGPTSandboxAdapter';
import { MinimalProviderAdapter, type MinimalProviderConfig } from './MinimalProviderAdapter';
import { OpenSandboxAdapter, type OpenSandboxConnectionConfig } from './OpenSandboxAdapter';

// Re-export adapters and their configs
export { BaseSandboxAdapter } from './BaseSandboxAdapter';
export { FastGPTSandboxAdapter, type FastGPTSandboxConfig } from './FastGPTSandboxAdapter';
export {
  MinimalProviderAdapter,
  type MinimalProviderConfig,
  type MinimalProviderConnection
} from './MinimalProviderAdapter';
export {
  OpenSandboxAdapter,
  type OpenSandboxConnectionConfig,
  type SandboxRuntimeType
} from './OpenSandboxAdapter';

type CreateProviderType =
  | {
      provider: 'opensandbox';
      config: OpenSandboxConnectionConfig;
    }
  | {
      provider: 'minimal';
      config: MinimalProviderConfig;
    }
  | {
      provider: 'fastgpt';
      config: FastGPTSandboxConfig;
    };

/**
 * Create a sandbox provider instance.
 *
 * @param config Provider configuration
 * @returns Configured sandbox instance
 * @throws Error if provider type is unknown
 */
export const createSandbox = ({ provider, config }: CreateProviderType): ISandbox => {
  switch (provider) {
    case 'opensandbox':
      return new OpenSandboxAdapter(config);

    case 'minimal':
      return new MinimalProviderAdapter(config);

    case 'fastgpt':
      return new FastGPTSandboxAdapter(config);

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
};
