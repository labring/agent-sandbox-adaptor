# 添加沙盒适配器技能

这个技能帮助你快速为 agent-sandbox-adaptor 项目添加新的沙盒提供商适配器。

## 功能

自动化创建：
- ✅ 适配器类（继承 BaseSandboxAdapter）
- ✅ 类型定义文件
- ✅ API 客户端（如果需要）
- ✅ 单元测试
- ✅ 工厂函数集成
- ✅ 环境变量模板

## 使用方法

只需告诉 Claude 你想添加哪个沙盒提供商：

```
添加 E2B 适配器
```

或者提供更多细节：

```
我需要为 RunPod 添加适配器。RunPod 的 API 文档显示：
- 基础 URL: https://api.runpod.io/v2
- 认证：Bearer token
- 创建沙盒：POST /pods
- 执行命令：POST /pods/{id}/exec
- 状态：CREATED、RUNNING、EXITED
```

或者直接分享文档：

```
这是 Modal Labs 的 API 文档：[文档链接或文件]
```

## 技能会做什么

1. **收集信息** - 询问提供商的 API 结构、认证方式、支持的功能
2. **分析文档** - 理解 API 端点、状态映射、SDK 可用性
3. **生成代码** - 创建适配器类、类型定义、API 客户端
4. **集成项目** - 更新工厂函数、添加环境变量
5. **创建测试** - 生成单元测试确保质量
6. **验证** - 运行类型检查和测试

## 支持的模式

### 模式 1：REST API 提供商
适用于有简单 REST API 的提供商（如 RunPod、E2B）
- 创建 API 客户端类
- 使用 polyfill 处理文件系统
- 实现基本生命周期

### 模式 2：SDK 提供商
适用于有官方 SDK 的提供商（如 Modal Labs、OpenSandbox）
- 直接使用 SDK
- 原生实现支持的功能
- 最小化 polyfill 使用

### 模式 3：功能有限提供商
适用于 API 功能较少的提供商
- 实现支持的方法
- 对不支持的功能抛出错误
- 大量使用 polyfill

## 示例

### 示例 1：简单 REST API

**输入：**
```
添加 E2B 沙盒支持，API 地址 https://api.e2b.dev，
使用 API key 认证，支持创建、执行命令、删除
```

**输出：**
- `src/adapters/E2BAdapter/index.ts` - 适配器实现
- `src/adapters/E2BAdapter/type.ts` - 类型定义
- `src/adapters/E2BAdapter/api.ts` - API 客户端
- `tests/unit/adapters/E2BAdapter.test.ts` - 测试
- 更新的 `src/adapters/index.ts`
- 更新的 `.env.test.template`

### 示例 2：SDK 集成

**输入：**
```
添加 Modal Labs 适配器，他们有 @modal-labs/client SDK，
支持命令执行、文件系统、指标
```

**输出：**
- 使用 SDK 的适配器实现
- 原生方法实现（不用 polyfill）
- SDK 错误处理
- 完整的测试覆盖

## 测试用例

项目包含 4 个测试用例：
1. E2B - REST API 模式
2. Modal Labs - SDK 集成模式
3. RunPod - 功能有限模式（中文）
4. Gitpod - 工作区映射模式

运行测试：
```bash
cd .claude/skills/add-sandbox-adapter-workspace/iteration-1
# 查看测试结果
```

## 文件结构

```
.claude/skills/add-sandbox-adapter/
├── SKILL.md                    # 技能文档（中文）
├── README.md                   # 本文件
├── evals/
│   └── evals.json             # 测试用例
└── add-sandbox-adapter-workspace/
    └── iteration-1/           # 测试运行结果
        ├── eval-1/            # E2B 测试
        ├── eval-2/            # Modal Labs 测试
        ├── eval-3/            # RunPod 测试
        └── eval-4/            # Gitpod 测试
```

## 注意事项

- 技能会自动识别中文输入并保留中文注释
- 生成的代码遵循项目现有模式
- 所有代码都会进行类型检查和测试
- 提供商名称会自动转换为小写

## 下一步

现在你可以：
1. 尝试添加一个新的沙盒提供商
2. 查看测试结果了解技能效果
3. 根据需要修改生成的代码

祝使用愉快！🚀
