"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ConnectionConfig: () => ConnectionConfig,
  DEFAULT_EGRESS_PORT: () => DEFAULT_EGRESS_PORT,
  DEFAULT_ENTRYPOINT: () => DEFAULT_ENTRYPOINT,
  DEFAULT_EXECD_PORT: () => DEFAULT_EXECD_PORT,
  DEFAULT_HEALTH_CHECK_POLLING_INTERVAL_MILLIS: () => DEFAULT_HEALTH_CHECK_POLLING_INTERVAL_MILLIS,
  DEFAULT_READY_TIMEOUT_SECONDS: () => DEFAULT_READY_TIMEOUT_SECONDS,
  DEFAULT_REQUEST_TIMEOUT_SECONDS: () => DEFAULT_REQUEST_TIMEOUT_SECONDS,
  DEFAULT_RESOURCE_LIMITS: () => DEFAULT_RESOURCE_LIMITS,
  DEFAULT_TIMEOUT_SECONDS: () => DEFAULT_TIMEOUT_SECONDS,
  DefaultAdapterFactory: () => DefaultAdapterFactory,
  ExecutionEventDispatcher: () => ExecutionEventDispatcher,
  InvalidArgumentException: () => InvalidArgumentException,
  Sandbox: () => Sandbox,
  SandboxApiException: () => SandboxApiException,
  SandboxError: () => SandboxError,
  SandboxException: () => SandboxException,
  SandboxInternalException: () => SandboxInternalException,
  SandboxManager: () => SandboxManager,
  SandboxReadyTimeoutException: () => SandboxReadyTimeoutException,
  SandboxUnhealthyException: () => SandboxUnhealthyException,
  createDefaultAdapterFactory: () => createDefaultAdapterFactory
});
module.exports = __toCommonJS(index_exports);

// src/core/exceptions.ts
var SandboxError = class {
  constructor(code, message) {
    this.code = code;
    this.message = message;
  }
  static INTERNAL_UNKNOWN_ERROR = "INTERNAL_UNKNOWN_ERROR";
  static READY_TIMEOUT = "READY_TIMEOUT";
  static UNHEALTHY = "UNHEALTHY";
  static INVALID_ARGUMENT = "INVALID_ARGUMENT";
  static UNEXPECTED_RESPONSE = "UNEXPECTED_RESPONSE";
};
var SandboxException = class extends Error {
  name = "SandboxException";
  error;
  cause;
  requestId;
  constructor(opts = {}) {
    super(opts.message);
    this.cause = opts.cause;
    this.error = opts.error ?? new SandboxError(SandboxError.INTERNAL_UNKNOWN_ERROR);
    this.requestId = opts.requestId;
  }
};
var SandboxApiException = class extends SandboxException {
  name = "SandboxApiException";
  statusCode;
  rawBody;
  constructor(opts) {
    super({
      message: opts.message,
      cause: opts.cause,
      error: opts.error ?? new SandboxError(SandboxError.UNEXPECTED_RESPONSE, opts.message),
      requestId: opts.requestId
    });
    this.statusCode = opts.statusCode;
    this.rawBody = opts.rawBody;
  }
};
var SandboxInternalException = class extends SandboxException {
  name = "SandboxInternalException";
  constructor(opts) {
    super({
      message: opts.message,
      cause: opts.cause,
      error: new SandboxError(SandboxError.INTERNAL_UNKNOWN_ERROR, opts.message)
    });
  }
};
var SandboxUnhealthyException = class extends SandboxException {
  name = "SandboxUnhealthyException";
  constructor(opts) {
    super({
      message: opts.message,
      cause: opts.cause,
      error: new SandboxError(SandboxError.UNHEALTHY, opts.message)
    });
  }
};
var SandboxReadyTimeoutException = class extends SandboxException {
  name = "SandboxReadyTimeoutException";
  constructor(opts) {
    super({
      message: opts.message,
      cause: opts.cause,
      error: new SandboxError(SandboxError.READY_TIMEOUT, opts.message)
    });
  }
};
var InvalidArgumentException = class extends SandboxException {
  name = "InvalidArgumentException";
  constructor(opts) {
    super({
      message: opts.message,
      cause: opts.cause,
      error: new SandboxError(SandboxError.INVALID_ARGUMENT, opts.message)
    });
  }
};

