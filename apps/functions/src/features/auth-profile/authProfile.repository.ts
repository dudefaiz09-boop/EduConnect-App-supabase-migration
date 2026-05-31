import { getOwnProfile, type ProfileRecord } from '../../lib/profile-service.js';

export class AuthProfileRepository {
  static async getProfile(uid: string): Promise<ProfileRecord> {
    return getOwnProfile(uid);
  }
}
