import { N as NetworkPolicy, a as NetworkRule, S as Sandboxes, E as ExecdCommands, b as SandboxFiles, c as ExecdHealth, d as ExecdMetrics, L as ListSandboxesResponse, e as SandboxId, f as SandboxInfo, g as Execution, h as ExecutionHandlers, i as ServerStreamEvent, V as Volume, j as SandboxMetrics, R as RenewSandboxExpirationResponse, k as Endpoint } from './sandboxes-pbhLrfFS.js';
export { C as CodeContextRequest, l as CommandExecution, m as CommandLogs, n as CommandStatus, o as ContentReplaceEntry, p as CreateSandboxRequest, q as CreateSandboxResponse, r as ExecutionComplete, s as ExecutionError, t as ExecutionInit, u as ExecutionResult, F as FileInfo, v as FileMetadata, w as FilesInfoResponse, H as Host, x as ListSandboxesParams, M as Metrics, y as MoveEntry, z as NetworkRuleAction, O as OutputMessage, P as PVC, A as Permission, B as PingResponse, D as RenameFileItem, G as RenewSandboxExpirationRequest, I as ReplaceFileContentItem, J as RunCommandOpts, K as SearchEntry, Q as SearchFilesResponse, T as SetPermissionEntry, U as SupportedLanguage, W as WriteEntry } from './sandboxes-pbhLrfFS.js';

type SandboxErrorCode = "INTERNAL_UNKNOWN_ERROR" | "READY_TIMEOUT" | "UNHEALTHY" | "INVALID_ARGUMENT" | "UNEXPECTED_RESPONSE" | (string & {});
/**
 * Structured error payload carried by {@link SandboxException}.
 *
 * - `code`: stable programmatic identifier
 * - `message`: optional human-readable message
 */
declare class SandboxError {
    readonly code: SandboxErrorCode;
    readonly message?: string | undefined;
    static readonly INTERNAL_UNKNOWN_ERROR: SandboxErrorCode;
    static readonly READY_TIMEOUT: SandboxErrorCode;
    static readonly UNHEALTHY: SandboxErrorCode;
    static readonly INVALID_ARGUMENT: SandboxErrorCode;
    static readonly UNEXPECTED_RESPONSE: SandboxErrorCode;
    constructor(code: SandboxErrorCode, message?: string | undefined);
}
interface SandboxExceptionOpts {
    message?: string;
    cause?: unknown;
    error?: SandboxError;
    requestId?: string;
}
/**
 * Base exception class for all SDK errors.
 *
 * All errors thrown by this SDK are subclasses of {@link SandboxException}.
 */
declare class SandboxException extends Error {
    readonly name: string;
    readonly error: SandboxError;
    readonly cause?: unknown;
    readonly requestId?: string;
    constructor(opts?: SandboxExceptionOpts);
}
declare class SandboxApiException extends SandboxException {
    readonly name: string;
    readonly statusCode?: number;
    readonly rawBody?: unknown;
    constructor(opts: SandboxExceptionOpts & {
        statusCode?: number;
        rawBody?: unknown;
    });
}
declare class SandboxInternalException extends SandboxException {
    readonly name: string;
    constructor(opts: {
        message?: string;
        cause?: unknown;
    });
}
declare class SandboxUnhealthyException extends SandboxException {
    readonly name: string;
    constructor(opts: {
        message?: string;
        cause?: unknown;
    });
}
declare class SandboxReadyTimeoutException extends SandboxException {
    readonly name: string;
    constructor(opts: {
        message?: string;
        cause?: unknown;
    });
}
declare class InvalidArgumentException extends SandboxException {
    readonly name: string;
    constructor(opts: {
        message?: string;
        cause?: unknown;
    });
}

type ConnectionProtocol = "http" | "https";
/**
 * Options for {@link ConnectionConfig}.
 *
 * Most users only need `domain`, `protocol`, and `apiKey`.
 */