// src/openapi/execdClient.ts
var import_openapi_fetch = __toESM(require("openapi-fetch"), 1);
function createExecdClient(opts) {
  const createClientFn = import_openapi_fetch.default.default ?? import_openapi_fetch.default;
  return createClientFn({
    baseUrl: opts.baseUrl,
    headers: opts.headers,
    fetch: opts.fetch
  });
}

// src/openapi/egressClient.ts
var import_openapi_fetch2 = __toESM(require("openapi-fetch"), 1);
function createEgressClient(opts) {
  const createClientFn = import_openapi_fetch2.default.default ?? import_openapi_fetch2.default;
  return createClientFn({
    baseUrl: opts.baseUrl,
    headers: opts.headers,
    fetch: opts.fetch
  });
}

// src/openapi/lifecycleClient.ts
var import_openapi_fetch3 = __toESM(require("openapi-fetch"), 1);
function readEnvApiKey() {
  const env = globalThis?.process?.env;
  const v = env?.OPEN_SANDBOX_API_KEY;
  return typeof v === "string" && v.length ? v : void 0;
}
function createLifecycleClient(opts = {}) {
  const apiKey = opts.apiKey ?? readEnvApiKey();
  const headers = {
    ...opts.headers ?? {}
  };
  if (apiKey && !headers["OPEN-SANDBOX-API-KEY"]) {
    headers["OPEN-SANDBOX-API-KEY"] = apiKey;
  }
  const createClientFn = import_openapi_fetch3.default.default ?? import_openapi_fetch3.default;
  return createClientFn({
    baseUrl: opts.baseUrl ?? "http://localhost:8080/v1",
    headers,
    fetch: opts.fetch
  });
}

// src/adapters/openapiError.ts
function throwOnOpenApiFetchError(result, fallbackMessage) {
  if (!result.error) return;
  const requestId = result.response.headers.get("x-request-id") ?? void 0;
  const status = result.response.status ?? 0;
  const err = result.error;
  const message = err?.message ?? err?.error?.message ?? fallbackMessage;
  const code = err?.code ?? err?.error?.code;
  const msg = err?.message ?? err?.error?.message ?? message;
  throw new SandboxApiException({
    message: msg,
    statusCode: status,
    requestId,
    error: code ? new SandboxError(String(code), String(msg ?? "")) : new SandboxError(SandboxError.UNEXPECTED_RESPONSE, String(msg ?? "")),
    rawBody: result.error
  });
}

// src/adapters/sse.ts
function tryParseJson(line) {
  try {
    return JSON.parse(line);
  } catch {
    return void 0;
  }
}
async function* parseJsonEventStream(res, opts) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const parsed = tryParseJson(text);
    const err = parsed && typeof parsed === "object" ? parsed : void 0;
    const requestId = res.headers.get("x-request-id") ?? void 0;
    const message = err?.message ?? opts?.fallbackErrorMessage ?? `Stream request failed (status=${res.status})`;
    const code = err?.code ? String(err.code) : SandboxError.UNEXPECTED_RESPONSE;
    throw new SandboxApiException({
      message,
      statusCode: res.status,
      requestId,
      error: new SandboxError(code, err?.message ? String(err.message) : message),
      rawBody: parsed ?? text
    });
  }
  if (!res.body) {
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const rawLine = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:") || line.startsWith("id:") || line.startsWith("retry:")) continue;
      const jsonLine = line.startsWith("data:") ? line.slice("data:".length).trim() : line;
      if (!jsonLine) continue;
      const parsed = tryParseJson(jsonLine);
      if (!parsed) continue;
      yield parsed;
    }
  }
  buf += decoder.decode();
  const last = buf.trim();
  if (last) {
    const jsonLine = last.startsWith("data:") ? last.slice("data:".length).trim() : last;
    const parsed = tryParseJson(jsonLine);
    if (parsed) yield parsed;
  }
}

