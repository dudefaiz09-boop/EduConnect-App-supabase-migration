export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface ProfileRow {
  id: string;
  school_id: string;
  email: string;
  display_name: string | null;
  role: string;
  roles: string[];
  assigned_modules: string[];
  permissions: Json;
  class_ids: string[];
  subject_ids: string[];
  section_ids: string[];
  linked_student_ids: string[];
  is_super_admin: boolean;
  managed_tenant_ids: string[];
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CourseRow {
  id: string;
  school_id: string;
  title: string;
  description: string | null;
  subject_id: string | null;
  class_ids: string[];
  teacher_id: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface EnrollmentRow {
  id: string;
  school_id: string;
  course_id: string;
  student_id: string;
  status: 'active' | 'completed' | 'dropped';
  enrolled_at: string;
  updated_at: string;
}

export interface DocumentRow {
  collection: string;
  id: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface UserTenantRow {
  id: string;
  user_id: string;
  email: string;
  tenant_id: string;
  role: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, 'id' | 'school_id' | 'email'>;
        Update: Partial<ProfileRow>;
      };
      courses: {
        Row: CourseRow;
        Insert: Partial<CourseRow> & Pick<CourseRow, 'school_id' | 'title'>;
        Update: Partial<CourseRow>;
      };
      enrollments: {
        Row: EnrollmentRow;
        Insert: Partial<EnrollmentRow> &
          Pick<EnrollmentRow, 'school_id' | 'course_id' | 'student_id'>;
        Update: Partial<EnrollmentRow>;
      };
      documents: {
        Row: DocumentRow;
        Insert: Partial<DocumentRow> & Pick<DocumentRow, 'collection' | 'id' | 'data'>;
        Update: Partial<DocumentRow>;
      };
      tenants: {
        Row: TenantRow;
        Insert: Partial<TenantRow> & Pick<TenantRow, 'id' | 'name' | 'slug'>;
        Update: Partial<TenantRow>;
      };
      user_tenants: {
        Row: UserTenantRow;
        Insert: Partial<UserTenantRow> & Pick<UserTenantRow, 'email' | 'tenant_id' | 'role'>;
        Update: Partial<UserTenantRow>;
      };
    };
  };
}
