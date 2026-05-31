import { ApiClient } from '../client/base.js';

export class ParentPortalService {
  constructor(private client: ApiClient) {}

  studentProfile(uid: string) {
    return this.client.get(`/students/${uid}`);
  }

  async studentBundle(uid: string, classId?: string) {
    const results = await Promise.allSettled([
      this.client.get(`/attendance/history/${uid}`),
      this.client.get(`/fees/${uid}`),
      this.client.get(`/performance/${uid}`),
      classId ? this.client.get(`/assignments/${classId}`) : Promise.resolve([]),
      this.client.get(`/assignments/history/${uid}`),
    ]);

    const valueOrFallback = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
      r.status === 'fulfilled' ? r.value : fallback;

    return [
      valueOrFallback(results[0], []),
      valueOrFallback(results[1], { fees: [], payments: [] }),
      valueOrFallback(results[2], []),
      valueOrFallback(results[3], []),
      valueOrFallback(results[4], []),
    ] as const;
  }
}
