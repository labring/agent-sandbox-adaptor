# OSS Package Management - Complete Example

## Scenario: Execute Node.js script with `npm install axios`

### User's Script

```javascript
// script.js
const axios = require('axios');

async function fetchData() {
  const response = await axios.get('https://api.github.com/users/github');
  console.log(response.data.name);
}

fetchData();
```

---

## Implementation Flow

```typescript
import { AliyunFCAdapter } from '@fastgpt-sdk/sandbox-adapter';

async function runUserScript() {
  // 1. Create adapter with workspace
  const adapter = new AliyunFCAdapter({
    endpoint: 'https://your-fc.cn-hangzhou.fc.aliyuncs.com',
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
    functionName: 'sandbox-executor',
    workspaceId: 'user-123-project-456' // Unique per user/project
  });

  try {
    // 2. Create sandbox
    await adapter.create();

    // 3. Write user script to workspace
    await adapter.writeFiles([{
      path: 'script.js',
      data: `
        const axios = require('axios');
        async function fetchData() {
          const response = await axios.get('https://api.github.com/users/github');
          console.log(response.data.name);
        }
        fetchData();
      `
    }]);

    // 4. Install dependencies (first time: installs, subsequent: restores from cache)
    console.log('Installing packages...');
    await adapter.installPackages(['axios']);

    // 5. Execute script
    console.log('Executing script...');
    const result = await adapter.execute('node script.js');

    console.log('Output:', result.stdout);
    // Output: GitHub

    // 6. Run another script with same packages (uses cache)
    await adapter.writeFiles([{
      path: 'script2.js',
      data: `
        const axios = require('axios');
        console.log('Axios version:', require('axios/package.json').version);
      `
    }]);

    const result2 = await adapter.execute('node script2.js');
    console.log('Output:', result2.stdout);
    // Output: Axios version: 1.6.0

  } finally {
    // 7. Cleanup (optional - removes OSS cache)
    // await adapter.delete();
  }
}

runUserScript();
```

---

## What Happens Behind the Scenes

### First Execution (Cold Start):
```
1. FC container starts                           [~2s]
2. Check OSS for node_modules.tar.gz             [~0.5s] ❌ Not found
3. npm install axios                             [~8s] ✅ Install
4. Compress node_modules → tar.gz                [~1s]
5. Upload to OSS                                 [~1s]
6. Execute script                                [~0.5s]
───────────────────────────────────────────────────────
Total: ~13s
```

### Second Execution (Cold Start):
```
1. FC container starts                           [~2s]
2. Download node_modules.tar.gz from OSS         [~1s] ✅ Found
3. Extract to /tmp/workspace-xxx/node_modules    [~1s]
4. Execute script                                [~0.5s]
───────────────────────────────────────────────────────
Total: ~4.5s (65% faster!)
```

### Third Execution (Warm Instance):
```
1. Container already running                     [0s]
2. node_modules already in /tmp                  [0s]
3. Execute script                                [~0.5s]
───────────────────────────────────────────────────────
Total: ~0.5s (96% faster!)
```

---

## OSS Storage Structure

```
sandbox-storage (OSS Bucket)
├── user-123-project-456/
│   ├── node_modules.tar.gz          # Package cache (compressed)
│   ├── files/
│   │   ├── script.js                # User files
│   │   ├── data.json
│   │   └── output.txt
│   └── workspace-snapshot.tar.gz    # Full workspace backup
│
├── user-789-project-012/
│   └── node_modules.tar.gz
│
├── shared/                          # Shared cache for common packages
│   ├── node_modules-axios.tar.gz
│   ├── node_modules-axios-lodash.tar.gz
│   └── node_modules-express.tar.gz
│
└── archives/
    └── old-workspace-123.tar.gz     # Archived workspaces
```

---

## Cost Optimization Tips

### 1. Shared Package Cache

For common packages, use a shared cache across all users:

```typescript
// Hono server
app.post('/packages/install', async (c) => {
  const { workspaceId, packages } = await c.req.json();

  // Generate cache key from sorted package list
  const cacheKey = `shared/node_modules-${packages.sort().join('-')}.tar.gz`;

  try {
    // Check if shared cache exists
    await client.head(cacheKey);

    // Shared cache exists, download and use it
    const cachePath = `/tmp/${workspaceId}-node_modules.tar.gz`;
    await client.get(cacheKey, cachePath);

    // Extract to workspace
    await execAsync(`tar -xzf ${cachePath} -C /tmp/workspace-${workspaceId}`);

    return c.json({
      success: true,
      source: 'shared-cache',
      packages
    });
  } catch {
    // No shared cache, install and create one
    await execAsync(`npm install ${packages.join(' ')}`, {
      cwd: `/tmp/workspace-${workspaceId}`
    });

    // Create cache for future use
    const cachePath = `/tmp/${workspaceId}-node_modules.tar.gz`;
    await execAsync(`tar -czf ${cachePath} -C /tmp/workspace-${workspaceId} node_modules`);
    await client.put(cacheKey, cachePath);

    return c.json({
      success: true,
      source: 'fresh-install',
      packages
    });
  }
});
```

**Benefits:**
- ✅ Multiple users share same cache
- ✅ Reduces OSS storage costs
- ✅ Faster for common package combinations

### 2. Cache Expiration with Lifecycle Rules

Set OSS lifecycle rules to auto-delete old caches:

```typescript
// Configure via Aliyun Console or SDK
{
  "Rules": [
    {
      "ID": "delete-old-workspace-caches",
      "Prefix": "user-*/node_modules.tar.gz",
      "Status": "Enabled",
      "Expiration": {
        "Days": 30  // Delete after 30 days of inactivity
      }
    },
    {
      "ID": "keep-shared-caches",
      "Prefix": "shared/",
      "Status": "Enabled",
      "Expiration": {
        "Days": 90  // Keep shared caches longer
      }
    }
  ]
}
```

