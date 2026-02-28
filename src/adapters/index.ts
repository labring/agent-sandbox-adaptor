import { ISandbox } from '../interfaces';
import { SealosDevboxAdapter, type SealosDevboxConfig } from './SealosDevboxAdapter';
import { MinimalProviderAdapter, type MinimalProviderConfig } from './MinimalProviderAdapter';
import { OpenSandboxAdapter, type OpenSandboxConnectionConfig } from './OpenSandboxAdapter';

// Re-export adapters and their configs
export { BaseSandboxAdapter } from './BaseSandboxAdapter';
export { SealosDevboxAdapter, type SealosDevboxConfig } from './SealosDevboxAdapter';
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
      provider: 'sealos-devbox';
      config: SealosDevboxConfig;
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

    case 'sealos-devbox':
      return new SealosDevboxAdapter(config);

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
};
