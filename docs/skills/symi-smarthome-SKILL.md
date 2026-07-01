---
name: "symi-smarthome"
description: "SYMI Smart Home skill profile for Butler-centered deployments."
---

# SYMI Smart Home Skill（Butler 对齐版）

本文件用于在 Butler 仓内归档与维护 `symi-smarthome` 的关键对齐信息，避免技能说明散落到其他仓库。

## 1. 调用入口（推荐）

- 主入口：`http://<host>:3000`
- 主要接口：
  - `POST /api/chat`（自然语言对话）
  - `POST /api/ai/confirm`（写操作确认）
- 维护模式：系统设置开启后，可跳过写操作确认流。

## 2. AI 工具能力（v0.7.0）

- `get_device_status`
- `list_scenes`
- `activate_scene`
- `get_security_score`
- `get_knxd_status`
- `control_device`

## 3. KNX 运行基线

- knxd 监听：`172.17.0.1:3671`
- Butler 读取 knxd 配置：`/knxd-gateway/.env`
- 建议挂载：`/DATA/AppData/knx-gateway/.env -> /knxd-gateway/.env`

## 4. 安全策略

- 默认仅允许本地或受信网络调用。
- 写操作默认二次确认（`pendingAction` + `/api/ai/confirm`）。
- 不在技能文本或脚本中硬编码密钥、token。

## 5. 与历史网关的关系

- 62 机网关仅做历史参考，不作为当前部署必须依赖。
- 生产与验证主线以 CasaOS 65 + Butler 为准。
