/**
 * Domain models for filesystem.
 *
 * IMPORTANT:
 * - These are NOT OpenAPI-generated types.
 * - They are intentionally stable and JS-friendly.
 */
interface FileInfo extends Record<string, unknown> {
    path: string;
    size?: number;
    /**
     * Last modification time.
     */
    modifiedAt?: Date;
    /**
     * Creation time.
     */
    createdAt?: Date;
    mode?: number;
    owner?: string;
    group?: string;
}
interface Permission extends Record<string, unknown> {
    mode: number;
    owner?: string;
    group?: string;
}
interface FileMetadata extends Record<string, unknown> {
    path: string;
    mode?: number;
    owner?: string;
    group?: string;
}
interface RenameFileItem extends Record<string, unknown> {
    src: string;
    dest: string;
}
interface ReplaceFileContentItem extends Record<string, unknown> {
    old: string;
    new: string;
}
type FilesInfoResponse = Record<string, FileInfo>;
type SearchFilesResponse = FileInfo[];
interface WriteEntry {
    path: string;
    /**
     * File data to upload.
     *
     * Supports:
     * - string / bytes / Blob (in-memory)
     * - AsyncIterable<Uint8Array> or ReadableStream<Uint8Array> (streaming upload for large files)
     */
    data?: string | Uint8Array | ArrayBuffer | Blob | AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>;
    mode?: number;
    owner?: string;
    group?: string;
}
interface SearchEntry {
    path: string;
    pattern?: string;
}
interface MoveEntry {
    src: string;
    dest: string;
}
interface ContentReplaceEntry {
    path: string;
    oldContent: string;
    newContent: string;
}
interface SetPermissionEntry {
    path: string;
    mode: number;
    owner?: string;
    group?: string;
}

/**
 * High-level filesystem facade (JS-friendly).
 *
 * This interface provides a convenience layer over the underlying execd filesystem API:
 * it offers common operations (read/write/search/move/delete) and supports streaming I/O for large files.
 */
interface SandboxFiles {
    getFileInfo(paths: string[]): Promise<Record<string, FileInfo>>;
    search(entry: SearchEntry): Promise<SearchFilesResponse>;
    createDirectories(entries: Pick<WriteEntry, "path" | "mode" | "owner" | "group">[]): Promise<void>;
    deleteDirectories(paths: string[]): Promise<void>;
    writeFiles(entries: WriteEntry[]): Promise<void>;
    readFile(path: string, opts?: {
        encoding?: string;
        range?: string;
    }): Promise<string>;
    readBytes(path: string, opts?: {
        range?: string;
    }): Promise<Uint8Array>;
    readBytesStream(path: string, opts?: {
        range?: string;
    }): AsyncIterable<Uint8Array>;
    deleteFiles(paths: string[]): Promise<void>;
    moveFiles(entries: MoveEntry[]): Promise<void>;
    replaceContents(entries: ContentReplaceEntry[]): Promise<void>;
    setPermissions(entries: SetPermissionEntry[]): Promise<void>;
}

/**
 * Domain models for sandbox lifecycle.
 *
 * IMPORTANT:
 * - These are NOT OpenAPI-generated types.
 * - They are intentionally stable and JS-friendly.
 *
 * The internal OpenAPI schemas may change frequently; adapters map responses into these models.
 */
type SandboxId = string;
interface ImageAuth extends Record<string, unknown> {
    username?: string;
    password?: string;
    token?: string;
}
interface ImageSpec {
    uri: string;
    auth?: ImageAuth;
}
type ResourceLimits = Record<string, string>;
type NetworkRuleAction = "allow" | "deny";
interface NetworkRule extends Record<string, unknown> {
    /**
     * Whether to allow or deny matching targets.
     */
    action: NetworkRuleAction;
    /**
     * FQDN or wildcard domain (e.g., "example.com", "*.example.com").
     * IP/CIDR is not supported in the egress MVP.
     */
    target: string;
}
interface NetworkPolicy extends Record<string, unknown> {
    /**
     * Default action when no egress rule matches. Defaults to "deny".
     */
    defaultAction?: NetworkRuleAction;
    /**
     * List of egress rules evaluated in order.
     */
    egress?: NetworkRule[];
}
/**
 * Host path bind mount backend.
 *
 * Maps a directory on the host filesystem into the container.
 * Only available when the runtime supports host mounts.
 */
