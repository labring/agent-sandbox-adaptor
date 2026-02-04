import { ISandbox } from '../interfaces';
import { FastGPTSandboxAdapter, FastGPTSandboxConfig } from './FastGPTSandboxAdapter';
import { MinimalProviderAdapter, MinimalProviderConfig } from './MinimalProviderAdapter';
import { OpenSandboxAdapter, OpenSandboxConnectionConfig } from './OpenSandboxAdapter';

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