// src/models/executionEventDispatcher.ts
function extractText(results) {
  if (!results || typeof results !== "object") return void 0;
  const r = results;
  const v = r["text/plain"] ?? r.text ?? r.textPlain;
  return v == null ? void 0 : String(v);
}
var ExecutionEventDispatcher = class {
  constructor(execution, handlers) {
    this.execution = execution;
    this.handlers = handlers;
  }
  async dispatch(ev) {
    await this.handlers?.onEvent?.(ev);
    const ts = ev.timestamp ?? Date.now();
    switch (ev.type) {
      case "init": {
        const id = ev.text ?? "";
        if (id) this.execution.id = id;
        const init = { id, timestamp: ts };
        await this.handlers?.onInit?.(init);
        return;
      }
      case "stdout": {
        const msg = { text: ev.text ?? "", timestamp: ts, isError: false };
        this.execution.logs.stdout.push(msg);
        await this.handlers?.onStdout?.(msg);
        return;
      }
      case "stderr": {
        const msg = { text: ev.text ?? "", timestamp: ts, isError: true };
        this.execution.logs.stderr.push(msg);
        await this.handlers?.onStderr?.(msg);
        return;
      }
      case "result": {
        const r = { text: extractText(ev.results), timestamp: ts, raw: ev.results };
        this.execution.result.push(r);
        await this.handlers?.onResult?.(r);
        return;
      }
      case "execution_count": {
        const c = ev.execution_count;
        if (typeof c === "number") this.execution.executionCount = c;
        return;
      }
      case "execution_complete": {
        const ms = ev.execution_time;
        const complete = { timestamp: ts, executionTimeMs: typeof ms === "number" ? ms : 0 };
        this.execution.complete = complete;
        await this.handlers?.onExecutionComplete?.(complete);
        return;
      }
      case "error": {
        const e = ev.error;
        if (e) {
          const err = {
            name: String(e.ename ?? e.name ?? ""),
            value: String(e.evalue ?? e.value ?? ""),
            timestamp: ts,
            traceback: Array.isArray(e.traceback) ? e.traceback.map(String) : []
          };
          this.execution.error = err;
          await this.handlers?.onError?.(err);
        }
        return;
      }
      default:
        return;
    }
  }
};

