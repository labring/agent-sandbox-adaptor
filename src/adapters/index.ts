import { ISandbox } from '../interfaces';
import { MinimalProviderAdapter, MinimalProviderConfig } from './MinimalProviderAdapter';
import { OpenSandboxAdapter, OpenSandboxConnectionConfig } from './OpenSandboxAdapter';

type CreateProvoderType =
  | {
      provider: 'opensandbox';
      config: OpenSandboxConnectionConfig;
    }
  | {
      provider: 'minimal';
      config: MinimalProviderConfig;
    };

/**
 * Create a sandbox provider instance.
 *
 * @param config Provider configuration
 * @returns Configured sandbox instance
 * @throws Error if provider type is unknown
 */
export const createSandbox = ({ provider, config }: CreateProvoderType): ISandbox => {
  switch (provider) {
    case 'opensandbox':
      return new OpenSandboxAdapter({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        runtime: config.runtime
      });

    case 'minimal':
      return new MinimalProviderAdapter(config);

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
};
