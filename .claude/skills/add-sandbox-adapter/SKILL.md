---
name: add-sandbox-adapter
description: 为 agent-sandbox-adaptor 项目添加新的沙盒提供商适配器。当用户想要添加新的沙盒提供商支持、提到添加适配器、或提供沙盒服务文档时使用此技能。触发短语包括"添加 X 适配器"、"集成 X 沙盒"、"支持 X 提供商"，或当用户分享沙盒服务的 API 文档时。
---

# 添加沙盒适配器技能

此技能帮助你为 agent-sandbox-adaptor 项目添加新的沙盒提供商适配器。它自动化创建适配器代码、类型定义、环境变量、测试和集成更新。

## 何时使用此技能

在以下情况使用此技能：
- 用户想要添加新的沙盒提供商支持
- 用户提到"添加适配器"、"新提供商"、"集成沙盒"
- 用户提供沙盒服务的 API 文档或 SDK
- 用户指定沙盒厂商名称（例如："添加 E2B 适配器"、"支持 Modal"）

## 理解项目结构

agent-sandbox-adaptor 项目为不同的沙盒提供商提供统一接口。每个适配器：

1. **继承 BaseSandboxAdapter** - 继承通用功能和 polyfill 服务
2. **实现 ISandbox 接口** - 提供生命周期、命令执行、文件系统和健康检查方法
3. **拥有独立目录** - 包含适配器实现、类型定义和可选的 API 客户端
4. **在工厂中注册** - 添加到 `createSandbox()` 函数和类型联合中

### 需要理解的关键文件

- `src/adapters/BaseSandboxAdapter.ts` - 带有 polyfill 实现的基类
- `src/adapters/OpenSandboxAdapter/` - 功能完整的参考实现
- `src/adapters/SealosDevboxAdapter/` - 带自定义 API 的简单参考实现
- `src/adapters/index.ts` - 工厂函数和类型定义
- `.env.test.template` - 测试用环境变量模板

## 工作流程

### 步骤 1：收集信息

向用户询问：

1. **提供商名称** - 这个适配器应该叫什么？（例如："e2b"、"modal"、"runpod"）
2. **文档** - API 文档、SDK 链接或文档文件
3. **认证方式** - 提供商如何认证？（API key、token、凭证）
4. **核心能力** - 提供商支持哪些功能？
   - 原生命令执行还是需要 polyfill？
   - 原生文件系统操作还是需要 polyfill？
   - 生命周期操作（创建、启动、停止、删除、暂停/恢复）？
   - 后台执行支持？
   - 指标和健康检查？

### 步骤 2：分析提供商

基于文档，确定：

1. **SDK 可用性** - 提供商是否有官方的 TypeScript/JavaScript SDK？
2. **API 结构** - REST API、gRPC、WebSocket 还是其他？
3. **认证方法** - header 中的 API key、token、OAuth 等
4. **资源模型** - 沙盒如何创建和管理？
5. **命令执行** - 同步、流式还是两者都支持？
6. **功能支持** - 哪些 ISandbox 方法可以原生实现，哪些需要 polyfill？

### 步骤 3：创建适配器结构

在 `src/adapters/{ProviderName}Adapter/` 中创建以下文件：

#### 3.1 类型定义 (`type.ts`)

定义 TypeScript 类型：
- 提供商特定的配置
- API 请求/响应类型
- 状态/状态映射
- 资源规格

示例结构：
```typescript
/**
 * {Provider} 适配器配置
 */
export interface {Provider}Config {
  /** API 端点 URL */
  baseUrl: string;
  /** 认证 token/key */
  apiKey: string;
  /** 沙盒标识符 */
  sandboxId: string;
  /** 可选的超时设置 */
  timeout?: number;
}

/**
 * 提供商特定的沙盒状态枚举
 */
export enum {Provider}StateEnum {
  Running = 'running',
  Pending = 'pending',
  Stopped = 'stopped',
  // ... 其他状态
}

/**
 * API 响应类型
 */
export interface {Provider}InfoResponse {
  id: string;
  state: {Provider}StateEnum;
  // ... 其他字段
}
```

#### 3.2 API 客户端（如果需要）(`api.ts`)

如果提供商没有官方 SDK，创建简单的 API 客户端：

```typescript
import type { {Provider}Config, {Provider}InfoResponse } from './type';

export class {Provider}Api {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: {Provider}Config) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  async getInfo(sandboxId: string): Promise<{Provider}InfoResponse> {
    const response = await fetch(`${this.baseUrl}/sandboxes/${sandboxId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.statusText}`);
    }

    return response.json();
  }

  // 添加其他 API 方法：create、delete、execute 等
}
```

#### 3.3 适配器实现 (`index.ts`)