interface ConnectionConfigOptions {
    /**
     * API server domain (host[:port]) without scheme.
     * Examples:
     * - "localhost:8080"
     * - "api.opensandbox.io"
     *
     * You may also pass a full URL (e.g. "http://localhost:8080" or "https://api.example.com").
     * If the URL includes a path, it will be preserved and `/v1` will be appended automatically.
     */
    domain?: string;
    protocol?: ConnectionProtocol;
    apiKey?: string;
    headers?: Record<string, string>;
    /**
     * Request timeout applied to all SDK HTTP calls (best-effort; wraps fetch).
     * Defaults to 30 seconds.
     */
    requestTimeoutSeconds?: number;
    /**
     * Enable basic debug logging for HTTP requests (best-effort).
     */
    debug?: boolean;
    /**
     * Use sandbox server as proxy for process execd requests.
     * Useful when the client SDK cannot access the created sandbox directly.
     */
    useServerProxy?: boolean;
}
declare class ConnectionConfig {
    readonly protocol: ConnectionProtocol;
    readonly domain: string;
    readonly apiKey?: string;
    readonly headers: Record<string, string>;
    private _fetch;
    private _sseFetch;
    readonly requestTimeoutSeconds: number;
    readonly debug: boolean;
    readonly userAgent: string;
    /**
     * Use sandbox server as proxy for endpoint requests (default false).
     */
    readonly useServerProxy: boolean;
    private _closeTransport;
    private _closePromise;
    private _transportInitialized;
    /**
     * Create a connection configuration.
     *
     * Environment variables (optional):
     * - `OPEN_SANDBOX_DOMAIN` (default: `localhost:8080`)
     * - `OPEN_SANDBOX_API_KEY`
     */
    constructor(opts?: ConnectionConfigOptions);
    get fetch(): typeof fetch;
    get sseFetch(): typeof fetch;
    getBaseUrl(): string;
    private initializeTransport;
    /**
     * Ensure this configuration has transport helpers (fetch/SSE) allocated.
     *
     * On Node.js this creates a dedicated `undici` dispatcher; on browsers it
     * simply reuses the global fetch. Returns either `this` or a cloned config
     * with the transport initialized.
     */
    withTransportIfMissing(): ConnectionConfig;
    /**
     * Close the Node.js agent owned by this configuration.
     */
    closeTransport(): Promise<void>;
}

interface Egress {
    getPolicy(): Promise<NetworkPolicy>;
    /**
     * Patch egress rules with sidecar merge semantics.
     *
     * Incoming rules take priority over existing rules with the same target.
     * Existing rules for other targets remain unchanged. Within one patch payload,
     * the first rule for a target wins. The current defaultAction is preserved.
     */
    patchRules(rules: NetworkRule[]): Promise<void>;
}

interface CreateLifecycleStackOptions {
    connectionConfig: ConnectionConfig;
    lifecycleBaseUrl: string;
}
interface LifecycleStack {
    sandboxes: Sandboxes;
}
interface CreateExecdStackOptions {
    connectionConfig: ConnectionConfig;
    execdBaseUrl: string;
    endpointHeaders?: Record<string, string>;
}
interface ExecdStack {
    commands: ExecdCommands;
    files: SandboxFiles;
    health: ExecdHealth;
    metrics: ExecdMetrics;
}
interface CreateEgressStackOptions {
    connectionConfig: ConnectionConfig;
    egressBaseUrl: string;
    endpointHeaders?: Record<string, string>;
}
interface EgressStack {
    egress: Egress;
}
/**
 * Factory abstraction to keep `Sandbox` and `SandboxManager` decoupled from concrete adapter implementations.
 *
 * This is primarily useful for advanced integrations (custom transports, dependency injection, testing).
 */
interface AdapterFactory {
    createLifecycleStack(opts: CreateLifecycleStackOptions): LifecycleStack;
    createExecdStack(opts: CreateExecdStackOptions): ExecdStack;
    createEgressStack(opts: CreateEgressStackOptions): EgressStack;
}

declare class DefaultAdapterFactory implements AdapterFactory {
    createLifecycleStack(opts: CreateLifecycleStackOptions): LifecycleStack;
    createExecdStack(opts: CreateExecdStackOptions): ExecdStack;
    createEgressStack(opts: CreateEgressStackOptions): EgressStack;
}
declare function createDefaultAdapterFactory(): AdapterFactory;

interface SandboxManagerOptions {
    /**
     * Connection configuration for calling the OpenSandbox Lifecycle API.
     */
    connectionConfig?: ConnectionConfig | ConnectionConfigOptions;
    /**
     * Advanced override: inject a custom adapter factory (custom transports, dependency injection).
     */
    adapterFactory?: AdapterFactory;
}
interface SandboxFilter {
    /**
     * Filter by sandbox lifecycle states.
     */
    states?: string[];
    /**
     * Filter by metadata key-value pairs.
     */
    metadata?: Record<string, string>;
    /**
     * Pagination page number (1-indexed).
     */
    page?: number;
    /**
     * Number of items per page.
     */
    pageSize?: number;
}
/**
 * Administrative interface for managing sandboxes (list/get/pause/resume/kill/renew).
 *
 * For interacting *inside* a sandbox, use {@link Sandbox}.
 */