// src/adapters/commandsAdapter.ts
function joinUrl(baseUrl, pathname) {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}
function toRunCommandRequest(command, opts) {
  if (opts?.gid != null && opts.uid == null) {
    throw new Error("uid is required when gid is provided");
  }
  const body = {
    command,
    cwd: opts?.workingDirectory,
    background: !!opts?.background
  };
  if (opts?.timeoutSeconds != null) {
    body.timeout = Math.round(opts.timeoutSeconds * 1e3);
  }
  if (opts?.uid != null) {
    body.uid = opts.uid;
  }
  if (opts?.gid != null) {
    body.gid = opts.gid;
  }
  if (opts?.envs != null) {
    body.envs = opts.envs;
  }
  return body;
}
function parseOptionalDate(value, field) {
  if (value == null) return void 0;
  if (value instanceof Date) return value;
  if (typeof value !== "string") {
    throw new Error(`Invalid ${field}: expected ISO string, got ${typeof value}`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
  return parsed;
}
var CommandsAdapter = class {
  constructor(client, opts) {
    this.client = client;
    this.opts = opts;
    this.fetch = opts.fetch ?? fetch;
  }
  fetch;
  async interrupt(sessionId) {
    const { error, response } = await this.client.DELETE("/command", {
      params: { query: { id: sessionId } }
    });
    throwOnOpenApiFetchError({ error, response }, "Interrupt command failed");
  }
  async getCommandStatus(commandId) {
    const { data, error, response } = await this.client.GET("/command/status/{id}", {
      params: { path: { id: commandId } }
    });
    throwOnOpenApiFetchError({ error, response }, "Get command status failed");
    const ok = data;
    if (!ok || typeof ok !== "object") {
      throw new Error("Get command status failed: unexpected response shape");
    }
    return {
      id: ok.id,
      content: ok.content,
      running: ok.running,
      exitCode: ok.exit_code ?? null,
      error: ok.error,
      startedAt: parseOptionalDate(ok.started_at, "startedAt"),
      finishedAt: parseOptionalDate(ok.finished_at, "finishedAt") ?? null
    };
  }
  async getBackgroundCommandLogs(commandId, cursor) {
    const { data, error, response } = await this.client.GET("/command/{id}/logs", {
      params: { path: { id: commandId }, query: cursor == null ? {} : { cursor } },
      parseAs: "text"
    });
    throwOnOpenApiFetchError({ error, response }, "Get command logs failed");
    const ok = data;
    if (typeof ok !== "string") {
      throw new Error("Get command logs failed: unexpected response shape");
    }
    const cursorHeader = response.headers.get("EXECD-COMMANDS-TAIL-CURSOR");
    const parsedCursor = cursorHeader != null && cursorHeader !== "" ? Number(cursorHeader) : void 0;
    return {
      content: ok,
      cursor: Number.isFinite(parsedCursor ?? NaN) ? parsedCursor : void 0
    };
  }
  async *runStream(command, opts, signal) {
    const url = joinUrl(this.opts.baseUrl, "/command");
    const body = JSON.stringify(toRunCommandRequest(command, opts));
    const res = await this.fetch(url, {
      method: "POST",
      headers: {
        "accept": "text/event-stream",
        "content-type": "application/json",
        ...this.opts.headers ?? {}
      },
      body,
      signal
    });
    for await (const ev of parseJsonEventStream(res, { fallbackErrorMessage: "Run command failed" })) {
      yield ev;
    }
  }
  async run(command, opts, handlers, signal) {
    const execution = {
      logs: { stdout: [], stderr: [] },
      result: []
    };
    const dispatcher = new ExecutionEventDispatcher(execution, handlers);
    for await (const ev of this.runStream(command, opts, signal)) {
      if (ev.type === "init" && (ev.text ?? "") === "" && execution.id) {
        ev.text = execution.id;
      }
      await dispatcher.dispatch(ev);
    }
    if (!opts?.background) {
      const errorValue = execution.error?.value?.trim();
      const parsedExitCode = errorValue && /^-?\d+$/.test(errorValue) ? Number(errorValue) : Number.NaN;
      execution.exitCode = execution.error != null ? Number.isFinite(parsedExitCode) ? parsedExitCode : null : execution.complete ? 0 : null;
    }
    return execution;
  }
  async createSession(options) {
    const body = options?.cwd != null ? { cwd: options.cwd } : {};
    const { data, error, response } = await this.client.POST("/session", {
      body
    });
    throwOnOpenApiFetchError({ error, response }, "Create session failed");
    const ok = data;
    if (!ok || typeof ok.session_id !== "string") {
      throw new Error("Create session failed: unexpected response shape");
    }
    return ok.session_id;
  }
  async *runInSessionStream(sessionId, code, opts, signal) {
    const url = joinUrl(
      this.opts.baseUrl,
      `/session/${encodeURIComponent(sessionId)}/run`
    );
    const body = {
      code
    };
    if (opts?.cwd != null) body.cwd = opts.cwd;
    if (opts?.timeoutMs != null) body.timeout_ms = opts.timeoutMs;
    const res = await this.fetch(url, {
      method: "POST",
      headers: {
        accept: "text/event-stream",
        "content-type": "application/json",
        ...this.opts.headers ?? {}
      },
      body: JSON.stringify(body),
      signal
    });
    for await (const ev of parseJsonEventStream(res, {
      fallbackErrorMessage: "Run in session failed"
    })) {
      yield ev;
    }
  }
  async runInSession(sessionId, code, options, handlers, signal) {
    const execution = {
      logs: { stdout: [], stderr: [] },
      result: []
    };
    const dispatcher = new ExecutionEventDispatcher(execution, handlers);
    for await (const ev of this.runInSessionStream(
      sessionId,
      code,
      options,
      signal
    )) {
      if (ev.type === "init" && (ev.text ?? "") === "" && execution.id) {
        ev.text = execution.id;
      }
      await dispatcher.dispatch(ev);
    }
    return execution;
  }
  async deleteSession(sessionId) {
    const { error, response } = await this.client.DELETE(
      "/session/{sessionId}",
      { params: { path: { sessionId } } }
    );
    throwOnOpenApiFetchError({ error, response }, "Delete session failed");
  }
};

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

// src/adapters/filesystemAdapter.ts
function joinUrl2(baseUrl, pathname) {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}
function toUploadBlob(data) {
  if (typeof data === "string") return new Blob([data]);
  if (data instanceof Blob) return data;
  if (data instanceof ArrayBuffer) return new Blob([data]);
  const copied = Uint8Array.from(data);
  return new Blob([copied.buffer]);
}
function isReadableStream(v) {
  return !!v && typeof v.getReader === "function";
}
function isAsyncIterable(v) {
  return !!v && typeof v[Symbol.asyncIterator] === "function";
}
function isNodeRuntime() {
  const p = globalThis?.process;
  return !!p?.versions?.node;
}
async function collectBytes(source) {
  const chunks = [];
  let total = 0;
  if (isReadableStream(source)) {
    const reader = source.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          total += value.length;
        }
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    for await (const chunk of source) {
      chunks.push(chunk);
      total += chunk.length;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
function toReadableStream(it) {
  const RS = ReadableStream;
  if (typeof RS?.from === "function") return RS.from(it);
  const iterator = it[Symbol.asyncIterator]();
  return new ReadableStream({
    async pull(controller) {
      const r = await iterator.next();
      if (r.done) {
        controller.close();
        return;
      }
      controller.enqueue(r.value);
    },
    async cancel() {
      await iterator.return?.();
    }
  });
}
function basename(p) {
  const parts = p.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "file";
}
function encodeUtf8(s) {
  return new TextEncoder().encode(s);
}
async function* multipartUploadBody(opts) {
  const b = opts.boundary;
  yield encodeUtf8(`--${b}\r
`);
  yield encodeUtf8(
    `Content-Disposition: form-data; name="metadata"; filename="metadata"\r
`
  );
  yield encodeUtf8(`Content-Type: application/json\r
\r
`);
  yield encodeUtf8(opts.metadataJson);
  yield encodeUtf8(`\r
`);
  yield encodeUtf8(`--${b}\r
`);
  yield encodeUtf8(
    `Content-Disposition: form-data; name="file"; filename="${opts.fileName}"\r
`
  );
  yield encodeUtf8(`Content-Type: ${opts.fileContentType}\r
\r
`);
  if (isReadableStream(opts.file)) {
    const reader = opts.file.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) yield value;
      }
    } finally {
      reader.releaseLock();
    }
  } else {
    for await (const chunk of opts.file) {
      yield chunk;
    }
  }
  yield encodeUtf8(`\r
--${b}--\r
`);
}
function toPermission(e) {
  return {
    mode: e.mode ?? 755,
    owner: e.owner,
    group: e.group
  };
}
var FilesystemAdapter = class {
  constructor(client, opts) {
    this.client = client;
    this.opts = opts;
    this.fetch = opts.fetch ?? fetch;
  }
  fetch;
  static Api = {
    // This is intentionally derived from OpenAPI schema types so API changes surface quickly.
    SearchFilesOk: null,
    FilesInfoOk: null,
    MakeDirsRequest: null,
    SetPermissionsRequest: null,
    MoveFilesRequest: null,
    ReplaceContentsRequest: null
  };
  parseIsoDate(field, v) {
    if (typeof v !== "string" || !v) {
      throw new Error(`Invalid ${field}: expected ISO string, got ${typeof v}`);
    }
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`Invalid ${field}: ${v}`);
    }
    return d;
  }
  static _ApiFileInfo = null;
  mapApiFileInfo(raw) {
    const { path, size, created_at, modified_at, mode, owner, group, ...rest } = raw;
    return {
      ...rest,
      path,
      size,
      mode,
      owner,
      group,
      createdAt: created_at ? this.parseIsoDate("createdAt", created_at) : void 0,
      modifiedAt: modified_at ? this.parseIsoDate("modifiedAt", modified_at) : void 0
    };
  }
  async getFileInfo(paths) {
    const { data, error, response } = await this.client.GET("/files/info", {
      params: { query: { path: paths } }
    });
    throwOnOpenApiFetchError({ error, response }, "Get file info failed");
    const raw = data;
    if (!raw) return {};
    if (typeof raw !== "object") {
      throw new Error(
        `Get file info failed: unexpected response shape (got ${typeof raw})`
      );
    }
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!v || typeof v !== "object") {
        throw new Error(
          `Get file info failed: invalid file info for path=${k}`
        );
      }
      out[k] = this.mapApiFileInfo(v);
    }
    return out;
  }
  async deleteFiles(paths) {
    const { error, response } = await this.client.DELETE("/files", {
      params: { query: { path: paths } }
    });
    throwOnOpenApiFetchError({ error, response }, "Delete files failed");
  }
  async createDirectories(entries) {
    const map = {};
    for (const e of entries) {
      map[e.path] = toPermission(e);
    }
    const body = map;
    const { error, response } = await this.client.POST("/directories", {
      body
    });
    throwOnOpenApiFetchError({ error, response }, "Create directories failed");
  }
  async deleteDirectories(paths) {
    const { error, response } = await this.client.DELETE("/directories", {
      params: { query: { path: paths } }
    });
    throwOnOpenApiFetchError({ error, response }, "Delete directories failed");
  }
  async setPermissions(entries) {
    const req = {};
    for (const e of entries) {
      req[e.path] = toPermission(e);
    }
    const body = req;
    const { error, response } = await this.client.POST("/files/permissions", {
      body
    });
    throwOnOpenApiFetchError({ error, response }, "Set permissions failed");
  }
  async moveFiles(entries) {
    const req = entries.map((e) => ({
      src: e.src,
      dest: e.dest
    }));
    const body = req;
    const { error, response } = await this.client.POST("/files/mv", {
      body
    });
    throwOnOpenApiFetchError({ error, response }, "Move files failed");
  }
  async replaceContents(entries) {
    const req = {};
    for (const e of entries) {
      req[e.path] = { old: e.oldContent, new: e.newContent };
    }
    const body = req;
    const { error, response } = await this.client.POST("/files/replace", {
      body
    });
    throwOnOpenApiFetchError({ error, response }, "Replace contents failed");
  }
  async search(entry) {
    const { data, error, response } = await this.client.GET("/files/search", {
      params: { query: { path: entry.path, pattern: entry.pattern } }
    });
    throwOnOpenApiFetchError({ error, response }, "Search files failed");
    const ok = data;
    if (!ok) return [];
    if (!Array.isArray(ok)) {
      throw new Error(
        `Search files failed: unexpected response shape (expected array, got ${typeof ok})`
      );
    }
    return ok.map((x) => this.mapApiFileInfo(x));
  }
  async uploadFile(meta, data) {
    const url = joinUrl2(this.opts.baseUrl, "/files/upload");
    const fileName = basename(meta.path);
    const metadataJson = JSON.stringify(meta);
    if (isReadableStream(data) || isAsyncIterable(data)) {
      if (!isNodeRuntime()) {
        const bytes = await collectBytes(data);
        return await this.uploadFile(meta, bytes);
      }
      const boundary = `opensandbox_${Math.random().toString(16).slice(2)}_${Date.now()}`;
      const bodyIt = multipartUploadBody({
        boundary,
        metadataJson,
        fileName,
        fileContentType: "application/octet-stream",
        file: data
      });
      const stream = toReadableStream(bodyIt);
      const res2 = await this.fetch(url, {
        method: "POST",
        headers: {
          "content-type": `multipart/form-data; boundary=${boundary}`,
          ...this.opts.headers ?? {}
        },
        body: stream,
        // Node fetch (undici) requires duplex for streaming request bodies.
        duplex: "half"
      });
      if (!res2.ok) {
        const requestId = res2.headers.get("x-request-id") ?? void 0;
        const rawBody = await res2.text().catch(() => void 0);
        throw new SandboxApiException({
          message: `Upload failed (status=${res2.status})`,
          statusCode: res2.status,
          requestId,
          error: new SandboxError(
            SandboxError.UNEXPECTED_RESPONSE,
            "Upload failed"
          ),
          rawBody
        });
      }
      return;
    }
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([metadataJson], { type: "application/json" }),
      "metadata"
    );
    if (typeof data === "string") {
      const textBlob = new Blob([data], { type: "text/plain; charset=utf-8" });
      form.append("file", textBlob, fileName);
    } else {
      const blob = toUploadBlob(data);
      const fileBlob = blob.type ? blob : new Blob([blob], { type: "application/octet-stream" });
      form.append("file", fileBlob, fileName);
    }
    const res = await this.fetch(url, {
      method: "POST",
      headers: {
        ...this.opts.headers ?? {}
      },
      body: form
    });
    if (!res.ok) {
      const requestId = res.headers.get("x-request-id") ?? void 0;
      const rawBody = await res.text().catch(() => void 0);
      throw new SandboxApiException({
        message: `Upload failed (status=${res.status})`,
        statusCode: res.status,
        requestId,
        error: new SandboxError(
          SandboxError.UNEXPECTED_RESPONSE,
          "Upload failed"
        ),
        rawBody
      });
    }
  }
  async readBytes(path, opts) {
    const url = joinUrl2(this.opts.baseUrl, "/files/download") + `?path=${encodeURIComponent(path)}`;
    const res = await this.fetch(url, {
      method: "GET",
      headers: {
        ...this.opts.headers ?? {},
        ...opts?.range ? { Range: opts.range } : {}
      }
    });
    if (!res.ok) {
      const requestId = res.headers.get("x-request-id") ?? void 0;
      const rawBody = await res.text().catch(() => void 0);
      throw new SandboxApiException({
        message: "Download failed",
        statusCode: res.status,
        requestId,
        error: new SandboxError(
          SandboxError.UNEXPECTED_RESPONSE,
          "Download failed"
        ),
        rawBody
      });
    }
    const ab = await res.arrayBuffer();
    return new Uint8Array(ab);
  }
  readBytesStream(path, opts) {
    return this.downloadStream(path, opts);
  }
  async *downloadStream(path, opts) {
    const url = joinUrl2(this.opts.baseUrl, "/files/download") + `?path=${encodeURIComponent(path)}`;
    const res = await this.fetch(url, {
      method: "GET",
      headers: {
        ...this.opts.headers ?? {},
        ...opts?.range ? { Range: opts.range } : {}
      }
    });
    if (!res.ok) {
      const requestId = res.headers.get("x-request-id") ?? void 0;
      const rawBody = await res.text().catch(() => void 0);
      throw new SandboxApiException({
        message: "Download stream failed",
        statusCode: res.status,
        requestId,
        error: new SandboxError(
          SandboxError.UNEXPECTED_RESPONSE,
          "Download stream failed"
        ),
        rawBody
      });
    }
    const body = res.body;
    if (!body) return;
    const reader = body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      if (value) yield value;
    }
  }
  async readFile(path, opts) {
    const bytes = await this.readBytes(path, { range: opts?.range });
    const encoding = opts?.encoding ?? "utf-8";
    return new TextDecoder(encoding).decode(bytes);
  }
  async writeFiles(entries) {
    for (const e of entries) {
      const meta = {
        path: e.path,
        owner: e.owner,
        group: e.group,
        mode: e.mode
      };
      await this.uploadFile(meta, e.data ?? "");
    }
  }
};

