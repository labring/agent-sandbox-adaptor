# Aliyun FC Provider Implementation Guide

## Overview
Two approaches for implementing Aliyun FC adapter based on FC deployment types.

## Approach 1: Event Function (Direct API)

### Architecture
```
AliyunFCAdapter → Aliyun FC SDK → Event Function
```

### Implementation
- Use `@alicloud/fc2` SDK
- Invoke functions via HTTP API
- Handle async/sync invocation modes
- Map FC lifecycle to adapter interface

### Pros
- Native FC integration
- Simpler deployment
- Lower latency

### Cons
- Limited to FC execution model
- Stateless by design
- Cold start overhead

---

## Approach 2: Custom Container with Hono Server (Recommended for Sandbox Use Case)

### Architecture
```
AliyunFCAdapter → HTTP Client → Hono Server (in FC Container) → Command Execution
```

### Why This Works Well

1. **FC Custom Container Runtime** supports long-running HTTP servers
2. **Hono** is lightweight and perfect for command interface
3. **Persistent execution environment** within container lifecycle
4. **Full control** over execution environment

### Container Implementation

#### 1. Hono Server (runs in FC container)

```typescript
// fc-container/src/index.ts
import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = new Hono();

// Health check endpoint (required by FC)
app.get('/ping', (c) => c.json({ status: 'ok' }));

// Command execution endpoint
app.post('/execute', async (c) => {
  const { command, workingDirectory, timeoutMs } = await c.req.json();

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDirectory,
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024 // 10MB
    });

    return c.json({
      stdout,
      stderr,
      exitCode: 0
    });
  } catch (error: any) {
    return c.json({
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1
    }, 500);
  }
});

// File operations endpoints
app.post('/files/read', async (c) => {
  const { path } = await c.req.json();
  // Implement file read
});

app.post('/files/write', async (c) => {
  const { path, content } = await c.req.json();
  // Implement file write
});

export default app;
```

#### 2. Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN npm install

# Copy application
COPY . .

# Expose port (FC requires 9000 by default)
EXPOSE 9000

# Start server
CMD ["node", "dist/index.js"]
```

#### 3. FC Configuration (s.yaml)

```yaml
edition: 3.0.0
name: sandbox-adapter
access: default

resources:
  sandbox-service:
    component: fc3
    props:
      region: cn-hangzhou
      functionName: sandbox-executor
      runtime: custom-container
      timeout: 600
      memorySize: 2048
      cpu: 1.0

      customContainerConfig:
        image: registry.cn-hangzhou.aliyuncs.com/your-namespace/sandbox-executor:latest
        port: 9000

      internetAccess: true
```

### Adapter Implementation

```typescript
// src/adapters/AliyunFCAdapter/index.ts
import { BaseSandboxAdapter } from '../BaseSandboxAdapter';
import { CommandPolyfillService } from '@/polyfill/CommandPolyfillService';
import type { ExecuteOptions, ExecuteResult, SandboxId, SandboxInfo } from '@/types';

export interface AliyunFCConfig {
  /** FC function HTTP endpoint */
  endpoint: string;
  /** Access key ID */
  accessKeyId: string;
  /** Access key secret */
  accessKeySecret: string;
  /** Function name */
  functionName: string;
}

export class AliyunFCAdapter extends BaseSandboxAdapter {
  readonly provider = 'aliyunfc' as const;

  private _id: SandboxId;
  private endpoint: string;
  private headers: Record<string, string>;

  constructor(private config: AliyunFCConfig) {
    super();
    this._id = config.functionName;
    this.endpoint = config.endpoint;

    // Setup authentication headers
    this.headers = {
      'Content-Type': 'application/json',
      'x-fc-access-key-id': config.accessKeyId,
      'x-fc-access-key-secret': config.accessKeySecret
    };

    this.polyfillService = new CommandPolyfillService(this);
  }

  get id(): SandboxId {
    return this._id;
  }

