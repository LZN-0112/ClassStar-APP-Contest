Read "E:\校园班级事务智能管理助手\back\BACKEND_ARCHITECTURE_DESIGN.md":

     1	# 校园班级事务智能管理助手 — 后端架构设计文档
     2	
     3	> 版本：v1.0  
     4	> 日期：2026-07-07  
     5	> 技术栈：Node.js + NestJS + MySQL 8.0 + Redis + MinIO/OSS  
     6	> 目标：与前端现有页面、交互逻辑、业务规则完全对齐，输出可直接用于编码开发的完整后端设计方案
     7	
     8	---
     9	
    10	## 1. 项目整体分层架构设计方案
    11	
    12	### 1.1 架构分层
    13	
    14	```
    15	┌─────────────────────────────────────────────────────────────┐
    16	│                      客户端层（移动端/Web）                   │
    17	└───────────────────────┬─────────────────────────────────────┘
    18	                        │ HTTPS / RESTful API
    19	┌───────────────────────▼─────────────────────────────────────┐
    20	│                    接入层（Nginx / CDN）                     │
    21	│         SSL终止、静态资源、负载均衡、限流、WAF              │
    22	└───────────────────────┬─────────────────────────────────────┘
    23	                        │
    24	┌───────────────────────▼─────────────────────────────────────┐
    25	│                   应用层（NestJS API）                       │
    26	│  Controller → Service → Repository/DAO → Prisma → MySQL      │
    27	│  Guard / Interceptor / Filter / Pipe / Decorator            │
    28	└───────────────────────┬─────────────────────────────────────┘
    29	                        │
    30	┌───────────────────────▼─────────────────────────────────────┐
    31	│                    数据层                                    │
    32	│  MySQL（主数据）  Redis（缓存/会话/队列）  MinIO/OSS（文件） │
    33	└─────────────────────────────────────────────────────────────┘
    34	```
    35	
    36	### 1.2 分层职责
    37	
    38	| 层级 | 职责 | NestJS 对应 |
    39	|---|---|---|
    40	| Controller | 接收 HTTP 请求，参数校验，调用 Service，返回统一响应 | `@Controller()` |
    41	| Service | 业务逻辑编排，事务控制，权限校验，数据组装 | `@Injectable()` Provider |
    42	| Repository/DAO | 数据访问封装，复杂查询构建 | Prisma Client / Custom Repository |
    43	| Entity/DTO | 数据结构定义，入参校验，出参形状 | Prisma Schema / class-validator DTO |
    44	| Guard | 登录鉴权、班级隔离、操作鉴权 | `@Injectable()` Guard |
    45	| Interceptor | 统一响应包装、日志、性能监控 | `@Injectable()` Interceptor |
    46	| Filter | 全局异常捕获，统一错误响应 | `@Catch()` ExceptionFilter |
    47	| Pipe | 入参转换与校验 | `ValidationPipe` |
    48	
    49	### 1.3 请求流转链路
    50	
    51	```
    52	Client Request
    53	    ↓
    54	Nginx (SSL/限流)
    55	    ↓
    56	NestJS App
    57	    ↓
    58	Global Exception Filter
    59	    ↓
    60	Auth Guard (JWT 校验)
    61	    ↓
    62	Class Isolation Guard (班级隔离)
    63	    ↓
    64	Validation Pipe (DTO 校验)
    65	    ↓
    66	Controller (路由分发)
    67	    ↓
    68	Service (业务逻辑 + 事务)
    69	    ↓
    70	Repository/Prisma (数据访问)
    71	    ↓
    72	MySQL / Redis / MinIO
    73	    ↓
    74	Response Interceptor (统一包装)
    75	    ↓
    76	Client Response
    77	```
    78	
    79	### 1.4 核心设计原则
    80	
    81	1. ** thin controller, fat service**：Controller 只做参数接收和响应返回，业务逻辑下沉到 Service。
    82	2. **统一出入口**：所有接口统一返回格式、统一异常处理、统一分页。
    83	3. **班级数据强隔离**：所有业务查询默认携带 `class_id` 过滤，Service 层从当前登录用户上下文获取 classId。
    84	4. **权限轻量化**：全员基础功能平权，复杂角色拦截简化为操作日志留痕，仅在关键操作（如删除班级、修改他人数据）做简单鉴权。
    85	5. **文件与元数据分离**：文件内容存储 MinIO/OSS，数据库只存元数据和 URL。
    86	
    87	---
    88	
    89	## 2. 12 个业务功能模块完整设计
    90	
    91	> **优先级定义**  
    92	> P0：第一阶段优先开发（核心链路）  
    93	> P1：第二阶段开发（重要业务）  
    94	> P2：第三阶段开发（增强体验）
    95	
    96	---
    97	
    98	### 2.1 认证账号模块（P0）
    99	
   100	#### 2.1.1 前端涉及页面
   101	
   102	| 页面 | 交互逻辑 |
   103	|---|---|
   104	| 启动页 (Launch) | 冷启动展示，判断登录态跳转 |
   105	| 登录页 (Login) | 手机号+密码 / 手机号+验证码双方式登录 |
   106	| 注册页 (Register) | 手机号、验证码、姓名、学号、密码注册 |
   107	| 重置密码页 (ResetPassword) | 手机号验证后重置密码 |
   108	| 身份选择页 (IdentitySelect) | 选择学生身份，进入 JoinClass |
   109	| 加入/创建班级页 (JoinClass) | 创建班级或输入班级码加入 |
   110	
   111	#### 2.1.2 业务规则
   112	
   113	1. **双登录方式**：
   114	   - 密码登录：手机号 + 密码
   115	   - 验证码登录：手机号 + 短信验证码
   116	2. **密码规则**：8-20 位，必须同时包含字母和数字。
   117	3. **注册流程**：手机号 → 短信验证码 → 填写姓名/学号/密码 → 注册成功 → 返回登录页重新登录。
   118	4. **重置密码**：手机号 → 短信验证码 → 设置新密码 → 返回登录页重新登录。
   119	5. **注册成功后不自动登录**，必须重新走登录流程（前端约束）。
   120	6. **Token 策略**：
   121	   - AccessToken：有效期 2 小时，存储在内存/本地
   122	   - RefreshToken：有效期 30 天，存储在 HttpOnly Cookie 或安全本地存储
   123	7. **登录失败锁定**：同一账号连续 5 次密码错误，锁定 15 分钟。
   124	8. **设备绑定**：RefreshToken 记录设备信息与 IP，异常设备登录可强制下线。
   125	
   126	#### 2.1.3 RESTful API 清单
   127	
   128	##### 1. 发送短信验证码
   129	
   130	| 项 | 内容 |
   131	|---|---|
   132	| 请求方式 | POST |
   133	| 接口路径 | `/auth/sms-code` |
   134	| 说明 | 发送短信验证码，支持注册/登录/重置密码 |
   135	
   136	**请求入参：**
   137	
   138	| 字段 | 类型 | 必填 | 说明 |
   139	|---|---|---|---|
   140	| phone | string | 是 | 手机号，11 位 |
   141	| scene | string | 是 | 场景：`register`/`login`/`reset-password` |
   142	
   143	**成功响应：**
   144	
   145	```json
   146	{
   147	  "code": 0,
   148	  "message": "验证码已发送",
   149	  "data": { "expireSeconds": 300 }
   150	}
   151	```
   152	
   153	**失败响应：**
   154	
   155	```json
   156	{
   157	  "code": 1001,
   158	  "message": "发送过于频繁，请 60 秒后重试"
   159	}
   160	```
   161	
   162	##### 2. 用户注册
   163	
   164	| 项 | 内容 |
   165	|---|---|
   166	| 请求方式 | POST |
   167	| 接口路径 | `/auth/register` |
   168	| 说明 | 新用户注册 |
   169	
   170	**请求入参：**
   171	
   172	| 字段 | 类型 | 必填 | 说明 |
   173	|---|---|---|---|
   174	| phone | string | 是 | 手机号 |
   175	| smsCode | string | 是 | 短信验证码 |
   176	| name | string | 是 | 姓名，2-20 字符 |
   177	| studentId | string | 否 | 学号 |
   178	| password | string | 是 | 密码 |
   179	
   180	**成功响应：**
   181	
   182	```json
   183	{
   184	  "code": 0,
   185	  "message": "注册成功，请登录",
   186	  "data": { "userId": "uuid" }
   187	}
   188	```
   189	
   190	##### 3. 用户登录
   191	
   192	| 项 | 内容 |
   193	|---|---|
   194	| 请求方式 | POST |
   195	| 接口路径 | `/auth/login` |
   196	| 说明 | 密码或验证码登录 |
   197	
   198	**请求入参：**
   199	
   200	| 字段 | 类型 | 必填 | 说明 |
   201	|---|---|---|---|
   202	| phone | string | 是 | 手机号 |
   203	| loginType | string | 是 | `password` 或 `sms` |
   204	| password | string | 否 | loginType=password 时必填 |
   205	| smsCode | string | 否 | loginType=sms 时必填 |
   206	| deviceId | string | 否 | 设备标识 |
   207	
   208	**成功响应：**
   209	
   210	```json
   211	{
   212	  "code": 0,
   213	  "message": "登录成功",
   214	  "data": {
   215	    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
   216	    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
   217	    "expiresIn": 7200,
   218	    "user": {
   219	      "id": "uuid",
   220	      "name": "张梓涵",
   221	      "phone": "138****1234",
   222	      "avatar": "",
   223	      "role": "班长",
   224	      "classId": "uuid",
   225	      "className": "计算机2301班"
   226	    }
   227	  }
   228	}
   229	```
   230	
   231	##### 4. 刷新 Token
   232	
   233	| 项 | 内容 |
   234	|---|---|
   235	| 请求方式 | POST |
   236	| 接口路径 | `/auth/refresh` |
   237	| 说明 | 使用 RefreshToken 换取新的 AccessToken |
   238	
   239	**请求入参：**
   240	
   241	| 字段 | 类型 | 必填 | 说明 |
   242	|---|---|---|---|
   243	| refreshToken | string | 是 | RefreshToken |
   244	
   245	**成功响应：**
   246	
   247	```json
   248	{
   249	  "code": 0,
   250	  "message": "刷新成功",
   251	  "data": {
   252	    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
   253	    "expiresIn": 7200
   254	  }
   255	}
   256	```
   257	
   258	##### 5. 重置密码
   259	
   260	| 项 | 内容 |
   261	|---|---|
   262	| 请求方式 | POST |
   263	| 接口路径 | `/auth/reset-password` |
   264	| 说明 | 忘记密码后重置 |
   265	
   266	**请求入参：**
   267	
   268	| 字段 | 类型 | 必填 | 说明 |
   269	|---|---|---|---|
   270	| phone | string | 是 | 手机号 |
   271	| smsCode | string | 是 | 短信验证码 |
   272	| newPassword | string | 是 | 新密码 |
   273	
   274	**成功响应：**
   275	
   276	```json
   277	{
   278	  "code": 0,
   279	  "message": "密码重置成功，请重新登录",
   280	  "data": null
   281	}
   282	```
   283	
   284	##### 6. 退出登录
   285	
   286	| 项 | 内容 |
   287	|---|---|
   288	| 请求方式 | POST |
   289	| 接口路径 | `/auth/logout` |
   290	| 说明 | 注销当前设备 Token |
   291	
   292	**成功响应：**
   293	
   294	```json
   295	{
   296	  "code": 0,
   297	  "message": "退出成功",
   298	  "data": null
   299	}
   300	```
   301	
   302	##### 7. 获取当前用户信息
   303	
   304	| 项 | 内容 |
   305	|---|---|
   306	| 请求方式 | GET |
   307	| 接口路径 | `/auth/me` |
   308	| 说明 | 获取当前登录用户基本信息 |
   309	
   310	**成功响应：**
   311	
   312	```json
   313	{
   314	  "code": 0,
   315	  "message": "success",
   316	  "data": {
   317	    "id": "uuid",
   318	    "name": "张梓涵",
   319	    "phone": "138****1234",
   320	    "avatar": "",
   321	    "studentId": "2023010001",
   322	    "role": "班长",
   323	    "classId": "uuid",
   324	    "className": "计算机2301班",
   325	    "isCommittee": true
   326	  }
   327	}
   328	```
   329	
   330	#### 2.1.4 数据库表设计
   331	
   332	**`users` 用户基础信息表**
   333	
   334	| 字段 | 类型 | 约束 | 说明 |
   335	|---|---|---|---|
   336	| id | CHAR(36) | PK | 用户唯一标识 |
   337	| name | VARCHAR(50) | NOT NULL | 姓名 |
   338	| phone | VARCHAR(20) | UNIQUE, NOT NULL | 手机号 |
   339	| student_id | VARCHAR(30) | INDEX | 学号 |
   340	| avatar | VARCHAR(255) | | 头像 URL |
   341	| password_hash | VARCHAR(255) | NOT NULL | bcrypt 密码哈希 |
   342	| status | TINYINT(1) | DEFAULT 1 | 0=禁用, 1=正常 |
   343	| created_at | DATETIME(3) | DEFAULT NOW | 创建时间 |
   344	| updated_at | DATETIME(3) | ON UPDATE | 更新时间 |
   345	
   346	**`user_auths` 用户认证方式表**
   347	
   348	| 字段 | 类型 | 约束 | 说明 |
   349	|---|---|---|---|
   350	| id | CHAR(36) | PK | |
   351	| user_id | CHAR(36) | FK → users | |
   352	| auth_type | VARCHAR(20) | NOT NULL | password/wechat/qq |
   353	| identifier | VARCHAR(100) | NOT NULL | 手机号/openid |
   354	| credential | VARCHAR(255) | | 密码哈希或 token |
   355	| created_at | DATETIME(3) | | |
   356	| updated_at | DATETIME(3) | | |
   357	
   358	**`refresh_tokens` RefreshToken 表**
   359	
   360	| 字段 | 类型 | 约束 | 说明 |
   361	|---|---|---|---|
   362	| id | CHAR(36) | PK | |
   363	| user_id | CHAR(36) | FK → users | |
   364	| token_hash | VARCHAR(255) | UNIQUE | Token 哈希 |
   365	| device_info | VARCHAR(255) | | 设备信息 |
   366	| ip_address | VARCHAR(45) | | IP |
   367	| expires_at | DATETIME(3) | NOT NULL | 过期时间 |
   368	| revoked_at | DATETIME(3) | | 吊销时间 |
   369	| created_at | DATETIME(3) | | |
   370	
   371	**`sms_codes` 短信验证码表**
   372	
   373	| 字段 | 类型 | 约束 | 说明 |
   374	|---|---|---|---|
   375	| id | CHAR(36) | PK | |
   376	| phone | VARCHAR(20) | INDEX | 手机号 |
   377	| scene | VARCHAR(20) | | 场景 |
   378	| code | VARCHAR(10) | | 验证码 |
   379	| used | TINYINT(1) | DEFAULT 0 | 是否已使用 |
   380	| expires_at | DATETIME(3) | | 过期时间 |
   381	| created_at | DATETIME(3) | | |
   382	
   383	#### 2.1.5 第三方集成
   384	
   385	- **短信验证码**：阿里云短信 / 腾讯云短信，按场景发送，5 分钟有效，60 秒防重发。
   386	
   387	---
   388	
   389	### 2.2 班级成员模块（P0）
   390	
   391	#### 2.2.1 前端涉及页面
   392	
   393	| 页面 | 交互逻辑 |
   394	|---|---|
   395	| 加入/创建班级页 (JoinClass) | 创建班级生成班级码和二维码；输入班级码加入 |
   396	| 班级首页 (ClassHome) | 展示班级信息、成员数、快捷入口 |
   397	| 成员列表页 (MemberList) | 展示班级成员，支持搜索 |
   398	| 成员详情页 (MemberDetail) | 查看成员个人信息、考勤/作业/缴费汇总 |
   399	| 班委管理页 (CommitteeManage) | 添加/移除班委、自定义角色 |
   400	| 班委交接页 (Handover) | 班委职责交接 |
   401	| 导入学生名单页 (ImportStudents) | Excel/教务系统/QQ/微信群导入 |
   402	
   403	#### 2.2.2 业务规则
   404	
   405	1. 一个班级对应一个数字码 `code`（6-8 位），唯一且不可变。
   406	2. 创建班级者自动成为该班级成员，默认角色「班长」。
   407	3. 加入班级：通过数字码或扫描二维码（二维码含班级 ID）。
   408	4. 班级数据强隔离：所有业务接口必须校验当前用户属于该班级。
   409	5. 成员列表支持按姓名、学号搜索。
   410	6. 班委角色可自定义，权限弱化，主要做操作日志留痕。
   411	7. 导入学生名单支持：
   412	   - Excel 文件导入（.xlsx/.xls）
   413	   - 教务系统接口同步
   414	   - QQ/微信群文本粘贴解析
   415	8. 导入时根据学号/手机号去重，已存在用户关联，不存在用户创建占位账号。
   416	9. 班委交接：记录交接日志，更新 class_members 角色。
   417	
   418	#### 2.2.3 RESTful API 清单
   419	
   420	##### 1. 创建班级
   421	
   422	| 项 | 内容 |
   423	|---|---|
   424	| 请求方式 | POST |
   425	| 接口路径 | `/classes` |
   426	
   427	**请求入参：**
   428	
   429	| 字段 | 类型 | 必填 | 说明 |
   430	|---|---|---|---|
   431	| name | string | 是 | 班级名称 |
   432	| grade | string | 否 | 年级，如 2023 |
   433	| major | string | 否 | 专业 |
   434	
   435	**成功响应：**
   436	
   437	```json
   438	{
   439	  "code": 0,
   440	  "message": "创建成功",
   441	  "data": {
   442	    "id": "uuid",
   443	    "name": "计算机2301班",
   444	    "code": "23010001",
   445	    "qrCodeUrl": "https://minio/qr/xxx.png"
   446	  }
   447	}
   448	```
   449	
   450	##### 2. 加入班级
   451	
   452	| 项 | 内容 |
   453	|---|---|
   454	| 请求方式 | POST |
   455	| 接口路径 | `/classes/join` |
   456	
   457	**请求入参：**
   458	
   459	| 字段 | 类型 | 必填 | 说明 |
   460	|---|---|---|---|
   461	| code | string | 否 | 班级数字码（code 和 classId 二选一） |
   462	| classId | string | 否 | 班级 ID（扫码加入时用） |
   463	
   464	##### 3. 获取班级信息
   465	
   466	| 项 | 内容 |
   467	|---|---|
   468	| 请求方式 | GET |
   469	| 接口路径 | `/classes/:id` |
   470	
   471	##### 4. 获取成员列表
   472	
   473	| 项 | 内容 |
   474	|---|---|
   475	| 请求方式 | GET |
   476	| 接口路径 | `/classes/:id/members` |
   477	
   478	**请求入参（Query）：**
   479	
   480	| 字段 | 类型 | 必填 | 说明 |
   481	|---|---|---|---|
   482	| keyword | string | 否 | 姓名/学号搜索 |
   483	| role | string | 否 | 按角色筛选 |
   484	| page | number | 否 | 默认 1 |
   485	| pageSize | number | 否 | 默认 20 |
   486	
   487	##### 5. 获取成员详情
   488	
   489	| 项 | 内容 |
   490	|---|---|
   491	| 请求方式 | GET |
   492	| 接口路径 | `/classes/:id/members/:memberId` |
   493	
   494	##### 6. 导入学生名单
   495	
   496	| 项 | 内容 |
   497	|---|---|
   498	| 请求方式 | POST |
   499	| 接口路径 | `/classes/:id/members/import` |
   500	
   501	**请求入参：**
   502	
   503	| 字段 | 类型 | 必填 | 说明 |
   504	|---|---|---|---|
   505	| importType | string | 是 | `excel`/`edu-system`/`qq-group`/`wechat-group` |
   506	| file | File | 否 | importType=excel 时必填 |
   507	| textContent | string | 否 | importType=qq-group/wechat-group 时必填 |
   508	| eduAuthToken | string | 否 | importType=edu-system 时必填 |
   509	
   510	**成功响应：**
   511	
   512	```json
   513	{
   514	  "code": 0,
   515	  "message": "导入成功",
   516	  "data": {
   517	    "total": 35,
   518	    "success": 35,
   519	    "failed": 0,
   520	    "failedList": []
   521	  }
   522	}
   523	```
   524	
   525	##### 7. 添加班委
   526	
   527	| 项 | 内容 |
   528	|---|---|
   529	| 请求方式 | POST |
   530	| 接口路径 | `/classes/:id/committees` |
   531	
   532	**请求入参：**
   533	
   534	| 字段 | 类型 | 必填 | 说明 |
   535	|---|---|---|---|
   536	| userId | string | 是 | 用户 ID |
   537	| role | string | 是 | 角色名称 |
   538	
   539	##### 8. 移除班委
   540	
   541	| 项 | 内容 |
   542	|---|---|
   543	| 请求方式 | DELETE |
   544	| 接口路径 | `/classes/:id/committees/:userId` |
   545	
   546	##### 9. 班委交接
   547	
   548	| 项 | 内容 |
   549	|---|---|
   550	| 请求方式 | POST |
   551	| 接口路径 | `/classes/:id/committees/handover` |
   552	
   553	**请求入参：**
   554	
   555	| 字段 | 类型 | 必填 | 说明 |
   556	|---|---|---|---|
   557	| fromUserId | string | 是 | 原班委用户 ID |
   558	| toUserId | string | 是 | 新班委用户 ID |
   559	| role | string | 是 | 交接角色 |
   560	
   561	##### 10. 创建自定义角色
   562	
   563	| 项 | 内容 |
   564	|---|---|
   565	| 请求方式 | POST |
   566	| 接口路径 | `/classes/:id/roles` |
   567	
   568	**请求入参：**
   569	
   570	| 字段 | 类型 | 必填 | 说明 |
   571	|---|---|---|---|
   572	| roleName | string | 是 | 角色名称 |
   573	| description | string | 否 | 角色描述 |
   574	
   575	#### 2.2.4 数据库表设计
   576	
   577	**`classes` 班级信息表**
   578	
   579	| 字段 | 类型 | 约束 | 说明 |
   580	|---|---|---|---|
   581	| id | CHAR(36) | PK | |
   582	| name | VARCHAR(100) | NOT NULL | 班级名称 |
   583	| code | VARCHAR(20) | UNIQUE | 班级数字码 |
   584	| qr_code_url | VARCHAR(255) | | 二维码 URL |
   585	| creator_id | CHAR(36) | FK → users | 创建者 |
   586	| announcement | TEXT | | 班级公告 |
   587	| status | TINYINT(1) | DEFAULT 1 | 0=解散, 1=正常 |
   588	| created_at | DATETIME(3) | | |
   589	| updated_at | DATETIME(3) | | |
   590	
   591	**`class_members` 班级成员关系表**
   592	
   593	| 字段 | 类型 | 约束 | 说明 |
   594	|---|---|---|---|
   595	| id | CHAR(36) | PK | |
   596	| class_id | CHAR(36) | FK → classes | |
   597	| user_id | CHAR(36) | FK → users | |
   598	| role | VARCHAR(50) | DEFAULT '学生' | 角色 |
   599	| is_committee | TINYINT(1) | DEFAULT 0 | 是否班委 |
   600	| joined_at | DATETIME(3) | | 入班时间 |
   601	| created_at | DATETIME(3) | | |
   602	| updated_at | DATETIME(3) | | |
   603	
   604	**`class_roles` 角色定义表**
   605	
   606	| 字段 | 类型 | 约束 | 说明 |
   607	|---|---|---|---|
   608	| id | CHAR(36) | PK | |
   609	| class_id | CHAR(36) | FK → classes, NULL=系统预设 | |
   610	| role_name | VARCHAR(50) | NOT NULL | 角色名 |
   611	| role_type | VARCHAR(20) | DEFAULT 'custom' | system/custom |
   612	| permissions | JSON | | 权限列表（留痕用） |
   613	| description | VARCHAR(255) | | 描述 |
   614	
   615	**`committee_handovers` 班委交接记录表**
   616	
   617	| 字段 | 类型 | 约束 | 说明 |
   618	|---|---|---|---|
   619	| id | CHAR(36) | PK | |
   620	| class_id | CHAR(36) | FK → classes | |
   621	| role | VARCHAR(50) | | 角色 |
   622	| from_user_id | CHAR(36) | FK → users | |
   623	| to_user_id | CHAR(36) | FK → users | |
   624	| status | VARCHAR(20) | DEFAULT 'completed' | 状态 |
   625	| handed_over_at | DATETIME(3) | | 交接时间 |
   626	| created_at | DATETIME(3) | | |
   627	
   628	#### 2.2.5 第三方集成
   629	
   630	- **Excel 导入**：SheetJS / xlsx 解析，支持 .xlsx/.xls，列映射「学号、姓名、手机号」。
   631	- **教务系统对接**：学校开放接口或模拟登录，获取学生名单。
   632	- **QQ/微信群文本解析**：正则匹配「学号 姓名」「姓名」等格式。
   633	- **二维码生成**：qrcode 库生成班级加入二维码。
   634	
   635	---
   636	
   637	### 2.3 通知消息模块（P0）
   638	
   639	#### 2.3.1 前端涉及页面
   640	
   641	| 页面 | 交互逻辑 |
   642	|---|---|
   643	| 通知首页 (Messages/MessageList) | 消息列表，按类型筛选 |
   644	| 通知详情页 (MessageDetail) | 查看通知详情，签收按钮 |
   645	| 发布通知页 (PublishMessage) | 发布通知，设置签收、再次提醒 |
   646	| 消息统计页 (MessageStats) | 查看发送、已读、签收统计 |
   647	| 互动消息页 (InteractionMessages) | 通知/作业/活动分类筛选 |
   648	
   649	#### 2.3.2 业务规则
   650	
   651	1. 通知类型：`通知`、`作业`、`活动`、`互动`（数据层面保留，展示层已删除互动 Tab）。
   652	2. 发布通知必填：标题、内容、类型。
   653	3. 可设置签收确认，开启后用户需点击「签收」。
   654	4. 可设置发布后再次提醒未读同学的时间间隔（分钟）。
   655	5. 通知详情突出展示时间、地点、内容。
   656	6. 班委可查看已读/未读名单、签收/未签收名单。
   657	7. 已读状态：用户打开详情即标记已读。
   658	8. 签收状态：用户主动点击签收按钮。
   659	9. 支持手动触发再次提醒，向未读用户推送/短信。
   660	10. 支持导出签收名单（Excel）。
   661	
   662	#### 2.3.3 RESTful API 清单
   663	
   664	##### 1. 获取消息列表
   665	
   666	| 项 | 内容 |
   667	|---|---|
   668	| 请求方式 | GET |
   669	| 接口路径 | `/messages` |
   670	
   671	**Query 参数：**
   672	
   673	| 字段 | 类型 | 必填 | 说明 |
   674	|---|---|---|---|
   675	| classId | string | 是 | 班级 ID |
   676	| type | string | 否 | 通知/作业/活动/互动 |
   677	| keyword | string | 否 | 标题搜索 |
   678	| page | number | 否 | 默认 1 |
   679	| pageSize | number | 否 | 默认 20 |
   680	
   681	**成功响应：**
   682	
   683	```json
   684	{
   685	  "code": 0,
   686	  "message": "success",
   687	  "data": {
   688	    "list": [
   689	      {
   690	        "id": "uuid",
   691	        "type": "通知",
   692	        "title": "关于下周班会的通知",
   693	        "preview": "本周五晚7点在教学楼A301召开班会...",
   694	        "time": "10:30",
   695	        "unread": true,
   696	        "requireAck": true,
   697	        "acked": false
   698	      }
   699	    ],
   700	    "pagination": { "page": 1, "pageSize": 20, "total": 100, "hasMore": true }
   701	  }
   702	}
   703	```
   704	
   705	##### 2. 获取消息详情
   706	
   707	| 项 | 内容 |
   708	|---|---|
   709	| 请求方式 | GET |
   710	| 接口路径 | `/messages/:id` |
   711	
   712	##### 3. 发布通知
   713	
   714	| 项 | 内容 |
   715	|---|---|
   716	| 请求方式 | POST |
   717	| 接口路径 | `/messages` |
   718	
   719	**请求入参：**
   720	
   721	| 字段 | 类型 | 必填 | 说明 |
   722	|---|---|---|---|
   723	| classId | string | 是 | 班级 ID |
   724	| type | string | 是 | 通知类型 |
   725	| title | string | 是 | 标题 |
   726	| content | string | 是 | 内容 |
   727	| location | string | 否 | 地点 |
   728	| eventTime | string | 否 | 事件时间 ISO8601 |
   729	| requireAck | boolean | 否 | 是否需签收 |
   730	| reminderInterval | number | 否 | 再次提醒间隔分钟数 |
   731	| scope | array | 否 | 指定接收人 userId，空=全班 |
   732	| attachments | array | 否 | 附件 URL 列表 |
   733	
   734	##### 4. 标记已读
   735	
   736	| 项 | 内容 |
   737	|---|---|
   738	| 请求方式 | PUT |
   739	| 接口路径 | `/messages/:id/read` |
   740	
   741	##### 5. 签收通知
   742	
   743	| 项 | 内容 |
   744	|---|---|
   745	| 请求方式 | POST |
   746	| 接口路径 | `/messages/:id/ack` |
   747	
   748	##### 6. 获取签收统计
   749	
   750	| 项 | 内容 |
   751	|---|---|
   752	| 请求方式 | GET |
   753	| 接口路径 | `/messages/:id/ack-stats` |
   754	
   755	**成功响应：**
   756	
   757	```json
   758	{
   759	  "code": 0,
   760	  "message": "success",
   761	  "data": {
   762	    "total": 35,
   763	    "acked": 20,
   764	    "unacked": 15,
   765	    "ackedList": [{ "userId": "", "name": "", "ackedAt": "" }],
   766	    "unackedList": [{ "userId": "", "name": "" }]
   767	  }
   768	}
   769	```
   770	
   771	##### 7. 再次提醒未读用户
   772	
   773	| 项 | 内容 |
   774	|---|---|
   775	| 请求方式 | POST |
   776	| 接口路径 | `/messages/:id/remind` |
   777	
   778	##### 8. 导出签收名单
   779	
   780	| 项 | 内容 |
   781	|---|---|
   782	| 请求方式 | GET |
   783	| 接口路径 | `/messages/:id/ack-export` |
   784	
   785	**成功响应：** 返回 Excel 文件下载 URL。
   786	
   787	#### 2.3.4 数据库表设计
   788	
   789	**`messages` 通知主表**
   790	
   791	| 字段 | 类型 | 约束 | 说明 |
   792	|---|---|---|---|
   793	| id | CHAR(36) | PK | |
   794	| class_id | CHAR(36) | FK → classes, INDEX | |
   795	| publisher_id | CHAR(36) | FK → users | 发布人 |
   796	| type | VARCHAR(20) | NOT NULL | 通知/作业/活动/互动 |
   797	| title | VARCHAR(200) | NOT NULL | 标题 |
   798	| content | TEXT | NOT NULL | 内容 |
   799	| location | VARCHAR(200) | | 地点 |
   800	| event_time | DATETIME(3) | | 事件时间 |
   801	| require_ack | TINYINT(1) | DEFAULT 0 | 是否需签收 |
   802	| reminder_interval | INT | | 再次提醒间隔（分钟） |
   803	| scope | JSON | | 指定接收人 |
   804	| status | VARCHAR(20) | DEFAULT 'published' | published/draft/deleted |
   805	| created_at | DATETIME(3) | | |
   806	| updated_at | DATETIME(3) | | |
   807	
   808	**`message_reads` 消息已读记录表**
   809	
   810	| 字段 | 类型 | 约束 | 说明 |
   811	|---|---|---|---|
   812	| id | CHAR(36) | PK | |
   813	| message_id | CHAR(36) | FK → messages | |
   814	| user_id | CHAR(36) | FK → users | |
   815	| read_at | DATETIME(3) | | |
   816	
   817	**`message_acks` 通知签收记录表**
   818	
   819	| 字段 | 类型 | 约束 | 说明 |
   820	|---|---|---|---|
   821	| id | CHAR(36) | PK | |
   822	| message_id | CHAR(36) | FK → messages | |
   823	| user_id | CHAR(36) | FK → users | |
   824	| acked_at | DATETIME(3) | | |
   825	
   826	**`message_reminders` 再次提醒任务表**
   827	
   828	| 字段 | 类型 | 约束 | 说明 |
   829	|---|---|---|---|
   830	| id | CHAR(36) | PK | |
   831	| message_id | CHAR(36) | FK → messages | |
   832	| remind_at | DATETIME(3) | | 提醒时间 |
   833	| status | VARCHAR(20) | DEFAULT 'pending' | pending/sent/cancelled |
   834	
   835	#### 2.3.5 第三方集成
   836	
   837	- **消息推送**：极光推送/个推，向未读用户发送提醒。
   838	- **短信提醒**：对未开启推送的用户 fallback 短信。
   839	- **Excel 导出**：导出签收名单。
   840	
   841	---
   842	
   843	### 2.4 作业模块（P0）
   844	
   845	#### 2.4.1 前端涉及页面
   846	
   847	| 页面 | 交互逻辑 |
   848	|---|---|
   849	| 作业列表页 (HomeworkList) | 展示作业列表，学委可见「离线核对」入口 |
   850	| 发布作业页 (PublishHomework) | 班委发布作业 |
   851	| 作业详情页 (HomeworkDetail) | 查看作业详情、提交统计 |
   852	| 提交作业页 (HomeworkSubmit) | 学生提交作业及附件 |
   853	| 我的作业页 (MyHomework) | 学生查看待提交/已提交/已逾期 |
   854	| 延时申请页 (DelayApply) | 学生申请延时提交 |
   855	| 离线核对首页 (OfflineCheckHome) | 选择核对方式 |
   856	| 批量核对页 (BatchCheck) | 批量勾选已交学生 |
   857	| 截图核对页 (ScreenshotCheck) | 上传截图 OCR 识别 |
   858	| 核对结果页 (CheckResult) | 展示已交/未交名单 |
   859	
   860	#### 2.4.2 业务规则
   861	
   862	1. 作业状态由 deadline 自动计算：
   863	   - 当前时间 < deadline：`进行中`
   864	   - 当前时间 ≥ deadline：`已截止`
   865	2. 学生我的作业状态：
   866	   - 未提交且未逾期：`待提交`
   867	   - 已提交：`已提交`
   868	   - 未提交且已逾期：`已逾期`
   869	3. 学生可提交作业，支持附件上传。
   870	4. 学生可在 deadline 前申请延时，班委审批。
   871	5. 学委可发布作业、查看提交统计、批量导出作业文件。
   872	6. 离线核对支持：
   873	   - 批量核对：手动勾选已交学生
   874	   - 截图核对：上传名单截图，OCR 识别学号/姓名
   875	7. 核对结果生成已交/未交名单，支持导出。
   876	8. 作业附件统一走 MinIO/OSS。
   877	
   878	#### 2.4.3 RESTful API 清单
   879	
   880	##### 1. 获取作业列表
   881	
   882	| 项 | 内容 |
   883	|---|---|
   884	| 请求方式 | GET |
   885	| 接口路径 | `/homework` |
   886	
   887	**Query 参数：**
   888	
   889	| 字段 | 类型 | 必填 | 说明 |
   890	|---|---|---|---|
   891	| classId | string | 是 | |
   892	| status | string | 否 | `ongoing`/`ended` |
   893	| page | number | 否 | |
   894	| pageSize | number | 否 | |
   895	
   896	##### 2. 发布作业
   897	
   898	| 项 | 内容 |
   899	|---|---|
   900	| 请求方式 | POST |
   901	| 接口路径 | `/homework` |
   902	
   903	**请求入参：**
   904	
   905	| 字段 | 类型 | 必填 | 说明 |
   906	|---|---|---|---|
   907	| classId | string | 是 | |
   908	| title | string | 是 | 作业标题 |
   909	| subject | string | 否 | 科目 |
   910	| content | string | 是 | 作业内容 |
   911	| deadline | string | 是 | ISO8601 截止时间 |
   912	| attachments | array | 否 | 附件 URL 列表 |
   913	
   914	##### 3. 获取作业详情
   915	
   916	| 项 | 内容 |
   917	|---|---|
   918	| 请求方式 | GET |
   919	| 接口路径 | `/homework/:id` |
   920	
   921	##### 4. 提交作业
   922	
   923	| 项 | 内容 |
   924	|---|---|
   925	| 请求方式 | POST |
   926	| 接口路径 | `/homework/:id/submissions` |
   927	
   928	**请求入参：**
   929	
   930	| 字段 | 类型 | 必填 | 说明 |
   931	|---|---|---|---|
   932	| content | string | 否 | 文字内容 |
   933	| attachments | array | 否 | 附件 URL 列表 |
   934	
   935	##### 5. 获取提交列表
   936	
   937	| 项 | 内容 |
   938	|---|---|
   939	| 请求方式 | GET |
   940	| 接口路径 | `/homework/:id/submissions` |
   941	
   942	##### 6. 申请延时
   943	
   944	| 项 | 内容 |
   945	|---|---|
   946	| 请求方式 | POST |
   947	| 接口路径 | `/homework/:id/delay` |
   948	
   949	**请求入参：**
   950	
   951	| 字段 | 类型 | 必填 | 说明 |
   952	|---|---|---|---|
   953	| reason | string | 是 | 申请原因 |
   954	| expectedDeadline | string | 是 | 期望截止时间 |
   955	
   956	##### 7. 审批延时
   957	
   958	| 项 | 内容 |
   959	|---|---|
   960	| 请求方式 | PUT |
   961	| 接口路径 | `/homework/:id/delay/:delayId` |
   962	
   963	**请求入参：**
   964	
   965	| 字段 | 类型 | 必填 | 说明 |
   966	|---|---|---|---|
   967	| status | string | 是 | `approved`/`rejected` |
   968	
   969	##### 8. 离线核对—批量核对
   970	
   971	| 项 | 内容 |
   972	|---|---|
   973	| 请求方式 | POST |
   974	| 接口路径 | `/homework/:id/offline-check/batch` |
   975	
   976	**请求入参：**
   977	
   978	| 字段 | 类型 | 必填 | 说明 |
   979	|---|---|---|---|
   980	| submittedStudentIds | array | 是 | 已交学生 userId 列表 |
   981	
   982	##### 9. 离线核对—截图识别
   983	
   984	| 项 | 内容 |
   985	|---|---|
   986	| 请求方式 | POST |
   987	| 接口路径 | `/homework/:id/offline-check/screenshot` |
   988	
   989	**请求入参：**
   990	
   991	| 字段 | 类型 | 必填 | 说明 |
   992	|---|---|---|---|
   993	| imageUrl | string | 是 | 截图 URL |
   994	
   995	**成功响应：**
   996	
   997	```json
   998	{
   999	  "code": 0,
  1000	  "message": "识别成功",
  1001	  "data": {
  1002	    "recognizedStudents": [{ "studentId": "", "name": "" }],
  1003	    "unrecognizedTexts": []
  1004	  }
  1005	}
  1006	```
  1007	
  1008	##### 10. 获取核对结果
  1009	
  1010	| 项 | 内容 |
  1011	|---|---|
  1012	| 请求方式 | GET |
  1013	| 接口路径 | `/homework/:id/check-result` |
  1014	
  1015	##### 11. 批量导出作业文件
  1016	
  1017	| 项 | 内容 |
  1018	|---|---|
  1019	| 请求方式 | POST |
  1020	| 接口路径 | `/homework/:id/export-submissions` |
  1021	
  1022	**成功响应：** 返回异步任务 ID 或下载 URL。
  1023	
  1024	#### 2.4.4 数据库表设计
  1025	
  1026	**`homeworks` 作业主表**
  1027	
  1028	| 字段 | 类型 | 约束 | 说明 |
  1029	|---|---|---|---|
  1030	| id | CHAR(36) | PK | |
  1031	| class_id | CHAR(36) | FK → classes | |
  1032	| publisher_id | CHAR(36) | FK → users | 发布人 |
  1033	| title | VARCHAR(200) | NOT NULL | 标题 |
  1034	| subject | VARCHAR(100) | | 科目 |
  1035	| content | TEXT | | 内容 |
  1036	| deadline | DATETIME(3) | NOT NULL | 截止时间 |
  1037	| attachments | JSON | | 附件列表 |
  1038	| status | VARCHAR(20) | DEFAULT 'published' | published/draft/deleted |
  1039	| created_at | DATETIME(3) | | |
  1040	| updated_at | DATETIME(3) | | |
  1041	
  1042	**`homework_submissions` 作业提交记录表**
  1043	
  1044	| 字段 | 类型 | 约束 | 说明 |
  1045	|---|---|---|---|
  1046	| id | CHAR(36) | PK | |
  1047	| homework_id | CHAR(36) | FK → homeworks | |
  1048	| student_id | CHAR(36) | FK → users | |
  1049	| content | TEXT | | 文字内容 |
  1050	| attachments | JSON | | 附件列表 |
  1051	| status | VARCHAR(20) | DEFAULT 'submitted' | submitted/returned |
  1052	| submitted_at | DATETIME(3) | | |
  1053	| updated_at | DATETIME(3) | | |
  1054	
  1055	**`homework_delay_applications` 作业延时申请表**
  1056	
  1057	| 字段 | 类型 | 约束 | 说明 |
  1058	|---|---|---|---|
  1059	| id | CHAR(36) | PK | |
  1060	| homework_id | CHAR(36) | FK → homeworks | |
  1061	| student_id | CHAR(36) | FK → users | |
  1062	| reason | TEXT | | 原因 |
  1063	| expected_deadline | DATETIME(3) | | 期望截止时间 |
  1064	| status | VARCHAR(20) | DEFAULT 'pending' | pending/approved/rejected |
  1065	| reviewed_by | CHAR(36) | FK → users | 审批人 |
  1066	| reviewed_at | DATETIME(3) | | |
  1067	
  1068	**`homework_offline_checks` 离线作业核对记录表**
  1069	
  1070	| 字段 | 类型 | 约束 | 说明 |
  1071	|---|---|---|---|
  1072	| id | CHAR(36) | PK | |
  1073	| homework_id | CHAR(36) | FK → homeworks | |
  1074	| checked_by | CHAR(36) | FK → users | 核对人 |
  1075	| submitted_count | INT | | 已交人数 |
  1076	| total_count | INT | | 总人数 |
  1077	| check_type | VARCHAR(20) | | batch/screenshot |
  1078	| checked_at | DATETIME(3) | | |
  1079	
  1080	**`homework_offline_check_details` 离线核对明细表**
  1081	
  1082	| 字段 | 类型 | 约束 | 说明 |
  1083	|---|---|---|---|
  1084	| id | CHAR(36) | PK | |
  1085	| check_id | CHAR(36) | FK → homework_offline_checks | |
  1086	| student_id | CHAR(36) | FK → users | |
  1087	| status | VARCHAR(20) | DEFAULT 'submitted' | submitted/missing |
  1088	
  1089	#### 2.4.5 第三方集成
  1090	
  1091	- **MinIO/OSS**：作业附件、截图上传。
  1092	- **OCR 识别**：腾讯云 OCR / 百度 OCR，识别截图中的学号姓名。
  1093	- **Excel 导出**：导出核对结果、作业提交列表。
  1094	
  1095	---
  1096	
  1097	### 2.5 考勤签到模块（P0）
  1098	
  1099	#### 2.5.1 前端涉及页面
  1100	
  1101	| 页面 | 交互逻辑 |
  1102	|---|---|
  1103	| 考勤列表页 (AttendanceList) | 展示历史考勤 |
  1104	| 发布考勤页 (PublishAttendance) | 班委发布考勤，选择签到模式 |
  1105	| 考勤详情页 (AttendanceDetail) | 查看考勤统计 |
  1106	| 签到页 (CheckIn) | 学生签到 |
  1107	| 签到方式页 (CheckInMethod) | 选择定位/二维码/水印拍照/口令 |
  1108	| 请假申请页 (LeaveApply) | 学生提交请假 |
  1109	| 请假审批页 (LeaveApproval) | 班委审批请假 |
  1110	| 考勤报告页 (AttendanceReport) | 出勤率统计 |
  1111	
  1112	#### 2.5.2 业务规则
  1113	
  1114	1. **四种签到模式**：
  1115	   - **定位签到**：学生在指定地点范围内签到（默认 100-500 米）。
  1116	   - **二维码签到**：班委展示动态二维码，学生扫码，二维码含一次性 token。
  1117	   - **水印拍照签到**：学生拍摄带时间地点水印的照片上传，防代签。
  1118	   - **口令签到**：班委公布签到口令，学生输入正确口令签到。
  1119	2. 考勤状态：`open`（进行中）、`closed`（已结束）、`cancelled`（已取消）。
  1120	3. 学生签到记录状态：`present`（出勤）、`leave`（请假）、`absent`（缺勤）、`late`（迟到）。
  1121	4. 防代签校验：
  1122	   - 定位：校验距离、设备指纹
  1123	   - 二维码：一次性 token，5 分钟过期
  1124	   - 水印拍照：OCR 识别水印时间地点，人脸识别（可选）
  1125	   - 口令：班委端生成随机 4-6 位数字/字母
  1126	5. 学生可在考勤结束前提交请假申请，班委审批。
  1127	6. 考勤结束后自动生成统计报告。
  1128	
  1129	#### 2.5.3 RESTful API 清单
  1130	
  1131	##### 1. 获取考勤列表
  1132	
  1133	| 项 | 内容 |
  1134	|---|---|
  1135	| 请求方式 | GET |
  1136	| 接口路径 | `/attendances` |
  1137	
  1138	**Query 参数：** classId, status, page, pageSize
  1139	
  1140	##### 2. 发布考勤
  1141	
  1142	| 项 | 内容 |
  1143	|---|---|
  1144	| 请求方式 | POST |
  1145	| 接口路径 | `/attendances` |
  1146	
  1147	**请求入参：**
  1148	
  1149	| 字段 | 类型 | 必填 | 说明 |
  1150	|---|---|---|---|
  1151	| classId | string | 是 | |
  1152	| title | string | 是 | 考勤标题 |
  1153	| type | string | 否 | 班会考勤/团课考勤/早操考勤 |
  1154	| startTime | string | 是 | 开始时间 |
  1155	| endTime | string | 是 | 结束时间 |
  1156	| method | string | 是 | `location`/`qr`/`photo`/`code` |
  1157	| location | string | 否 | 地点名称 |
  1158	| latitude | number | 否 | 纬度 |
  1159	| longitude | number | 否 | 经度 |
  1160	| checkRadius | number | 否 | 签到半径（米），默认 100 |
  1161	
  1162	##### 3. 获取考勤详情
  1163	
  1164	| 项 | 内容 |
  1165	|---|---|
  1166	| 请求方式 | GET |
  1167	| 接口路径 | `/attendances/:id` |
  1168	
  1169	##### 4. 获取签到二维码
  1170	
  1171	| 项 | 内容 |
  1172	|---|---|
  1173	| 请求方式 | GET |
  1174	| 接口路径 | `/attendances/:id/qr-code` |
  1175	
  1176	**成功响应：**
  1177	
  1178	```json
  1179	{
  1180	  "code": 0,
  1181	  "message": "success",
  1182	  "data": {
  1183	    "qrCodeUrl": "https://minio/qr/xxx.png",
  1184	    "token": "uuid",
  1185	    "expiresAt": "2026-07-07T10:00:00Z"
  1186	  }
  1187	}
  1188	```
  1189	
  1190	##### 5. 获取签到口令
  1191	
  1192	| 项 | 内容 |
  1193	|---|---|
  1194	| 请求方式 | GET |
  1195	| 接口路径 | `/attendances/:id/check-code` |
  1196	
  1197	##### 6. 学生签到
  1198	
  1199	| 项 | 内容 |
  1200	|---|---|
  1201	| 请求方式 | POST |
  1202	| 接口路径 | `/attendances/:id/check-in` |
  1203	
  1204	**请求入参：**
  1205	
  1206	| 字段 | 类型 | 必填 | 说明 |
  1207	|---|---|---|---|
  1208	| method | string | 是 | 签到方式 |
  1209	| token | string | 否 | QR 模式必填 |
  1210	| code | string | 否 | 口令模式必填 |
  1211	| latitude | number | 否 | 定位模式必填 |
  1212	| longitude | number | 否 | 定位模式必填 |
  1213	| photoUrl | string | 否 | 水印拍照模式必填 |
  1214	
  1215	**成功响应：**
  1216	
  1217	```json
  1218	{
  1219	  "code": 0,
  1220	  "message": "签到成功",
  1221	  "data": {
  1222	    "recordId": "uuid",
  1223	    "status": "present",
  1224	    "checkInAt": "2026-07-07T09:30:00Z"
  1225	  }
  1226	}
  1227	```
  1228	
  1229	**失败响应（重复签到）：**
  1230	
  1231	```json
  1232	{
  1233	  "code": 1005,
  1234	  "message": "您已签到，请勿重复操作"
  1235	}
  1236	```
  1237	
  1238	##### 7. 提交请假申请
  1239	
  1240	| 项 | 内容 |
  1241	|---|---|
  1242	| 请求方式 | POST |
  1243	| 接口路径 | `/attendances/:id/leave` |
  1244	
  1245	**请求入参：**
  1246	
  1247	| 字段 | 类型 | 必填 | 说明 |
  1248	|---|---|---|---|
  1249	| reason | string | 是 | 请假原因 |
  1250	
  1251	##### 8. 审批请假
  1252	
  1253	| 项 | 内容 |
  1254	|---|---|
  1255	| 请求方式 | PUT |
  1256	| 接口路径 | `/attendances/:id/leave/:leaveId` |
  1257	
  1258	**请求入参：**
  1259	
  1260	| 字段 | 类型 | 必填 | 说明 |
  1261	|---|---|---|---|
  1262	| status | string | 是 | approved/rejected |
  1263	
  1264	##### 9. 获取考勤报告
  1265	
  1266	| 项 | 内容 |
  1267	|---|---|
  1268	| 请求方式 | GET |
  1269	| 接口路径 | `/attendances/:id/report` |
  1270	
  1271	**成功响应：**
  1272	
  1273	```json
  1274	{
  1275	  "code": 0,
  1276	  "message": "success",
  1277	  "data": {
  1278	    "total": 35,
  1279	    "present": 30,
  1280	    "leave": 2,
  1281	    "absent": 3,
  1282	    "presentRate": "85.7%"
  1283	  }
  1284	}
  1285	```
  1286	
  1287	#### 2.5.4 数据库表设计
  1288	
  1289	**`attendances` 考勤主表**
  1290	
  1291	| 字段 | 类型 | 约束 | 说明 |
  1292	|---|---|---|---|
  1293	| id | CHAR(36) | PK | |
  1294	| class_id | CHAR(36) | FK → classes | |
  1295	| publisher_id | CHAR(36) | FK → users | |
  1296	| title | VARCHAR(200) | NOT NULL | 标题 |
  1297	| type | VARCHAR(50) | | 考勤类型 |
  1298	| start_time | DATETIME(3) | NOT NULL | 开始时间 |
  1299	| end_time | DATETIME(3) | NOT NULL | 结束时间 |
  1300	| method | VARCHAR(20) | NOT NULL | location/qr/photo/code |
  1301	| location | VARCHAR(255) | | 地点 |
  1302	| latitude | DECIMAL(10,8) | | 纬度 |
  1303	| longitude | DECIMAL(11,8) | | 经度 |
  1304	| check_radius | INT | | 签到半径 |
  1305	| check_code | VARCHAR(20) | | 签到口令 |
  1306	| status | VARCHAR(20) | DEFAULT 'open' | open/closed/cancelled |
  1307	| created_at | DATETIME(3) | | |
  1308	
  1309	**`attendance_records` 考勤签到记录表**
  1310	
  1311	| 字段 | 类型 | 约束 | 说明 |
  1312	|---|---|---|---|
  1313	| id | CHAR(36) | PK | |
  1314	| attendance_id | CHAR(36) | FK → attendances | |
  1315	| student_id | CHAR(36) | FK → users | |
  1316	| status | VARCHAR(20) | DEFAULT 'present' | present/leave/absent/late |
  1317	| check_in_at | DATETIME(3) | | 签到时间 |
  1318	| check_in_method | VARCHAR(20) | | 实际签到方式 |
  1319	| latitude | DECIMAL(10,8) | | |
  1320	| longitude | DECIMAL(11,8) | | |
  1321	| photo_url | VARCHAR(500) | | 水印照片 URL |
  1322	
  1323	**`leave_applications` 请假申请表**
  1324	
  1325	| 字段 | 类型 | 约束 | 说明 |
  1326	|---|---|---|---|
  1327	| id | CHAR(36) | PK | |
  1328	| attendance_id | CHAR(36) | FK → attendances | |
  1329	| student_id | CHAR(36) | FK → users | |
  1330	| reason | TEXT | | 原因 |
  1331	| status | VARCHAR(20) | DEFAULT 'pending' | pending/approved/rejected |
  1332	| reviewed_by | CHAR(36) | FK → users | |
  1333	| reviewed_at | DATETIME(3) | | |
  1334	
  1335	#### 2.5.5 第三方集成
  1336	
  1337	- **地图 API**：腾讯地图/高德地图，计算签到点与当前位置距离。
  1338	- **二维码生成**：服务端生成含一次性 token 的二维码。
  1339	- **MinIO/OSS**：水印拍照照片上传。
  1340	- **OCR 识别**：识别水印照片中的时间地点信息（可选）。
  1341	
  1342	---
  1343	
  1344	### 2.6 活动报名模块（P1）
  1345	
  1346	#### 2.6.1 前端涉及页面
  1347	
  1348	| 页面 | 交互逻辑 |
  1349	|---|---|
  1350	| 活动列表页 (ActivityList) | 展示活动，右上角班委可发布 |
  1351	| 发布活动页 (PublishActivity) | 班委发布活动 |
  1352	| 活动详情页 (ActivityDetail) | 展示活动详情，底部报名按钮 |
  1353	| 报名表单页 (RegistrationForm) | 填写报名信息 |
  1354	| 我的报名页 (MyRegistration) | 查看我的报名记录 |
  1355	| 报名统计页 (RegistrationStats) | 班委查看报名统计 |
  1356	
  1357	#### 2.6.2 业务规则
  1358	
  1359	1. 活动状态由时间和 deadline 自动计算：
  1360	   - 当前时间 < 报名截止时间：`报名中`
  1361	   - 报名截止时间 ≤ 当前时间 < 活动开始时间：`进行中`
  1362	   - 当前时间 ≥ 活动开始时间：`已结束`
  1363	2. 报名阶段按钮可点击，文案「立即报名」，点击后弹窗提示「报名成功」。
  1364	3. 进行中/已结束状态按钮禁用，文案分别显示「进行中」/「已结束」，点击后弹窗提示「报名失败」。
  1365	4. 报名人数达到 `capacity` 后不可报名，接口返回明确状态码。
  1366	5. 班委可发布活动、查看报名统计、导出报名名单。
  1367	6. 报名支持审核模式（可选），默认自动通过。
  1368	
  1369	#### 2.6.3 RESTful API 清单
  1370	
  1371	##### 1. 获取活动列表
  1372	
  1373	| 项 | 内容 |
  1374	|---|---|
  1375	| 请求方式 | GET |
  1376	| 接口路径 | `/activities` |
  1377	
  1378	**Query 参数：** classId, status, page, pageSize
  1379	
  1380	##### 2. 发布活动
  1381	
  1382	| 项 | 内容 |
  1383	|---|---|
  1384	| 请求方式 | POST |
  1385	| 接口路径 | `/activities` |
  1386	
  1387	**请求入参：**
  1388	
  1389	| 字段 | 类型 | 必填 | 说明 |
  1390	|---|---|---|---|
  1391	| classId | string | 是 | |
  1392	| title | string | 是 | 活动标题 |
  1393	| eventDate | string | 是 | 活动日期 YYYY-MM-DD |
  1394	| eventTime | string | 否 | 活动时间 HH:mm |
  1395	| location | string | 否 | 地点 |
  1396	| capacity | number | 否 | 容量上限 |
  1397	| coverUrl | string | 否 | 封面图 URL |
  1398	| deadline | string | 是 | 报名截止时间 |
  1399	| requireAudit | boolean | 否 | 是否需要审核 |
  1400	
  1401	##### 3. 获取活动详情
  1402	
  1403	| 项 | 内容 |
  1404	|---|---|
  1405	| 请求方式 | GET |
  1406	| 接口路径 | `/activities/:id` |
  1407	
  1408	**成功响应：**
  1409	
  1410	```json
  1411	{
  1412	  "code": 0,
  1413	  "message": "success",
  1414	  "data": {
  1415	    "id": "uuid",
  1416	    "title": "春季运动会",
  1417	    "eventDate": "2026-04-12",
  1418	    "eventTime": "08:00",
  1419	    "location": "体育馆",
  1420	    "status": "报名中",
  1421	    "registered": 32,
  1422	    "capacity": 50,
  1423	    "canRegister": true,
  1424	    "buttonText": "立即报名",
  1425	    "buttonDisabled": false
  1426	  }
  1427	}
  1428	```
  1429	
  1430	##### 4. 活动报名
  1431	
  1432	| 项 | 内容 |
  1433	|---|---|
  1434	| 请求方式 | POST |
  1435	| 接口路径 | `/activities/:id/register` |
  1436	
  1437	**请求入参：**
  1438	
  1439	| 字段 | 类型 | 必填 | 说明 |
  1440	|---|---|---|---|
  1441	| remark | string | 否 | 备注 |
  1442	
  1443	**成功响应（报名成功）：**
  1444	
  1445	```json
  1446	{
  1447	  "code": 0,
  1448	  "message": "报名成功",
  1449	  "data": { "registrationId": "uuid" }
  1450	}
  1451	```
  1452	
  1453	**失败响应（报名失败）：**
  1454	
  1455	```json
  1456	{
  1457	  "code": 1005,
  1458	  "message": "报名失败，活动已结束"
  1459	}
  1460	```
  1461	
  1462	##### 5. 获取报名列表
  1463	
  1464	| 项 | 内容 |
  1465	|---|---|
  1466	| 请求方式 | GET |
  1467	| 接口路径 | `/activities/:id/registrations` |
  1468	
  1469	##### 6. 审核报名
  1470	
  1471	| 项 | 内容 |
  1472	|---|---|
  1473	| 请求方式 | PUT |
  1474	| 接口路径 | `/activities/:id/registrations/:registrationId` |
  1475	
  1476	**请求入参：**
  1477	
  1478	| 字段 | 类型 | 必填 | 说明 |
  1479	|---|---|---|---|
  1480	| status | string | 是 | approved/rejected |
  1481	
  1482	##### 7. 获取我的报名
  1483	
  1484	| 项 | 内容 |
  1485	|---|---|
  1486	| 请求方式 | GET |
  1487	| 接口路径 | `/my-registrations` |
  1488	
  1489	#### 2.6.4 数据库表设计
  1490	
  1491	**`activities` 活动主表**
  1492	
  1493	| 字段 | 类型 | 约束 | 说明 |
  1494	|---|---|---|---|
  1495	| id | CHAR(36) | PK | |
  1496	| class_id | CHAR(36) | FK → classes | |
  1497	| publisher_id | CHAR(36) | FK → users | |
  1498	| title | VARCHAR(200) | NOT NULL | |
  1499	| event_date | DATE | NOT NULL | 活动日期 |
  1500	| event_time | TIME | | 活动时间 |
  1501	| location | VARCHAR(255) | | |
  1502	| capacity | INT | | 容量 |
  1503	| cover_url | VARCHAR(500) | | 封面 |
  1504	| deadline | DATETIME(3) | | 报名截止 |
  1505	| require_audit | TINYINT(1) | DEFAULT 0 | 是否需审核 |
  1506	| status | VARCHAR(20) | | registering/ongoing/ended/cancelled |
  1507	| created_at | DATETIME(3) | | |
  1508	
  1509	**`activity_registrations` 活动报名记录表**
  1510	
  1511	| 字段 | 类型 | 约束 | 说明 |
  1512	|---|---|---|---|
  1513	| id | CHAR(36) | PK | |
  1514	| activity_id | CHAR(36) | FK → activities | |
  1515	| student_id | CHAR(36) | FK → users | |
  1516	| remark | VARCHAR(255) | | 备注 |
  1517	| status | VARCHAR(20) | DEFAULT 'approved' | pending/approved/rejected |
  1518	| registered_at | DATETIME(3) | | |
  1519	
  1520	#### 2.6.5 第三方集成
  1521	
  1522	- **MinIO/OSS**：活动封面图上传。
  1523	- **消息推送**：报名成功/审核结果通知。
  1524	
  1525	---
  1526	
  1527	### 2.7 投票模块（P1）
  1528	
  1529	#### 2.7.1 前端涉及页面
  1530	
  1531	| 页面 | 交互逻辑 |
  1532	|---|---|
  1533	| 投票列表页 (VoteList) | 展示投票列表，右上角发布投票 |
  1534	| 发布投票页 (PublishVote) | 创建投票，设置选项、截止时间 |
  1535	| 投票选项页 (VoteOptions) | 用户选择选项提交 |
  1536	
  1537	#### 2.7.2 业务规则
  1538	
  1539	1. 投票类型：`single`（单选）、`multiple`（多选）。
  1540	2. 投票截止时间后不可投票。
  1541	3. 每个学生每投票一次，防止重复投票。
  1542	4. 实时统计票数，支持查看结果。
  1543	5. 班委可发布投票、提前关闭投票。
  1544	
  1545	#### 2.7.3 RESTful API 清单
  1546	
  1547	##### 1. 获取投票列表
  1548	
  1549	| 项 | 内容 |
  1550	|---|---|
  1551	| 请求方式 | GET |
  1552	| 接口路径 | `/votes` |
  1553	
  1554	**Query 参数：** classId, status, page, pageSize
  1555	
  1556	##### 2. 发布投票
  1557	
  1558	| 项 | 内容 |
  1559	|---|---|
  1560	| 请求方式 | POST |
  1561	| 接口路径 | `/votes` |
  1562	
  1563	**请求入参：**
  1564	
  1565	| 字段 | 类型 | 必填 | 说明 |
  1566	|---|---|---|---|
  1567	| classId | string | 是 | |
  1568	| title | string | 是 | 投票标题 |
  1569	| voteType | string | 是 | single/multiple |
  1570	| deadline | string | 是 | 截止时间 |
  1571	| options | array | 是 | 选项文本列表 |
  1572	
  1573	##### 3. 获取投票详情
  1574	
  1575	| 项 | 内容 |
  1576	|---|---|
  1577	| 请求方式 | GET |
  1578	| 接口路径 | `/votes/:id` |
  1579	
  1580	##### 4. 提交投票
  1581	
  1582	| 项 | 内容 |
  1583	|---|---|
  1584	| 请求方式 | POST |
  1585	| 接口路径 | `/votes/:id/vote` |
  1586	
  1587	**请求入参：**
  1588	
  1589	| 字段 | 类型 | 必填 | 说明 |
  1590	|---|---|---|---|
  1591	| optionIds | array | 是 | 选项 ID 列表 |
  1592	
  1593	**失败响应（重复投票）：**
  1594	
  1595	```json
  1596	{
  1597	  "code": 1005,
  1598	  "message": "您已参与过该投票"
  1599	}
  1600	```
  1601	
  1602	##### 5. 获取投票结果
  1603	
  1604	| 项 | 内容 |
  1605	|---|---|
  1606	| 请求方式 | GET |
  1607	| 接口路径 | `/votes/:id/results` |
  1608	
  1609	#### 2.7.4 数据库表设计
  1610	
  1611	**`votes` 投票主表**
  1612	
  1613	| 字段 | 类型 | 约束 | 说明 |
  1614	|---|---|---|---|
  1615	| id | CHAR(36) | PK | |
  1616	| class_id | CHAR(36) | FK → classes | |
  1617	| publisher_id | CHAR(36) | FK → users | |
  1618	| title | VARCHAR(200) | NOT NULL | |
  1619	| vote_type | VARCHAR(20) | DEFAULT 'single' | single/multiple |
  1620	| deadline | DATETIME(3) | NOT NULL | |
  1621	| status | VARCHAR(20) | DEFAULT 'published' | published/closed/deleted |
  1622	
  1623	**`vote_options` 投票选项表**
  1624	
  1625	| 字段 | 类型 | 约束 | 说明 |
  1626	|---|---|---|---|
  1627	| id | CHAR(36) | PK | |
  1628	| vote_id | CHAR(36) | FK → votes | |
  1629	| label | VARCHAR(200) | NOT NULL | 选项文本 |
  1630	| sort_order | INT | DEFAULT 0 | 排序 |
  1631	
  1632	**`vote_records` 用户投票记录表**
  1633	
  1634	| 字段 | 类型 | 约束 | 说明 |
  1635	|---|---|---|---|
  1636	| id | CHAR(36) | PK | |
  1637	| vote_id | CHAR(36) | FK → votes | |
  1638	| option_id | CHAR(36) | FK → vote_options | |
  1639	| student_id | CHAR(36) | FK → users | |
  1640	| created_at | DATETIME(3) | | |
  1641	
  1642	#### 2.7.5 第三方集成
  1643	
  1644	- 无特殊第三方集成。
  1645	
  1646	---
  1647	
  1648	### 2.8 班费/团费双账本模块（P1）
  1649	
  1650	#### 2.8.1 前端涉及页面
  1651	
  1652	| 页面 | 交互逻辑 |
  1653	|---|---|
  1654	| 班费账本页 (FeeLedger) | 展示班费收支记录 |
  1655	| 团费账本页 (LeagueFeeRecord) | 展示团费收支记录 |
  1656	| 缴费登记页 (PaymentRegister) | 登记学生缴费状态 |
  1657	| 班费记账页 (FeeRecord) | 新增收支记录 |
  1658	| 团费记账页 (LeaguePaymentRegister) | 新增团费收支 |
  1659	| 财务报表页 (FinanceReport) | 月度/学期统计 |
  1660	
  1661	#### 2.8.2 业务规则
  1662	
  1663	1. 班费和团费**物理隔离**，使用不同 `record_type` 区分。
  1664	2. 收支方向：`income`（收入）、`expense`（支出）。
  1665	3. 团费额外字段 `fee_category`：团费收缴、活动支出、材料采购。
  1666	4. 缴费登记：标记哪些学生已缴费，支持批量登记。
  1667	5. 财务报表：按班级、账本类型、月份、学期汇总收入/支出/余额。
  1668	6. 余额计算：收入 - 支出。
  1669	7. 财务操作记录审计日志。
  1670	
  1671	#### 2.8.3 RESTful API 清单
  1672	
  1673	##### 1. 获取财务记录列表
  1674	
  1675	| 项 | 内容 |
  1676	|---|---|
  1677	| 请求方式 | GET |
  1678	| 接口路径 | `/finance/records` |
  1679	
  1680	**Query 参数：**
  1681	
  1682	| 字段 | 类型 | 必填 | 说明 |
  1683	|---|---|---|---|
  1684	| classId | string | 是 | |
  1685	| recordType | string | 是 | class_fee/league_fee |
  1686	| direction | string | 否 | income/expense |
  1687	| dateRange | string | 否 | 日期范围 2026-01-01~2026-12-31 |
  1688	| page | number | 否 | |
  1689	| pageSize | number | 否 | |
  1690	
  1691	##### 2. 新增财务记录
  1692	
  1693	| 项 | 内容 |
  1694	|---|---|
  1695	| 请求方式 | POST |
  1696	| 接口路径 | `/finance/records` |
  1697	
  1698	**请求入参：**
  1699	
  1700	| 字段 | 类型 | 必填 | 说明 |
  1701	|---|---|---|---|
  1702	| classId | string | 是 | |
  1703	| recordType | string | 是 | class_fee/league_fee |
  1704	| feeCategory | string | 否 | 团费分类 |
  1705	| title | string | 是 | 标题 |
  1706	| amount | number | 是 | 金额 |
  1707	| direction | string | 是 | income/expense |
  1708	| recordDate | string | 是 | 记账日期 |
  1709	| attachments | array | 否 | 凭证附件 |
  1710	
  1711	##### 3. 获取缴费登记列表
  1712	
  1713	| 项 | 内容 |
  1714	|---|---|
  1715	| 请求方式 | GET |
  1716	| 接口路径 | `/finance/payments` |
  1717	
  1718	**Query 参数：** classId, recordType, paid, page, pageSize
  1719	
  1720	##### 4. 批量缴费登记
  1721	
  1722	| 项 | 内容 |
  1723	|---|---|
  1724	| 请求方式 | POST |
  1725	| 接口路径 | `/finance/payments/batch` |
  1726	
  1727	**请求入参：**
  1728	
  1729	| 字段 | 类型 | 必填 | 说明 |
  1730	|---|---|---|---|
  1731	| classId | string | 是 | |
  1732	| recordType | string | 是 | class_fee/league_fee |
  1733	| studentIds | array | 是 | 学生 ID 列表 |
  1734	| amount | number | 是 | 缴费金额 |
  1735	| paid | boolean | 是 | true=标记已缴，false=标记未缴 |
  1736	
  1737	##### 5. 获取财务报表
  1738	
  1739	| 项 | 内容 |
  1740	|---|---|
  1741	| 请求方式 | GET |
  1742	| 接口路径 | `/finance/report` |
  1743	
  1744	**Query 参数：** classId, recordType, year, semester
  1745	
  1746	**成功响应：**
  1747	
  1748	```json
  1749	{
  1750	  "code": 0,
  1751	  "message": "success",
  1752	  "data": {
  1753	    "totalIncome": 3500.00,
  1754	    "totalExpense": 1280.00,
  1755	    "balance": 2220.00,
  1756	    "monthly": [
  1757	      { "month": "1月", "income": 500, "expense": 120 },
  1758	      { "month": "2月", "income": 300, "expense": 200 },
  1759	      { "month": "3月", "income": 800, "expense": 360 }
  1760	    ]
  1761	  }
  1762	}
  1763	```
  1764	
  1765	#### 2.8.4 数据库表设计
  1766	
  1767	**`finance_records` 财务记录表**
  1768	
  1769	| 字段 | 类型 | 约束 | 说明 |
  1770	|---|---|---|---|
  1771	| id | CHAR(36) | PK | |
  1772	| class_id | CHAR(36) | FK → classes | |
  1773	| recorder_id | CHAR(36) | FK → users | 记录人 |
  1774	| record_type | VARCHAR(20) | NOT NULL | class_fee/league_fee |
  1775	| fee_category | VARCHAR(50) | | 团费分类 |
  1776	| title | VARCHAR(200) | NOT NULL | 标题 |
  1777	| amount | DECIMAL(10,2) | NOT NULL | 金额 |
  1778	| direction | VARCHAR(10) | NOT NULL | income/expense |
  1779	| record_date | DATE | NOT NULL | 记账日期 |
  1780	| attachments | JSON | | 凭证附件 |
  1781	| created_at | DATETIME(3) | | |
  1782	
  1783	**`finance_payments` 缴费登记表**
  1784	
  1785	| 字段 | 类型 | 约束 | 说明 |
  1786	|---|---|---|---|
  1787	| id | CHAR(36) | PK | |
  1788	| class_id | CHAR(36) | FK → classes | |
  1789	| record_type | VARCHAR(20) | NOT NULL | class_fee/league_fee |
  1790	| student_id | CHAR(36) | FK → users | |
  1791	| amount | DECIMAL(10,2) | | 缴费金额 |
  1792	| paid | TINYINT(1) | DEFAULT 0 | 是否已缴 |
  1793	| paid_at | DATETIME(3) | | 缴费时间 |
  1794	| registered_by | CHAR(36) | FK → users | 登记人 |
  1795	
  1796	#### 2.8.5 第三方集成
  1797	
  1798	- **MinIO/OSS**：财务凭证附件上传。
  1799	- **智慧团建**：团费数据对接（可选，学校提供接口时接入）。
  1800	
  1801	---
  1802	
  1803	### 2.9 资料档案模块（P1）
  1804	
  1805	#### 2.9.1 前端涉及页面
  1806	
  1807	| 页面 | 交互逻辑 |
  1808	|---|---|
  1809	| 资料库页 (MaterialLibrary) | 资料列表，支持分类筛选 |
  1810	| 上传资料页 (UploadMaterial) | 上传文件，选择分类 |
  1811	| 资料详情页 (MaterialDetail) | 查看详情、下载 |
  1812	| 班级档案页 (ClassArchive) | 按学年学期展示档案 |
  1813	| 电子档案页 (ClassElectronicArchive) | 电子档案管理 |
  1814	| 导出档案页 (ExportArchive) | 导出档案文件 |
  1815	| 下载统计页 (DownloadStats) | 资料下载统计 |
  1816	| 数据看板页 (DataDashboard) | 综合数据统计 |
  1817	
  1818	#### 2.9.2 业务规则
  1819	
  1820	1. 资料分类：班会 PPT、团课内容、学习资料、其他。
  1821	2. 文件上传后存 MinIO/OSS，数据库存元数据。
  1822	3. 下载资料时记录下载人、下载时间，用于统计。
  1823	4. 班级档案按学年学期归档，支持多个文件。
  1824	5. 导出档案采用异步任务，生成后通过消息通知用户下载。
  1825	6. 数据看板聚合通知、作业、考勤、活动、财务等数据。
  1826	
  1827	#### 2.9.3 RESTful API 清单
  1828	
  1829	##### 1. 获取资料列表
  1830	
  1831	| 项 | 内容 |
  1832	|---|---|
  1833	| 请求方式 | GET |
  1834	| 接口路径 | `/materials` |
  1835	
  1836	**Query 参数：** classId, category, keyword, page, pageSize
  1837	
  1838	##### 2. 上传资料
  1839	
  1840	| 项 | 内容 |
  1841	|---|---|
  1842	| 请求方式 | POST |
  1843	| 接口路径 | `/materials` |
  1844	
  1845	**请求入参：**
  1846	
  1847	| 字段 | 类型 | 必填 | 说明 |
  1848	|---|---|---|---|
  1849	| classId | string | 是 | |
  1850	| title | string | 是 | 资料标题 |
  1851	| category | string | 是 | 分类 |
  1852	| description | string | 否 | 描述 |
  1853	| fileUrl | string | 是 | 文件 URL |
  1854	| fileSize | number | 否 | 文件大小 |
  1855	| mimeType | string | 否 | 文件类型 |
  1856	
  1857	##### 3. 下载资料
  1858	
  1859	| 项 | 内容 |
  1860	|---|---|
  1861	| 请求方式 | POST |
  1862	| 接口路径 | `/materials/:id/download` |
  1863	
  1864	**成功响应：** 返回临时下载 URL。
  1865	
  1866	##### 4. 获取下载统计
  1867	
  1868	| 项 | 内容 |
  1869	|---|---|
  1870	| 请求方式 | GET |
  1871	| 接口路径 | `/materials/:id/download-stats` |
  1872	
  1873	##### 5. 获取档案列表
  1874	
  1875	| 项 | 内容 |
  1876	|---|---|
  1877	| 请求方式 | GET |
  1878	| 接口路径 | `/archives` |
  1879	
  1880	**Query 参数：** classId, year, type
  1881	
  1882	##### 6. 创建档案
  1883	
  1884	| 项 | 内容 |
  1885	|---|---|
  1886	| 请求方式 | POST |
  1887	| 接口路径 | `/archives` |
  1888	
  1889	**请求入参：**
  1890	
  1891	| 字段 | 类型 | 必填 | 说明 |
  1892	|---|---|---|---|
  1893	| classId | string | 是 | |
  1894	| title | string | 是 | 档案标题 |
  1895	| archiveYear | string | 是 | 学年 |
  1896	| archiveType | string | 是 | 学期档案/学年档案 |
  1897	| fileUrls | array | 是 | 文件 URL 列表 |
  1898	
  1899	##### 7. 导出档案
  1900	
  1901	| 项 | 内容 |
  1902	|---|---|
  1903	| 请求方式 | POST |
  1904	| 接口路径 | `/archives/:id/export` |
  1905	
  1906	**成功响应：** 返回异步任务 ID。
  1907	
  1908	##### 8. 获取数据看板
  1909	
  1910	| 项 | 内容 |
  1911	|---|---|
  1912	| 请求方式 | GET |
  1913	| 接口路径 | `/dashboard/stats` |
  1914	
  1915	**成功响应：**
  1916	
  1917	```json
  1918	{
  1919	  "code": 0,
  1920	  "message": "success",
  1921	  "data": {
  1922	    "messageCount": 120,
  1923	    "homeworkCount": 45,
  1924	    "attendanceRate": "92%",
  1925	    "activityCount": 8,
  1926	    "classFeeBalance": 2220.00,
  1927	    "pendingTasks": 12
  1928	  }
  1929	}
  1930	```
  1931	
  1932	#### 2.9.4 数据库表设计
  1933	
  1934	**`materials` 资料表**
  1935	
  1936	| 字段 | 类型 | 约束 | 说明 |
  1937	|---|---|---|---|
  1938	| id | CHAR(36) | PK | |
  1939	| class_id | CHAR(36) | FK → classes | |
  1940	| uploader_id | CHAR(36) | FK → users | 上传人 |
  1941	| title | VARCHAR(200) | NOT NULL | 标题 |
  1942	| category | VARCHAR(50) | | 分类 |
  1943	| description | TEXT | | 描述 |
  1944	| file_url | VARCHAR(500) | NOT NULL | 文件 URL |
  1945	| file_size | INT | | 大小 |
  1946	| mime_type | VARCHAR(100) | | 类型 |
  1947	| download_count | INT | DEFAULT 0 | 下载次数 |
  1948	
  1949	**`material_downloads` 资料下载记录表**
  1950	
  1951	| 字段 | 类型 | 约束 | 说明 |
  1952	|---|---|---|---|
  1953	| id | CHAR(36) | PK | |
  1954	| material_id | CHAR(36) | FK → materials | |
  1955	| user_id | CHAR(36) | FK → users | |
  1956	| downloaded_at | DATETIME(3) | | |
  1957	
  1958	**`archives` 班级档案表**
  1959	
  1960	| 字段 | 类型 | 约束 | 说明 |
  1961	|---|---|---|---|
  1962	| id | CHAR(36) | PK | |
  1963	| class_id | CHAR(36) | FK → classes | |
  1964	| title | VARCHAR(200) | NOT NULL | |
  1965	| archive_year | VARCHAR(20) | NOT NULL | 学年 |
  1966	| archive_type | VARCHAR(50) | NOT NULL | 档案类型 |
  1967	| created_by | CHAR(36) | FK → users | |
  1968	
  1969	**`archive_files` 档案文件表**
  1970	
  1971	| 字段 | 类型 | 约束 | 说明 |
  1972	|---|---|---|---|
  1973	| id | CHAR(36) | PK | |
  1974	| archive_id | CHAR(36) | FK → archives | |
  1975	| file_name | VARCHAR(255) | | |
  1976	| file_url | VARCHAR(500) | | |
  1977	| file_size | INT | | |
  1978	
  1979	#### 2.9.5 第三方集成
  1980	
  1981	- **MinIO/OSS**：资料、档案文件存储。
  1982	- **文档转码**：PDF 预览（可选）。
  1983	- **智慧团建**：团课内容上传对接。
  1984	
  1985	---
  1986	
  1987	### 2.10 内置工具模块（P2）
  1988	
  1989	#### 2.10.1 前端涉及页面
  1990	
  1991	| 页面 | 交互逻辑 |
  1992	|---|---|
  1993	| 随机抽签页 (RandomDraw) | 设置抽取人数、替补人数，开始抽签 |
  1994	| 番茄钟页 (Pomodoro) | 专注计时（纯前端，后端无需接口） |
  1995	
  1996	#### 2.10.2 业务规则
  1997	
  1998	1. 随机抽签从班级成员中随机抽取主选和替补名单。
  1999	2. 可设置主选人数、替补人数、排除人员。
  2000	3. 抽签结果保存，支持查看历史记录。
