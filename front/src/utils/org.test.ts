import { describe, it, expect } from 'vitest';
import {
  ORG_TYPES,
  ORG_TYPE_LABEL,
  ORG_TYPE_COLOR,
  getOrgTypeMeta,
} from './org';

describe('utils/org 组织类型元信息', () => {
  it('ORG_TYPES 覆盖四种组织类型', () => {
    expect(ORG_TYPES).toEqual(['class', 'association', 'committee', 'club']);
  });

  it('每种类型都配置了标签与合法颜色', () => {
    for (const t of ORG_TYPES) {
      expect(ORG_TYPE_LABEL[t]).toBeTruthy();
      expect(ORG_TYPE_COLOR[t]).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('getOrgTypeMeta 返回指定类型的标签、颜色与图标', () => {
    const meta = getOrgTypeMeta('association');
    expect(meta.label).toBe('社团');
    expect(meta.color).toBe('#A855F7');
    expect(meta.Icon).toBeTruthy();
  });

  it('未传类型时默认按班级处理', () => {
    const meta = getOrgTypeMeta();
    expect(meta.label).toBe('班级');
    expect(meta.color).toBe('#2563EB');
  });

  it('非法类型回退为班级', () => {
    const meta = getOrgTypeMeta('unknown-type');
    expect(meta.label).toBe('班级');
    expect(meta.color).toBe('#2563EB');
  });
});