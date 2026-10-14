# 班务星app App 自动化测试方案

> 参考课程：《3天搞定企业级APP自动化：2026最新 Python+Appium 驱动网易严选全流程测试》
> 课程出处：哔哩哔哩 黑马程序员 BV1VQgA6hEo2（52集，2026-08-14 发布）
> 方案版本：v1.0 ｜ 编制日期：2026-09-20 ｜ 被测应用：班务星app（校园班级事务智能管理助手）V1.0

---

## 0. 方案摘要

| 项目 | 内容 |
|------|------|
| 测试类型 | 移动端 UI 自动化（Appium 驱动） |
| 技术栈 | Python 3 + Appium 2.x + pytest + Allure + Jenkins |
| 设计模式 | Page Object（PO）+ 数据驱动 + 分层封装 |
| 被测形态 | 阶段一：Android 模拟器 Chrome 打开 H5；阶段二：uni-app 打包 APK（Hybrid/WebView） |
| 覆盖模块 | 认证、通知、考勤、作业（P0）＋ 活动、投票、班费（P1）＋ 工具、资料档案、设置（P2）＋ 3 条端到端 |
| 用例规模 | 约 66 条（详见第 6 章） |
| 实施周期 | 3 天（与课程节奏对齐） |
| 交付物 | 自动化测试工程、Allure 报告、Jenkins 流水线、本方案文档 |

**本方案直接把课程中“网易严选全流程测试”的方法论（元素定位 → PO 封装 → pytest 管理 → 数据驱动 → Allure 报告 → Jenkins CI）完整迁移到班务星app，并针对班务星的技术特点（Taro H5/WebView 应用、多角色权限、班级事务业务流）做了专项适配。**

---

## 1. 背景与目标

### 1.1 背景

- 班务星app 已完成后端接口级测试（`docs/分模块测试清单.md`，13 个脚本、约 90 项接口检查），并完成 H5 页面手工巡检。
- 目前**没有移动端 UI 自动化**，回归依赖人工点击，重复性高、效率低。
- 课程《3天搞定企业级APP自动化》提供了一套经过验证的企业级移动端自动化实施路径，可直接落地到班务星app。

### 1.2 测试目标

1. 建立可持续运行的 App UI 自动化回归体系，核心业务（认证/通知/考勤/作业）回归时间从人工数小时降至自动化 10-15 分钟。
2. 覆盖多角色（学生 / 班委 / 管理员）下的关键业务流程，验证 UI 层与后端接口层的一致性。
3. 输出 Allure 可视化测试报告，接入 Jenkins 定时回归，形成“提交即回归”的闭环。
4. 沉淀 PO 页面对象资产，后续页面改版时仅维护 PO 层，降低维护成本。

### 1.3 课程方法论 → 班务星落点映射

| 课程章节（52集） | 核心内容 | 班务星落点 |
|---|---|---|
| 01-19（Day1） | Appium 介绍、环境搭建、adb、包名启动页、元素定位/点击/输入、显示等待、滑动 | 搭建 Android 模拟器 + Appium 环境；定位班务星登录/首页元素；编写登录脚本 |
| 20-39（Day2） | Appium 原理、BASE 方法封装、PO 框架、conftest、登录/搜索页封装、数据驱动 | 建立 base/driver/conftest；封装登录页、首页、通知页；登录成功/失败用例 + 数据驱动 |
| 40-52（Day3） | 购物车/订单页面封装、Allure 报告、Git、Jenkins CI | 封装考勤/作业/活动等业务页；Allure 报告；git 管理；Jenkins 流水线 |

---

## 2. 被测应用分析

### 2.1 应用技术栈（已核实）

| 层 | 技术 | 说明 |
|---|---|---|
| 移动端 | Taro 4.2.1 + React 18 + TypeScript | 跨端框架，可构建 H5 / 微信小程序 / RN |
| 后端 | NestJS RESTful API | 本地开发地址 `http://localhost:3000/api/v1` |
| 数据 | MySQL + Prisma ORM + Redis + MinIO | 业务库 / 缓存 / 文件存储 |
| 鉴权 | JWT（AccessToken 2h + RefreshToken）+ CSRF | 401/403 全模块拦截已验证 |

### 2.2 功能模块与页面地图（已核实）

底部 5 Tab：**首页 / 班级 / 通知 / 数据 / 我的**；主包 14 页 + 9 个业务子包（约 70 页）：