declare class SandboxManager {
    private readonly sandboxes;
    private readonly connectionConfig;
    private constructor();
    static create(opts?: SandboxManagerOptions): SandboxManager;
    listSandboxInfos(filter?: SandboxFilter): Promise<ListSandboxesResponse>;
    getSandboxInfo(sandboxId: SandboxId): Promise<SandboxInfo>;
    killSandbox(sandboxId: SandboxId): Promise<void>;
    pauseSandbox(sandboxId: SandboxId): Promise<void>;
    resumeSandbox(sandboxId: SandboxId): Promise<void>;
    /**
     * Renew expiration by setting expiresAt to now + timeoutSeconds.
     */
    renewSandbox(sandboxId: SandboxId, timeoutSeconds: number): Promise<void>;
    /**
     * Release the HTTP agent resources allocated for this manager instance.
     *
     * Each manager clone owns a scoped `ConnectionConfig` clone.
     *
     * This mirrors the Python SDK's default transport lifecycle.
     */
    close(): Promise<void>;
}

/**
 * Dispatches streamed execution events to handlers.
 *
 * This mutates the provided `execution` object (appending logs/results and setting fields like
 * `id`, `executionCount`, and `complete`) and invokes optional callbacks in {@link ExecutionHandlers}.
 */
declare class ExecutionEventDispatcher {
    private readonly execution;
    private readonly handlers?;
    constructor(execution: Execution, handlers?: ExecutionHandlers | undefined);
    dispatch(ev: ServerStreamEvent): Promise<void>;
}

declare const DEFAULT_EXECD_PORT = 44772;
declare const DEFAULT_EGRESS_PORT = 18080;
declare const DEFAULT_ENTRYPOINT: string[];
declare const DEFAULT_RESOURCE_LIMITS: Record<string, string>;
declare const DEFAULT_TIMEOUT_SECONDS = 600;
declare const DEFAULT_READY_TIMEOUT_SECONDS = 30;
declare const DEFAULT_HEALTH_CHECK_POLLING_INTERVAL_MILLIS = 200;
declare const DEFAULT_REQUEST_TIMEOUT_SECONDS = 30;

