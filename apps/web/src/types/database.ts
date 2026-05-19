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
    };
  };
}
