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

function fillForm(phone: string, password: string, confirmPassword: string) {
  fireEvent.change(screen.getByPlaceholderText('请输入手机号'), {
    target: { value: phone },
  });
  fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
    target: { value: password },
  });
  fireEvent.change(screen.getByPlaceholderText('请再次输入密码'), {
    target: { value: confirmPassword },
  });
}

describe('Register 注册页', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('未勾选协议时点击注册仅提示，不发起请求', () => {
    renderRegister();
    fillForm('13800138000', 'Test1234', 'Test1234');

    fireEvent.click(screen.getByText('注册'));

    expect(toast.error).toHaveBeenCalledWith('请先勾选同意《用户协议》和《隐私政策》');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('手机号格式非法时提示且不发起请求', () => {
    const { container } = renderRegister();
    toggleAgreement(container);
    fillForm('123456', 'Test1234', 'Test1234');

    fireEvent.click(screen.getByText('注册'));

    expect(toast.error).toHaveBeenCalledWith('请输入正确的 11 位手机号');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('密码不符合规则时提示', () => {
    const { container } = renderRegister();
    toggleAgreement(container);
    fillForm('13800138000', 'abcdefgh', 'abcdefgh');

    fireEvent.click(screen.getByText('注册'));

    expect(toast.error).toHaveBeenCalledWith('密码需 8-20 位且同时包含字母和数字');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('两次密码不一致时提示', () => {
    const { container } = renderRegister();
    toggleAgreement(container);
    fillForm('13800138000', 'Test1234', 'Test5678');

    fireEvent.click(screen.getByText('注册'));

    expect(toast.error).toHaveBeenCalledWith('两次输入的密码不一致');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('注册成功后提示并跳转到登录页', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { code: 0, data: { userId: 'u-1' } } } as any);

    const { container } = renderRegister();
    toggleAgreement(container);
    fillForm('13800138000', 'Test1234', 'Test1234');

    fireEvent.click(screen.getByText('注册'));

    expect(await screen.findByText('LOGIN_PAGE')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      phone: '13800138000',
      name: '13800138000',
      password: 'Test1234',
      confirmPassword: 'Test1234',
    });
    expect(toast.success).toHaveBeenCalledWith('注册成功，请登录');
  });

  it('注册失败（手机号已注册）时展示后端错误信息', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('手机号已注册'));

    const { container } = renderRegister();
    toggleAgreement(container);
    fillForm('13800138000', 'Test1234', 'Test1234');

    fireEvent.click(screen.getByText('注册'));

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('手机号已注册');
    });
    expect(screen.queryByText('LOGIN_PAGE')).not.toBeInTheDocument();
    expect(screen.getByText('注册账号')).toBeInTheDocument();
  });
});