| 子包 | 页面 | 角色 |
|---|---|---|
| message 消息 | 列表 / 详情 / 发布 / 统计 / 互动消息 | 班委发布、全员查看/签收 |
| attendance 考勤 | 列表 / 发布 / 详情 / 签到 / 签到方式 / 请假申请 / 请假审批 / 报表 / 我的 | 班委发布、学生签到 |
| activity 活动 | 列表 / 发布 / 详情 / 报名表单 / 我的报名 / 报名统计 | 班委发布、学生报名 |
| vote 投票/抽签 | 列表 / 发布 / 选项 / 随机抽签 / 规则 / 记录 / 详情 | 班委发布、全员投票 |
| fee 班费 | 账本 / 记账 / 报表 / 缴费登记 / 团费账本 / 团费登记 | 班委管理 |
| material 资料工具 | 资料库 / 上传 / 详情 / 任务看板 / 发布任务 / 番茄钟 / 扫码 / 更多 / 转发 | 全员+班委 |
| settings 设置班级管理 | 设置 / 账户安全 / 通知设置 / 隐私 / 通用 / 提醒 / 帮助反馈 / 关于 / 成员列表 / 成员详情 / 导入学生 / 班级设置 / 错误看板 | 全员+班委+管理员 |
| archive 档案 | 班级档案 / 详情 / 文件列表 / 电子档案 / 导出 / 下载统计 / 学期报表 | 班委 |
| homework 作业 | 列表 / 发布 / 详情 / 提交 / 我的 / 延时申请 / 离线核对 / 批量核对 / 截图核对 / 核对结果 | 班委发布、学生提交 |

### 2.3 角色与权限

| 功能 | 学生 | 班委 | 管理员 |
|---|---|---|---|
| 发布通知/作业/考勤/活动/投票 | ✗ | ✓ | ✓ |
| 管理班委 / 班级设置 | ✗ | ✗ | ✓ |
| 导入学生 / 管理班费 / 离线核对 / 作废抽签 | ✗ | ✓ | ✓ |
| 查看班级信息 / 签到 / 提交作业 / 投票 | ✓ | ✓ | ✓ |

> 自动化测试需覆盖三种角色账号（见附录 A），用于验证权限边界（学生端不应出现发布入口）。

### 2.4 被测形态选型（关键决策）

班务星目前**无原生 APK**（Taro 工程仅构建 H5/小程序；旧 uni-app 工程可经 HBuilderX 云打包 app-plus）。因此分两阶段：

| 阶段 | 形态 | 驱动方式 | 优点 | 适用 |
|---|---|---|---|---|
| **一（推荐先行）** | H5 版，Android 模拟器 Chrome 打开 | `browserName: Chrome` + ChromeDriver | 免打包、DOM 元素定位稳定、与 localhost 后端直连、最快打通全流程 | 绝大多数业务用例 |
| **二（可选）** | uni-app 打包 APK（Hybrid） | `appPackage/appActivity` + WebView context 切换 | 更接近真实 APP、覆盖扫码/定位/震动等原生能力 | 原生能力专项、上架形态回归 |
| 三 | 微信小程序 | 小程序自动化框架（另行方案） | 覆盖小程序端 | 暂不纳入本方案 |

> 本方案主体按阶段一设计；阶段二在“WebView context 切换”一节给出适配方案。

---

## 3. 测试范围与优先级

### 3.1 范围内

认证、通知、考勤、作业、活动、投票、班费、工具（随机抽签/番茄钟）、资料档案、个人设置、3 条端到端流程。

### 3.2 优先级矩阵

| 优先级 | 模块 | 理由 | 用例数 |
|---|---|---|---|
| **P0** | 认证、通知、考勤、作业 | 核心闭环，回归频率最高 | 34 |
| **P1** | 活动、投票、班费 | 班级事务主要业务，中频回归 | 16 |
| **P2** | 工具、资料档案、设置 | 辅助功能，低频回归 | 13 |
| **E2E** | 全流程 | 版本发布前冒烟 | 3 |

### 3.3 暂不自动化（依赖真机/第三方能力）

- 二维码扫码签到 / 扫码加入班级（需真机摄像头 + 二维码动态生成）
- GPS 定位签到（需模拟定位，另行专项）
- 截图核对 OCR（依赖第三方 OCR 服务）
- 短信验证码登录 / 注册（建议测试环境用固定万能验证码或接口打码，见 7.2）
- 微信小程序端

---

## 4. 测试环境与工具链

### 4.1 软硬件清单

| 类别 | 项 | 版本/说明 |
|---|---|---|
| 主机 | Windows 11 台式机 | 现有开发机 |
| 模拟器 | MuMu 模拟器（或夜神/LDPlayer） | Android 12，API 31，分辨率建议 1080×2400 |
| 手机驱动 | Android SDK Platform-Tools（adb） | ≥ 34.0.0 |
| 运行时 | JDK 11+ | Appium 服务依赖 |
| 自动化服务 | Appium 2.x + UiAutomator2 驱动 | `npm install -g appium` + `appium driver install uiautomator2` |
| 浏览器驱动 | ChromeDriver | 版本与模拟器内 Chrome 匹配 |
| 元素定位工具 | Appium Inspector / uiautomatorviewer | H5 用 Chrome DevTools 亦可 |
| 脚本语言 | Python 3.10+ | |
| Python 包 | Appium-Python-Client、pytest、allure-pytest、PyYAML、openpyxl | `pip install -r requirements.txt` |
| 被测后端 | 本地 NestJS `localhost:3000` + MySQL/Redis/MinIO | 已可运行（`back/`） |
| 报告/CI | Allure 2.x、Git、Jenkins | 见第 9 章 |

### 4.2 环境搭建步骤（对应课程 01-07 集）

