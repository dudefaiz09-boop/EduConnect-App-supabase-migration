import type { ModuleKey } from '@educonnect/shared';

export const primaryTabOrder = [
  'dashboard',
  'announcements',
  'assignments',
  'aiAssistant',
  'chat',
] as const satisfies readonly ModuleKey[];

export const moreModuleOrder = [
  'attendance',
  'library',
  'fees',
  'performance',
  'parentPortal',
  'students',
  'teachers',
  'allUsers',
] as const satisfies readonly ModuleKey[];

export const accountRouteOrder = ['profile', 'settings'] as const;

export type PrimaryTabKey = (typeof primaryTabOrder)[number];
export type MoreModuleKey = (typeof moreModuleOrder)[number];
export type AccountRouteKey = (typeof accountRouteOrder)[number];
export type ActiveRouteKey = ModuleKey | 'more' | AccountRouteKey;

export function isPrimaryTabKey(key: ModuleKey): key is PrimaryTabKey {
  return primaryTabOrder.includes(key as PrimaryTabKey);
}

export function isMoreModuleKey(key: ModuleKey): key is MoreModuleKey {
  return moreModuleOrder.includes(key as MoreModuleKey);
}
