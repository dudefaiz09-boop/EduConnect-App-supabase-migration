import type { Request, Response } from 'express';
import { hasPermission as userHasPermission } from '@educonnect/shared';
import { z } from 'zod';
import { getStorageProvider } from '../../lib/storage/index.js';
import { getSupabaseAdmin } from '../../lib/supabase.js';
import { tryGetTenantId } from '../../lib/context.js';
import { AppError } from '../../middleware/error.js';
import { randomUUID } from 'node:crypto';

const presignUploadSchema = z.object({
  module: z.string().min(1),
  entityId: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().positive(),
});

const completeUploadSchema = z.object({
  uploadId: z.string().min(1),
  provider: z.string().min(1),
  bucket: z.string().min(1),
  key: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().positive(),
  module: z.string().min(1),
  entityId: z.string().min(1),
});

type UploadSessionData = {
  tenantId: string;
  schoolId: string;
  provider: string;
  bucket: string;
  key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  module: string;
  entityId: string;
  uploadedBy?: string;
  accessScope?: DocumentAccessScope;
  status: 'pending' | 'completed';
  expiresAt: string;
  createdAt: string;
  completedDocumentId?: string;
  completedAt?: string;
};

type DocumentAccessScope = 'module' | 'owner_and_staff';

type DocumentActor = {
  uid?: string;
  role?: string;
  roles?: string[];
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  permissions?: Record<string, boolean>;
  linkedStudentIds?: string[];
};

type DocumentRow = {
  id?: string;
  collection?: string;
  data?: {
    tenantId?: string;
    schoolId?: string;
    module?: string;
    entityId?: string;
    uploadedBy?: string;
    ownerId?: string;
    userId?: string;
    studentId?: string;
    accessScope?: DocumentAccessScope;
  } | null;
};

const MODULE_READ_PERMISSIONS: Record<string, string[]> = {
  announcements: ['manageAnnouncements', 'createAnnouncements'],
  assignments: ['viewAssignments', 'manageAssignments'],
  attendance: ['viewAttendance', 'manageAttendance'],
  fees: ['viewFees', 'manageFees'],
  library: ['manageLibrary'],
  performance: ['viewPerformance', 'managePerformance'],
  students: ['viewStudents', 'manageStudents'],
  teachers: ['manageTeachers'],
};

const MODULE_MANAGE_PERMISSIONS: Record<string, string[]> = {
  announcements: ['manageAnnouncements', 'createAnnouncements'],
  assignments: ['manageAssignments'],
  attendance: ['manageAttendance'],
  fees: ['manageFees'],
  library: ['manageLibrary'],
  performance: ['managePerformance'],
  students: ['manageStudents'],
  teachers: ['manageTeachers'],
};

function getConfiguredStorageProviderName() {
  return process.env.STORAGE_PROVIDER || 'supabase';
}

function uploadSessionTtlSeconds() {
  return Number(
    process.env.UPLOAD_SESSION_TTL_SECONDS || process.env.FIREBASE_SIGNED_URL_TTL_SECONDS || '900'
  );
}

function matchesUploadSession(
  session: UploadSessionData,
  body: z.infer<typeof completeUploadSchema>,
  tenantId: string,
  userId?: string
) {
  return (
    session.tenantId === tenantId &&
    (!session.uploadedBy || session.uploadedBy === userId) &&
    session.provider === body.provider &&
    session.bucket === body.bucket &&
    session.key === body.key &&
    session.filename === body.filename &&
    session.contentType === body.contentType &&
    Number(session.sizeBytes) === Number(body.sizeBytes) &&
    session.module === body.module &&
    session.entityId === body.entityId
  );
}

function actorRoles(actor?: DocumentActor) {
  return new Set([actor?.role, ...(actor?.roles || [])].filter(Boolean));
}

function isPrivilegedDocumentActor(actor?: DocumentActor) {
  const roles = actorRoles(actor);
  return !!actor?.isAdmin || !!actor?.isSuperAdmin || roles.has('admin') || roles.has('principal');
}

