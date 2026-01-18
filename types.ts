
export enum UserRole {
  AGNIVEER = 'agniveer',
  OFFICER = 'trg_officer',
  COY_CDR = 'coy_cdr',
  COY_CLK = 'coy_clk',
  CO = 'co',
  ADMIN = 'admin'
}

export interface User {
  id: string;
  user_id: number; // Added for compatibility
  username: string; // Service ID
  full_name?: string;
  name: string;
  role: UserRole;
  company?: string;
  rank?: string;
  agniveer_id?: number;
}

export interface RRIBand {
  score: number;
  label: 'Green' | 'Amber' | 'Red';
  color: string;
}

export interface PerformanceMetrics {
  physical: number;
  cognitive: number;
  military: number;
  feedback: number;
  discipline: number;
}

export interface AgniveerData {
  id: string;
  name: string;
  company: string;
  batch: string; // e.g. "Oct 2024"
  rri: number;
  metrics: PerformanceMetrics;
  growthPlan: string[];
}




export interface Task {
  id: string;
  name: string;
  category: string;
  requiredAttributes: string[];
  status: 'Open' | 'Closed';
}

export interface AgniveerProfile {
  id: number;
  service_id: string;
  name: string;
  rank: string;
  unit: string;
  company: string;
  batch_no: string;
  joining_date?: string;
  email?: string;
  phone?: string;
  upcoming_tests?: ScheduledTest[];
}

export interface ScheduledTest {
  id: number;
  name: string;
  test_type: string;
  description?: string;
  scheduled_date: string;
  location?: string;
  status: string;
}

// Access Control Types using Role Enums
export interface InboxItem {
  id: number;
  email_id: number;
  subject: string;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  timestamp: string; // ISO String
  is_read: boolean;
  priority: 'Normal' | 'High' | 'Urgent';
  is_starred?: boolean;
}

export interface EmailDetail extends InboxItem {
  body: string;
}

export interface EmailCreate {
  subject: string;
  body: string;
  priority: string;
  recipient_ids?: number[];
  target_batch?: string;
  target_company?: string;
}