1. 安装并启动 MuMu 模拟器，`adb devices` 确认识别（MuMu 端口 `127.0.0.1:7555`）。
2. 安装 Appium：`npm i -g appium`，安装驱动 `appium driver install uiautomator2`。
3. 安装 ChromeDriver 并放入 `tools/chromedriver/`，确认版本号与模拟器 Chrome 一致（`adb shell am start -n com.android.chrome/.MainActivity` 后 `chrome://version`）。
4. 安装 Python 依赖，`appium --version` 与 `pytest --version` 自检。
5. 启动后端：`cd back && npm run start:dev`，接口自检 `curl http://localhost:3000/api/v1/health`（或登录接口）。
6. 模拟器 Chrome 访问班务星 H5 地址（本地联调 `http://localhost:3000` 需模拟器可访问宿主机，用 `http://10.0.2.2:3000` 或局域网 IP），确认登录页渲染。

### 4.3 Appium Capabilities 设计

**阶段一：H5 in Chrome（主路径）**

```python
desired_caps = {
    "platformName": "Android",
    "appium:deviceName": "MuMu",
    "appium:udid": "127.0.0.1:7555",
    "appium:platformVersion": "12",
    "browserName": "Chrome",
    "appium:chromedriverExecutable": r"C:\tools\chromedriver\chromedriver.exe",
    "appium:noReset": True,
    "appium:unicodeKeyboard": True,   # 中文输入
    "appium:resetKeyboard": True,
    "appium:automationName": "UiAutomator2",
    "appium:newCommandTimeout": 300,
}
```

**阶段二：Hybrid APK（打包后）**

```python
desired_caps = {
    "platformName": "Android",
    "appium:deviceName": "MuMu",
    "appium:app": r"E:\banwuxing\dist\banwuxing.apk",
    "appium:appPackage": "com.banwuxing.app",   # 以打包配置为准
    "appium:appActivity": ".MainActivity",
    "appium:automationName": "UiAutomator2",
    "appium:noReset": False,
}
# 启动后切换到 WebView context：
# driver.switch_to.context("WEBVIEW_com.banwuxing.app")
```

---

## 5. 自动化框架设计（对齐课程 Day2-Day3）

### 5.1 框架架构（分层）

```
┌─────────────────────────────────────────────────────────────┐
│ 执行入口：Jenkins 流水线 / 命令行 pytest -m "p0"            │
├─────────────────────────────────────────────────────────────┤
│ 测试用例层 testcases/  按模块分组：认证/通知/考勤/作业/...   │
│    pytest 用例 + 断言（UI断言 + 接口二次校验）               │
├─────────────────────────────────────────────────────────────┤
│ 页面对象层 pages/  PO：login_page / home_page / notice_page │
│    考勤页 / 作业页 / 活动页 / 投票页 / 班费页 / 设置页      │
│    页面 = 元素定位 + 操作方法，一个页面一个类                │
├─────────────────────────────────────────────────────────────┤
│ 封装层 base/     BasePage（find/click/input/swipe/wait）    │
│    Driver（启动/关闭会话） Config（读取 yaml）              │
│    DataLoader（数据驱动） Common（断言/截图/日志）           │
├─────────────────────────────────────────────────────────────┤
│ 驱动层  Appium-Python-Client → Appium Server                │
│         → UiAutomator2 / ChromeDriver → Android 模拟器      │
└─────────────────────────────────────────────────────────────┘
支撑：config/（环境配置）  data/（用例数据 yaml/json/excel）
      report/（Allure 结果） logs/   screenshots/（失败截图）
```

### 5.2 自动化测试工程目录结构

```
banwuxing-appium/                      # 建议新建于 E:\班务星app\appium-test\
├── config/
│   ├── caps_h5.yaml                   # 阶段一 capabilities
│   ├── caps_apk.yaml                  # 阶段二 capabilities
│   └── env.yaml                       # base_url / 账号 / 超时等
├── base/
│   ├── driver.py                      # 会话创建与销毁
│   ├── base_page.py                   # find/click/input/swipe/wait 封装
│   ├── config.py                      # 配置读取
│   └── data_loader.py                 # yaml/excel 数据读取
├── pages/
│   ├── login_page.py                  # 登录/注册/重置
│   ├── home_page.py                   # 首页 + Tab 导航
│   ├── notice_page.py                 # 通知列表/详情/签收/发布
│   ├── attendance_page.py             # 考勤列表/签到/请假
│   ├── homework_page.py               # 作业列表/详情/提交/发布
│   ├── activity_page.py               # 活动列表/报名/发布
│   ├── vote_page.py                   # 投票/抽签
│   ├── fee_page.py                    # 班费账本/缴费登记
│   └── profile_page.py                # 个人中心/设置
├── testcases/
│   ├── conftest.py                    # fixture：driver/登录态/数据清理
│   ├── test_auth.py                   # P0 认证
│   ├── test_notice.py                 # P0 通知
│   ├── test_attendance.py             # P0 考勤
│   ├── test_homework.py               # P0 作业
│   ├── test_activity.py               # P1 活动
│   ├── test_vote.py                   # P1 投票
│   ├── test_fee.py                    # P1 班费
│   ├── test_tools.py                  # P2 抽签/番茄钟
│   ├── test_material.py               # P2 资料档案
│   ├── test_settings.py               # P2 设置
│   └── test_e2e.py                    # 端到端
├── data/
│   ├── login_data.yaml                # 登录数据驱动
│   ├── notice_data.yaml
│   └── ...                            # 各模块数据
├── utils/
│   ├── api_client.py                  # 接口二次校验（requests）
│   ├── screenshot.py
│   └── logger.py
├── requirements.txt
├── pytest.ini                         # marker：p0/p1/p2/smoke
└── conftest.py                        # 顶层：allure 环境信息
```