interface SandboxCreateOptions {
    /**
     * Connection configuration for calling the OpenSandbox Lifecycle API and the sandbox's execd API.
     */
    connectionConfig?: ConnectionConfig | ConnectionConfigOptions;
    /**
     * Advanced override: inject a custom adapter factory (custom transports, dependency injection).
     */
    adapterFactory?: AdapterFactory;
    /**
     * Container image uri, e.g. `python:3.11`
     */
    image: string | {
        uri: string;
        auth?: {
            username: string;
            password: string;
        };
    };
    /**
     * Entrypoint command for the sandbox (defaults to tail -f /dev/null).
     */
    entrypoint?: string[];
    /**
     * Environment variables to inject into the sandbox runtime.
     */
    env?: Record<string, string>;
    /**
     * Custom metadata tags (used for filtering/management).
     */
    metadata?: Record<string, string>;
    /**
     * Optional outbound network policy for the sandbox.
     * If provided without defaultAction, defaults to "deny".
     */
    networkPolicy?: NetworkPolicy;
    /**
     * Optional list of volume mounts for persistent storage.
     * Each volume specifies a backend (host path or PVC) and mount configuration.
     */
    volumes?: Volume[];
    /**
     * Opaque extension parameters passed through to the server as-is.
     */
    extensions?: Record<string, string>;
    /**
     * Resource limits applied to the sandbox container.
     *
     * This is forwarded to the Lifecycle API as `resourceLimits`.
     */
    resource?: Record<string, string>;
    /**
     * Sandbox timeout in seconds. Set to `null` to require explicit cleanup.
     */
    timeoutSeconds?: number | null;
    /**
     * Skip readiness checks during create/connect.
     *
     * When true, the SDK will not wait for lifecycle state `Running` or perform the health check.
     * The returned sandbox instance may not be ready yet.
     */
    skipHealthCheck?: boolean;
    /**
     * Optional custom readiness check used by {@link Sandbox.waitUntilReady}.
     *
     * If provided, the SDK will call this function during readiness checks instead of
     * using the default `execd` ping check.
     */
    healthCheck?: (sbx: Sandbox) => boolean | Promise<boolean>;
    readyTimeoutSeconds?: number;
    healthCheckPollingInterval?: number;
}
interface SandboxConnectOptions {
    /**
     * Connection configuration for calling the OpenSandbox APIs.
     */
    connectionConfig?: ConnectionConfig | ConnectionConfigOptions;
    /**
     * Advanced override: inject a custom adapter factory (custom transports, dependency injection).
     */
    adapterFactory?: AdapterFactory;
    /**
     * ID of the existing sandbox to connect to.
     */
    sandboxId: SandboxId;
    /**
     * Skip readiness checks after connecting.
     */
    skipHealthCheck?: boolean;
    /**
     * Optional custom readiness check used by {@link Sandbox.waitUntilReady}.
     */
    healthCheck?: (sbx: Sandbox) => boolean | Promise<boolean>;
    /**
     * Max time to wait for readiness.
     */
    readyTimeoutSeconds?: number;
    /**
     * Polling interval for readiness checks (milliseconds).
     */
    healthCheckPollingInterval?: number;
}
declare class Sandbox {
    readonly id: SandboxId;
    readonly connectionConfig: ConnectionConfig;
    /**
     * Lifecycle (sandbox management) service.
     */
    readonly sandboxes: Sandboxes;
    /**
     * Execd services.
     */
    readonly commands: ExecdCommands;
    /**
     * High-level filesystem facade (JS-friendly).
     */
    readonly files: SandboxFiles;
    readonly health: ExecdHealth;
    readonly metrics: ExecdMetrics;
    /**
     * Internal state kept out of the public instance shape.
     *
     * This avoids nominal typing issues when multiple copies of the SDK exist in a dependency graph.
     */
    private static readonly _priv;
    private constructor();
    static create(opts: SandboxCreateOptions): Promise<Sandbox>;
    static connect(opts: SandboxConnectOptions): Promise<Sandbox>;
    getInfo(): Promise<SandboxInfo>;
    isHealthy(): Promise<boolean>;
    getMetrics(): Promise<SandboxMetrics>;
    pause(): Promise<void>;
    /**
     * Resume a paused sandbox and return a fresh, connected Sandbox instance.
     *
     * After resume, the execd endpoint may change, so this method returns a new
     * {@link Sandbox} instance with a refreshed execd base URL.
     */
    resume(opts?: {
        skipHealthCheck?: boolean;
        readyTimeoutSeconds?: number;
        healthCheckPollingInterval?: number;
    }): Promise<Sandbox>;
    /**
     * Resume a paused sandbox by id, then connect to its execd endpoint.
     */
    static resume(opts: SandboxConnectOptions): Promise<Sandbox>;
    kill(): Promise<void>;
    /**
     * Release any client-side resources (e.g. Node.js HTTP agents) owned by this Sandbox instance.
     */
    close(): Promise<void>;
    /**
     * Renew expiration by setting expiresAt to now + timeoutSeconds.
     */
    renew(timeoutSeconds: number): Promise<RenewSandboxExpirationResponse>;
    getEgressPolicy(): Promise<NetworkPolicy>;
    patchEgressRules(rules: NetworkRule[]): Promise<void>;
    /**
     * Get sandbox endpoint for a port (STRICT: no scheme), e.g. "localhost:44772" or "domain/route/.../44772".
     */
    getEndpoint(port: number): Promise<Endpoint>;
    /**
     * Get absolute endpoint URL with scheme (convenience for HTTP clients).
     */
    getEndpointUrl(port: number): Promise<string>;
    waitUntilReady(opts: {
        readyTimeoutSeconds: number;
        pollingIntervalMillis: number;
        healthCheck?: (sbx: Sandbox) => boolean | Promise<boolean>;
    }): Promise<void>;
}

export { type AdapterFactory, ConnectionConfig, type ConnectionConfigOptions, type ConnectionProtocol, DEFAULT_EGRESS_PORT, DEFAULT_ENTRYPOINT, DEFAULT_EXECD_PORT, DEFAULT_HEALTH_CHECK_POLLING_INTERVAL_MILLIS, DEFAULT_READY_TIMEOUT_SECONDS, DEFAULT_REQUEST_TIMEOUT_SECONDS, DEFAULT_RESOURCE_LIMITS, DEFAULT_TIMEOUT_SECONDS, DefaultAdapterFactory, Endpoint, ExecdCommands, ExecdHealth, ExecdMetrics, Execution, ExecutionEventDispatcher, ExecutionHandlers, InvalidArgumentException, ListSandboxesResponse, NetworkPolicy, NetworkRule, RenewSandboxExpirationResponse, Sandbox, SandboxApiException, type SandboxConnectOptions, type SandboxCreateOptions, SandboxError, SandboxException, SandboxFiles, type SandboxFilter, SandboxId, SandboxInfo, SandboxInternalException, SandboxManager, type SandboxManagerOptions, SandboxMetrics, SandboxReadyTimeoutException, SandboxUnhealthyException, Sandboxes, ServerStreamEvent, Volume, createDefaultAdapterFactory };
