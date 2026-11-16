import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Register from './Register';
import { toast } from 'sonner';
import { api } from '@/lib/api';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  api: { post: vi.fn() },
}));

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<div>LOGIN_PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function toggleAgreement(container: HTMLElement) {
  const checkbox = container.querySelector(
    '[data-pencil-name="Agreement"] > div'
  ) as HTMLElement;
  fireEvent.click(checkbox);
}

/** 第一步：填写账号信息 */
function fillAccountStep(
  overrides: { phone?: string; email?: string; code?: string } = {}
) {
  const {
    phone = '13800138000',
    email = 'zhangsan@example.com',
    code = '123456',
  } = overrides;
  fireEvent.change(screen.getByPlaceholderText('请输入手机号'), {
    target: { value: phone },
  });
  fireEvent.change(screen.getByPlaceholderText('请输入邮箱（用于接收验证码）'), {
    target: { value: email },
  });
  fireEvent.change(screen.getByPlaceholderText('请输入邮箱验证码'), {
    target: { value: code },
  });
}

function goNext() {
  fireEvent.click(screen.getByText('下一步'));
}

/** 第二步：填写资料 */
function fillProfileStep(
  overrides: { name?: string; password?: string; confirmPassword?: string } = {}
) {
  const {
    name = '张三',
    password = 'Test1234',
    confirmPassword = 'Test1234',
  } = overrides;
  fireEvent.change(screen.getByPlaceholderText('请输入真实姓名（用于班级实名）'), {
    target: { value: name },
  });
  fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
    target: { value: password },
  });
  fireEvent.change(screen.getByPlaceholderText('请再次输入密码'), {
    target: { value: confirmPassword },
  });
}

/** 完整走完两步 */
function fillAll() {
  fillAccountStep();
  goNext();
  fillProfileStep();
}

describe('Register 注册页', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('第一步手机号格式非法时提示且不进入第二步', () => {
    renderRegister();
    fillAccountStep({ phone: '123456' });

    goNext();

    expect(toast.error).toHaveBeenCalledWith('请输入正确的 11 位手机号');
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('请输入密码')).not.toBeInTheDocument();
  });

  it('第一步邮箱格式非法时提示且不进入第二步', () => {
    renderRegister();
    fillAccountStep({ email: 'not-an-email' });

    goNext();

    expect(toast.error).toHaveBeenCalledWith('请输入正确的邮箱');
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('请输入密码')).not.toBeInTheDocument();
  });

  it('第一步验证码缺失时提示且不进入第二步', () => {
    renderRegister();
    fillAccountStep({ code: '' });

    goNext();

    expect(toast.error).toHaveBeenCalledWith('请输入 6 位邮箱验证码');
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('请输入密码')).not.toBeInTheDocument();
  });

  it('第一步通过后进入第二步展示姓名和密码表单', () => {
    renderRegister();
    fillAccountStep();

    goNext();

    expect(screen.getByPlaceholderText('请输入真实姓名（用于班级实名）')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('请输入手机号')).not.toBeInTheDocument();
  });

  it('未勾选协议时点击注册仅提示，不发起请求', () => {
    renderRegister();
    fillAll();

    fireEvent.click(screen.getByText('注册'));

    expect(toast.error).toHaveBeenCalledWith('请先勾选同意《用户协议》和《隐私政策》');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('密码不符合规则时提示', () => {
    const { container } = renderRegister();
    toggleAgreement(container);
    fillAll();
    fillProfileStep({ password: 'abcdefgh', confirmPassword: 'abcdefgh' });

    fireEvent.click(screen.getByText('注册'));

    expect(toast.error).toHaveBeenCalledWith('密码需 8-20 位且同时包含字母和数字');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('两次密码不一致时提示', () => {
    const { container } = renderRegister();
    toggleAgreement(container);
    fillAll();
    fillProfileStep({ password: 'Test1234', confirmPassword: 'Test5678' });

    fireEvent.click(screen.getByText('注册'));

    expect(toast.error).toHaveBeenCalledWith('两次输入的密码不一致');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('注册成功后提示并跳转到登录页', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { code: 0, data: { userId: 'u-1' } } } as any);

    const { container } = renderRegister();
    toggleAgreement(container);
    fillAll();

    fireEvent.click(screen.getByText('注册'));

    expect(await screen.findByText('LOGIN_PAGE')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      phone: '13800138000',
      email: 'zhangsan@example.com',
      code: '123456',
      name: '张三',
      password: 'Test1234',
      confirmPassword: 'Test1234',
    });
    expect(toast.success).toHaveBeenCalledWith('注册成功，请登录');
  });

  it('注册失败（手机号已注册）时展示后端错误信息', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('手机号已注册'));

    const { container } = renderRegister();
    toggleAgreement(container);
    fillAll();

    fireEvent.click(screen.getByText('注册'));

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('手机号已注册');
    });
    expect(screen.queryByText('LOGIN_PAGE')).not.toBeInTheDocument();
    expect(screen.getByText('注册账号')).toBeInTheDocument();
  });
});