### 5.3 关键代码设计要点

**driver.py（会话管理，对应课程 24 集 BASE 方法）**

```python
from appium import webdriver

def create_driver(caps: dict):
    driver = webdriver.Remote("http://127.0.0.1:4723/wd/hub", caps)
    driver.implicitly_wait(5)
    return driver
```

**base_page.py（元素操作统一封装）**

```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class BasePage:
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)   # 显示等待，对应课程 12 集

    def find(self, locator):
        return self.wait.until(EC.visibility_of_element_located(locator))

    def click(self, locator):
        self.find(locator).click()

    def input(self, locator, text):
        self.find(locator).clear()
        self.find(locator).send_keys(text)

    def swipe_up(self, duration=500):
        size = self.driver.get_window_size()
        self.driver.swipe(size["width"]/2, size["height"]*0.8,
                          size["width"]/2, size["height"]*0.2, duration)

    def get_toast(self, message, timeout=5):
        """断言 Toast 提示（Android）"""
        return self.wait.until(EC.presence_of_element_located(
            ("xpath", f"//*[contains(@text,'{message}')]")))
```

**conftest.py（前置与清理，对应课程 27 集优化处理）**

```python
import pytest

@pytest.fixture(scope="session")
def driver():
    from base.driver import create_driver
    from base.config import Config
    d = create_driver(Config.caps())
    yield d
    d.quit()                     # 课程 35 集：关闭 APP 操作

@pytest.fixture(scope="session")
def login(driver):
    """登录态前置：学生/班委/管理员三种账号由参数化注入"""
    from pages.login_page import LoginPage
    LoginPage(driver).login(Config.admin_account())
    yield driver

@pytest.fixture(autouse=True)
def clean_data():
    """用例前后调用后端清理脚本（复用 back/tmp-cleanup.mjs 思路）"""
    yield
```

### 5.4 元素定位策略（对应课程 05/10/11 集）

班务星 H5 版渲染为常规 DOM，定位优先级：

| 优先级 | 方式 | 示例（Taro H5 DOM） |
|---|---|---|
| 1 | 文本 XPath（最稳） | `//*[contains(text(),'登录')]`、`//*[contains(text(),'签收')]` |
| 2 | placeholder / 输入框属性 | `//input[@placeholder='请输入手机号']`、`//input[@type='password']` |
| 3 | 语义化 class | `//*[contains(@class,'submit-btn')]`、`.cell-title` |
| 4 | 组合（文本+层级） | `//div[contains(@class,'list-item')]//*[contains(text(),'语文作业')]` |

要点：
- **所有业务断言优先用文本定位**，班务星 UI 文案稳定（如“签收”“提交作业”“报名”“投票”）；
- 列表页（作业/通知/活动）用 `swipe_up()` 滚动加载后断言；
- 所有定位先走 `WebDriverWait` 显示等待，避免首屏渲染慢导致误报；
- 阶段二 WebView 下定位方式不变（context 切换后同为 DOM）；
- 定位失败自动截图保存到 `screenshots/`，并附带 allure 附件。

---

## 6. 测试用例设计（核心交付）

### 6.1 用例设计规范

- 编号规则：`BWX-<模块>-<序号>`，模块简写：AUTH/NOT/ATT/HWK/ACT/VOT/FEE/TOOL/MAT/SET/E2E。
- 每条用例字段：编号、用例名称、优先级、前置条件、操作步骤、预期结果、数据（见附录）。
- 断言三要素：**UI 断言（页面元素/文案/Toast）＋ 跳转断言（当前 URL/路由）＋ 接口二次校验（后端数据落库）**。
- 涉及发布/提交类操作，用例结束后调用清理接口（或独立测试库）隔离脏数据。

### 6.2 P0-认证模块（AUTH，10 条）

| 编号 | 用例名称 | 前置 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| BWX-AUTH-01 | 注册成功跳转登录 | 后端可注册新号 | 进入注册页→输入新手机号/姓名/密码→提交 | 提示注册成功，跳转登录页 |
| BWX-AUTH-02 | 注册-两次密码不一致拦截 | 同上 | 两次密码输入不同→提交 | 表单校验提示，不跳转 |
| BWX-AUTH-03 | 注册-弱密码拦截 | 同上 | 输入纯数字密码→提交 | 提示密码需含字母数字，8-20 位 |
| BWX-AUTH-04 | 登录成功进入首页 | 已注册账号 | 输入正确手机号密码→登录 | 跳转首页，展示用户信息/班级 Tab |
| BWX-AUTH-05 | 登录-错误密码失败 | 已注册账号 | 输入错误密码→登录 | 提示“手机号或密码错误” |
| BWX-AUTH-06 | 登录-空手机号拦截 | - | 不输入手机号→登录 | 表单校验提示 |
| BWX-AUTH-07 | 登录-密码错误 5 次锁定 | 测试账号 | 连续 5 次错误密码 | 第 5 次提示账号锁定 15 分钟 |
| BWX-AUTH-08 | 忘记密码-重置后新密码登录 | 已注册账号 | 忘记密码→验证码→设新密码→新密码登录 | 重置成功，新密码可登录 |
| BWX-AUTH-09 | 加入班级-输入班级码 | 有班级码 | 加入班级→输入 6-8 位班级码→加入 | 加入成功，首页出现班级信息 |
| BWX-AUTH-10 | 加入班级-错误班级码 | - | 输入不存在的班级码 | 提示班级码错误 |

