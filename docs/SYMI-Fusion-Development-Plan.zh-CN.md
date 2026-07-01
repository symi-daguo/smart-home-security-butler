# SYMI Fusion 网关开发方案（归档到 Butler 仓）

> 版本：v1.2  
> 日期：2026-07-01  
> 状态：Phase 1-4（核心项）已完成，Tasmota 融合为可选后续  
> 代码主仓：`smart-home-security-butler`  
> 说明：本文件为原 OpenKNX 侧方案的 Butler 仓归档版本，后续以本仓为唯一维护入口。

---

## 1. 项目边界与单一事实源

- 控制平面统一在 `:3000`（Smart Home Security Butler）。
- KNX 主线统一使用本机 `knxd :3671`，不依赖 62 机房网关在线。
- OpenKNX 仓仅保留硬件与历史文档参考，不再作为应用代码主仓。
- 后续迭代、验证、发布均以本仓为准。

---

## 2. 65 现网部署基线（必须满足）

- 应用：`smart-home-butler`（端口 `3000`）
- KNX：`rs232-knx-knxd`（`3671`）
- 挂载：
  - `/DATA/AppData/knx-gateway/.env -> /knxd-gateway/.env`
  - `/var/run/docker.sock -> /var/run/docker.sock`
- 环境变量：
  - `KNXD_ENV_PATH=/knxd-gateway/.env`
  - `KNXD_HOST=172.17.0.1`
  - `KNXD_PORT=3671`
  - `KNXD_CONTAINER_NAME=rs232-knx-knxd`

---

## 3. 阶段验收总览

## Phase 1（已完成）
- `knxd-collector` 打通，支持配置读取与 3671 健康检测。
- KNX 工作室 Tab1/2（概要 + 网关配置）上线。
- API：`/api/knxd/status`、`/api/knxd/config`（GET/PUT）。

## Phase 2（已完成）
- knxproj 上传解析（ZIP/XML）与 ETS 元数据入库。
- 地址簿 CRUD 与 ETS 设备树展示。
- `/api/knxd/logs` 通过 Docker Socket 获取容器日志。

## Phase 3（已完成）
- AI 工具对齐：`list_scenes`、`activate_scene`、`get_knxd_status`。
- 写操作确认流：`pendingAction` + `/api/ai/confirm`。
- 维护模式开关：开启后写操作可直执。
- 本地路由：安全评分/设备状态/场景列表/knxd 状态优先本地回答。

## Phase 4（核心项已完成）
- CasaOS 运维卡片：容器列表与重启能力。
- 配置备份/还原：SQLite + settings + knxd `.env`。
- Tasmota-ModbusKNX 融合保留为可选后续项。

## Phase 4.1（2026-07-01 验证修正）
- 修复 AI 对“重启容器”请求未进入确认流的问题：
  - 新增 AI 工具：`list_containers`、`restart_container`
  - `restart_container` 纳入写操作确认流（`pendingAction` + `/api/ai/confirm`）
  - 增加本地意图兜底：解析“重启 xxx 容器”并强制走确认流程
- 联机与本地回归结果：
  - `npm test`、`npm run build` 通过
  - `agent-browser` 验证 AI 助手页面出现“确认执行：重启容器 ...”按钮
  - `GET /api/system/backup` 解包包含 `security-butler.db`、`settings.json`、`knx-gateway.env`、`knx-projects/*.knxproj`
  - CasaOS `192.168.2.65` 关键容器在线：`smart-home-butler`、`rs232-knx-knxd`

---

## 4. API 增量（v0.7.0）

- AI：
  - `POST /api/chat`
  - `POST /api/ai/confirm`
- CasaOS 运维：
  - `GET /api/casaos/containers`
  - `POST /api/casaos/containers/:name/restart`
- 备份还原：
  - `GET /api/system/backup`
  - `POST /api/system/restore`

---

## 5. 关于“apk 问题”的结论

- 这里的 `apk` 是 Alpine Linux 包管理器（`apk add`），不是 Android APK。
- J1900 上镜像重建偶发失败可用 `docker cp dist/public` 热更新作为临时方案。
- 该问题不影响本仓源码组织方式，但影响现场完整 build 的稳定性。

---

## 6. 后续协作规范（建议固定）

- 只在本仓开发、验证、提交。
- 每次迭代按顺序执行：开发 -> 65 验证 -> 更新文档 -> git 提交。
- 文档统一沉淀在本仓 `docs/`，避免分散在多仓导致版本漂移。
