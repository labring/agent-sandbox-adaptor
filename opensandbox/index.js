import {
  CommandsAdapter,
  ExecutionEventDispatcher,
  FilesystemAdapter,
  HealthAdapter,
  InvalidArgumentException,
  MetricsAdapter,
  SandboxApiException,
  SandboxError,
  SandboxException,
  SandboxInternalException,
  SandboxReadyTimeoutException,
  SandboxUnhealthyException,
  SandboxesAdapter,
  createExecdClient,
  createLifecycleClient,
  throwOnOpenApiFetchError
} from "./chunk-PHJSF3IJ.js";

// src/openapi/egressClient.ts
import createClient from "openapi-fetch";
function createEgressClient(opts) {
  const createClientFn = createClient.default ?? createClient;
  return createClientFn({
    baseUrl: opts.baseUrl,
    headers: opts.headers,
    fetch: opts.fetch
  });
}

// src/adapters/egressAdapter.ts
var EgressAdapter = class {
  constructor(client) {
    this.client = client;
  }
  async getPolicy() {
    const { data, error, response } = await this.client.GET("/policy");
    throwOnOpenApiFetchError({ error, response }, "Get sandbox egress policy failed");
    const raw = data;
    if (!raw || typeof raw !== "object" || !raw.policy || typeof raw.policy !== "object") {
      throw new Error("Get sandbox egress policy failed: unexpected response shape");
    }
    return raw.policy;
  }
  async patchRules(rules) {
    const body = rules;
    const { error, response } = await this.client.PATCH("/policy", {
      body
    });
    throwOnOpenApiFetchError({ error, response }, "Patch sandbox egress rules failed");
  }
};

// src/factory/defaultAdapterFactory.ts
var DefaultAdapterFactory = class {
  createLifecycleStack(opts) {
    const lifecycleClient = createLifecycleClient({
      baseUrl: opts.lifecycleBaseUrl,
      apiKey: opts.connectionConfig.apiKey,
      headers: opts.connectionConfig.headers,
      fetch: opts.connectionConfig.fetch
    });
    const sandboxes = new SandboxesAdapter(lifecycleClient);
    return { sandboxes };
  }
  createExecdStack(opts) {
    const headers = {
      ...opts.connectionConfig.headers ?? {},
      ...opts.endpointHeaders ?? {}
    };
    const execdClient = createExecdClient({
      baseUrl: opts.execdBaseUrl,
      headers,
      fetch: opts.connectionConfig.fetch
    });
    const health = new HealthAdapter(execdClient);
    const metrics = new MetricsAdapter(execdClient);
    const files = new FilesystemAdapter(execdClient, {
      baseUrl: opts.execdBaseUrl,
      fetch: opts.connectionConfig.fetch,
      headers
    });
    const commands = new CommandsAdapter(execdClient, {
      baseUrl: opts.execdBaseUrl,
      fetch: opts.connectionConfig.sseFetch,
      headers
    });
    return {
      commands,
      files,
      health,
      metrics
    };
  }
  createEgressStack(opts) {
    const headers = {
      ...opts.connectionConfig.headers ?? {},
      ...opts.endpointHeaders ?? {}
    };
    const egressClient = createEgressClient({
      baseUrl: opts.egressBaseUrl,
      headers,
      fetch: opts.connectionConfig.fetch
    });
    return {
      egress: new EgressAdapter(egressClient)
    };
  }
};
function createDefaultAdapterFactory() {
  return new DefaultAdapterFactory();
}

// src/core/constants.ts
var DEFAULT_EXECD_PORT = 44772;
var DEFAULT_EGRESS_PORT = 18080;
var DEFAULT_ENTRYPOINT = ["tail", "-f", "/dev/null"];
var DEFAULT_RESOURCE_LIMITS = {
  cpu: "1",
  memory: "2Gi"
};
var DEFAULT_TIMEOUT_SECONDS = 600;
var DEFAULT_READY_TIMEOUT_SECONDS = 30;
var DEFAULT_HEALTH_CHECK_POLLING_INTERVAL_MILLIS = 200;
var DEFAULT_REQUEST_TIMEOUT_SECONDS = 30;
var DEFAULT_USER_AGENT = "OpenSandbox-JS-SDK/0.1.5";