### 6.3 P0-通知模块（NOT，8 条）

| 编号 | 用例名称 | 前置 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| BWX-NOT-01 | 通知列表加载 | 班级有通知 | 底部Tab“通知”→进入列表 | 列表展示标题/时间/未读红点 |
| BWX-NOT-02 | 通知类型筛选 | 有通知/作业/活动 | 按“作业”筛选 | 仅显示作业类通知 |
| BWX-NOT-03 | 通知详情查看 | - | 点击通知进入详情 | 展示标题、内容、时间、地点 |
| BWX-NOT-04 | 通知签收 | 需签收通知 | 详情页点“签收” | 状态变已签收，Toast 确认 |
| BWX-NOT-05 | 重复签收幂等 | 已签收 | 再次点击签收 | 提示“已签收，不能重复签收” |
| BWX-NOT-06 | 发布通知-必填校验 | 班委账号 | 空标题→发布 | 拦截提示 |
| BWX-NOT-07 | 发布通知-全班 | 班委账号 | 填写标题/内容→需签收→发布 | 发布成功，学生端列表可见 |
| BWX-NOT-08 | 通知统计-签收名单 | 班委 + 学生已签收 | 统计页查看签收数据 | 已读/未读、已签收/未签收数字正确 |

### 6.4 P0-考勤模块（ATT，8 条）

| 编号 | 用例名称 | 前置 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| BWX-ATT-01 | 考勤列表加载 | 班内有考勤 | 首页→我的考勤 | 列表展示状态（未开始/进行中/已结束） |
| BWX-ATT-02 | 手动签到成功 | 进行中考勤 | 签到页→点击“签到” | 状态变“已签到”，可查看 |
| BWX-ATT-03 | 重复签到拦截 | 已签到 | 再次签到 | 提示已签到 |
| BWX-ATT-04 | 迟到标记 | 考勤进行中且超时 | 超时后签到 | 状态标记“迟到” |
| BWX-ATT-05 | 发布考勤-手动 | 班委账号 | 发布考勤→手动方式→设置时间→发布 | 学生端可见可签到 |
| BWX-ATT-06 | 发布考勤-必填校验 | 班委账号 | 空标题→发布 | 拦截提示 |
| BWX-ATT-07 | 请假申请-提交 | 学生账号 | 请假页→选类型/理由/时间→提交 | 状态“待审批” |
| BWX-ATT-08 | 请假审批-通过 | 班委账号 | 审批页→查看→通过 | 学生端状态变“已批准” |

### 6.5 P0-作业模块（HWK，8 条）

| 编号 | 用例名称 | 前置 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| BWX-HWK-01 | 作业列表加载 | 班内有作业 | 首页→我的作业 | 列表展示标题/截止时间/提交状态 |
| BWX-HWK-02 | 作业状态筛选 | 有进行中/已截止 | 按“已截止”筛选 | 仅显示已截止作业 |
| BWX-HWK-03 | 作业详情查看 | - | 点击作业 | 展示内容、截止时间、附件 |
| BWX-HWK-04 | 提交作业-文字 | 未截止 | 详情→提交→输入内容→提交 | 状态变“已提交” |
| BWX-HWK-05 | 提交作业-附件 | 未截止 | 提交→上传图片→提交 | 提交成功，附件可查看 |
| BWX-HWK-06 | 截止后提交拦截 | 已截止作业 | 尝试提交 | 提示已截止，无提交入口 |
| BWX-HWK-07 | 发布作业-设置截止时间 | 班委账号 | 发布→标题/内容/截止→发布 | 学生端可见，状态计算正确 |
| BWX-HWK-08 | 延时申请-提交 | 已截止作业 | 详情→申请延时→理由→提交 | 状态“待审批” |

### 6.6 P1-活动模块（ACT，6 条）

| 编号 | 用例名称 | 前置 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| BWX-ACT-01 | 活动列表加载 | 班内有活动 | 首页→我的活动 | 列表展示活动状态 |
| BWX-ACT-02 | 活动报名-成功 | 报名中 | 详情→报名→填写→确认 | 状态变“已报名” |
| BWX-ACT-03 | 重复报名拦截 | 已报名 | 再次报名 | 提示已报名 |
| BWX-ACT-04 | 取消报名 | 已报名 | 点击“取消报名” | 状态变未报名，名额释放 |
| BWX-ACT-05 | 发布活动-设置人数上限 | 班委账号 | 发布→标题/时间/上限→发布 | 学生端可见，满员后提示候补 |
| BWX-ACT-06 | 报名统计-名单 | 班委账号 | 详情→报名统计 | 人数/名单/已签到正确 |