function hasAnyPermission(actor: DocumentActor | undefined, permissions: string[]) {
  return !!actor && permissions.some((permission) => userHasPermission(actor, permission));
}

function isOwnerOrLinkedStudent(doc: DocumentRow, actor?: DocumentActor) {
  if (!actor?.uid) return false;

  const candidateOwners = [
    doc.data?.uploadedBy,
    doc.data?.ownerId,
    doc.data?.userId,
    doc.data?.studentId,
    doc.data?.entityId,
  ].filter(Boolean);

  if (candidateOwners.includes(actor.uid)) return true;
  return (actor.linkedStudentIds || []).some((studentId) => candidateOwners.includes(studentId));
}

function documentModule(doc: DocumentRow) {
  return String(doc.data?.module || doc.collection || 'documents');
}

function resolveAccessScope(module: string, actor?: DocumentActor): DocumentAccessScope {
  if (
    isPrivilegedDocumentActor(actor) ||
    hasAnyPermission(actor, MODULE_MANAGE_PERMISSIONS[module] || [])
  ) {
    return 'module';
  }

  return 'owner_and_staff';
}

function canReadDocument(doc: DocumentRow, actor?: DocumentActor) {
  if (isPrivilegedDocumentActor(actor) || isOwnerOrLinkedStudent(doc, actor)) return true;

  const module = documentModule(doc);
  const scope = doc.data?.accessScope || 'owner_and_staff';
  if (scope === 'module') {
    return hasAnyPermission(actor, MODULE_READ_PERMISSIONS[module] || []);
  }

  return hasAnyPermission(actor, MODULE_MANAGE_PERMISSIONS[module] || []);
}

function canDeleteDocument(doc: DocumentRow, actor?: DocumentActor) {
  if (isPrivilegedDocumentActor(actor) || isOwnerOrLinkedStudent(doc, actor)) return true;
  return hasAnyPermission(actor, MODULE_MANAGE_PERMISSIONS[documentModule(doc)] || []);
}

export class DocumentsController {
  static async presignUpload(req: Request, res: Response) {
    const tenantId = tryGetTenantId();
    if (!tenantId) {
      throw new AppError('Tenant context is required', 400);
    }

    const body = presignUploadSchema.parse(req.body);

    const provider = getStorageProvider();
    const result = await provider.createPresignedUpload(
      tenantId,
      body.module,
      body.entityId,
      body.filename,
      body.contentType,
      body.sizeBytes
    );

    const supabaseAdmin = getSupabaseAdmin();
    const uploadId = randomUUID();
    const now = new Date();
    const session: UploadSessionData = {
      tenantId,
      schoolId: tenantId,
      provider: getConfiguredStorageProviderName(),
      bucket: result.bucket,
      key: result.key,
      filename: body.filename,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
      module: body.module,
      entityId: body.entityId,
      uploadedBy: req.user?.uid,
      accessScope: resolveAccessScope(body.module, req.user),
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + uploadSessionTtlSeconds() * 1000).toISOString(),
    };

    const { error } = await supabaseAdmin.from('documents').insert({
      collection: 'uploadSessions',
      id: uploadId,
      data: session,
      created_at: session.createdAt,
      updated_at: session.createdAt,
    });

    if (error) {
      throw new AppError(`Failed to save upload session: ${error.message}`, 500);
    }

