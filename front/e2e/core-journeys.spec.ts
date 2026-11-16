import { expect, test, type StorageState } from '@playwright/test';
import {
  createClassViaUI,
  joinClassViaUI,
  loginViaUI,
  publishHomeworkViaUI,
  publishNoticeViaUI,
  publishVoteViaUI,
  registerViaUI,
  uniquePhone,
  waitForClassContext,
} from './helpers';

/**
 * L4 核心旅程（真实前后端全链路，无 mock）
 *
 * 为避免触发后端注册限流（5 次/分钟/IP）与登录限流（10 次/分钟/IP），
 * 账号仅在 beforeAll 中通过真实 UI 注册/登录一次（A、B 各一个），
 * 三条旅程通过 storageState 复用登录态，各自使用全新浏览器上下文（互不污染）。
 *
 * 旅程 1：发布通知 → 学生未读红点 → 打开详情 → 确认签收 → 已读红点消失
 * 旅程 2：发布作业 → 学生在「我的作业」可见（待提交）
 * 旅程 3：发布投票 → 学生投票 → 列表状态变更 → 结果页展示票数
 */

const stamp = Date.now();
const className = `E2E班级-${stamp}`;
const noticeTitle = `E2E通知-${stamp}`;
const homeworkTitle = `E2E作业-${stamp}`;
const voteTitle = `E2E投票-${stamp}`;
const VOTE_OPTION_A = '选项甲';
const VOTE_OPTION_B = '选项乙';

let stateA: StorageState;
let stateB: StorageState;

test.beforeAll(async ({ browser }) => {
  // 该 hook 包含两个账号的完整注册/登录/建班/入班链路（含首次冷编译），放宽到 180s
  test.setTimeout(180_000);

  // 账号 A：注册 → 登录 → 创建班级 → 进入班级（真实 UI 全链路）
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  const phoneA = uniquePhone();
  await registerViaUI(pageA, phoneA);
  await loginViaUI(pageA, phoneA);
  const classCode = await createClassViaUI(pageA, className);
  await pageA.locator('[data-pencil-name="Enter Class Button"]').click();
  await expect(pageA).toHaveURL(/#\/home/, { timeout: 15_000 });
  await waitForClassContext(pageA);
  stateA = await ctxA.storageState();
  await ctxA.close();

  // 账号 B：注册 → 登录 → 凭班级码加入班级（真实 UI 全链路）
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  const phoneB = uniquePhone();
  await registerViaUI(pageB, phoneB);
  await loginViaUI(pageB, phoneB);
  await joinClassViaUI(pageB, classCode);
  await waitForClassContext(pageB);
  stateB = await ctxB.storageState();
  await ctxB.close();
});

test('旅程1：发布通知 → 学生未读红点 → 确认签收 → 已读红点消失', async ({ browser }) => {
  // —— A 侧：发布通知 ——
  const ctxA = await browser.newContext({ storageState: stateA });
  const pageA = await ctxA.newPage();
  await publishNoticeViaUI(pageA, noticeTitle);
  // 发布成功后在通知列表可见该通知
  await expect(pageA.locator(`[data-pencil-name="${noticeTitle}"]`)).toBeVisible({
    timeout: 15_000,
  });
  await ctxA.close();

  // —— B 侧：未读红点 → 打开详情 → 确认签收 ——
  const ctxB = await browser.newContext({ storageState: stateB });
  const pageB = await ctxB.newPage();
  await pageB.goto('/#/message-list');
  const item = pageB.locator(`[data-pencil-name="${noticeTitle}"]`);
  await expect(item).toBeVisible({ timeout: 15_000 });
  await expect(item.locator('[data-pencil-name="Unread Dot"]')).toBeVisible();

  await item.click();
  await expect(pageB).toHaveURL(/#\/message-detail\//, { timeout: 15_000 });
  const ackButton = pageB.locator('[data-pencil-name="Ack Button"]');
  await expect(ackButton).toContainText('确认签收');
  await ackButton.click();
  await expect(pageB.getByText('签收成功', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(ackButton).toContainText('已签收');

  // —— 返回列表：未读红点消失（打开详情即已读的语义生效） ——
  await pageB.goto('/#/message-list');
  const itemAgain = pageB.locator(`[data-pencil-name="${noticeTitle}"]`);
  await expect(itemAgain).toBeVisible({ timeout: 15_000 });
  await expect(itemAgain.locator('[data-pencil-name="Unread Dot"]')).toHaveCount(0);
  await ctxB.close();
});

test('旅程2：发布作业 → 学生在「我的作业」可见（待提交）', async ({ browser }) => {
  // —— A 侧：发布作业 ——
  const ctxA = await browser.newContext({ storageState: stateA });
  const pageA = await ctxA.newPage();
  await publishHomeworkViaUI(pageA, homeworkTitle);
  await ctxA.close();

  // —— B 侧：我的作业列表可见该作业，状态为待提交 ——
  const ctxB = await browser.newContext({ storageState: stateB });
  const pageB = await ctxB.newPage();
  await pageB.goto('/#/my-homework');
  const card = pageB.locator('[data-pencil-name="Card"]').filter({ hasText: homeworkTitle });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card).toContainText('待提交');
  await ctxB.close();
});

test('旅程3：发布投票 → 学生投票 → 列表状态变更 → 结果页展示票数', async ({ browser }) => {
  // —— A 侧：发布投票 ——
  const ctxA = await browser.newContext({ storageState: stateA });
  const pageA = await ctxA.newPage();
  await publishVoteViaUI(pageA, voteTitle, [VOTE_OPTION_A, VOTE_OPTION_B]);
  await ctxA.close();

  // —— B 侧：从列表进入投票页提交 ——
  const ctxB = await browser.newContext({ storageState: stateB });
  const pageB = await ctxB.newPage();
  await pageB.goto('/#/vote-list');
  const card = pageB.locator('[data-pencil-name="Vote Card"]').filter({ hasText: voteTitle });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card.locator('[data-pencil-name="Action"]')).toContainText('去投票');
  await card.locator('[data-pencil-name="Action"]').click();

  await expect(pageB).toHaveURL(/#\/vote-options/, { timeout: 15_000 });
  await pageB.locator(`[data-pencil-name="${VOTE_OPTION_A}"]`).click();
  await pageB.locator('[data-pencil-name="Submit Button"]').click();
  await expect(pageB.getByText('投票成功', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(pageB).toHaveURL(/#\/vote-list/, { timeout: 15_000 });

  // —— 投票后：列表按钮变为「已投票」，再次进入可见结果与票数 ——
  const cardAfter = pageB.locator('[data-pencil-name="Vote Card"]').filter({ hasText: voteTitle });
  await expect(cardAfter).toBeVisible({ timeout: 15_000 });
  await expect(cardAfter.locator('[data-pencil-name="Action"]')).toContainText('已投票');
  await cardAfter.locator('[data-pencil-name="Action"]').click();
  await expect(
    pageB.getByRole('heading', { name: '投票结果', exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(pageB.locator(`[data-pencil-name="${VOTE_OPTION_A}"]`)).toContainText('1票');
  await ctxB.close();
});