### 6.7 P1-投票模块（VOT，5 条）

| 编号 | 用例名称 | 前置 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| BWX-VOT-01 | 投票列表加载 | 班内有投票 | 首页→投票 | 列表展示状态（进行中/已结束） |
| BWX-VOT-02 | 单选投票-提交 | 进行中投票 | 详情→选一项→提交 | 提示投票成功 |
| BWX-VOT-03 | 重复投票拦截 | 已投票 | 再次进入投票 | 提示每人限投一次 |
| BWX-VOT-04 | 发布投票-多选/匿名 | 班委账号 | 发布→类型/选项/截止→发布 | 学生端可见可投 |
| BWX-VOT-05 | 投票结果统计 | 已有投票数据 | 查看结果 | 结果百分比/票数正确 |

### 6.8 P1-班费模块（FEE，5 条）

| 编号 | 用例名称 | 前置 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| BWX-FEE-01 | 班费账本-收支明细 | 有记录 | 首页→班费→账本 | 收入/支出/余额正确 |
| BWX-FEE-02 | 记账-收入 | 班委账号 | 添加记录→收入→金额/用途→确认 | 账本新增一条，余额增加 |
| BWX-FEE-03 | 记账-金额校验 | 班委账号 | 金额为 0 或负数→确认 | 拦截提示 |
| BWX-FEE-04 | 缴费登记-勾选学生 | 班委账号 | 缴费登记→选项目/金额→勾选已缴→确认 | 学生状态变“已缴费” |
| BWX-FEE-05 | 财务报表-月度统计 | 有数据 | 报表页查看 | 月度收支/趋势正确 |

### 6.9 P2-工具模块（TOOL，5 条）

| 编号 | 用例名称 | 前置 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| BWX-TOOL-01 | 随机抽签-正常抽取 | 班委账号，成员≥2 | 抽签→设人数→开始 | 结果人数正确、无重复 |
| BWX-TOOL-02 | 随机抽签-排除人员 | 班委账号 | 排除 1 人后抽签 | 被排除者不出现 |
| BWX-TOOL-03 | 随机抽签-成员不足拦截 | 成员数＜抽取数 | 开始抽签 | 提示成员不足 |
| BWX-TOOL-04 | 抽签记录-作废 | 班委账号 | 历史记录→作废 | 记录状态变已作废 |
| BWX-TOOL-05 | 番茄钟-开始/完成 | 学生账号 | 开始→计时→完成 | 专注时长入统计 |

### 6.10 P2-资料档案与设置（MAT/SET，8 条）

| 编号 | 用例名称 | 前置 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| BWX-MAT-01 | 资料库-分类浏览 | 有资料 | 资料库→选分类 | 分类下资料列表正确 |
| BWX-MAT-02 | 资料上传-必填校验 | 班委账号 | 空标题上传 | 拦截提示 |
| BWX-MAT-03 | 班级档案-创建/查看 | 班委账号 | 创建档案→上传附件→查看 | 档案列表可见，附件可下载 |
| BWX-SET-01 | 个人信息-修改姓名 | 学生账号 | 我的→个人信息→改姓名 | 保存成功（待审核状态） |
| BWX-SET-02 | 手机号脱敏展示 | 已登录 | 查看账号与安全 | 手机号显示 139***1111 形式 |
| BWX-SET-03 | 修改密码-旧密码错误 | 已登录 | 输入错误旧密码→保存 | 提示旧密码错误 |
| BWX-SET-04 | 消息通知开关 | 已登录 | 设置→通知→关闭开关 | 开关状态持久化 |
| BWX-SET-05 | 意见反馈-提交 | 已登录 | 帮助反馈→填写→提交 | 提示提交成功，我的反馈可见 |

### 6.11 端到端全流程（E2E，3 条）

| 编号 | 用例名称 | 前置 | 操作步骤 | 预期结果 |
|---|---|---|---|---|
| BWX-E2E-01 | 学生日常闭环 | 学生+班委双账号 | 班委发布通知/作业/考勤 → 学生登录查看、签收、提交、签到 | 全链路数据一致（列表/统计页可见） |
| BWX-E2E-02 | 班级活动闭环 | 班委账号 | 发布活动 → 报名 → 取消 → 再报名 → 统计 | 报名数据正确，统计一致 |
| BWX-E2E-03 | 班费记账闭环 | 班委账号 | 收入记账 → 支出记账 → 缴费登记 → 报表 | 余额=收入-支出，报表与账本一致 |

### 6.12 用例统计汇总

| 模块 | 优先级 | 用例数 |
|---|---|---|
| 认证 AUTH | P0 | 10 |
| 通知 NOT | P0 | 8 |
| 考勤 ATT | P0 | 8 |
| 作业 HWK | P0 | 8 |
| 活动 ACT | P1 | 6 |
| 投票 VOT | P1 | 5 |
| 班费 FEE | P1 | 5 |
| 工具 TOOL | P2 | 5 |
| 资料档案/设置 MAT/SET | P2 | 8 |
| 端到端 E2E | 冒烟 | 3 |
| **合计** | | **66** |