  // ==================== Lifecycle Methods ====================

  async ensureRunning(): Promise<void> {
    // FC containers are auto-started on first request
    const isReady = await this.ping();
    if (!isReady) {
      throw new Error('FC container failed to start');
    }
  }

  async create(): Promise<void> {
    this._status = { state: 'Creating' };
    // FC containers are created automatically
    await this.ensureRunning();
    this._status = { state: 'Running' };
  }

  async start(): Promise<void> {
    this._status = { state: 'Starting' };
    await this.ensureRunning();
    this._status = { state: 'Running' };
  }

  async stop(): Promise<void> {
    // FC containers auto-scale to zero
    this._status = { state: 'Stopped' };
  }

  async delete(): Promise<void> {
    // FC manages container lifecycle
    this._status = { state: 'UnExist' };
  }

  async getInfo(): Promise<SandboxInfo | null> {
    try {
      const response = await fetch(`${this.endpoint}/info`, {
        headers: this.headers
      });

      if (!response.ok) return null;

      const data = await response.json();
      return {
        id: this._id,
        image: { repository: data.image || 'custom-container' },
        entrypoint: [],
        status: this._status,
        createdAt: new Date()
      };
    } catch {
      return null;
    }
  }

  // ==================== Command Execution ====================

  async execute(command: string, options?: ExecuteOptions): Promise<ExecuteResult> {
    try {
      const response = await fetch(`${this.endpoint}/execute`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          command,
          workingDirectory: options?.workingDirectory,
          timeoutMs: options?.timeoutMs || 30000
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Execution failed');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Command execution failed: ${error}`);
    }
  }

  // ==================== Health Check ====================

  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/ping`, {
        headers: this.headers,
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

---

## Comparison

| Feature | Event Function | Custom Container + Hono |
|---------|---------------|-------------------------|
| **Execution Model** | Stateless invocation | HTTP server (stateful within instance) |
| **Cold Start** | Higher | Lower (container reuse) |
| **Complexity** | Lower | Higher |
| **Flexibility** | Limited | Full control |
| **File Operations** | Via OSS/NAS | Direct filesystem |
| **Best For** | Simple commands | Full sandbox environment |

---

## Recommendation

**Use Custom Container + Hono** because:

1. ✅ Better matches sandbox use case (persistent environment)
2. ✅ Supports file operations natively
3. ✅ Lower latency for repeated commands
4. ✅ Full control over execution environment
5. ✅ Easier to implement polyfill features

---

## Implementation Steps

1. **Create Hono server** with command execution endpoints
2. **Build Docker image** with required tools
3. **Deploy to FC** as custom container
4. **Implement AliyunFCAdapter** with HTTP client
5. **Add tests** following existing pattern

---

## Testing

```typescript
// tests/integration/aliyunFC.test.ts
import { describe, it, expect } from 'vitest';
import { AliyunFCAdapter } from '@/adapters/AliyunFCAdapter';

describe('AliyunFCAdapter', () => {
  const adapter = new AliyunFCAdapter({
    endpoint: process.env.ALIYUN_FC_ENDPOINT!,
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
    functionName: 'sandbox-executor'
  });

  it('should execute commands', async () => {
    await adapter.create();
    const result = await adapter.execute('echo "Hello FC"');
    expect(result.stdout).toContain('Hello FC');
    expect(result.exitCode).toBe(0);
  });

  it('should handle errors', async () => {
    const result = await adapter.execute('exit 1');
    expect(result.exitCode).toBe(1);
  });
});
```

---

---

## Data Persistence in Aliyun FC

### 1. Container Filesystem (Ephemeral)

**Default behavior:**
- ❌ **Not persistent** across cold starts
- ✅ **Persistent** within warm instance lifecycle (typically 10-15 minutes)
- 📦 Limited to `/tmp` directory (512MB default)

```typescript
// Temporary storage - lost on cold start
app.post('/execute', async (c) => {
  const { command } = await c.req.json();
  // Files written to /tmp are only available during warm instance
  await execAsync(`${command} > /tmp/output.txt`);
});
```

**Use case:** Short-lived execution results, temporary files

---

### 2. NAS (Network Attached Storage) - Recommended ✅

**Fully persistent storage** that survives cold starts and instance recycling.

#### Configuration

**s.yaml:**
```yaml
resources:
  sandbox-service:
    component: fc3
    props:
      functionName: sandbox-executor
      runtime: custom-container

      # Mount NAS for persistent storage
      nasConfig:
        userId: 10003
        groupId: 10003
        mountPoints:
          - serverAddr: "your-nas-id.cn-hangzhou.nas.aliyuncs.com"
            nasDir: "/sandbox-data"
            fcDir: "/mnt/nas"
```

#### Hono Server with NAS

```typescript
// fc-container/src/index.ts
import { Hono } from 'hono';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const app = new Hono();

// Persistent storage path
const PERSISTENT_ROOT = '/mnt/nas';
const WORKSPACE_ROOT = path.join(PERSISTENT_ROOT, 'workspaces');

// Initialize workspace on startup
async function initWorkspace(workspaceId: string) {
  const workspacePath = path.join(WORKSPACE_ROOT, workspaceId);
  await fs.mkdir(workspacePath, { recursive: true });
  return workspacePath;
}

// Execute command in persistent workspace
app.post('/execute', async (c) => {
  const { command, workspaceId = 'default', workingDirectory } = await c.req.json();

  try {
    // Ensure workspace exists
    const workspacePath = await initWorkspace(workspaceId);
    const cwd = workingDirectory
      ? path.join(workspacePath, workingDirectory)
      : workspacePath;

    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024
    });

    return c.json({
      stdout,
      stderr,
      exitCode: 0,
      workspacePath // Return persistent path
    });
  } catch (error: any) {
    return c.json({
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1
    }, 500);
  }
});