// src/config/connection.ts
function isNodeRuntime() {
  const p = globalThis?.process;
  return !!p?.versions?.node;
}
function redactHeaders(headers) {
  const out = { ...headers };
  for (const k of Object.keys(out)) {
    if (k.toLowerCase() === "open-sandbox-api-key") out[k] = "***";
  }
  return out;
}
function readEnv(name) {
  const env = globalThis?.process?.env;
  const v = env?.[name];
  return typeof v === "string" && v.length ? v : void 0;
}
function stripTrailingSlashes(s) {
  return s.replace(/\/+$/, "");
}
function stripV1Suffix(s) {
  const trimmed = stripTrailingSlashes(s);
  return trimmed.endsWith("/v1") ? trimmed.slice(0, -3) : trimmed;
}
var DEFAULT_KEEPALIVE_TIMEOUT_MS = 3e4;
function normalizeDomainBase(input) {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    const u = new URL(input);
    const proto = u.protocol === "https:" ? "https" : "http";
    const base = `${u.origin}${u.pathname}`;
    return { protocol: proto, domainBase: stripV1Suffix(base) };
  }
  return { domainBase: stripV1Suffix(input) };
}
function createNodeFetch() {
  if (!isNodeRuntime()) {
    return {
      fetch,
      close: async () => {
      }
    };
  }
  const baseFetch = fetch;
  let dispatcher;
  let dispatcherPromise = null;
  const nodeFetch = async (input, init) => {
    dispatcherPromise ??= (async () => {
      try {
        const mod = await import("undici");
        const Agent = mod.Agent;
        if (!Agent) {
          return void 0;
        }
        dispatcher = new Agent({
          keepAliveTimeout: DEFAULT_KEEPALIVE_TIMEOUT_MS,
          keepAliveMaxTimeout: DEFAULT_KEEPALIVE_TIMEOUT_MS
        });
        return dispatcher;
      } catch {
        return void 0;
      }
    })();
    if (dispatcherPromise) {
      await dispatcherPromise;
    }
    if (dispatcher) {
      const mergedInit = { ...init ?? {}, dispatcher };
      return baseFetch(input, mergedInit);
    }
    return baseFetch(input, init);
  };
  return {
    fetch: nodeFetch,
    close: async () => {
      if (dispatcherPromise) {
        await dispatcherPromise.catch(() => void 0);
      }
      if (dispatcher && typeof dispatcher === "object" && typeof dispatcher.close === "function") {
        try {
          await dispatcher.close();
        } catch {
        }
      }
    }
  };
}
function createTimedFetch(opts) {
  const baseFetch = opts.baseFetch;
  const timeoutSeconds = opts.timeoutSeconds;
  const debug = opts.debug;
  const defaultHeaders = opts.defaultHeaders ?? {};
  const label = opts.label;
  return async (input, init) => {
    const method = init?.method ?? "GET";
    const url = typeof input === "string" ? input : input?.toString?.() ?? String(input);
    const ac = new AbortController();
    const timeoutMs = Math.floor(timeoutSeconds * 1e3);
    const t = Number.isFinite(timeoutMs) && timeoutMs > 0 ? setTimeout(
      () => ac.abort(
        new Error(
          `[${label}] Request timed out (timeoutSeconds=${timeoutSeconds})`
        )
      ),
      timeoutMs
    ) : void 0;
    const onAbort = () => ac.abort(init?.signal?.reason ?? new Error("Aborted"));
    if (init?.signal) {
      if (init.signal.aborted) onAbort();
      else
        init.signal.addEventListener("abort", onAbort, { once: true });
    }
    const mergedInit = {
      ...init,
      signal: ac.signal
    };
    if (debug) {
      const mergedHeaders = {
        ...defaultHeaders,
        ...init?.headers ?? {}
      };
      console.log(
        `[opensandbox:${label}] ->`,
        method,
        url,
        redactHeaders(mergedHeaders)
      );
    }
    try {
      const res = await baseFetch(input, mergedInit);
      if (debug) {
        console.log(`[opensandbox:${label}] <-`, method, url, res.status);
      }
      return res;
    } finally {
      if (t) clearTimeout(t);
      if (init?.signal)
        init.signal.removeEventListener("abort", onAbort);
    }
  };
}
var ConnectionConfig = class _ConnectionConfig {
  protocol;
  domain;
  apiKey;
  headers;
  _fetch;
  _sseFetch;
  requestTimeoutSeconds;
  debug;
  userAgent = DEFAULT_USER_AGENT;
  /**
   * Use sandbox server as proxy for endpoint requests (default false).
   */
  useServerProxy;
  _closeTransport;
  _closePromise = null;
  _transportInitialized = false;
  /**
   * Create a connection configuration.
   *
   * Environment variables (optional):
   * - `OPEN_SANDBOX_DOMAIN` (default: `localhost:8080`)
   * - `OPEN_SANDBOX_API_KEY`
   */
  constructor(opts = {}) {
    const envDomain = readEnv("OPEN_SANDBOX_DOMAIN");
    const envApiKey = readEnv("OPEN_SANDBOX_API_KEY");
    const rawDomain = opts.domain ?? envDomain ?? "localhost:8080";
    const normalized = normalizeDomainBase(rawDomain);
    this.protocol = normalized.protocol ?? opts.protocol ?? "http";
    this.domain = normalized.domainBase;
    this.apiKey = opts.apiKey ?? envApiKey;
    this.requestTimeoutSeconds = typeof opts.requestTimeoutSeconds === "number" ? opts.requestTimeoutSeconds : 30;
    this.debug = !!opts.debug;
    this.useServerProxy = !!opts.useServerProxy;
    const headers = { ...opts.headers ?? {} };
    if (this.apiKey && !headers["OPEN-SANDBOX-API-KEY"]) {
      headers["OPEN-SANDBOX-API-KEY"] = this.apiKey;
    }
    if (isNodeRuntime() && this.userAgent && !headers["user-agent"] && !headers["User-Agent"]) {
      headers["user-agent"] = this.userAgent;
    }
    this.headers = headers;
    this._fetch = null;
    this._sseFetch = null;
    this._closeTransport = async () => {
    };
    this._transportInitialized = false;
  }
  get fetch() {
    return this._fetch ?? fetch;
  }
  get sseFetch() {
    return this._sseFetch ?? fetch;
  }
  getBaseUrl() {
    if (this.domain.startsWith("http://") || this.domain.startsWith("https://")) {
      return `${stripV1Suffix(this.domain)}/v1`;
    }
    return `${this.protocol}://${stripV1Suffix(this.domain)}/v1`;
  }
  initializeTransport() {
    if (this._transportInitialized) return;
    const { fetch: baseFetch, close } = createNodeFetch();
    this._fetch = createTimedFetch({
      baseFetch,
      timeoutSeconds: this.requestTimeoutSeconds,
      debug: this.debug,
      defaultHeaders: this.headers,
      label: "http"
    });
    this._sseFetch = createTimedFetch({
      baseFetch,
      timeoutSeconds: 0,
      debug: this.debug,
      defaultHeaders: this.headers,
      label: "sse"
    });
    this._closeTransport = close;
    this._transportInitialized = true;
  }
  /**
   * Ensure this configuration has transport helpers (fetch/SSE) allocated.
   *
   * On Node.js this creates a dedicated `undici` dispatcher; on browsers it
   * simply reuses the global fetch. Returns either `this` or a cloned config
   * with the transport initialized.
   */
  withTransportIfMissing() {
    if (this._transportInitialized) {
      return this;
    }
    const clone = new _ConnectionConfig({
      domain: this.domain,
      protocol: this.protocol,
      apiKey: this.apiKey,
      headers: { ...this.headers },
      requestTimeoutSeconds: this.requestTimeoutSeconds,
      debug: this.debug,
      useServerProxy: this.useServerProxy
    });
    clone.initializeTransport();
    return clone;
  }
  /**
   * Close the Node.js agent owned by this configuration.
   */
  async closeTransport() {
    if (!this._transportInitialized) return;
    this._closePromise ??= this._closeTransport();
    await this._closePromise;
  }
};