// src/adapters/healthAdapter.ts
var HealthAdapter = class {
  constructor(client) {
    this.client = client;
  }
  async ping() {
    const { error, response } = await this.client.GET("/ping");
    throwOnOpenApiFetchError({ error, response }, "Execd ping failed");
    return true;
  }
};

// src/adapters/metricsAdapter.ts
function normalizeMetrics(m) {
  const cpuCount = m.cpu_count ?? 0;
  const cpuUsedPercentage = m.cpu_used_pct ?? 0;
  const memoryTotalMiB = m.mem_total_mib ?? 0;
  const memoryUsedMiB = m.mem_used_mib ?? 0;
  const timestamp = m.timestamp ?? 0;
  return {
    cpuCount: Number(cpuCount),
    cpuUsedPercentage: Number(cpuUsedPercentage),
    memoryTotalMiB: Number(memoryTotalMiB),
    memoryUsedMiB: Number(memoryUsedMiB),
    timestamp: Number(timestamp)
  };
}
var MetricsAdapter = class {
  constructor(client) {
    this.client = client;
  }
  async getMetrics() {
    const { data, error, response } = await this.client.GET("/metrics");
    throwOnOpenApiFetchError({ error, response }, "Get execd metrics failed");
    const ok = data;
    if (!ok || typeof ok !== "object") {
      throw new Error("Get execd metrics failed: unexpected response shape");
    }
    return normalizeMetrics(ok);
  }
};

