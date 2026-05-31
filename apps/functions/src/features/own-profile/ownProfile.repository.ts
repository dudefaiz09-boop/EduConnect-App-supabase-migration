import { getOwnProfile, upsertOwnProfile, type ProfileRecord } from '../../lib/profile-service.js';

export class OwnProfileRepository {
  static async getProfile(uid: string): Promise<ProfileRecord> {
    return getOwnProfile(uid);
  }

  static async updateProfile(
    uid: string,
    email: string | undefined,
    displayName?: string,
    photoURL?: string
  ): Promise<ProfileRecord> {
    return upsertOwnProfile(uid, email, { displayName, photoURL });
  }
}
