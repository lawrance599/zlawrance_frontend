# 后 - 大坝安全监测数据端 API 文档管理系统

本文档为前端开发者提供后端 API 的完整参考，基于 Rust + Axum + PostgreSQL 构建。

## 目录

- [项目概述](#项目概述)
- [技术栈](#技术栈)
- [认证机制](#认证机制)
- [API 端点总览](#api-端点总览)
- [请求/响应格式](#请求响应格式)
- [详细 API 说明](#详细-api-说明)
- [数据模型](#数据模型)
- [注意事项](#注意事项)

---

## 项目概述

这是一个大坝安全监测数据管理后端系统，支持：

- 用户认证（用户名密码 + GitHub OAuth）
- 传感器/测点管理
- 三种监测数据类型（引张线、静力水准、倒垂线）
- 数据统计分析

---

## 技术栈

| 类别     | 技术               |
| -------- | ------------------ |
| 后端框架 | Axum 0.8.8 (Rust)  |
| 数据库   | PostgreSQL 14+     |
| ORM      | SQLx               |
| 认证     | JWT (Bearer Token) |
| 密码加密 | bcrypt             |
| OAuth    | GitHub             |

---

## 认证机制

### JWT 认证

所有需要认证的接口必须在请求头中添加：

```http
Authorization: Bearer <your-jwt-token>
```

### 登录流程

1. **用户名密码登录**: `POST /api/auth/login`
2. **GitHub OAuth 登录**: 重定向到 GitHub 授权，回调获取 token

### Token 获取

- 登录成功返回 token 字符串
- OAuth 回调成功返回 `{ token, user_id, username }`

**示例响应**:

```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user_id": 1,
    "username": "admin"
  }
}
```

---

## API 端点总览

### 认证接口

| 方法 | 路径                                   | 说明                      | 认证 |
| ---- | -------------------------------------- | ------------------------- | ---- |
| POST | `/api/auth/login`                      | 用户登录                  | 否   |
| GET  | `/api/auth/me`                         | 获取当前用户信息          | 是   |
| GET  | `/api/auth/oauth/providers`            | 获取支持的 OAuth Provider | 否   |
| GET  | `/api/auth/oauth/{provider}/authorize` | 重定向到 OAuth 授权页     | 否   |
| GET  | `/api/auth/oauth/{provider}/callback`  | OAuth 回调                | 否   |

### 用户接口

| 方法 | 路径         | 说明     | 认证 |
| ---- | ------------ | -------- | ---- |
| GET  | `/api/users` | 列出用户 | 是   |
| POST | `/api/users` | 创建用户 | 是   |

### 测点/传感器接口

| 方法 | 路径                 | 说明         | 认证 |
| ---- | -------------------- | ------------ | ---- |
| GET  | `/api/points`        | 列出所有测点 | 是   |
| GET  | `/api/points/{code}` | 获取测点详情 | 是   |

### 监测数据接口

| 方法     | 路径                                 | 说明         | 认证 |
| -------- | ------------------------------------ | ------------ | ---- |
| GET/POST | `/api/data/{id}/inverted-plumb-line` | 倒垂线数据   | 是   |
| GET/POST | `/api/data/{id}/extensometer`        | 引张线数据   | 是   |
| GET/POST | `/api/data/{id}/hydrostatic-level`   | 静力水准数据 | 是   |

### 统计接口

| 方法 | 路径                       | 说明             | 认证 |
| ---- | -------------------------- | ---------------- | ---- |
| GET  | `/api/stats/points/{code}` | 获取测点统计信息 | 是   |

---

## 请求/响应格式

### 统一响应格式

所有 API 响应遵循以下格式：

```json
{
  "code": 200,
  "data": { ... }
}
```

- `code`: HTTP 状态码 (如 200, 400, 401, 500)
- `data`: 响应数据

### 分页参数

```http
GET /api/users?limit=20&offset=0
```

| 参数   | 类型    | 默认值 | 说明         |
| ------ | ------- | ------ | ------------ |
| limit  | integer | 20     | 返回数量上限 |
| offset | integer | 0      | 偏移量       |

### 时间范围参数

```http
GET /api/data/{id}/extensometer?start=2024-01-01T00:00:00&end=2024-12-31T23:59:59
```

| 参数  | 格式            | 默认值      | 说明     |
| ----- | --------------- | ----------- | -------- |
| start | RFC3339/ISO8601 | end - 30 天 | 开始时间 |
| end   | RFC3339/ISO8601 | 当前时间    | 结束时间 |

需要注意的是, 数据有一段时间没有更新了, 因此假设你使用默认参数, 一般是获取不到数据。
但是你可以通过访问测点统计信息得到 first_observation 和 last_observation, 一般选取这两个中间的时间段来进行查询。

---

## 详细 API 说明

### 1. 用户登录

**POST** `/api/auth/login`

**请求体**:

```json
{
  "login_type": "username", // 固定填 "username"
  "id": "admin",
  "password": "password123"
}
```

**成功响应** (200):

```json
{
  "code": 200,
  "data": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 2. 获取当前用户信息

**GET** `/api/auth/me`

**请求头**:

```http
Authorization: Bearer <token>
```

**成功响应** (200):

```json
{
  "code": 200,
  "data": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "phone": "13800138000",
    "name": "admin",
    "department": "系统管理"
  }
}
```

---

### 3. GitHub OAuth 登录

#### 步骤 1: 获取可用 Provider

**GET** `/api/auth/oauth/providers`

**成功响应** (200):

```json
{
  "code": 200,
  "data": [{ "id": "github", "name": "GitHub" }]
}
```

#### 步骤 2: 重定向到授权页

**GET** `/api/auth/oauth/github/authorize`

返回 302 重定向到 GitHub 授权页面。

#### 步骤 3: 处理回调

**GET** `/api/auth/oauth/github/callback?code=xxx&state=xxx`

**成功响应** (200):

```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user_id": 2,
    "username": "github_user"
  }
}
```

**失败响应** (如果用户拒绝授权):

```json
{
  "code": 400,
  "data": null
}
```

---

### 4. 获取测点列表

**GET** `/api/points`

**请求头**:

```http
Authorization: Bearer <token>
```

**成功响应** (200):

```json
{
  "code": 200,
  "data": [
    {
      "code": "EX1-2",
      "sensor_type": "EX",
      "height": 153.0,
      "install_date": "2018-05-10",
      "section": "2号坝段",
      "status": 1,
      "updated_at": "2024-01-01T00:00:00"
    },
    ...
  ]
}
```

---

### 5. 获取测点详情

**GET** `/api/points/{code}`

**示例**: `GET /api/points/EX1-2`

**成功响应** (200):

```json
{
  "code": 200,
  "data": {
    "code": "EX1-2",
    "sensor_type": "EX",
    "height": 153.0,
    "install_date": "2018-05-10",
    "section": "2号坝段",
    "status": 1,
    "updated_at": "2024-01-01T00:00:00"
  }
}
```

---

### 6. 获取引张线数据

**GET** `/api/data/{id}/extensometer`

- `{id}` 为传感器编码，如 `EX1-2`

**查询参数**:

- `limit`: 数量上限 (默认 20)
- `offset`: 偏移量 (默认 0)
- `start`: 开始时间
- `end`: 结束时间

**示例**: `GET /api/data/EX1-2/extensometer?limit=100&start=2024-01-01T00:00:00`

**成功响应** (200):

```json
{
  "code": 200,
  "data": [
    {
      "sensor_code": "EX1-2",
      "ob_time": "2024-06-01T08:00:00",
      "reservoir_level": 150.5,
      "value": 0.123
    },
    ...
  ]
}
```

---

### 7. 新增引张线数据

**POST** `/api/data/{id}/extensometer`

**请求体**:

```json
{
  "observation_time": "2024-06-15T10:30:00",
  "reservoir_level": 152.3,
  "value": 0.456
}
```

**成功响应** (201):

```json
{
  "code": 201,
  "data": null
}
```

---

### 8. 获取静力水准数据

**GET** `/api/data/{id}/hydrostatic-level`

**响应格式**:

```json
{
  "code": 200,
  "data": [
    {
      "sensor_code": "TC1-1",
      "ob_time": "2024-06-01T08:00:00",
      "value": 0.789
    }
  ]
}
```

**新增静力水准数据 (POST)**:

```json
{
  "observation_time": "2024-06-15T10:30:00",
  "value": 1.234
}
```

---

### 9. 获取倒垂线数据

**GET** `/api/data/{id}/inverted-plumb-line`

**响应格式**:

```json
{
  "code": 200,
  "data": [
    {
      "sensor_code": "IP1",
      "ob_time": "2024-06-01T08:00:00",
      "reservoir_level": 150.5,
      "lr_value": 0.012,
      "ud_value": -0.005
    }
  ]
}
```

**新增倒垂线数据 (POST)**:

```json
{
  "observation_time": "2024-06-15T10:30:00",
  "reservoir_level": 152.3,
  "lr_value": 0.015,
  "ud_value": -0.003
}
```

---

### 10. 获取测点统计信息

**GET** `/api/stats/points/{code}`

**示例**: `GET /api/stats/points/EX1-2`

**成功响应** (200):

```json
{
  "code": 200,
  "data": {
    "sensor_code": "EX1-2",
    "first_observation": "2024-01-01T08:00:00",
    "last_observation": "2024-12-31T08:00:00",
    "total_records": 3650,
    "max_value": 1.234,
    "min_value": -0.567,
    "max_observation_time": "2024-07-15T14:00:00",
    "min_observation_time": "2024-01-15T06:00:00"
  }
}
```

---

### 11. 用户管理

**GET** `/api/users` - 列出用户
**POST** `/api/users` - 创建用户

**创建用户请求体**:

```json
{
  "username": "newuser",
  "password": "password123",
  "phone": "13900139000",
  "name": "新用户",
  "department": "技术部"
}
```

---

## 数据模型

### 测点 (Sensors)

| 字段         | 类型     | 说明                                                   |
| ------------ | -------- | ------------------------------------------------------ |
| code         | string   | 传感器编码 (主键)，如 `EX1-2`, `TC1-1`, `IP1`          |
| sensor_type  | string   | 传感器类型: `EX`(引张线), `TC`(静力水准), `IP`(倒垂线) |
| height       | float    | 安装高度                                               |
| install_date | date     | 安装日期                                               |
| section      | string   | 所属坝段，如 `2号坝段`, `5号坝段`                      |
| status       | smallint | 状态 (1=正常)                                          |
| updated_at   | datetime | 更新时间                                               |

### 测点统计 (SensorStats)

| 字段                 | 类型     | 说明           |
| -------------------- | -------- | -------------- |
| sensor_code          | string   | 传感器编码     |
| first_observation    | datetime | 首次观测时间   |
| last_observation     | datetime | 最后观测时间   |
| total_records        | integer  | 记录总数       |
| max_value            | float    | 最大值         |
| min_value            | float    | 最小值         |
| max_observation_time | datetime | 最大值出现时间 |
| min_observation_time | datetime | 最小值出现时间 |

### 用户 (User)

| 字段          | 类型     | 说明                    |
| ------------- | -------- | ----------------------- |
| id            | integer  | 用户 ID                 |
| username      | string   | 用户名 (唯一)           |
| role          | string   | 角色: `admin` 或 `user` |
| phone         | string   | 电话 (可选)             |
| name          | string   | 姓名 (可选)             |
| department    | string   | 部门 (可选)             |
| status        | smallint | 状态 (1=正常)           |
| created_at    | datetime | 创建时间                |
| last_login_at | datetime | 最后登录时间            |

### 监测数据

**引张线 (ExtensometerData)**:

- sensor_code: 传感器编码
- observation_time: 观测时间
- reservoir_level: 水库水位 (可选)
- value: 监测值

**静力水准 (HydrostaticLevelData)**:

- sensor_code: 传感器编码
- observation_time: 观测时间
- value: 监测值

**倒垂线 (InvertedPlumbLineData)**:

- sensor_code: 传感器编码
- observation_time: 观测时间
- reservoir_level: 水库水位 (可选)
- lr_value: 左右位移 (可选)
- ud_value: 上下位移 (可选)

---

## 注意事项

### 1. 认证状态

- 大部分接口需要认证（`/api/auth/*` 除外）
- 未认证请求返回 `401 Unauthorized`

### 2. 时间格式

- 所有时间使用 RFC3339 格式: `YYYY-MM-DDTHH:MM:SS`
- 示例: `2024-06-15T10:30:00`

### 3. 传感器编码规则

- **EX**: 引张线传感器，编码如 `EX1-2`, `EX2-3`
- **TC**: 静力水准传感器，编码如 `TC1-1`, `TC3-5`
- **IP**: 倒垂线传感器，编码如 `IP1`, `IP9`

### 4. 错误处理

- 400: 请求参数错误
- 401: 未认证
- 403: 无权限
- 404: 资源不存在
- 500: 服务器内部错误

### 5. 默认分页

- 默认返回 20 条记录
- 默认查询最近 30 天数据

### 6. 传感器数量

- 数据库中预置了 47 个测点数据

---

## 开发环境配置

```env
DATABASE_URL=postgres://yixin:yixin@localhost:5432/test
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

**服务器地址**: `http://127.0.0.1:8080`

---

## 快速开始

1. 使用用户名密码登录获取 token
2. 在后续请求的 Header 中添加 `Authorization: Bearer <token>`
3. 调用各业务 API

### 默认管理员账号

- 用户名: `admin`
- 密码: `password123`
