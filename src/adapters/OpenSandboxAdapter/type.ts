import { ImageSpec, NetworkPolicy, ResourceLimits } from '@/types';

/**
 * Configuration for creating a sandbox.
 */
export interface OpenSandboxConfigType {
  /** Container image specification */
  image: ImageSpec;

  /** Entrypoint command */
  entrypoint?: string[];

  /** Timeout in seconds (0 for no timeout) */
  timeout?: number;

  /** Resource limits */
  resourceLimits?: ResourceLimits;

  /** Environment variables */
  env?: Record<string, string>;

  /** Metadata for the sandbox */
  metadata?: Record<string, any>;

  /** Network access policy */
  networkPolicy?: NetworkPolicy;

  /** Provider-specific extensions */
  extensions?: Record<string, unknown>;
}