// src/adapters/sandboxesAdapter.ts
function encodeMetadataFilter(metadata) {
  const parts = [];
  for (const [k, v] of Object.entries(metadata)) {
    parts.push(`${k}=${v}`);
  }
  return parts.join("&");
}
var SandboxesAdapter = class {
  constructor(client) {
    this.client = client;
  }
  parseIsoDate(field, v) {
    if (typeof v !== "string" || !v) {
      throw new Error(`Invalid ${field}: expected ISO string, got ${typeof v}`);
    }
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`Invalid ${field}: ${v}`);
    }
    return d;
  }
  parseOptionalIsoDate(field, v) {
    if (v == null) return null;
    return this.parseIsoDate(field, v);
  }
  mapSandboxInfo(raw) {
    return {
      ...raw ?? {},
      createdAt: this.parseIsoDate("createdAt", raw?.createdAt),
      expiresAt: this.parseOptionalIsoDate("expiresAt", raw?.expiresAt)
    };
  }
  async createSandbox(req) {
    const body = req;
    const { data, error, response } = await this.client.POST("/sandboxes", {
      body
    });
    throwOnOpenApiFetchError({ error, response }, "Create sandbox failed");
    const raw = data;
    if (!raw || typeof raw !== "object") {
      throw new Error("Create sandbox failed: unexpected response shape");
    }
    return {
      ...raw ?? {},
      createdAt: this.parseIsoDate("createdAt", raw?.createdAt),
      expiresAt: this.parseOptionalIsoDate("expiresAt", raw?.expiresAt)
    };
  }
  async getSandbox(sandboxId) {
    const { data, error, response } = await this.client.GET("/sandboxes/{sandboxId}", {
      params: { path: { sandboxId } }
    });
    throwOnOpenApiFetchError({ error, response }, "Get sandbox failed");
    const ok = data;
    if (!ok || typeof ok !== "object") {
      throw new Error("Get sandbox failed: unexpected response shape");
    }
    return this.mapSandboxInfo(ok);
  }
  async listSandboxes(params = {}) {
    const query = {};
    if (params.states?.length) query.state = params.states;
    if (params.metadata && Object.keys(params.metadata).length) {
      query.metadata = encodeMetadataFilter(params.metadata);
    }
    if (params.page != null) query.page = params.page;
    if (params.pageSize != null) query.pageSize = params.pageSize;
    const { data, error, response } = await this.client.GET("/sandboxes", {
      params: { query }
    });
    throwOnOpenApiFetchError({ error, response }, "List sandboxes failed");
    const raw = data;
    if (!raw || typeof raw !== "object") {
      throw new Error("List sandboxes failed: unexpected response shape");
    }
    const itemsRaw = raw.items;
    if (!Array.isArray(itemsRaw)) throw new Error("List sandboxes failed: unexpected items shape");
    return {
      ...raw ?? {},
      items: itemsRaw.map((x) => this.mapSandboxInfo(x))
    };
  }
  async deleteSandbox(sandboxId) {
    const { error, response } = await this.client.DELETE("/sandboxes/{sandboxId}", {
      params: { path: { sandboxId } }
    });
    throwOnOpenApiFetchError({ error, response }, "Delete sandbox failed");
  }
  async pauseSandbox(sandboxId) {
    const { error, response } = await this.client.POST("/sandboxes/{sandboxId}/pause", {
      params: { path: { sandboxId } }
    });
    throwOnOpenApiFetchError({ error, response }, "Pause sandbox failed");
  }
  async resumeSandbox(sandboxId) {
    const { error, response } = await this.client.POST("/sandboxes/{sandboxId}/resume", {
      params: { path: { sandboxId } }
    });
    throwOnOpenApiFetchError({ error, response }, "Resume sandbox failed");
  }
  async renewSandboxExpiration(sandboxId, req) {
    const body = req;
    const { data, error, response } = await this.client.POST("/sandboxes/{sandboxId}/renew-expiration", {
      params: { path: { sandboxId } },
      body
    });
    throwOnOpenApiFetchError({ error, response }, "Renew sandbox expiration failed");
    const raw = data;
    if (!raw || typeof raw !== "object") {
      throw new Error("Renew sandbox expiration failed: unexpected response shape");
    }
    return {
      ...raw ?? {},
      expiresAt: raw?.expiresAt ? this.parseIsoDate("expiresAt", raw.expiresAt) : void 0
    };
  }
  async getSandboxEndpoint(sandboxId, port, useServerProxy = false) {
    const { data, error, response } = await this.client.GET("/sandboxes/{sandboxId}/endpoints/{port}", {
      params: { path: { sandboxId, port }, query: { use_server_proxy: useServerProxy } }
    });
    throwOnOpenApiFetchError({ error, response }, "Get sandbox endpoint failed");
    const ok = data;
    if (!ok || typeof ok !== "object") {
      throw new Error("Get sandbox endpoint failed: unexpected response shape");
    }
    return ok;
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
function isNodeRuntime2() {
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
  if (!isNodeRuntime2()) {
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
    if (isNodeRuntime2() && this.userAgent && !headers["user-agent"] && !headers["User-Agent"]) {
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
//# sourceMappingURL=index.cjs.map