// File operations with NAS persistence
app.post('/files/write', async (c) => {
  const { workspaceId = 'default', path: filePath, content } = await c.req.json();

  const workspacePath = await initWorkspace(workspaceId);
  const fullPath = path.join(workspacePath, filePath);

  // Ensure parent directory exists
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, 'utf-8');

  return c.json({ success: true, path: fullPath });
});

app.post('/files/read', async (c) => {
  const { workspaceId = 'default', path: filePath } = await c.req.json();

  const workspacePath = await initWorkspace(workspaceId);
  const fullPath = path.join(workspacePath, filePath);

  const content = await fs.readFile(fullPath, 'utf-8');
  return c.json({ content });
});

// List workspace files
app.get('/workspaces/:workspaceId/files', async (c) => {
  const workspaceId = c.req.param('workspaceId');
  const workspacePath = path.join(WORKSPACE_ROOT, workspaceId);

  const files = await fs.readdir(workspacePath, { recursive: true });
  return c.json({ files });
});

// Clean up workspace
app.delete('/workspaces/:workspaceId', async (c) => {
  const workspaceId = c.req.param('workspaceId');
  const workspacePath = path.join(WORKSPACE_ROOT, workspaceId);

  await fs.rm(workspacePath, { recursive: true, force: true });
  return c.json({ success: true });
});

export default app;
```

#### Adapter with Workspace Support

```typescript
// src/adapters/AliyunFCAdapter/index.ts
export interface AliyunFCConfig {
  endpoint: string;
  accessKeyId: string;
  accessKeySecret: string;
  functionName: string;
  /** Workspace ID for persistent storage isolation */
  workspaceId?: string;
}

export class AliyunFCAdapter extends BaseSandboxAdapter {
  private workspaceId: string;

  constructor(private config: AliyunFCConfig) {
    super();
    this._id = config.functionName;
    this.workspaceId = config.workspaceId || `workspace-${Date.now()}`;
    // ... rest of constructor
  }