---

## 7. 数据驱动设计（对应课程 34 集）

### 7.1 数据文件与用途

| 数据文件 | 驱动用例 | 内容 |
|---|---|---|
| `data/login_data.yaml` | BWX-AUTH-04~07 | 账号/密码/预期提示 |
| `data/notice_data.yaml` | BWX-NOT-06~08 | 发布通知标题/类型/签收开关 |
| `data/attendance_data.yaml` | BWX-ATT-05~08 | 考勤方式/时间/请假类型 |
| `data/homework_data.yaml` | BWX-HWK-04~08 | 作业标题/科目/截止时间 |
| `data/activity_data.yaml` | BWX-ACT-02~06 | 活动标题/人数上限 |
| `data/vote_data.yaml` | BWX-VOT-02~05 | 投票类型/选项/匿名 |
| `data/fee_data.yaml` | BWX-FEE-02~05 | 收支类型/金额/用途 |

示例 `login_data.yaml`：

```yaml
valid:
  phone: "13800000001"
  password: "Test@1234"
  expect: "首页"
invalid_password:
  phone: "13800000001"
  password: "wrong123"
  expect: "手机号或密码错误"
empty_phone:
  phone: ""
  password: "Test@1234"
  expect: "请输入手机号"
locked:
  phone: "13800000001"
  password: "Wrong@0001"
  expect: "账号已锁定"
```

### 7.2 测试数据准备（附录 A 展开）

| 项 | 方案 |
|---|---|
| 账号 | 管理员/班委/学生各 1 个，固定密码，存 `config/env.yaml` |
| 验证码 | 测试环境后端支持固定万能验证码（如 `888888`），短信通道 mock |
| 数据隔离 | 独立测试库 `banwuxing_test`；每条用例清理脚本（复用 `back/tmp-cleanup.mjs`） |
| 班级码 | 固定测试班级码（如 `88888888`） |

---

## 8. 断言与校验策略

1. **UI 断言**：页面元素存在、文本内容、Toast 提示、跳转路由 —— 覆盖 90% 用例。
2. **接口二次校验**（utils/api_client.py）：发布/提交类用例执行后调用后端 API 校验数据落库（如发布通知后 `GET /classes/{id}/messages` 列表包含该标题）。前端断言 + 接口校验双保险。
3. **数据库校验（可选）**：对金额、统计类用例直接查 MySQL 明细（复用 Prisma 或直连查询）。
4. **失败处理**：断言失败自动截图 + allure 附件 + 日志；`pytest.ini` 配置 `--maxfail`，P0 失败即中断冒烟。

---

## 9. 测试报告与持续集成（对应课程 46/49/50/51 集）

### 9.1 Allure 报告

```bash
pytest testcases -m p0 --alluredir=report/allure-results
allure generate report/allure-results -o report/allure-report --clean
allure open report/allure-report
```

- 用例加 `@allure.feature("认证")`、`@allure.story("登录")`、`@allure.title`，生成功能树报告；
- 失败用例自动附加截图与页面源码；
- 每次构建产物保留 30 天。

### 9.2 Git 版本管理（对应课程 48/49 集）

- 自动化工程独立仓库 `banwuxing-appium`（或并入主仓库 `appium-test/` 目录）；
- `.gitignore` 忽略：`report/`、`screenshots/`、`logs/`、`__pycache__/`、`.pytest_cache/`、`allure-results/`；
- 分支策略：`main`（稳定用例集）＋ `feature/*`（用例开发），PR 合并触发 Jenkins。

### 9.3 Jenkins 流水线（对应课程 50/51 集）

```groovy
pipeline {
    agent any
    triggers {
        cron('H 6 * * *')            // 每日 06:00 定时回归
        upstream(upstreamProjects: 'banwuxing-backend', threshold: hudson.model.Result.SUCCESS)
    }
    stages {
        stage('拉取代码') { steps { git branch: 'main', url: '.../banwuxing-appium.git' } }
        stage('环境准备') { steps { sh 'pip install -r requirements.txt' } }
        stage('启动后端') { steps { sh 'cd ../back && npm run start:dev &' } }
        stage('执行测试') { steps { sh 'pytest testcases -m p0 --alluredir=report/allure-results' } }
        stage('生成报告') { steps { sh 'allure generate report/allure-results -o report/allure-report --clean' } }
        stage('发布报告') { steps { publishHTML([htmlDir: 'report/allure-report', reportName: '班务星App自动化报告']) } }
    }
    post {
        failure { emailext(subject: '班务星app 回归失败', to: 'team@example.com') }
    }
}
```

- Jenkins 侧安装：Allure、HTML Publisher、Email Extension 插件；
- 模拟器需保持常驻（MuMu 后台运行），或使用 Jenkins Slave + 独立测试机。

---

## 10. 三天实施计划（对齐课程节奏）

