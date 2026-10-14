import { SetMetadata } from '@nestjs/common';
import { ClassMemberRoleLevel } from '@prisma/client';

export const ROLE_LEVEL_KEY = 'role_level';

export const OwnerOnly = () =>
  SetMetadata(ROLE_LEVEL_KEY, [ClassMemberRoleLevel.owner]);

export const AdminOrOwner = () =>
  SetMetadata(ROLE_LEVEL_KEY, [ClassMemberRoleLevel.admin, ClassMemberRoleLevel.owner]);

export const RoleLevel = (...levels: ClassMemberRoleLevel[]) =>
  SetMetadata(ROLE_LEVEL_KEY, levels);
