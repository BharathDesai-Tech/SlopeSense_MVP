export type ReportType = 'ground_cracks' | 'water_seepage' | 'rockfall' | 'road_subsidence';

export type UserRole = 'citizen' | 'responder' | 'admin';

export interface Report {
  id: string;
  type: ReportType;
  description: string;
  location: string;
  landmark_description?: string;
  latitude?: number;
  longitude?: number;
  photoName: string | null;
  photoUrl?: string;
  status: 'pending' | 'verified' | 'investigating' | 'resolved' | 'rejected';
  severity?: 'low' | 'moderate' | 'critical';
  reporter_trust_score?: number;
  points_awarded?: number;
  admin_notes?: string;
  createdAt: string;
  synced?: boolean;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
  badge_id?: string;
  district?: string;
  phone?: string;
  token?: string;
  is_verified?: boolean;
  trust_score?: number;
  reputation_points?: number;
  verified_reports_count?: number;
}

export type Lang = 'en' | 'hi' | 'as';

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  time: string;
  level: 'critical' | 'warning' | 'info';
  region_name?: string;
  latitude?: number;
  longitude?: number;
}

export interface AppSettings {
  language: Lang;
  notificationsEnabled: boolean;
  autoRefresh: boolean;
  darkMode: boolean;
  persona: 'citizen' | 'authority';
  audioAlertsEnabled: boolean;
}