    return res.json({
      status: 'success',
      data: { ...result, provider: session.provider, uploadId },
    });
  }

  static async completeUpload(req: Request, res: Response) {
    const tenantId = tryGetTenantId();
    if (!tenantId) {
      throw new AppError('Tenant context is required', 400);
    }

    const body = completeUploadSchema.parse(req.body);

    if (!body.key.startsWith(`schools/${tenantId}/`)) {
      throw new AppError('Storage key does not belong to the current tenant', 403);
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: uploadSessionRow, error: sessionError } = await supabaseAdmin
      .from('documents')
      .select('id,data')
      .eq('collection', 'uploadSessions')
      .eq('id', body.uploadId)
      .maybeSingle<{ id: string; data: UploadSessionData | null }>();

    if (sessionError) {
      throw new AppError(`Failed to load upload session: ${sessionError.message}`, 500);
    }

    const session = uploadSessionRow?.data;
    if (!session) {
      throw new AppError('Upload session not found', 404);
    }
    if (session.status !== 'pending') {
      throw new AppError('Upload session has already been completed', 409);
    }
    if (Date.parse(session.expiresAt) <= Date.now()) {
      throw new AppError('Upload session has expired', 410);
    }
    if (!matchesUploadSession(session, body, tenantId, req.user?.uid)) {
      throw new AppError('Upload completion does not match the server-issued upload session', 403);
    }

    const id = randomUUID();

    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        collection: 'attachments',
        id,
        data: {
          tenantId,
          schoolId: tenantId,
          module: body.module,
          entityId: body.entityId,
          uploadedBy: req.user?.uid,
          accessScope: session.accessScope || resolveAccessScope(body.module, req.user),
        },
        storage_provider: body.provider,
        storage_bucket: body.bucket,
        storage_key: body.key,
        mime_type: body.contentType,
        file_size_bytes: body.sizeBytes,
        original_filename: body.filename,
      })
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to save document metadata: ${error.message}`, 500);
    }

    const { error: updateSessionError } = await supabaseAdmin
      .from('documents')
      .update({
        data: {
          ...session,
          status: 'completed',
          completedAt: new Date().toISOString(),
          completedDocumentId: id,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('collection', 'uploadSessions')
      .eq('id', body.uploadId);

    if (updateSessionError) {
      throw new AppError(`Failed to update upload session: ${updateSessionError.message}`, 500);
    }

    return res.json({
      status: 'success',
      data,
    });
  }

  static async getDownloadUrl(req: Request, res: Response) {
    const tenantId = tryGetTenantId();
    const documentId = req.params.id;

    if (!tenantId) {
      throw new AppError('Tenant context is required', 400);
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: doc, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !doc) {
      throw new AppError('Document not found', 404);
    }

    // Verify tenant
    if (doc.data?.tenantId && doc.data.tenantId !== tenantId) {
      throw new AppError('Unauthorized access to document', 403);
    }
    if (!canReadDocument(doc, req.user)) {
      throw new AppError({
        code: 'DOCUMENT_ACCESS_DENIED',
        message: 'You do not have access to this document',
        statusCode: 403,
      });
    }

    const providerName = doc.storage_provider || 'supabase';
    const provider = getStorageProvider(providerName);

    const bucket =
      doc.storage_bucket || process.env.SUPABASE_UPLOADS_BUCKET || 'educonnect-uploads';
    const key = doc.storage_key || doc.data?.objectPath || '';

    if (!key) {
      throw new AppError('Storage key is missing for this document', 400);
    }

    const result = await provider.createPresignedReadUrl(bucket, key);

    return res.json({
      status: 'success',
      data: result,
    });
  }

  static async deleteDocument(req: Request, res: Response) {
    const tenantId = tryGetTenantId();
    const documentId = req.params.id;

    if (!tenantId) {
      throw new AppError('Tenant context is required', 400);
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: doc, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !doc) {
      throw new AppError('Document not found', 404);
    }

    if (doc.data?.tenantId && doc.data.tenantId !== tenantId) {
      throw new AppError('Unauthorized access to document', 403);
    }
    if (!canDeleteDocument(doc, req.user)) {
      throw new AppError({
        code: 'DOCUMENT_DELETE_DENIED',
        message: 'You do not have permission to delete this document',
        statusCode: 403,
      });
    }

    const providerName = doc.storage_provider || 'supabase';
    const bucket =
      doc.storage_bucket || process.env.SUPABASE_UPLOADS_BUCKET || 'educonnect-uploads';
    const key = doc.storage_key || doc.data?.objectPath || '';

    if (key) {
      const provider = getStorageProvider(providerName);
      try {
        await provider.deleteObject(bucket, key);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Failed to delete object from storage: ${message}`);
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      throw new AppError(`Failed to delete document metadata: ${deleteError.message}`, 500);
    }

    return res.json({
      status: 'success',
      message: 'Document deleted successfully',
    });
  }
}
