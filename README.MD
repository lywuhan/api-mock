# api-mock

一个基于 Mock.js + IndexDB 的本地 Mock 工具，开箱即用，便于前端开发者在本机配置接口并调试页面。

快速命令：

```bash
pnpm install
pnpm run dev    # 同时启动前端与 Mock 服务
```

主要优势：

- 零额外依赖：使用浏览器的 IndexedDB 本地存储，免去单独数据库部署，降低上手门槛；
- 快速上手与即时反馈：前端可在本地配置接口并立即查看结果，节省与后端协调时间；
- 集中管理与共享：避免在每个项目里重复维护 `mock.js`，团队可复用同一套 Mock 服务；
- 持久化场景复现：本地存储保留测试数据，便于回归、演示与多人复现问题；
- 分支与版本一致性：Mock 可与前端分支配套使用，便于回滚与场景测试；


```bash
pnpm add -D nodemon
# 启动（示例）
npx nodemon --watch server --exec "node server/index.js"
```


## 许可证

本项目采用 MIT 许可证（已在仓库根目录添加 `LICENSE` 文件）。请在使用或分发本项目时，保留 `LICENSE` 中的版权与许可声明。



