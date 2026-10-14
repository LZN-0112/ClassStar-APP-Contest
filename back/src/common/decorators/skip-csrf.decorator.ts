import { SetMetadata } from '@nestjs/common';

export const SKIP_CSRF_KEY = 'skipCsrf';

/**
 * 跳过 CSRF 校验，用于明确标识的公开只读接口或外部回调。
 */
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);