interface Host extends Record<string, unknown> {
    /**
     * Absolute path on the host filesystem to mount.
     */
    path: string;
}
/**
 * Kubernetes PersistentVolumeClaim mount backend.
 *
 * References an existing PVC in the same namespace as the sandbox pod.
 * Only available in Kubernetes runtime.
 */
interface PVC extends Record<string, unknown> {
    /**
     * Name of the PersistentVolumeClaim in the same namespace.
     */
    claimName: string;
}
/**
 * Storage mount definition for a sandbox.
 *
 * Each volume entry contains:
 * - A unique name identifier
 * - Exactly one backend (host, pvc) with backend-specific fields
 * - Common mount settings (mountPath, readOnly, subPath)
 */
interface Volume extends Record<string, unknown> {
    /**
     * Unique identifier for the volume within the sandbox.
     */
    name: string;
    /**
     * Host path bind mount backend (mutually exclusive with pvc).
     */
    host?: Host;
    /**
     * Kubernetes PVC mount backend (mutually exclusive with host).
     */
    pvc?: PVC;
    /**
     * Absolute path inside the container where the volume is mounted.
     */
    mountPath: string;
    /**
     * If true, the volume is mounted as read-only. Defaults to false (read-write).
     */
    readOnly?: boolean;
    /**
     * Optional subdirectory under the backend path to mount.
     */
    subPath?: string;
}
type SandboxState = "Creating" | "Running" | "Pausing" | "Paused" | "Resuming" | "Deleting" | "Deleted" | "Error" | string;
interface SandboxStatus extends Record<string, unknown> {
    state: SandboxState;
    reason?: string;
    message?: string;
}
interface SandboxInfo extends Record<string, unknown> {
    id: SandboxId;
    image: ImageSpec;
    entrypoint: string[];
    metadata?: Record<string, string>;
    status: SandboxStatus;
    /**
     * Sandbox creation time.
     */
    createdAt: Date;
    /**
     * Sandbox expiration time (server-side TTL).
     */
    expiresAt: Date | null;
}
interface CreateSandboxRequest extends Record<string, unknown> {
    image: ImageSpec;
    entrypoint: string[];
    /**
     * Timeout in seconds (server semantics).
     */
    timeout?: number | null;
    resourceLimits: ResourceLimits;
    env?: Record<string, string>;
    metadata?: Record<string, string>;
    /**
     * Optional outbound network policy for the sandbox.
     */
    networkPolicy?: NetworkPolicy;
    /**
     * Optional list of volume mounts for persistent storage.
     */
    volumes?: Volume[];
    extensions?: Record<string, unknown>;
}
interface CreateSandboxResponse extends Record<string, unknown> {
    id: SandboxId;
    status: SandboxStatus;
    metadata?: Record<string, string>;
    /**
     * Sandbox expiration time after creation.
     */
    expiresAt: Date | null;
    /**
     * Sandbox creation time.
     */
    createdAt: Date;
    entrypoint: string[];
}
interface PaginationInfo extends Record<string, unknown> {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
}
interface ListSandboxesResponse extends Record<string, unknown> {
    items: SandboxInfo[];
    pagination?: PaginationInfo;
}
interface RenewSandboxExpirationRequest {
    expiresAt: string;
}
interface RenewSandboxExpirationResponse extends Record<string, unknown> {
    /**
     * Updated expiration time (if the server returns it).
     */
    expiresAt?: Date;
}
interface Endpoint extends Record<string, unknown> {
    endpoint: string;
    /**
     * Headers that must be included on every request targeting this endpoint
     * (e.g. when the server requires them for routing or auth). Omit or empty if not required.
     */
    headers?: Record<string, string>;
}
interface ListSandboxesParams {
    /**
     * Filter by lifecycle state (the API supports multiple `state` query params).
     * Example: `{ states: ["Running", "Paused"] }`
     */
    states?: string[];
    /**
     * Filter by metadata key-value pairs.
     * NOTE: This will be encoded to a single `metadata` query parameter as described in the spec.
     */
    metadata?: Record<string, string>;
    page?: number;
    pageSize?: number;
}