| 天 | 课程对应 | 任务 | 交付物 | 完成标准 |
|---|---|---|---|---|
| **Day1** | 01-19 集 | ①搭建模拟器+Appium+ChromeDriver 环境；②元素定位摸底（登录/首页/通知）；③编写登录脚本与显示等待；④验证码 mock | 环境可用 + 登录脚本可跑 | `adb devices` 识别；登录成功用例通过 |
| **Day2** | 20-39 集 | ①建立 base/driver/conftest 骨架；②封装登录/首页/通知/考勤/作业 PO；③登录数据驱动 + 成功/失败断言；④P0 通知/考勤/作业用例开发 | PO 层 + P0 用例 | P0 用例全部通过，接口二次校验生效 |
| **Day3** | 40-52 集 | ①P1/P2 模块封装与用例；②E2E 流程；③Allure 报告接入；④git 提交；⑤Jenkins 流水线 | 全量用例 + 报告 + CI | 全量 66 条通过率 ≥95%；Jenkins 定时回归可运行 |

---

## 11. 风险与应对措施

| 风险 | 等级 | 应对 |
|---|---|---|
| H5 元素不稳定（Taro 渲染 class 随机/动态） | 高 | 文本 XPath 优先；PO 层集中维护定位器；失败重试机制（pytest-rerunfailures，限 1 次） |
| 模拟器与后端联调网络不通 | 中 | 用 `10.0.2.2` 映射宿主机；提前在模拟器 Chrome 手动验证登录页 |
| 验证码/短信依赖 | 中 | 测试环境万能验证码 + 短信 mock（7.2） |
| 二维码/GPS/OCR 功能无法自动化 | 中 | 划入“暂不自动化”（3.3），真机专项另行处理 |
| 测试数据污染（发布类用例） | 中 | 独立测试库 + 每用例清理脚本；用例幂等设计 |
| 账号锁定（5 次失败用例） | 低 | 锁定用例使用独立专用账号，不与其他用例共用 |
| Jenkins 无法访问模拟器 | 低 | 模拟器常驻 + adb 连接检查 stage；必要时独立测试机 |
| 已知前端缺陷（TabBar 遮挡、关于/反馈首屏空白） | 低 | 先记录为已知问题；对应用例标记 `xfail`，修复后取消 |

---

## 12. 验收标准

1. 环境与工程：`appium-test/` 工程可一键安装依赖并启动测试。
2. 用例规模与通过率：全量 66 条用例，P0 通过率 100%，全量 ≥95%（已知缺陷 xfail 除外）。
3. 报告：Allure 报告含功能树、用例步骤、失败截图，可离线查看。
4. CI：Jenkins 每日定时回归 + 后端构建后触发，失败自动邮件告警。
5. 回归效率：P0 回归 ≤15 分钟；全量回归 ≤40 分钟。
6. 文档：《自动化测试方案》本文件 + 运行手册（环境/命令/常见问题）。

---

## 附录 A：测试账号与数据准备

| 角色 | 手机号（建议） | 密码 | 用途 |
|---|---|---|---|
| 管理员 | 13800000001 | Test@1234 | 班级设置、班委管理 |
| 班委 | 13800000002 | Test@1234 | 发布类用例（通知/作业/考勤/活动/投票/班费） |
| 学生 | 13800000003 | Test@1234 | 签到/提交/投票/报名类用例 |
| 锁定专用 | 13800000004 | Test@1234 | 5 次错误密码锁定用例 |

班级：固定测试班级码 `88888888`；测试库 `banwuxing_test`，清理脚本复用 `back/tmp-cleanup.mjs` 思路。

## 附录 B：已核实的关键技术事实

| 事实 | 来源 |
|---|---|
| 移动端 Taro 4.2.1 + React 18 + TS，构建目标 weapp/h5/rn 等 | `mobile/package.json` |
| 底部 5 Tab：首页/班级/通知/数据/我的 | `mobile/src/app.config.ts` |
| 9 个业务子包 70+ 页面清单 | `mobile/src/app.config.ts` + `pages-sub/` |
| 后端本地 `http://localhost:3000/api/v1`，NestJS + Prisma + MySQL + Redis + MinIO | `mobile/.env.development`、`docs/班务星app系统架构图.md` |
| 接口级测试已覆盖认证/通知/考勤/作业/活动/投票/班费/工具/设置（13 脚本，约 90 项） | `docs/分模块测试清单.md` |
| 已知缺陷：TabBar 遮挡、关于/帮助首屏空白、文件上传大小限制缺失 | `docs/分模块测试清单.md` 阶段5/6、安全专项 |

## 附录 C：课程视频对照索引

| 本方案章节 | 课程集数 | 对应内容 |
|---|---|---|
| 第 4 章 环境搭建 | 01-07、15、45 | Appium 介绍/环境/验证、adb、安装卸载、模拟器使用 |
| 第 5.4 节 元素定位 | 05、09-13、16-18 | 定位工具、核心 API、点击/输入、显示等待、元素属性、滑动 |
| 第 5.3 节 BASE/PO 封装 | 20-27、35 | 工作原理、框架结构、BASE 方法、进入首页、conftest、关闭 APP |
| 第 6 章 登录/业务用例 | 29-38、40-44 | 登录页封装/断言/数据驱动、搜索/购物车/订单页面封装 |
| 第 9 章 报告与 CI | 46-52 | Allure 报告、gitignore、git 推送、Jenkins 集成/错误处理 |