  async execute(command: string, options?: ExecuteOptions): Promise<ExecuteResult> {
    const response = await fetch(`${this.endpoint}/execute`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        command,
        workspaceId: this.workspaceId, // Include workspace ID
        workingDirectory: options?.workingDirectory,
        timeoutMs: options?.timeoutMs || 30000
      })
    });

    return await response.json();
  }

  /**
   * Install npm packages with OSS caching
   * @param packages - Array of package names to install
   * @param workingDirectory - Optional working directory
   */
  async installPackages(
    packages: string[],
    workingDirectory?: string
  ): Promise<{ success: boolean; installed: string[] }> {
    const response = await fetch(`${this.endpoint}/packages/install`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        workspaceId: this.workspaceId,
        packages,
        workingDirectory
      })
    });

    return await response.json();
  }

  /**
   * Execute command with automatic package restoration
   * Useful for ensuring dependencies are available before execution
   */
  async executeWithPackages(
    command: string,
    packages: string[],
    options?: ExecuteOptions
  ): Promise<ExecuteResult> {
    const response = await fetch(`${this.endpoint}/execute-with-packages`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        command,
        workspaceId: this.workspaceId,
        packages,
        workingDirectory: options?.workingDirectory
      })
    });

    return await response.json();
  }

  async delete(): Promise<void> {
    // Clean up package cache
    await fetch(`${this.endpoint}/packages/cache/${this.workspaceId}`, {
      method: 'DELETE',
      headers: this.headers
    });

    this._status = { state: 'UnExist' };
  }
}
```

#### Usage Example

```typescript
import { AliyunFCAdapter } from '@fastgpt-sdk/sandbox-adapter';

// Create adapter
const adapter = new AliyunFCAdapter({
  endpoint: 'https://your-fc-function.cn-hangzhou.fc.aliyuncs.com',
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
  functionName: 'sandbox-executor',
  workspaceId: 'user-project-123'
});

// Scenario 1: Install packages once
await adapter.installPackages(['axios', 'lodash']);

// Scenario 2: Execute with packages (auto-restore from cache)
const result = await adapter.executeWithPackages(
  'node script.js',
  ['axios', 'lodash']
);

// Scenario 3: Regular execution (packages already cached)
await adapter.execute('npm run test');

// Scenario 4: Add more packages incrementally
await adapter.installPackages(['express']);

// Clean up
await adapter.delete(); // Removes OSS cache
```

#### Performance Comparison

| Scenario | Without Cache | With OSS Cache | Improvement |
|----------|---------------|----------------|-------------|
| First `npm install axios` | ~8s | ~8s | - |
| Second call (cold start) | ~8s | ~2s | **75% faster** |
| Third call (warm instance) | ~8s | ~0.5s | **94% faster** |
| Install 10 packages | ~30s | ~3s | **90% faster** |
```

**Benefits:**
- ✅ Fully persistent across cold starts
- ✅ Shared across multiple function instances
- ✅ High performance (NFS protocol)
- ✅ Supports standard filesystem operations

**Limitations:**
- 💰 Additional cost for NAS storage
- 🔧 Requires VPC configuration
- 📍 Regional availability

---

### 3. OSS (Object Storage Service)

**Alternative for large file storage:**

