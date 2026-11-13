type OverlayBackHandler = () => boolean;

const handlers: OverlayBackHandler[] = [];

/**
 * 注册弹层返回拦截：系统返回键触发时优先关闭弹层。
 * 返回 true 表示已消费该次返回事件。
 */
export function registerOverlayBack(handler: OverlayBackHandler): () => void {
  handlers.push(handler);
  return () => {
    const index = handlers.indexOf(handler);
    if (index >= 0) handlers.splice(index, 1);
  };
}

export function handleOverlayBack(): boolean {
  for (let i = handlers.length - 1; i >= 0; i -= 1) {
    if (handlers[i]()) return true;
  }
  return false;
}