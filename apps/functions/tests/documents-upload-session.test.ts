import type { Request, Response } from 'express';
import { DocumentsController } from '../src/features/documents/documents.controller.js';

const createPresignedUpload = jest.fn();
const from = jest.fn();

jest.mock('../src/lib/storage/index.js', () => ({
  getStorageProvider: jest.fn(() => ({ createPresignedUpload })),
}));

jest.mock('../src/lib/supabase.js', () => ({
  getSupabaseAdmin: jest.fn(() => ({ from })),
}));

jest.mock('../src/lib/context.js', () => ({
  tryGetTenantId: jest.fn(() => 'tenant-a'),
}));

function response() {
  return {
    json: jest.fn(),
  } as unknown as Response;
}

function request(body: Record<string, unknown>) {
  return {
    body,
    user: { uid: 'user-1' },
  } as Request;
}

function table(overrides: Record<string, unknown> = {}) {
  const builder = {
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    maybeSingle: jest.fn(),
    single: jest.fn(),
    ...overrides,
  };
  return builder;
}

const completeBody = {
  uploadId: 'upload-1',
  provider: 'firebase',
  bucket: 'firebase-bucket',
  key: 'schools/tenant-a/library/general/file.pdf',
  filename: 'file.pdf',
  contentType: 'application/pdf',
  sizeBytes: 123,
  module: 'library',
  entityId: 'general',
};

const sessionData = {
  tenantId: 'tenant-a',
  schoolId: 'tenant-a',
  provider: 'firebase',
  bucket: 'firebase-bucket',
  key: 'schools/tenant-a/library/general/file.pdf',
  filename: 'file.pdf',
  contentType: 'application/pdf',
  sizeBytes: 123,
  module: 'library',
  entityId: 'general',
  uploadedBy: 'user-1',
  status: 'pending',
  createdAt: '2026-05-31T00:00:00.000Z',
  expiresAt: '2099-01-01T00:00:00.000Z',
};

describe('document upload sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STORAGE_PROVIDER = 'firebase';
    createPresignedUpload.mockResolvedValue({
      uploadUrl: 'https://upload.example.test',
      bucket: 'firebase-bucket',
      key: 'schools/tenant-a/library/general/file.pdf',
    });
  });

  it('records a server-side upload session during presign', async () => {
    const documents = table({ insert: jest.fn(() => ({ error: null })) });
    from.mockReturnValue(documents);
    const res = response();

    await DocumentsController.presignUpload(
      request({
        module: 'library',
        entityId: 'general',
        filename: 'file.pdf',
        contentType: 'application/pdf',
        sizeBytes: 123,
      }),
      res
    );

    expect(documents.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'uploadSessions',
        data: expect.objectContaining({
          tenantId: 'tenant-a',
          provider: 'firebase',
          bucket: 'firebase-bucket',
          key: 'schools/tenant-a/library/general/file.pdf',
          status: 'pending',
        }),
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: expect.objectContaining({ uploadId: expect.any(String) }),
    });
  });

  it('rejects completion metadata that does not match the upload session', async () => {
    const sessions = table({
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'upload-1', data: sessionData },
        error: null,
      }),
    });
    from.mockReturnValue(sessions);

    await expect(
      DocumentsController.completeUpload(
        request({ ...completeBody, bucket: 'other-bucket' }),
        response()
      )
    ).rejects.toMatchObject({
      message: 'Upload completion does not match the server-issued upload session',
      statusCode: 403,
    });
  });

  it('persists metadata only after a matching pending upload session is found', async () => {
    const sessions = table({
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'upload-1', data: sessionData },
        error: null,
      }),
    });
    const attachments = table({
      single: jest.fn().mockResolvedValue({
        data: { id: 'attachment-1' },
        error: null,
      }),
    });
    const sessionUpdate = table();
    from
      .mockReturnValueOnce(sessions)
      .mockReturnValueOnce(attachments)
      .mockReturnValueOnce(sessionUpdate);
    const res = response();

    await DocumentsController.completeUpload(request(completeBody), res);

    expect(attachments.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'attachments',
        storage_provider: 'firebase',
        storage_bucket: 'firebase-bucket',
        storage_key: 'schools/tenant-a/library/general/file.pdf',
      })
    );
    expect(sessionUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'completed',
          completedDocumentId: expect.any(String),
        }),
      })
    );
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: { id: 'attachment-1' } });
  });
});