interface OutputMessage {
    text: string;
    timestamp: number;
    isError?: boolean;
}
interface ExecutionResult {
    text?: string;
    timestamp: number;
    /**
     * Raw mime map from execd event (e.g. "text/plain", "text/html", ...)
     */
    raw?: Record<string, unknown>;
}
interface ExecutionError {
    name: string;
    value: string;
    timestamp: number;
    traceback: string[];
}
interface ExecutionComplete {
    timestamp: number;
    executionTimeMs: number;
}
interface ExecutionInit {
    id: string;
    timestamp: number;
}
interface Execution {
    id?: string;
    executionCount?: number;
    logs: {
        stdout: OutputMessage[];
        stderr: OutputMessage[];
    };
    result: ExecutionResult[];
    error?: ExecutionError;
    complete?: ExecutionComplete;
    exitCode?: number | null;
}
interface ExecutionHandlers {
    /**
     * Optional low-level hook for every server-sent event (SSE) received.
     * Kept as `unknown` to avoid coupling to a specific OpenAPI schema module.
     */
    onEvent?: (ev: unknown) => void | Promise<void>;
    onStdout?: (msg: OutputMessage) => void | Promise<void>;
    onStderr?: (msg: OutputMessage) => void | Promise<void>;
    onResult?: (res: ExecutionResult) => void | Promise<void>;
    onExecutionComplete?: (c: ExecutionComplete) => void | Promise<void>;
    onError?: (err: ExecutionError) => void | Promise<void>;
    onInit?: (init: ExecutionInit) => void | Promise<void>;
}

/**
 * Domain models for execd interactions.
 *
 * IMPORTANT:
 * - These are NOT OpenAPI-generated types.
 * - They are intentionally stable and JS-friendly.
 */
interface ServerStreamEvent extends Record<string, unknown> {
    type: "init" | "stdout" | "stderr" | "result" | "execution_count" | "execution_complete" | "error" | string;
    timestamp?: number;
    text?: string;
    results?: Record<string, unknown>;
    error?: Record<string, unknown>;
}
interface CodeContextRequest extends Record<string, unknown> {
    language: string;
}
type SupportedLanguage = "python" | "go" | "javascript" | "typescript" | "bash" | "java";
interface RunCommandOpts {
    /**
     * Working directory for command execution (maps to API `cwd`).
     */
    workingDirectory?: string;
    /**
     * Run command in detached mode.
     */
    background?: boolean;
    /**
     * Maximum execution time in seconds; server will terminate the command when reached.
     * If omitted, the server will not enforce any timeout.
     */
    timeoutSeconds?: number;
    /**
     * Unix user ID used to run the command process.
     */
    uid?: number;
    /**
     * Unix group ID used to run the command process. Requires `uid`.
     */
    gid?: number;
    /**
     * Environment variables injected into the command process.
     */
    envs?: Record<string, string>;
}
interface CommandStatus {
    id?: string;
    content?: string;
    running?: boolean;
    exitCode?: number | null;
    error?: string;
    startedAt?: Date;
    finishedAt?: Date | null;
}
interface CommandLogs {
    content: string;
    cursor?: number;
}
type CommandExecution = Execution;
interface Metrics extends Record<string, unknown> {
    cpu_count?: number;
    cpu_used_pct?: number;
    mem_total_mib?: number;
    mem_used_mib?: number;
    timestamp?: number;
}
/**
 * Normalized, JS-friendly metrics.
 */
interface SandboxMetrics {
    cpuCount: number;
    cpuUsedPercentage: number;
    memoryTotalMiB: number;
    memoryUsedMiB: number;
    timestamp: number;
}
type PingResponse = Record<string, unknown>;

