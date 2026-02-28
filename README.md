# @fastgpt/sandbox

A unified, high-level abstraction layer for cloud sandbox providers. It offers a consistent, vendor-agnostic interface for creating, managing, and interacting with sandboxed environments like OpenSandbox.

> This package is ESM-only (`"type": "module"`) and requires Node.js **>= 20**.

## 安装

```bash
pnpm add @fastgpt/sandbox
```

## 用途

### 1. 操作沙盒

1. 执行命令：执行命令并返回结果
   1. Create 接口：成功返回，则认为沙盒已创建成功，可以执行命令。
   2. 执行
2. 下载文件。

### 2. 管理沙盒

1. 定期暂停：每 n 分钟不活跃则暂停
2. 定期销毁：每 n 分钟不活跃则销毁


## 添加新适配器