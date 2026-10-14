import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, Home, MessageCircle } from 'lucide-react';
import { reportError, getDeviceInfo, getBrowserInfo } from '@/lib/errorReporter';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showFeedback: boolean;
  feedbackText: string;
}

const friendlyMessages: Record<string, { title: string; desc: string; suggestion: string }> = {
  NetworkError: {
    title: '网络连接出了问题',
    desc: '看起来你的设备暂时无法连接到服务器，可能是网络信号不太好。',
    suggestion: '请检查网络连接后重试，或稍等片刻再试。',
  },
  TypeError: {
    title: '页面遇到了一点小状况',
    desc: '系统在加载内容时遇到了一些意外情况，我们已经记录下来了。',
    suggestion: '可以尝试刷新页面，如果问题持续存在，请反馈给我们。',
  },
  RangeError: {
    title: '数据加载异常',
    desc: '系统在处理数据时遇到了超出预期范围的情况。',
    suggestion: '请返回首页重新进入，我们会持续优化这个问题。',
  },
  ReferenceError: {
    title: '功能暂时不可用',
    desc: '你访问的功能可能正在维护或更新中，给你带来不便敬请谅解。',
    suggestion: '请稍后再试，或联系管理员了解最新进展。',
  },
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showFeedback: false, feedbackText: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, showFeedback: false, feedbackText: '' };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    const errorType = error.name || 'UnknownError';
    const friendly = friendlyMessages[errorType] || friendlyMessages['TypeError'];

    reportError({
      error_type: errorType,
      severity: 'major',
      message: `${friendly.title}: ${error.message}`,
      stack_trace: error.stack,
      page_path: window.location.pathname,
      device_info: getDeviceInfo(),
      browser_info: getBrowserInfo(),
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/home';
  };

  handleToggleFeedback = () => {
    this.setState((prev) => ({ showFeedback: !prev.showFeedback }));
  };

  handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ feedbackText: e.target.value });
  };

  handleSubmitFeedback = () => {
    if (this.state.error && this.state.feedbackText.trim()) {
      const errorType = this.state.error.name || 'UnknownError';
      const friendly = friendlyMessages[errorType] || friendlyMessages['TypeError'];
      reportError({
        error_type: errorType,
        severity: 'major',
        message: `${friendly.title}: ${this.state.error.message}`,
        stack_trace: this.state.error.stack,
        page_path: window.location.pathname,
        device_info: getDeviceInfo(),
        browser_info: getBrowserInfo(),
        user_feedback: this.state.feedbackText,
      });
    }
    this.setState({ showFeedback: false, feedbackText: '' });
  };

  render() {
    if (this.state.hasError) {
      const errorType = this.state.error?.name || 'UnknownError';
      const friendly = friendlyMessages[errorType] || friendlyMessages['TypeError'];

      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white px-6 text-center">
          <div className="flex flex-col items-center max-w-[320px]">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#FEE2E2]">
              <AlertCircle className="h-9 w-9 text-[#EF4444]" strokeWidth={2} />
            </div>
            <h2 className="mt-5 text-[18px] font-semibold text-[#1A1A1A]">{friendly.title}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[#6B7280]">{friendly.desc}</p>
            <p className="mt-1 text-[13px] text-[#9CA3AF]">{friendly.suggestion}</p>

            <div className="mt-6 flex w-full gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#0062FF] py-2.5 text-[14px] font-medium text-white transition-opacity active:opacity-70"
              >
                <RotateCcw className="h-4 w-4" />
                重试
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white py-2.5 text-[14px] font-medium text-[#4B5563] transition-opacity active:opacity-70"
              >
                <Home className="h-4 w-4" />
                返回首页
              </button>
            </div>

            <button
              type="button"
              onClick={this.handleToggleFeedback}
              className="mt-4 flex items-center gap-1.5 text-[13px] text-[#0062FF] transition-opacity active:opacity-70"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {this.state.showFeedback ? '收起反馈' : '描述一下刚才发生了什么'}
            </button>

            {this.state.showFeedback && (
              <div className="mt-3 w-full">
                <textarea
                  value={this.state.feedbackText}
                  onChange={this.handleFeedbackChange}
                  placeholder="请描述一下你当时在做什么，遇到了什么问题..."
                  rows={3}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white p-3 text-[13px] text-[#1A1A1A] placeholder:text-[#94A3B8] outline-none focus:border-[#0062FF] resize-none"
                />
                <button
                  type="button"
                  onClick={this.handleSubmitFeedback}
                  disabled={!this.state.feedbackText.trim()}
                  className="mt-2 w-full rounded-full bg-[#0062FF] py-2 text-[13px] font-medium text-white transition-opacity active:opacity-70 disabled:opacity-40"
                >
                  提交反馈
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
