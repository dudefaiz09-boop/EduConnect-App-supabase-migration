import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  tenantId: string;
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantId(): string {
  const context = tenantContextStorage.getStore();
  return context?.tenantId || 'default-school';
}
