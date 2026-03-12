import { SealosDevboxAdapter, type SealosDevboxConfig } from './SealosDevboxAdapter';
import {
  OpenSandboxAdapter,
  type OpenSandboxConnectionConfig,
  type OpenSandboxConfigType
} from './OpenSandboxAdapter';
import { ISandbox } from '@/interfaces';

export { SealosDevboxAdapter } from './SealosDevboxAdapter';
export type { SealosDevboxConfig } from './SealosDevboxAdapter';
export { OpenSandboxAdapter } from './OpenSandboxAdapter';
export type { OpenSandboxConfigType, OpenSandboxConnectionConfig } from './OpenSandboxAdapter';

export type SandboxProviderType = 'opensandbox' | 'sealosdevbox';

/** Maps each provider name to the ISandbox config type it exposes. */
interface SandboxConfigMap {
  opensandbox: OpenSandboxConfigType;
  sealosdevbox: undefined;
}

/** Resolves the concrete ISandbox type for a given provider. */

/** Maps each provider name to its constructor (connection) config type. */
interface SandboxConnectionConfig {
  opensandbox: OpenSandboxConnectionConfig;
  sealosdevbox: SealosDevboxConfig;
}

/**
 * Create a sandbox provider instance.
 * The return type is inferred from the provider name.
 *
 * @param config Provider configuration
 * @returns Configured sandbox instance
 * @throws Error if provider type is unknown
 */
export function createSandbox<P extends SandboxProviderType>(
  provider: P,
  config: SandboxConnectionConfig[P],
  createConfig?: SandboxConfigMap[P]
): ISandbox {
  switch (provider) {
    case 'opensandbox':
      return new OpenSandboxAdapter(
        config as OpenSandboxConnectionConfig,
        createConfig as OpenSandboxConfigType | undefined
      );

    case 'sealosdevbox':
      return new SealosDevboxAdapter(config as SealosDevboxConfig);

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