// src/manager.ts
var SandboxManager = class _SandboxManager {
  sandboxes;
  connectionConfig;
  constructor(opts) {
    this.sandboxes = opts.sandboxes;
    this.connectionConfig = opts.connectionConfig;
  }
  static create(opts = {}) {
    const baseConnectionConfig = opts.connectionConfig instanceof ConnectionConfig ? opts.connectionConfig : new ConnectionConfig(opts.connectionConfig);
    const connectionConfig = baseConnectionConfig.withTransportIfMissing();
    const lifecycleBaseUrl = connectionConfig.getBaseUrl();
    const adapterFactory = opts.adapterFactory ?? createDefaultAdapterFactory();
    let sandboxes;
    try {
      sandboxes = adapterFactory.createLifecycleStack({
        connectionConfig,
        lifecycleBaseUrl
      }).sandboxes;
    } catch (err) {
      void connectionConfig.closeTransport().catch(() => void 0);
      throw err;
    }
    return new _SandboxManager({ sandboxes, connectionConfig });
  }
  listSandboxInfos(filter = {}) {
    return this.sandboxes.listSandboxes({
      states: filter.states,
      metadata: filter.metadata,
      page: filter.page,
      pageSize: filter.pageSize
    });
  }
  getSandboxInfo(sandboxId) {
    return this.sandboxes.getSandbox(sandboxId);
  }
  killSandbox(sandboxId) {
    return this.sandboxes.deleteSandbox(sandboxId);
  }
  pauseSandbox(sandboxId) {
    return this.sandboxes.pauseSandbox(sandboxId);
  }
  resumeSandbox(sandboxId) {
    return this.sandboxes.resumeSandbox(sandboxId);
  }
  /**
   * Renew expiration by setting expiresAt to now + timeoutSeconds.
   */
  async renewSandbox(sandboxId, timeoutSeconds) {
    const expiresAt = new Date(Date.now() + timeoutSeconds * 1e3).toISOString();
    await this.sandboxes.renewSandboxExpiration(sandboxId, { expiresAt });
  }
  /**
   * Release the HTTP agent resources allocated for this manager instance.
   *
   * Each manager clone owns a scoped `ConnectionConfig` clone.
   *
   * This mirrors the Python SDK's default transport lifecycle.
   */
  async close() {
    await this.connectionConfig.closeTransport();
  }
};

