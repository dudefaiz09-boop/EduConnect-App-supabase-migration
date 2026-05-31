import { FeesRepository } from '../src/features/fees/fees.repository.js';

const feeDocRef = {
  get: jest.fn(),
  update: jest.fn(),
};

const feesCollection = {
  doc: jest.fn(() => feeDocRef),
};

const paymentsCollection = {
  add: jest.fn(),
};

jest.mock('../src/lib/documents.js', () => ({
  db: {
    collection: jest.fn((name: string) => {
      if (name === 'fees') return feesCollection;
      if (name === 'payments') return paymentsCollection;
      return { where: jest.fn().mockReturnThis(), get: jest.fn() };
    }),
  },
}));

jest.mock('../src/lib/notifications.js', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

function feeRecord(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: 'tenant-a',
    schoolId: 'tenant-a',
    studentId: 'student-1',
    amountDue: 1000,
    amountPaid: 0,
    dueDate: '2026-06-30',
    ...overrides,
  };
}

function actor(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'student-1',
    role: 'student',
    roles: ['student'],
    schoolId: 'tenant-a',
    permissions: {},
    ...overrides,
  };
}

describe('fees payment recording', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    feeDocRef.get.mockResolvedValue({
      exists: true,
      data: () => feeRecord(),
    });
    paymentsCollection.add.mockResolvedValue({ id: 'payment-1' });
  });

  it('rejects student self-recorded payments', async () => {
    await expect(
      FeesRepository.pay('fee-1', 500, 'online', actor(), 'tenant-a')
    ).rejects.toMatchObject({
      code: 'PAYMENT_VERIFICATION_REQUIRED',
      statusCode: 403,
    });

    expect(paymentsCollection.add).not.toHaveBeenCalled();
    expect(feeDocRef.update).not.toHaveBeenCalled();
  });

  it('allows authorized finance users to record verified/offline payments', async () => {
    const result = await FeesRepository.pay(
      'fee-1',
      500,
      'offline',
      actor({ uid: 'accountant-1', role: 'accountant', roles: ['accountant'] }),
      'tenant-a'
    );

    expect(paymentsCollection.add).toHaveBeenCalledWith(
      expect.objectContaining({
        feeId: 'fee-1',
        studentId: 'student-1',
        amount: 500,
        method: 'offline',
        recordedBy: 'accountant-1',
      })
    );
    expect(feeDocRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        amountPaid: 500,
        status: 'partial',
        updatedBy: 'accountant-1',
      })
    );
    expect(result).toMatchObject({
      success: true,
      paymentId: 'payment-1',
      amountPaid: 500,
      status: 'partial',
    });
  });

  it('rejects payments larger than the remaining balance', async () => {
    feeDocRef.get.mockResolvedValue({
      exists: true,
      data: () => feeRecord({ amountDue: 1000, amountPaid: 750 }),
    });

    await expect(
      FeesRepository.pay(
        'fee-1',
        500,
        'offline',
        actor({ uid: 'accountant-1', role: 'accountant', roles: ['accountant'] }),
        'tenant-a'
      )
    ).rejects.toMatchObject({
      code: 'PAYMENT_AMOUNT_EXCEEDS_BALANCE',
      statusCode: 400,
    });

    expect(paymentsCollection.add).not.toHaveBeenCalled();
    expect(feeDocRef.update).not.toHaveBeenCalled();
  });
});
