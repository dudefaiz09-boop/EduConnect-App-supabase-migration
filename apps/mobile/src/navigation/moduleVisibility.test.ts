import { canAccessModule } from '@educonnect/shared';
import { isMoreModuleKey, isPrimaryTabKey, moreModuleOrder, primaryTabOrder } from './types';

describe('mobile module visibility', () => {
  it('keeps admin-only All Users hidden from students', () => {
    expect(canAccessModule('student', 'allUsers')).toBe(false);
  });

  it('keeps the primary mobile modules available to students when defaults apply', () => {
    expect(canAccessModule('student', 'dashboard')).toBe(true);
    expect(canAccessModule('student', 'announcements')).toBe(true);
    expect(canAccessModule('student', 'assignments')).toBe(true);
    expect(canAccessModule('student', 'chat')).toBe(true);
  });

  it('honors explicit assigned module allow-lists', () => {
    expect(canAccessModule('teacher', 'assignments', ['dashboard'])).toBe(false);
    expect(canAccessModule('teacher', 'dashboard', ['dashboard'])).toBe(true);
  });

  it('keeps high-frequency modules in the primary tab order', () => {
    expect(primaryTabOrder).toEqual([
      'dashboard',
      'announcements',
      'assignments',
      'aiAssistant',
      'chat',
    ]);
    expect(isPrimaryTabKey('dashboard')).toBe(true);
    expect(isPrimaryTabKey('fees')).toBe(false);
  });

  it('keeps secondary modules in the More menu group', () => {
    expect(moreModuleOrder).toContain('attendance');
    expect(moreModuleOrder).toContain('allUsers');
    expect(isMoreModuleKey('library')).toBe(true);
    expect(isMoreModuleKey('chat')).toBe(false);
  });
});
