import { Request, Response, NextFunction } from 'express';
import { logger } from '@educonnect/logger';
import { bindRequestTenantAndUser, getCorrelationId, type UserContext } from '../lib/context.js';
import { AppError } from './error.js';
import { getSupabaseAdmin } from '../lib/supabase.js';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

/**
 * Enterprise SaaS Tenancy Middleware
 * Ensures all API calls are strictly scoped to a specific school (tenant).
 */
export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  resolveTenant(req, next).catch(next);
};

const tenantCache = new Map<string, { active: boolean; expiresAt: number }>();
const TENANT_CACHE_TTL_MS = 60_000;
const TENANT_CACHE_CLEANUP_INTERVAL_MS = 300_000;

const tenantCacheCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of tenantCache) {
    if (entry.expiresAt <= now) tenantCache.delete(key);
  }
}, TENANT_CACHE_CLEANUP_INTERVAL_MS);
tenantCacheCleanup.unref();

async function tenantExistsAndActive(tenantId: string) {
  const cached = tenantCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.active;

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('status')
    .eq('id', tenantId)
    .maybeSingle<{ status: string | null }>();

  if (error) throw error;

  if (!data) {
    return null;
  }

  const active = data.status !== 'inactive';
  tenantCache.set(tenantId, { active, expiresAt: Date.now() + TENANT_CACHE_TTL_MS });
  return active;
}

async function resolveTenant(req: Request, next: NextFunction) {
  if (!req.user) {
    return next(
      new AppError({
        code: 'AUTH_MISSING',
        message: 'Authentication required for tenant resolution',
        statusCode: 401,
      })
    );
  }

  const headerTenantId = String(req.headers['x-school-id'] || '').trim();
  const userTenantId = req.user.schoolId;
  const isSuperAdmin = req.user.isSuperAdmin;
  const managedTenantIds = req.user.managedTenantIds || [];
  const isProduction = process.env.NODE_ENV === 'production';

  let resolvedTenantId: string | null = null;

  if (isSuperAdmin && headerTenantId) {
    resolvedTenantId = headerTenantId;
    if (headerTenantId !== userTenantId) {
      logger.info(
        {
          uid: req.user.uid,
          requested: headerTenantId,
          correlationId: getCorrelationId(),
        },
        managedTenantIds.includes(headerTenantId)
          ? 'Super admin managed tenant switch'
          : 'Super admin global tenant switch'
      );
    }
  }

  if (!resolvedTenantId) {
    if (headerTenantId && userTenantId && headerTenantId !== userTenantId) {
      logger.warn(
        {
          uid: req.user.uid,
          requested: headerTenantId,
          actual: userTenantId,
          correlationId: getCorrelationId(),
        },
        'Tenant override attempt denied'
      );
      return next(
        new AppError({
          code: 'TENANT_MISMATCH',
          message: 'Tenant Access Denied',
          statusCode: 403,
          details: { requestedTenantId: headerTenantId, assignedTenantId: userTenantId },
        })
      );
    }

    // Only fall back to the user's token tenantId if one exists.
    // In production, log when the x-school-id header is absent so operators
    // can confirm that all expected clients are sending explicit tenant context.
    if (userTenantId) {
      if (isProduction && !headerTenantId) {
        logger.warn(
          {
            uid: req.user.uid,
            tenantId: userTenantId,
            path: req.path,
            correlationId: getCorrelationId(),
          },
          'Tenant resolved from user token without x-school-id header'
        );
      }
      resolvedTenantId = userTenantId;
    }
  }

  if (!resolvedTenantId) {
    logger.warn(
      { path: req.path, uid: req.user.uid, correlationId: getCorrelationId(), isProduction },
      'Missing Tenant ID'
    );
    return next(
      new AppError({
        code: 'TENANT_REQUIRED',
        message: isProduction
          ? 'Tenant context is required. Provide x-school-id header or ensure user token includes a schoolId claim.'
          : 'Tenant Context Required',
        statusCode: 400,
      })
    );
  }

  const tenantStatus = await tenantExistsAndActive(resolvedTenantId);
  if (tenantStatus === null) {
    return next(
      new AppError({
        code: 'TENANT_NOT_FOUND',
        message: 'Tenant not found',
        statusCode: 403,
        details: { tenantId: resolvedTenantId },
      })
    );
  }
  if (tenantStatus === false) {
    return next(
      new AppError({
        code: 'TENANT_INACTIVE',
        message: 'Tenant is inactive',
        statusCode: 403,
        details: { tenantId: resolvedTenantId },
      })
    );
  }

  req.tenantId = resolvedTenantId;
  bindRequestTenantAndUser(resolvedTenantId, req.user as UserContext);
  return next();
}