### 3. Incremental Updates (Hash-based Caching)

Only update cache when package.json changes:

```typescript
import crypto from 'crypto';

app.post('/packages/install', async (c) => {
  const { workspaceId, packageJson } = await c.req.json();

  // Generate hash of package.json content
  const hash = crypto.createHash('md5').update(packageJson).digest('hex');
  const cacheKey = `${workspaceId}/node_modules-${hash}.tar.gz`;

  try {
    // Check if cache exists for this exact package.json
    await client.head(cacheKey);

    // Cache hit - restore
    const cachePath = `/tmp/${workspaceId}-node_modules.tar.gz`;
    await client.get(cacheKey, cachePath);
    await execAsync(`tar -xzf ${cachePath} -C /tmp/workspace-${workspaceId}`);

    return c.json({
      success: true,
      cached: true,
      hash
    });
  } catch {
    // Cache miss - install and cache
    await execAsync(`npm install`, {
      cwd: `/tmp/workspace-${workspaceId}`
    });

    const cachePath = `/tmp/${workspaceId}-node_modules.tar.gz`;
    await execAsync(`tar -czf ${cachePath} -C /tmp/workspace-${workspaceId} node_modules`);
    await client.put(cacheKey, cachePath);

    return c.json({
      success: true,
      cached: false,
      hash
    });
  }
});
```

---

## Comparison: OSS vs NAS vs Docker Image

| Aspect | OSS | NAS | Docker Image |
|--------|-----|-----|--------------|
| **Setup Complexity** | 🟢 Low | 🟡 Medium | 🟢 Low |
| **First Install** | 🟡 8s | 🟡 8s | 🟢 0s (pre-installed) |
| **Cold Start Restore** | 🟢 2-3s | 🟢 0s (mounted) | 🟢 0s (in image) |
| **Warm Instance** | 🟢 0s (cached in /tmp) | 🟢 0s | 🟢 0s |
| **Dynamic Packages** | ✅ Yes | ✅ Yes | ❌ No (rebuild) |
| **Storage Cost** | 💰 $0.02/GB/month | 💰💰 $0.35/GB/month | 💰 Free (in image) |
| **Network Cost** | 💰 $0.12/GB download | 💰 Free (VPC) | 💰 Free |
| **Best For** | Dynamic deps | Frequent changes | Static deps |

---

## Hybrid Approach (Recommended)

Combine Docker image + OSS for optimal performance and flexibility:

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Pre-install common packages in image (instant availability)
RUN npm install -g \
    axios \
    lodash \
    express \
    dotenv

# Copy Hono server
COPY package.json bun.lockb ./
RUN npm install

COPY . .

EXPOSE 9000
CMD ["node", "dist/index.js"]
```

### Benefits

| Package Type | Source | Availability | Cost |
|--------------|--------|--------------|------|
| **Common** (axios, lodash) | Docker Image | Instant | Free |
| **User-specific** (custom libs) | OSS Cache | 2-3s restore | Low |
| **Dynamic** (user installs) | npm install + OSS | 8s first, 2s cached | Low |

### Usage Pattern

```typescript
// Common packages - instant (from image)
await adapter.execute('node -e "console.log(require(\'axios\').VERSION)"');
// Output: 1.6.0 (instant)

// User-specific packages - fast (from OSS cache)
await adapter.installPackages(['custom-lib']);
// First time: 8s, subsequent: 2s

// Dynamic install - cached after first use
await adapter.execute('npm install moment');
// First time: 5s, subsequent: 2s (OSS cache)
```

---

## Performance Summary

### Without OSS Cache
```
Every cold start:
- npm install: 8-30s (depending on packages)
- Total: 10-32s per cold start
```

### With OSS Cache
```
First cold start:
- npm install + cache: 8-30s
- Upload to OSS: 1-2s
- Total: 9-32s

Subsequent cold starts:
- Download from OSS: 1-2s
- Extract: 1s
- Total: 2-3s (70-90% faster!)

Warm instances:
- Already in /tmp: 0s
- Total: 0s (instant!)
```

---

## Real-World Example: FastGPT Sandbox

```typescript
// FastGPT workflow execution with dynamic packages
const adapter = new AliyunFCAdapter({
  endpoint: process.env.FC_ENDPOINT,
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  functionName: 'fastgpt-sandbox',
  workspaceId: `workflow-${workflowId}`
});

// User's workflow requires axios and cheerio
const userCode = `
  const axios = require('axios');
  const cheerio = require('cheerio');

  async function scrapeData(url) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    return $('title').text();
  }

  scrapeData('https://example.com').then(console.log);
`;

// Install packages (cached after first use)
await adapter.installPackages(['axios', 'cheerio']);

// Write and execute user code
await adapter.writeFiles([{ path: 'workflow.js', data: userCode }]);
const result = await adapter.execute('node workflow.js');

console.log(result.stdout); // Example Domain
```

**Performance:**
- First execution: ~12s (install + execute)
- Subsequent: ~3s (restore + execute)
- Warm instance: ~0.5s (execute only)

---

## Conclusion

**OSS 可以很好地保留 `npm install` 的内容!**

✅ **优势:**
- 完全持久化,跨冷启动保留
- 成本低 (~$0.02/GB/月)
- 实现简单,无需 VPC 配置
- 支持动态安装任意包

✅ **性能:**
- 首次安装: 正常速度 (~8s)
- 后续恢复: 快速 (~2-3s)
- 热实例: 即时 (~0s)

✅ **推荐方案:**
- Docker 镜像预装常用包 (axios, lodash, express)
- OSS 缓存用户特定包
- 混合使用,性能最优,成本最低