创建主适配器类：

```typescript
import { BaseSandboxAdapter } from '../BaseSandboxAdapter';
import { CommandPolyfillService } from '@/polyfill/CommandPolyfillService';
import { CommandExecutionError, ConnectionError } from '@/errors';
import type {
  ExecuteOptions,
  ExecuteResult,
  SandboxId,
  SandboxInfo,
  SandboxState
} from '@/types';
import { {Provider}Api } from './api';
import type { {Provider}Config, {Provider}StateEnum } from './type';

export class {Provider}Adapter extends BaseSandboxAdapter {
  readonly provider = '{providername}' as const;

  private api: {Provider}Api;
  private _id: SandboxId;

  constructor(private config: {Provider}Config) {
    super();
    this.api = new {Provider}Api(config);
    this._id = config.sandboxId;

    // 为文件系统/搜索/健康检查操作初始化 polyfill 服务
    this.polyfillService = new CommandPolyfillService(this);
  }

  get id(): SandboxId {
    return this._id;
  }

  // ==================== 状态映射 ====================

  private mapState(providerState: {Provider}StateEnum): SandboxState {
    switch (providerState) {
      case {Provider}StateEnum.Running:
        return 'Running';
      case {Provider}StateEnum.Pending:
        return 'Creating';
      case {Provider}StateEnum.Stopped:
        return 'Stopped';
      default:
        return 'Error';
    }
  }

  // ==================== 生命周期方法 ====================

  async ensureRunning(): Promise<void> {
    const info = await this.getInfo();
    if (!info) {
      await this.create();
      return;
    }

    const state = info.status.state;
    switch (state) {
      case 'Running':
        return;
      case 'Creating':
      case 'Starting':
        await this.waitUntilReady();
        return;
      case 'Stopped':
        await this.start();
        return;
      default:
        throw new ConnectionError('沙盒处于意外状态');
    }
  }

  async create(): Promise<void> {
    try {
      this._status = { state: 'Creating' };
      await this.api.create(this._id);
      await this.waitUntilReady();
      this._status = { state: 'Running' };
    } catch (error) {
      this._status = { state: 'Error', message: String(error) };
      throw new ConnectionError('创建沙盒失败', this.config.baseUrl, error);
    }
  }

  async start(): Promise<void> {
    try {
      this._status = { state: 'Starting' };
      await this.api.start(this._id);
      await this.waitUntilReady();
      this._status = { state: 'Running' };
    } catch (error) {
      throw new CommandExecutionError(
        '启动沙盒失败',
        'start',
        error instanceof Error ? error : undefined
      );
    }
  }

  async stop(): Promise<void> {
    try {
      this._status = { state: 'Stopping' };
      await this.api.stop(this._id);
      this._status = { state: 'Stopped' };
    } catch (error) {
      throw new CommandExecutionError(
        '停止沙盒失败',
        'stop',
        error instanceof Error ? error : undefined
      );
    }
  }

  async delete(): Promise<void> {
    try {
      this._status = { state: 'Deleting' };
      await this.api.delete(this._id);
      this._status = { state: 'UnExist' };
    } catch (error) {
      throw new CommandExecutionError(
        '删除沙盒失败',
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getInfo(): Promise<SandboxInfo | null> {
    try {
      const info = await this.api.getInfo(this._id);

      this._status = { state: this.mapState(info.state) };

      return {
        id: info.id,
        image: { repository: info.image || '' },
        entrypoint: [],
        status: this._status,
        createdAt: new Date(info.createdAt)
      };
    } catch (error) {
      return null;
    }
  }

  // ==================== 命令执行 ====================

  async execute(command: string, options?: ExecuteOptions): Promise<ExecuteResult> {
    const cmd = this.buildCommand(command, options?.workingDirectory);

    try {
      const result = await this.api.execute(this._id, {
        command: cmd,
        timeout: options?.timeoutMs
      });

      return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode || 0
      };
    } catch (error) {
      throw new CommandExecutionError(
        `命令执行失败: ${error}`,
        command,
        error instanceof Error ? error : undefined
      );
    }
  }

  // ==================== 健康检查 ====================

  async ping(): Promise<boolean> {
    try {
      const info = await this.api.getInfo(this._id);
      return info.state === {Provider}StateEnum.Running;
    } catch {
      return false;
    }
  }
}
```

### 步骤 4：更新集成文件

#### 4.1 更新 `src/adapters/index.ts`

将新适配器添加到工厂：

