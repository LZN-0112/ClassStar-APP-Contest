import { expect, type Locator, type Page } from '@playwright/test';

/** 测试账号统一密码（满足后端 ^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,20}$） */
export const PASSWORD = 'Test12345';

let seq = 0;

/** 生成唯一 11 位手机号（满足 ^1[3-9]\d{9}$，避免注册冲突） */
export function uniquePhone(): string {
  seq += 1;
  const ts = String(Date.now()).slice(-7);
  return `139${ts}${seq % 10}`;
}

/** 生成未来 N 天的 datetime-local 输入值（YYYY-MM-DDTHH:mm，本机时区） */
export function futureDateTimeInputValue(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 以「整页刷新」方式进入指定 hash 页面并等待锚点可见。
 * 背景：App 使用 AnimatePresence(mode="wait") + 0.25s 过渡动画，navigate 后 URL 立即变化，
 * 但旧页面实例仍挂在 DOM 上直到退场动画结束——直接操作会命中旧页面的同名元素
 * （如注册页与登录页都有「请输入手机号」输入框），导致输入落到即将卸载的实例上。
 * 整页刷新可保证目标页面是唯一且全新的实例（局部状态清零，登录态存于 localStorage 不受影响）。
 */
export async function gotoFresh(page: Page, hash: string, anchor: Locator): Promise<void> {
  await page.goto(`/#${hash}`);
  await page.reload();
  await expect(anchor).toBeVisible({ timeout: 20_000 });
}

/** 勾选协议框并断言确实处于勾选态（背景色 #0062FF） */
export async function checkAgreement(page: Page): Promise<void> {
  const box = page.locator('[data-pencil-name="Agreement"] > div').first();
  await box.click();
  await expect(box).toHaveCSS('background-color', 'rgb(0, 98, 255)');
}

/** 注册（真实 UI 全链路），成功后停留在 /login */
export async function registerViaUI(page: Page, phone: string): Promise<void> {
  await page.goto('/#/register');
  const phoneInput = page.getByPlaceholder('请输入手机号');
  await expect(phoneInput).toBeVisible({ timeout: 20_000 });
  await phoneInput.fill(phone);
  await expect(phoneInput).toHaveValue(phone);
  const passwordInput = page.getByPlaceholder('请输入密码');
  await passwordInput.fill(PASSWORD);
  await expect(passwordInput).toHaveValue(PASSWORD);
  const confirmInput = page.getByPlaceholder('请再次输入密码');
  await confirmInput.fill(PASSWORD);
  await expect(confirmInput).toHaveValue(PASSWORD);
  await checkAgreement(page);
  await page.locator('[data-pencil-name="Register Button"]').click();
  await expect(page).toHaveURL(/#\/login/, { timeout: 20_000 });
}

/** 登录（真实 UI 全链路），成功后落在 /join-class */
export async function loginViaUI(page: Page, phone: string): Promise<void> {
  await gotoFresh(page, '/login', page.getByText('欢迎回来'));
  const phoneInput = page.getByPlaceholder('请输入手机号');
  await phoneInput.fill(phone);
  await expect(phoneInput).toHaveValue(phone);
  const passwordInput = page.getByPlaceholder('请输入密码');
  await passwordInput.fill(PASSWORD);
  await expect(passwordInput).toHaveValue(PASSWORD);
  await checkAgreement(page);
  await page.locator('[data-pencil-name="Login Button"]').click();
  await expect(page).toHaveURL(/#\/join-class/, { timeout: 30_000 });
}

/** 在 /join-class 创建班级，返回 6 位班级码（页面停留在邀请卡片） */
export async function createClassViaUI(page: Page, name: string): Promise<string> {
  const createButton = page.locator('[data-pencil-name="Create Button"]');
  await expect(createButton).toBeVisible({ timeout: 20_000 });
  await createButton.click();
  const nameInput = page.getByPlaceholder('请输入班级名称');
  await nameInput.fill(name);
  await expect(nameInput).toHaveValue(name);
  await page.getByRole('button', { name: '创建', exact: true }).click();
  const codeEl = page.locator('[data-pencil-name="Class Code"]');
  await expect(codeEl).toContainText('班级码', { timeout: 20_000 });
  const code = (await codeEl.innerText()).replace(/\D/g, '');
  expect(code).toHaveLength(6);
  return code;
}

/** 在 /join-class 输入班级码加入班级，成功后落在 /home */
export async function joinClassViaUI(page: Page, code: string): Promise<void> {
  const codeInput = page.locator('[data-pencil-name="Class Code Input"]');
  await expect(codeInput).toBeVisible({ timeout: 20_000 });
  await codeInput.fill(code);
  await expect(codeInput).toHaveValue(code);
  await page.locator('[data-pencil-name="Join Button"]').click();
  await expect(page).toHaveURL(/#\/home/, { timeout: 20_000 });
}

/** 等待 useCurrentUser 将 classId 写入 localStorage（确保后续依赖班级上下文的页面就绪） */
export async function waitForClassContext(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const raw = localStorage.getItem('currentUser');
      if (!raw) return false;
      try {
        return Boolean((JSON.parse(raw) as { classId?: string }).classId);
      } catch {
        return false;
      }
    },
    undefined,
    { timeout: 15_000 },
  );
}

/** 发布通知（默认开启签收确认）→ 断言 toast「发布成功」并落 /message-list */
export async function publishNoticeViaUI(page: Page, title: string): Promise<void> {
  await page.goto('/#/publish-message');
  await page.getByPlaceholder('请输入通知标题').fill(title);
  await page
    .locator('[data-pencil-name="Time Input"] input[type="datetime-local"]')
    .fill(futureDateTimeInputValue(1));
  await page.getByPlaceholder('请输入地点').fill('E2E 测试教室');
  await page.getByPlaceholder('请输入通知内容...').fill('这是自动化端到端测试发布的通知内容');
  await page.locator('[data-pencil-name="Publish Button"]').click();
  await expect(page.getByText('发布成功', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/#\/message-list/, { timeout: 15_000 });
}

/** 发布作业 → 断言 toast「作业发布成功」并落 /homework-list */
export async function publishHomeworkViaUI(page: Page, title: string): Promise<void> {
  await page.goto('/#/publish-homework');
  await page.getByPlaceholder('请输入作业名称').fill(title);
  await page
    .locator('[data-pencil-name="Input Field"] input[type="datetime-local"]')
    .fill(futureDateTimeInputValue(7));
  await page.getByPlaceholder('请输入作业要求...').fill('这是自动化端到端测试发布的作业要求');
  await page.locator('[data-pencil-name="Button Primary"]').click();
  await expect(page.getByText('作业发布成功', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/#\/homework-list/, { timeout: 15_000 });
}

/** 发布投票（单选，2 个选项）→ 断言 toast「投票发布成功」并落 /vote-list */
export async function publishVoteViaUI(
  page: Page,
  title: string,
  options: [string, string],
): Promise<void> {
  await page.goto('/#/publish-vote');
  await page.getByPlaceholder('请输入投票标题').fill(title);
  await page.locator('[data-pencil-name="Option 1"] input').fill(options[0]);
  await page.locator('[data-pencil-name="Option 2"] input').fill(options[1]);
  await page
    .locator('[data-pencil-name="Settings Card"] input[type="datetime-local"]')
    .fill(futureDateTimeInputValue(7));
  await page.locator('[data-pencil-name="Button Primary"]').click();
  await expect(page.getByText('投票发布成功', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/#\/vote-list/, { timeout: 15_000 });
}