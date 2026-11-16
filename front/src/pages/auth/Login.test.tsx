import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import { toast } from 'sonner';
import { api } from '@/lib/api';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/join-class" element={<div>JOIN_CLASS_PAGE</div>} />
        <Route path="/register" element={<div>REGISTER_PAGE</div>} />
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

function fillForm(account: string, password: string) {
  fireEvent.change(screen.getByPlaceholderText('请输入手机号 / 邮箱'), {
    target: { value: account },
  });
  fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
    target: { value: password },
  });
}

describe('Login 登录页', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // 登录成功后查询班级列表：返回空列表，引导进入建班页
    vi.mocked(api.get).mockResolvedValue({ data: { code: 0, data: [] } } as any);
  });

  it('未勾选协议时点击登录仅提示，不发起请求', () => {
    renderLogin();
    fillForm('13800138000', 'Test1234');

    fireEvent.click(screen.getByText('登录'));

    expect(toast.error).toHaveBeenCalledWith('请先勾选同意《用户协议》和《隐私政策》');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('账号为空时提示请输入手机号或邮箱', () => {
    const { container } = renderLogin();
    toggleAgreement(container);
    fillForm('', 'Test1234');

    fireEvent.click(screen.getByText('登录'));

    expect(toast.error).toHaveBeenCalledWith('请输入手机号或邮箱');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('手机号格式非法时提示格式不正确', () => {
    const { container } = renderLogin();
    toggleAgreement(container);
    fillForm('123456', 'Test1234');

    fireEvent.click(screen.getByText('登录'));

    expect(toast.error).toHaveBeenCalledWith('手机号格式不正确');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('邮箱格式非法时提示格式不正确', () => {
    const { container } = renderLogin();
    toggleAgreement(container);
    fillForm('zhangsan@', 'Test1234');

    fireEvent.click(screen.getByText('登录'));

    expect(toast.error).toHaveBeenCalledWith('邮箱格式不正确');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('密码为空时提示请输入密码', () => {
    const { container } = renderLogin();
    toggleAgreement(container);
    fillForm('13800138000', '');

    fireEvent.click(screen.getByText('登录'));

    expect(toast.error).toHaveBeenCalledWith('请输入密码');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('手机号登录成功后保存双 Token、提示成功并跳转到建班页', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        code: 0,
        data: { accessToken: 'access-123', refreshToken: 'refresh-123' },
      },
    } as any);

    const { container } = renderLogin();
    toggleAgreement(container);
    fillForm('13800138000', 'Test1234');

    fireEvent.click(screen.getByText('登录'));

    expect(await screen.findByText('JOIN_CLASS_PAGE')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      account: '13800138000',
      loginType: 'password',
      password: 'Test1234',
    });
    expect(localStorage.getItem('accessToken')).toBe('access-123');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-123');
    expect(toast.success).toHaveBeenCalledWith('登录成功');
  });

  it('支持使用 QQ 邮箱登录', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        code: 0,
        data: { accessToken: 'access-456', refreshToken: 'refresh-456' },
      },
    } as any);

    const { container } = renderLogin();
    toggleAgreement(container);
    fillForm('3399322084@qq.com', 'Test1234');

    fireEvent.click(screen.getByText('登录'));

    expect(await screen.findByText('JOIN_CLASS_PAGE')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      account: '3399322084@qq.com',
      loginType: 'password',
      password: 'Test1234',
    });
    expect(localStorage.getItem('accessToken')).toBe('access-456');
  });

  it('登录失败时展示错误信息并停留在当前页', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('账号或密码错误'));

    const { container } = renderLogin();
    toggleAgreement(container);
    fillForm('13800138000', 'Wrong1234');

    fireEvent.click(screen.getByText('登录'));

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('账号或密码错误');
    });
    expect(screen.queryByText('JOIN_CLASS_PAGE')).not.toBeInTheDocument();
    expect(screen.getByText('欢迎回来')).toBeInTheDocument();
  });
});