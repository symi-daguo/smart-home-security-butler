# CasaOS + KNXD 对齐检查清单

用于保证 `smart-home-security-butler` 与 `knxd` 在 65 主机部署时保持完全匹配。

## 1. 容器与端口

- `smart-home-butler`：`3000`
- `rs232-knx-knxd`：`3671`（TCP/UDP）

## 2. 必要挂载

`smart-home-butler` 容器必须具备：

- `/DATA/AppData/knx-gateway/.env -> /knxd-gateway/.env`
- `/var/run/docker.sock -> /var/run/docker.sock`
- `./data -> /app/data`

## 3. 必要环境变量

- `KNXD_ENV_PATH=/knxd-gateway/.env`
- `KNXD_HOST=172.17.0.1`
- `KNXD_PORT=3671`
- `KNXD_CONTAINER_NAME=rs232-knx-knxd`
- `KNXD_COLLECTOR_ENABLED=true`

## 4. 接口验证

部署后至少验证以下接口：

- `GET /api/health`：版本与健康状态正常
- `GET /api/knxd/status`：`portOpen=true` 且容器状态非 stopped
- `GET /api/knxd/config`：返回 `envPath=/knxd-gateway/.env`
- `GET /api/casaos/containers`：可读容器状态（依赖 docker.sock）
- `GET /api/knxd/logs`：可读 knxd 日志

## 5. 现场常见偏差

- **偏差 1**：`KNXD_ENV_PATH` 未指向 `/knxd-gateway/.env`  
  结果：Butler 读不到现场 knxd 配置。

- **偏差 2**：未挂载 `docker.sock`  
  结果：容器运维卡片与日志能力失效。

- **偏差 3**：`KNXD_HOST` 写成 `127.0.0.1`  
  结果：bridge 网络下可能无法访问 host 网络 knxd。

## 6. 推荐工作流

1. 只在本仓开发：`codebase-memory-mcp/smart-home-security-butler`
2. 本地 build + API 自测
3. 同步到 65（rsync 或 git pull）
4. 容器重启后按本清单验证
5. 验证通过再提交迭代记录
