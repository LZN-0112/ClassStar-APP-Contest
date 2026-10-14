import { secureStorage } from '../storage/secure'

export function getCurrentClassId(): string {
  return secureStorage.get<string>('currentClassId') || ''
}

export function setCurrentClassId(classId: string) {
  secureStorage.set('currentClassId', classId)
}

export interface OrgInfo {
  id: string
  name: string
  orgType: string
  roleLevel?: string
}

export function getCurrentOrg(): OrgInfo | null {
  return secureStorage.get<OrgInfo>('currentOrgInfo') || null
}

export function setCurrentOrg(org: OrgInfo): void {
  secureStorage.set('currentOrgInfo', org)
}
