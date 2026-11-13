import { describe, it, expect, beforeEach } from 'vitest';
import {
  isOwner,
  isAdminOrOwner,
  isMember,
  ROLE_LABEL,
  getCurrentRoleLevel,
  currentIsOwner,
  currentIsAdminOrOwner,
} from './role';

describe('utils/role 角色判定与标签', () => {
  it('isOwner 仅对 owner 返回 true', () => {
    expect(isOwner('owner')).toBe(true);
    expect(isOwner('admin')).toBe(false);
    expect(isOwner('member')).toBe(false);
    expect(isOwner(undefined)).toBe(false);
  });

  it('isAdminOrOwner 对 admin 与 owner 返回 true', () => {
    expect(isAdminOrOwner('owner')).toBe(true);
    expect(isAdminOrOwner('admin')).toBe(true);
    expect(isAdminOrOwner('member')).toBe(false);
    expect(isAdminOrOwner(undefined)).toBe(false);
  });

  it('isMember 仅对 member 返回 true', () => {
    expect(isMember('member')).toBe(true);
    expect(isMember('owner')).toBe(false);
    expect(isMember('admin')).toBe(false);
    expect(isMember(undefined)).toBe(false);
  });

  it('ROLE_LABEL 覆盖三种角色的中文名称', () => {
    expect(ROLE_LABEL).toEqual({
      owner: '群主',
      admin: '管理员',
      member: '群员',
    });
  });
});

describe('utils/role 从 localStorage 读取当前角色', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('无缓存时返回 undefined', () => {
    expect(getCurrentRoleLevel()).toBeUndefined();
  });

  it('缓存合法 JSON 时返回 roleLevel', () => {
    localStorage.setItem('currentUser', JSON.stringify({ roleLevel: 'admin' }));
    expect(getCurrentRoleLevel()).toBe('admin');
  });

  it('缓存非法 JSON 时容错返回 undefined 而不抛错', () => {
    localStorage.setItem('currentUser', '{not-valid-json');
    expect(getCurrentRoleLevel()).toBeUndefined();
  });

  it('currentIsOwner / currentIsAdminOrOwner 与缓存联动', () => {
    localStorage.setItem('currentUser', JSON.stringify({ roleLevel: 'owner' }));
    expect(currentIsOwner()).toBe(true);
    expect(currentIsAdminOrOwner()).toBe(true);

    localStorage.setItem('currentUser', JSON.stringify({ roleLevel: 'member' }));
    expect(currentIsOwner()).toBe(false);
    expect(currentIsAdminOrOwner()).toBe(false);
  });
});