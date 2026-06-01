import { AiService } from '../src/features/ai/ai.service.js';

const logRef = {
  get: jest.fn(),
  update: jest.fn(),
};

const chatbotLogs = {
  doc: jest.fn(() => logRef),
};

jest.mock('../src/lib/documents.js', () => ({
  db: {
    collection: jest.fn((name: string) => {
      if (name === 'chatbotLogs') return chatbotLogs;
      return { doc: jest.fn(), where: jest.fn().mockReturnThis(), get: jest.fn() };
    }),
  },
}));

function actor(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'student-1',
    roles: ['student'],
    isAdmin: false,
    isSuperAdmin: false,
    ...overrides,
  };
}

describe('AI feedback ownership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logRef.get.mockResolvedValue({
      exists: true,
      data: () => ({ userId: 'student-1', query: 'hello' }),
    });
    logRef.update.mockResolvedValue(undefined);
  });

  it('allows users to leave feedback on their own AI logs', async () => {
    await expect(
      AiService.saveFeedback('log-1', 'helpful', actor({ uid: 'student-1' }))
    ).resolves.toEqual({ success: true });

    expect(chatbotLogs.doc).toHaveBeenCalledWith('log-1');
    expect(logRef.update).toHaveBeenCalledWith({ feedback: 'helpful' });
  });

  it('blocks users from updating another user AI log', async () => {
    await expect(
      AiService.saveFeedback('log-1', 'not_helpful', actor({ uid: 'student-2' }))
    ).rejects.toMatchObject({
      code: 'AI_FEEDBACK_FORBIDDEN',
      statusCode: 403,
    });

    expect(logRef.update).not.toHaveBeenCalled();
  });

  it('allows privileged staff to moderate AI log feedback', async () => {
    await expect(
      AiService.saveFeedback(
        'log-1',
        'not_helpful',
        actor({ uid: 'principal-1', roles: ['principal'] })
      )
    ).resolves.toEqual({ success: true });
  });

  it('returns not found when the AI log does not exist', async () => {
    logRef.get.mockResolvedValueOnce({ exists: false, data: () => undefined });

    await expect(AiService.saveFeedback('missing-log', 'helpful', actor())).rejects.toMatchObject({
      code: 'AI_LOG_NOT_FOUND',
      statusCode: 404,
    });

    expect(logRef.update).not.toHaveBeenCalled();
  });
});