interface ExecdCommands {
    /**
     * Run a command and stream server events (SSE). This is the lowest-level API.
     */
    runStream(command: string, opts?: RunCommandOpts, signal?: AbortSignal): AsyncIterable<ServerStreamEvent>;
    /**
     * Convenience: run a command, consume the stream, and build a structured execution result.
     */
    run(command: string, opts?: RunCommandOpts, handlers?: ExecutionHandlers, signal?: AbortSignal): Promise<CommandExecution>;
    /**
     * Interrupt the current execution in the given context/session.
     *
     * Note: Execd spec uses `DELETE /command?id=<sessionId>`.
     */
    interrupt(sessionId: string): Promise<void>;
    /**
     * Get the current running status for a command id.
     */
    getCommandStatus(commandId: string): Promise<CommandStatus>;
    /**
     * Get background command logs (non-streamed).
     */
    getBackgroundCommandLogs(commandId: string, cursor?: number): Promise<CommandLogs>;
    /**
     * Create a bash session with optional working directory.
     * Returns session ID for use with runInSession and deleteSession.
     */
    createSession(options?: {
        cwd?: string;
    }): Promise<string>;
    /**
     * Run shell code in an existing bash session (SSE stream, same event shape as run).
     * Optional cwd and timeoutMs apply to this run only; session state (e.g. env) persists.
     */
    runInSession(sessionId: string, code: string, options?: {
        cwd?: string;
        timeoutMs?: number;
    }, handlers?: ExecutionHandlers, signal?: AbortSignal): Promise<CommandExecution>;
    /**
     * Delete a bash session by ID. Frees resources; session ID must have been returned by createSession.
     */
    deleteSession(sessionId: string): Promise<void>;
}

interface ExecdHealth {
    ping(): Promise<boolean>;
}

interface ExecdMetrics {
    getMetrics(): Promise<SandboxMetrics>;
}

interface Sandboxes {
    createSandbox(req: CreateSandboxRequest): Promise<CreateSandboxResponse>;
    getSandbox(sandboxId: SandboxId): Promise<SandboxInfo>;
    listSandboxes(params?: ListSandboxesParams): Promise<ListSandboxesResponse>;
    deleteSandbox(sandboxId: SandboxId): Promise<void>;
    pauseSandbox(sandboxId: SandboxId): Promise<void>;
    resumeSandbox(sandboxId: SandboxId): Promise<void>;
    renewSandboxExpiration(sandboxId: SandboxId, req: RenewSandboxExpirationRequest): Promise<RenewSandboxExpirationResponse>;
    getSandboxEndpoint(sandboxId: SandboxId, port: number, useServerProxy?: boolean): Promise<Endpoint>;
}

export type { Permission as A, PingResponse as B, CodeContextRequest as C, RenameFileItem as D, ExecdCommands as E, FileInfo as F, RenewSandboxExpirationRequest as G, Host as H, ReplaceFileContentItem as I, RunCommandOpts as J, SearchEntry as K, ListSandboxesResponse as L, Metrics as M, NetworkPolicy as N, OutputMessage as O, PVC as P, SearchFilesResponse as Q, RenewSandboxExpirationResponse as R, Sandboxes as S, SetPermissionEntry as T, SupportedLanguage as U, Volume as V, WriteEntry as W, NetworkRule as a, SandboxFiles as b, ExecdHealth as c, ExecdMetrics as d, SandboxId as e, SandboxInfo as f, Execution as g, ExecutionHandlers as h, ServerStreamEvent as i, SandboxMetrics as j, Endpoint as k, CommandExecution as l, CommandLogs as m, CommandStatus as n, ContentReplaceEntry as o, CreateSandboxRequest as p, CreateSandboxResponse as q, ExecutionComplete as r, ExecutionError as s, ExecutionInit as t, ExecutionResult as u, FileMetadata as v, FilesInfoResponse as w, ListSandboxesParams as x, MoveEntry as y, NetworkRuleAction as z };