// src/sandbox.ts
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function toImageSpec(image) {
  if (typeof image === "string") return { uri: image };
  return { uri: image.uri, auth: image.auth };
}
var Sandbox = class _Sandbox {
  id;
  connectionConfig;
  /**
   * Lifecycle (sandbox management) service.
   */
  sandboxes;
  /**
   * Execd services.
   */
  commands;
  /**
   * High-level filesystem facade (JS-friendly).
   */
  files;
  health;
  metrics;
  /**
   * Internal state kept out of the public instance shape.
   *
   * This avoids nominal typing issues when multiple copies of the SDK exist in a dependency graph.
   */
  static _priv = /* @__PURE__ */ new WeakMap();
  constructor(opts) {
    this.id = opts.id;
    this.connectionConfig = opts.connectionConfig;
    _Sandbox._priv.set(this, {
      adapterFactory: opts.adapterFactory,
      lifecycleBaseUrl: opts.lifecycleBaseUrl,
      execdBaseUrl: opts.execdBaseUrl,
      egress: opts.egress
    });
    this.sandboxes = opts.sandboxes;
    this.commands = opts.commands;
    this.files = opts.files;
    this.health = opts.health;
    this.metrics = opts.metrics;
  }
  static async create(opts) {
    const baseConnectionConfig = opts.connectionConfig instanceof ConnectionConfig ? opts.connectionConfig : new ConnectionConfig(opts.connectionConfig);
    const connectionConfig = baseConnectionConfig.withTransportIfMissing();
    const lifecycleBaseUrl = connectionConfig.getBaseUrl();
    const adapterFactory = opts.adapterFactory ?? createDefaultAdapterFactory();
    let sandboxes;
    try {
      sandboxes = adapterFactory.createLifecycleStack({
        connectionConfig,
        lifecycleBaseUrl
      }).sandboxes;
    } catch (err) {
      await connectionConfig.closeTransport();
      throw err;
    }
    if (opts.volumes) {
      for (const vol of opts.volumes) {
        const backendsSpecified = [vol.host, vol.pvc].filter((b) => b !== void 0).length;
        if (backendsSpecified === 0) {
          throw new Error(
            `Volume '${vol.name}' must specify exactly one backend (host, pvc), but none was provided.`
          );
        }
        if (backendsSpecified > 1) {
          throw new Error(
            `Volume '${vol.name}' must specify exactly one backend (host, pvc), but multiple were provided.`
          );
        }
      }
    }
    const rawTimeout = opts.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS;
    const timeoutSeconds = opts.timeoutSeconds === null ? null : Math.floor(rawTimeout);
    if (timeoutSeconds !== null && !Number.isFinite(timeoutSeconds)) {
      throw new Error(
        `timeoutSeconds must be a finite number, got ${opts.timeoutSeconds}`
      );
    }
    const req = {
      image: toImageSpec(opts.image),
      entrypoint: opts.entrypoint ?? DEFAULT_ENTRYPOINT,
      resourceLimits: opts.resource ?? DEFAULT_RESOURCE_LIMITS,
      env: opts.env ?? {},
      metadata: opts.metadata ?? {},
      networkPolicy: opts.networkPolicy ? {
        ...opts.networkPolicy,
        defaultAction: opts.networkPolicy.defaultAction ?? "deny"
      } : void 0,
      volumes: opts.volumes,
      extensions: opts.extensions ?? {}
    };
    if (timeoutSeconds !== null) {
      req.timeout = timeoutSeconds;
    }
    let sandboxId;
    try {
      const created = await sandboxes.createSandbox(req);
      sandboxId = created.id;
      const endpoint = await sandboxes.getSandboxEndpoint(
        sandboxId,
        DEFAULT_EXECD_PORT,
        connectionConfig.useServerProxy
      );
      const egressEndpoint = await sandboxes.getSandboxEndpoint(
        sandboxId,
        DEFAULT_EGRESS_PORT,
        connectionConfig.useServerProxy
      );
      const execdBaseUrl = `${connectionConfig.protocol}://${endpoint.endpoint}`;
      const egressBaseUrl = `${connectionConfig.protocol}://${egressEndpoint.endpoint}`;
      const { commands, files, health, metrics } = adapterFactory.createExecdStack({
        connectionConfig,
        execdBaseUrl,
        endpointHeaders: endpoint.headers
      });
      const { egress } = adapterFactory.createEgressStack({
        connectionConfig,
        egressBaseUrl,
        endpointHeaders: egressEndpoint.headers
      });
      const sbx = new _Sandbox({
        id: sandboxId,
        connectionConfig,
        adapterFactory,
        lifecycleBaseUrl,
        execdBaseUrl,
        sandboxes,
        commands,
        files,
        health,
        metrics,
        egress
      });
      if (!(opts.skipHealthCheck ?? false)) {
        await sbx.waitUntilReady({
          readyTimeoutSeconds: opts.readyTimeoutSeconds ?? DEFAULT_READY_TIMEOUT_SECONDS,
          pollingIntervalMillis: opts.healthCheckPollingInterval ?? DEFAULT_HEALTH_CHECK_POLLING_INTERVAL_MILLIS,
          healthCheck: opts.healthCheck
        });
      }
      return sbx;
    } catch (err) {
      if (sandboxId) {
        try {
          await sandboxes.deleteSandbox(sandboxId);
        } catch {
        }
      }
      await connectionConfig.closeTransport();
      throw err;
    }
  }
  static async connect(opts) {
    const baseConnectionConfig = opts.connectionConfig instanceof ConnectionConfig ? opts.connectionConfig : new ConnectionConfig(opts.connectionConfig);
    const connectionConfig = baseConnectionConfig.withTransportIfMissing();
    const adapterFactory = opts.adapterFactory ?? createDefaultAdapterFactory();
    const lifecycleBaseUrl = connectionConfig.getBaseUrl();
    let sandboxes;
    try {
      sandboxes = adapterFactory.createLifecycleStack({
        connectionConfig,
        lifecycleBaseUrl
      }).sandboxes;
    } catch (err) {
      await connectionConfig.closeTransport();
      throw err;
    }
    try {
      const endpoint = await sandboxes.getSandboxEndpoint(
        opts.sandboxId,
        DEFAULT_EXECD_PORT,
        connectionConfig.useServerProxy
      );
      const egressEndpoint = await sandboxes.getSandboxEndpoint(
        opts.sandboxId,
        DEFAULT_EGRESS_PORT,
        connectionConfig.useServerProxy
      );
      const execdBaseUrl = `${connectionConfig.protocol}://${endpoint.endpoint}`;
      const egressBaseUrl = `${connectionConfig.protocol}://${egressEndpoint.endpoint}`;
      const { commands, files, health, metrics } = adapterFactory.createExecdStack({
        connectionConfig,
        execdBaseUrl,
        endpointHeaders: endpoint.headers
      });
      const { egress } = adapterFactory.createEgressStack({
        connectionConfig,
        egressBaseUrl,
        endpointHeaders: egressEndpoint.headers
      });
      const sbx = new _Sandbox({
        id: opts.sandboxId,
        connectionConfig,
        adapterFactory,
        lifecycleBaseUrl,
        execdBaseUrl,
        sandboxes,
        commands,
        files,
        health,
        metrics,
        egress
      });
      if (!(opts.skipHealthCheck ?? false)) {
        await sbx.waitUntilReady({
          readyTimeoutSeconds: opts.readyTimeoutSeconds ?? DEFAULT_READY_TIMEOUT_SECONDS,
          pollingIntervalMillis: opts.healthCheckPollingInterval ?? DEFAULT_HEALTH_CHECK_POLLING_INTERVAL_MILLIS,
          healthCheck: opts.healthCheck
        });
      }
      return sbx;
    } catch (err) {
      await connectionConfig.closeTransport();
      throw err;
    }
  }
  async getInfo() {
    return await this.sandboxes.getSandbox(this.id);
  }
  async isHealthy() {
    try {
      return await this.health.ping();
    } catch {
      return false;
    }
  }
  async getMetrics() {
    return await this.metrics.getMetrics();
  }
  async pause() {
    await this.sandboxes.pauseSandbox(this.id);
  }
  /**
   * Resume a paused sandbox and return a fresh, connected Sandbox instance.
   *
   * After resume, the execd endpoint may change, so this method returns a new
   * {@link Sandbox} instance with a refreshed execd base URL.
   */
  async resume(opts = {}) {
    await this.sandboxes.resumeSandbox(this.id);
    return await _Sandbox.connect({
      sandboxId: this.id,
      connectionConfig: this.connectionConfig,
      adapterFactory: _Sandbox._priv.get(this).adapterFactory,
      skipHealthCheck: opts.skipHealthCheck ?? false,
      readyTimeoutSeconds: opts.readyTimeoutSeconds,
      healthCheckPollingInterval: opts.healthCheckPollingInterval
    });
  }
  /**
   * Resume a paused sandbox by id, then connect to its execd endpoint.
   */
  static async resume(opts) {
    const baseConnectionConfig = opts.connectionConfig instanceof ConnectionConfig ? opts.connectionConfig : new ConnectionConfig(opts.connectionConfig);
    const adapterFactory = opts.adapterFactory ?? createDefaultAdapterFactory();
    const resumeConnectionConfig = baseConnectionConfig.withTransportIfMissing();
    const lifecycleBaseUrl = resumeConnectionConfig.getBaseUrl();
    let sandboxes;
    try {
      sandboxes = adapterFactory.createLifecycleStack({
        connectionConfig: resumeConnectionConfig,
        lifecycleBaseUrl
      }).sandboxes;
      await sandboxes.resumeSandbox(opts.sandboxId);
    } catch (err) {
      await resumeConnectionConfig.closeTransport();
      throw err;
    }
    await resumeConnectionConfig.closeTransport();
    return await _Sandbox.connect({ ...opts, connectionConfig: baseConnectionConfig, adapterFactory });
  }
  async kill() {
    await this.sandboxes.deleteSandbox(this.id);
  }
  /**
   * Release any client-side resources (e.g. Node.js HTTP agents) owned by this Sandbox instance.
   */
  async close() {
    await this.connectionConfig.closeTransport();
  }
  /**
   * Renew expiration by setting expiresAt to now + timeoutSeconds.
   */
  async renew(timeoutSeconds) {
    const expiresAt = new Date(
      Date.now() + timeoutSeconds * 1e3
    ).toISOString();
    return await this.sandboxes.renewSandboxExpiration(this.id, { expiresAt });
  }
  async getEgressPolicy() {
    return await _Sandbox._priv.get(this).egress.getPolicy();
  }
  async patchEgressRules(rules) {
    await _Sandbox._priv.get(this).egress.patchRules(rules);
  }
  /**
   * Get sandbox endpoint for a port (STRICT: no scheme), e.g. "localhost:44772" or "domain/route/.../44772".
   */
  async getEndpoint(port) {
    return await this.sandboxes.getSandboxEndpoint(
      this.id,
      port,
      this.connectionConfig.useServerProxy
    );
  }
  /**
   * Get absolute endpoint URL with scheme (convenience for HTTP clients).
   */
  async getEndpointUrl(port) {
    const ep = await this.getEndpoint(port);
    return `${this.connectionConfig.protocol}://${ep.endpoint}`;
  }
  async waitUntilReady(opts) {
    const deadline = Date.now() + opts.readyTimeoutSeconds * 1e3;
    let attempt = 0;
    let errorDetail = "Health check returned false continuously.";
    const buildTimeoutMessage = () => {
      const context = `domain=${this.connectionConfig.domain}, useServerProxy=${this.connectionConfig.useServerProxy}`;
      let suggestion = "If this sandbox runs in Docker bridge or remote-network mode, consider enabling useServerProxy=true.";
      if (!this.connectionConfig.useServerProxy) {
        suggestion += " You can also configure server-side [docker].host_ip for direct endpoint access.";
      }
      return `Sandbox health check timed out after ${opts.readyTimeoutSeconds}s (${attempt} attempts). ${errorDetail} Connection context: ${context}. ${suggestion}`;
    };
    while (true) {
      if (Date.now() > deadline) {
        throw new SandboxReadyTimeoutException({
          message: buildTimeoutMessage()
        });
      }
      attempt++;
      try {
        if (opts.healthCheck) {
          const ok = await opts.healthCheck(this);
          if (ok) {
            return;
          }
        } else {
          const ok = await this.health.ping();
          if (ok) {
            return;
          }
        }
        errorDetail = "Health check returned false continuously.";
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errorDetail = `Last health check error: ${message}`;
      }
      await sleep(opts.pollingIntervalMillis);
    }
  }
};
export {
  ConnectionConfig,
  DEFAULT_EGRESS_PORT,
  DEFAULT_ENTRYPOINT,
  DEFAULT_EXECD_PORT,
  DEFAULT_HEALTH_CHECK_POLLING_INTERVAL_MILLIS,
  DEFAULT_READY_TIMEOUT_SECONDS,
  DEFAULT_REQUEST_TIMEOUT_SECONDS,
  DEFAULT_RESOURCE_LIMITS,
  DEFAULT_TIMEOUT_SECONDS,
  DefaultAdapterFactory,
  ExecutionEventDispatcher,
  InvalidArgumentException,
  Sandbox,
  SandboxApiException,
  SandboxError,
  SandboxException,
  SandboxInternalException,
  SandboxManager,
  SandboxReadyTimeoutException,
  SandboxUnhealthyException,
  createDefaultAdapterFactory
};
//# sourceMappingURL=index.js.map