```typescript
// 添加导入
import { {Provider}Adapter, type {Provider}Config } from './{Provider}Adapter';

// 添加到导出
export { {Provider}Adapter } from './{Provider}Adapter';
export type { {Provider}Config } from './{Provider}Adapter';

// 添加到提供商类型联合
export type SandboxProviderType = 'opensandbox' | 'sealosdevbox' | '{providername}';

// 添加到配置映射
interface SandboxConfigMap {
  opensandbox: OpenSandboxConfigType;
  sealosdevbox: undefined;
  {providername}: undefined; // 或特定配置类型（如果需要）
}

// 添加到连接配置映射
interface SandboxConnectionConfig {
  opensandbox: OpenSandboxConnectionConfig;
  sealosdevbox: SealosDevboxConfig;
  {providername}: {Provider}Config;
}

// 在 createSandbox 函数中添加 case
export function createSandbox<P extends SandboxProviderType>(
  provider: P,
  config: SandboxConnectionConfig[P],
  createConfig?: SandboxConfigMap[P]
): ISandbox {
  switch (provider) {
    // ... 现有的 case

    case '{providername}':
      return new {Provider}Adapter(config as {Provider}Config);

    default:
      throw new Error(`未知提供商: ${provider}`);
  }
}
```

#### 4.2 更新 `.env.test.template`

为新提供商添加环境变量：

```bash
# {Provider} 沙盒配置
{PROVIDER}_SANDBOX_BASE_URL=
{PROVIDER}_SANDBOX_API_KEY=
{PROVIDER}_SANDBOX_ID=
```

### 步骤 5：创建单元测试

创建 `tests/unit/adapters/{Provider}Adapter.test.ts`：

```typescript
import { describe, expect, it } from 'vitest';
import { {Provider}Adapter } from '@/adapters/{Provider}Adapter';
import { ConnectionError, SandboxStateError } from '@/errors';
import type { {Provider}Config } from '@/adapters/{Provider}Adapter/type';

describe('{Provider}Adapter', () => {
  describe('初始化', () => {
    it('应该使用正确的提供商名称初始化', () => {
      const config: {Provider}Config = {
        baseUrl: 'https://api.example.com',
        apiKey: 'test-key',
        sandboxId: 'test-sandbox'
      };

      const adapter = new {Provider}Adapter(config);

      expect(adapter.provider).toBe('{providername}');
      expect(adapter.id).toBe('test-sandbox');
      expect(adapter.status.state).toBe('Creating');
    });
  });

  describe('生命周期方法', () => {
    it('当沙盒不存在时应该处理 getInfo', async () => {
      const config: {Provider}Config = {
        baseUrl: 'https://api.example.com',
        apiKey: 'invalid-key',
        sandboxId: 'non-existent'
      };

      const adapter = new {Provider}Adapter(config);
      const info = await adapter.getInfo();

      expect(info).toBeNull();
    });

    it('应该正确跟踪状态', () => {
      const config: {Provider}Config = {
        baseUrl: 'https://api.example.com',
        apiKey: 'test-key',
        sandboxId: 'test-sandbox'
      };

      const adapter = new {Provider}Adapter(config);

      expect(adapter.status.state).toBe('Creating');

      const validStates = [
        'UnExist',
        'Running',
        'Creating',
        'Starting',
        'Stopping',
        'Stopped',
        'Deleting',
        'Error'
      ];
      expect(validStates).toContain(adapter.status.state);
    });
  });

  describe('错误处理', () => {
    it('应该提供有意义的错误消息', () => {
      const connectionError = new ConnectionError(
        '创建沙盒失败',
        'https://api.example.com',
        new Error('网络超时')
      );

      expect(connectionError.message).toContain('创建沙盒失败');
      expect(connectionError.endpoint).toBe('https://api.example.com');
      expect(connectionError.cause).toBeDefined();
    });
  });

  describe('提供商', () => {
    it('应该有唯一的提供商名称', () => {
      const config: {Provider}Config = {
        baseUrl: 'https://api.example.com',
        apiKey: 'test-key',
        sandboxId: 'test-sandbox'
      };

      const adapter = new {Provider}Adapter(config);

      expect(adapter.provider).toBe('{providername}');
      expect(adapter.provider).not.toBe('opensandbox');
      expect(adapter.provider).not.toBe('sealosdevbox');
    });
  });
});
```

### 步骤 6：验证集成

创建所有文件后：

1. **运行类型检查**：`pnpm typecheck`
2. **运行测试**：`pnpm test`
3. **构建项目**：`pnpm build`
4. **验证导出**：检查新适配器是否正确导出

## 实现指南

### 使用 Polyfill 服务

BaseSandboxAdapter 为以下功能提供 polyfill 实现：
- 文件系统操作（readFiles、writeFiles、deleteFiles、moveFiles）
- 目录操作（createDirectories、deleteDirectories、listDirectory）
- 搜索操作（search）
- 健康检查（ping、getMetrics）

这些使用 CommandPolyfillService 执行 shell 命令。在构造函数中初始化它：