```typescript
import OSS from 'ali-oss';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: 'sandbox-storage'
});

// Basic file operations
app.post('/files/upload', async (c) => {
  const { workspaceId, path, content } = await c.req.json();

  const key = `${workspaceId}/${path}`;
  await client.put(key, Buffer.from(content));

  return c.json({ success: true, key });
});

app.post('/files/download', async (c) => {
  const { workspaceId, path } = await c.req.json();

  const key = `${workspaceId}/${path}`;
  const result = await client.get(key);

  return c.json({ content: result.content.toString() });
});

// ==================== Package Management with OSS ====================

/**
 * Install npm packages with OSS caching
 * Handles node_modules persistence across cold starts
 */
app.post('/packages/install', async (c) => {
  const { workspaceId, packages, workingDirectory = '.' } = await c.req.json();

  const workspacePath = `/tmp/workspace-${workspaceId}`;
  const projectPath = path.join(workspacePath, workingDirectory);
  const nodeModulesPath = path.join(projectPath, 'node_modules');
  const packageJsonPath = path.join(projectPath, 'package.json');
  const cacheKey = `${workspaceId}/node_modules.tar.gz`;

  try {
    // 1. Ensure workspace exists
    await fs.mkdir(projectPath, { recursive: true });

    // 2. Check if node_modules cache exists in OSS
    let cacheExists = false;
    try {
      await client.head(cacheKey);
      cacheExists = true;
    } catch (e) {
      // Cache doesn't exist
    }

    // 3. Restore from cache if exists
    if (cacheExists) {
      console.log('Restoring node_modules from OSS cache...');
      const cachePath = `/tmp/${workspaceId}-node_modules.tar.gz`;

      // Download cache
      await client.get(cacheKey, cachePath);

      // Extract to project
      await execAsync(`tar -xzf ${cachePath} -C ${projectPath}`);

      console.log('node_modules restored from cache');
    }

    // 4. Install new packages if specified
    if (packages && packages.length > 0) {
      console.log(`Installing packages: ${packages.join(', ')}`);

      const { stdout, stderr } = await execAsync(
        `npm install ${packages.join(' ')}`,
        { cwd: projectPath }
      );

      // 5. Update cache after installation
      console.log('Updating OSS cache...');
      const cachePath = `/tmp/${workspaceId}-node_modules.tar.gz`;

      // Compress node_modules
      await execAsync(
        `tar -czf ${cachePath} -C ${projectPath} node_modules`
      );

      // Upload to OSS
      await client.put(cacheKey, cachePath);

      console.log('Cache updated');

      return c.json({
        success: true,
        installed: packages,
        stdout,
        stderr,
        cached: true
      });
    }

    return c.json({
      success: true,
      restored: cacheExists,
      message: cacheExists ? 'Restored from cache' : 'No cache found'
    });

  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
      stderr: error.stderr
    }, 500);
  }
});

/**
 * Execute command with package cache restoration
 */
app.post('/execute-with-packages', async (c) => {
  const { workspaceId, command, packages, workingDirectory = '.' } = await c.req.json();

  const workspacePath = `/tmp/workspace-${workspaceId}`;
  const projectPath = path.join(workspacePath, workingDirectory);

  try {
    // 1. Restore packages first
    if (packages && packages.length > 0) {
      await fetch(`${c.req.url.replace('/execute-with-packages', '/packages/install')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, packages, workingDirectory })
      });
    }

    // 2. Execute command
    const { stdout, stderr } = await execAsync(command, {
      cwd: projectPath,
      timeout: 30000
    });

    return c.json({
      stdout,
      stderr,
      exitCode: 0
    });

  } catch (error: any) {
    return c.json({
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1
    }, 500);
  }
});

/**
 * Clear package cache
 */