```typescript
this.polyfillService = new CommandPolyfillService(this);
```

### 原生 vs Polyfill

当提供商直接支持时，原生实现方法：
- OpenSandbox 有原生的文件系统、指标和流式支持
- SealosDevbox 对大多数操作使用 polyfill

仅当提供商有更好的原生实现时才覆盖 polyfill 方法。

### 错误处理

使用提供的错误类：
- `ConnectionError` - 用于连接和初始化失败
- `CommandExecutionError` - 用于命令执行失败
- `SandboxStateError` - 用于无效的状态转换
- `FeatureNotSupportedError` - 用于不支持的功能
- `TimeoutError` - 用于超时场景

### 状态映射

将提供商特定的状态映射到标准 SandboxState 枚举：
- `'UnExist'` - 沙盒不存在
- `'Creating'` - 正在创建
- `'Starting'` - 正在启动
- `'Running'` - 准备好执行命令
- `'Stopping'` - 正在关闭
- `'Stopped'` - 已暂停/停止
- `'Deleting'` - 正在删除
- `'Error'` - 错误状态

### 命令构建

使用继承的 `buildCommand()` 方法处理工作目录：

```typescript
const cmd = this.buildCommand(command, options?.workingDirectory);
```

这会正确转义路径并将命令包装在 `sh -lc` 中。

## 常见模式

### 模式 1：简单 REST API 提供商

对于具有简单 REST API 的提供商：
1. 创建带有 fetch 调用的 API 客户端类
2. 将 API 响应映射到 ISandbox 类型
3. 对文件系统操作使用 polyfill
4. 实现生命周期和执行方法

示例：SealosDevboxAdapter

### 模式 2：基于 SDK 的提供商

对于具有官方 SDK 的提供商：
1. 直接导入和使用 SDK
2. 在 SDK 提供的地方实现原生方法
3. 仅对不支持的功能使用 polyfill
4. 处理 SDK 特定的错误类型

示例：OpenSandboxAdapter

### 模式 3：功能有限的提供商

对于 API 最少的提供商：
1. 仅实现支持的生命周期方法
2. 对不支持的功能抛出 FeatureNotSupportedError
3. 大量依赖 polyfill 服务
4. 清楚地记录限制

## 测试策略

创建验证以下内容的测试：
1. **初始化** - 正确的提供商名称、初始状态
2. **配置** - 配置验证和默认值
3. **状态管理** - 通过生命周期跟踪状态
4. **错误处理** - 正确的错误类型和消息
5. **类型安全** - TypeScript 类型正确

不要在单元测试中测试实际的 API 调用 - 使用 mock 或集成测试。

## 检查清单

完成前验证：

- [ ] 在 `src/adapters/{Provider}Adapter/index.ts` 中创建适配器类
- [ ] 在 `src/adapters/{Provider}Adapter/type.ts` 中创建类型定义
- [ ] 在 `src/adapters/{Provider}Adapter/api.ts` 中创建 API 客户端（如果需要）
- [ ] 使用新提供商更新 `src/adapters/index.ts`
- [ ] 将环境变量添加到 `.env.test.template`
- [ ] 在 `tests/unit/adapters/{Provider}Adapter.test.ts` 中创建单元测试
- [ ] 所有 TypeScript 类型编译无错误
- [ ] 测试通过
- [ ] 提供商名称小写且唯一
- [ ] 错误处理使用适当的错误类
- [ ] 为公共方法添加文档注释

## 示例交互

**用户**："添加 E2B 沙盒的适配器"

**你**：
1. 询问 E2B API 文档或 SDK 信息
2. 分析 E2B API 结构和能力
3. 创建继承 `BaseSandboxAdapter` 的 `E2BAdapter` 类
4. 为 E2B 特定类型创建类型定义
5. 如果没有 SDK，创建 API 客户端
6. 更新工厂函数和类型联合
7. 将环境变量添加到模板
8. 生成单元测试
9. 验证一切编译且测试通过

**用户**："这是 Modal API 文档：[提供链接或文件]"

**你**：
1. 阅读和分析 Modal 文档
2. 识别认证方法、API 端点和能力
3. 创建完整的适配器实现
4. 生成所有支持文件
5. 集成到项目中
6. 创建全面的测试
7. 验证实现

## 提示

- 对于 REST API 提供商，从更简单的 SealosDevboxAdapter 作为模板开始
- 对于基于 SDK 的提供商，使用 OpenSandboxAdapter 作为参考
- 除非提供商对所有内容都有原生实现，否则始终初始化 polyfillService
- 保持提供商名称小写且简洁
- 记录任何提供商特定的限制或怪癖
- 测试错误场景，而不仅仅是正常路径