app.delete('/packages/cache/:workspaceId', async (c) => {
  const workspaceId = c.req.param('workspaceId');
  const cacheKey = `${workspaceId}/node_modules.tar.gz`;

  try {
    await client.delete(cacheKey);
    return c.json({ success: true, message: 'Cache cleared' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
```

**Use case:** Large files, backups, long-term storage, **package caching**

#### How it works for `npm install axios`:

1. **First install** (cold start):
   ```
   POST /packages/install
   {
     "workspaceId": "user-123",
     "packages": ["axios"]
   }
   ```
   - Installs axios to `/tmp/workspace-user-123/node_modules`
   - Compresses `node_modules` → `node_modules.tar.gz`
   - Uploads to OSS: `user-123/node_modules.tar.gz`

2. **Subsequent calls** (warm or cold):
   ```
   POST /packages/install
   {
     "workspaceId": "user-123",
     "packages": []
   }
   ```
   - Downloads `node_modules.tar.gz` from OSS
   - Extracts to `/tmp/workspace-user-123/node_modules`
   - Ready to use immediately (no reinstall needed)

3. **Add more packages**:
   ```
   POST /packages/install
   {
     "workspaceId": "user-123",
     "packages": ["lodash"]
   }
   ```
   - Restores existing cache first
   - Installs lodash (incremental)
   - Updates cache with both axios + lodash

**Performance:**
- ✅ First install: ~5-10s (normal npm install)
- ✅ Cache restore: ~2-3s (download + extract)
- ✅ Much faster than reinstalling on every cold start

---

### 4. Hybrid Approach (Recommended for Production)

Combine NAS + OSS for optimal performance and cost:

```typescript
// Fast access: NAS for active workspace
// Long-term: OSS for archival and backups

app.post('/workspace/archive', async (c) => {
  const { workspaceId } = await c.req.json();

  // 1. Tar workspace from NAS
  const workspacePath = path.join(WORKSPACE_ROOT, workspaceId);
  const tarPath = `/tmp/${workspaceId}.tar.gz`;
  await execAsync(`tar -czf ${tarPath} -C ${workspacePath} .`);

  // 2. Upload to OSS
  await client.put(`archives/${workspaceId}.tar.gz`, tarPath);

  // 3. Clean up NAS
  await fs.rm(workspacePath, { recursive: true });

  return c.json({ success: true, archived: true });
});

app.post('/workspace/restore', async (c) => {
  const { workspaceId } = await c.req.json();

  // 1. Download from OSS
  const tarPath = `/tmp/${workspaceId}.tar.gz`;
  await client.get(`archives/${workspaceId}.tar.gz`, tarPath);

  // 2. Extract to NAS
  const workspacePath = path.join(WORKSPACE_ROOT, workspaceId);
  await fs.mkdir(workspacePath, { recursive: true });
  await execAsync(`tar -xzf ${tarPath} -C ${workspacePath}`);

  return c.json({ success: true, restored: true });
});
```

---

## Persistence Comparison

| Solution | Persistence | Performance | Cost | Use Case |
|----------|-------------|-------------|------|----------|
| **Container /tmp** | ❌ Ephemeral | ⚡ Fastest | 💰 Free | Temporary files |
| **NAS** | ✅ Persistent | ⚡ Fast | 💰💰 Medium | Active workspace |
| **OSS** | ✅ Persistent | 🐌 Slower | 💰 Low | Archives, large files |
| **Hybrid** | ✅ Persistent | ⚡ Optimized | 💰💰 Balanced | Production |

---

## Recommended Architecture for Sandbox Adapter

```
┌─────────────────────────────────────────────────┐
│  AliyunFCAdapter (Client)                       │
│  - Manages workspace lifecycle                  │
│  - Routes commands to FC                        │
└─────────────────┬───────────────────────────────┘
                  │ HTTP
                  ▼
┌─────────────────────────────────────────────────┐
│  FC Custom Container (Hono Server)              │
│  ┌───────────────────────────────────────────┐  │
│  │  /tmp (512MB)                             │  │
│  │  - Temporary execution                    │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  /mnt/nas (NAS Mount)                     │  │
│  │  - Persistent workspace                   │  │
│  │  - Active files                           │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  OSS Client                               │  │
│  │  - Archive/restore                        │  │
│  │  - Large file storage                     │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## Next Steps

1. Decide between Event Function vs Custom Container
2. If Custom Container: Build Hono server with endpoints
3. **Choose persistence strategy** (NAS recommended for sandbox use case)
4. Configure NAS mount in FC (if using NAS)
5. Implement AliyunFCAdapter following SealosDevboxAdapter pattern
6. Add workspace management endpoints
7. Add integration tests
8. Update package.json exports
