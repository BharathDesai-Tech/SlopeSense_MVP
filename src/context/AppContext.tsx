import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AlertItem, AppSettings, Report, ReportType, User, UserRole, Lang } from '@/types';
import { API_BASE_URL } from '@/api';
import {
  sirenEngine,
  speakEvacuationAlert,
  stopVoiceAlert,
  getOfflineQueuedReports,
  queueOfflineReport,
  flushOfflineReports,
  type QueuedOfflineReport,
} from '@/services/offlineEmergency';

interface RegisterCitizenPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  preferred_language?: Lang;
}

interface RegisterAuthorityPayload {
  name: string;
  email: string;
  password: string;
  organization: string;
  badge_id: string;
  district: string;
  department_code: string;
  phone?: string;
  preferred_language?: Lang;
}

interface AppContextValue {
  isOnline: boolean;
  isSirenActive: boolean;
  toggleSiren: () => void;
  triggerVoiceAlert: (lang?: Lang, customMessage?: string) => void;
  stopVoice: () => void;
  reports: Report[];
  addReport: (data: {
    type: ReportType;
    description: string;
    photoName: string | null;
    photoFile?: File | null;
    location?: string;
    landmark_description?: string;
    latitude?: number;
    longitude?: number;
    severity?: 'low' | 'moderate' | 'critical';
  }) => Promise<{ ok: boolean; message?: string }>;
  updateReportStatus: (
    id: string,
    status: 'pending' | 'verified' | 'investigating' | 'resolved' | 'rejected',
    adminNotes?: string
  ) => Promise<void>;
  user: User | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; pending_verification?: boolean; email?: string; message?: string }>;
  registerCitizen: (data: RegisterCitizenPayload) => Promise<{ ok: boolean; pending_verification?: boolean; email?: string; demo_otp?: string; message?: string }>;
  registerAuthority: (data: RegisterAuthorityPayload) => Promise<{ ok: boolean; pending_verification?: boolean; email?: string; demo_otp?: string; message?: string }>;
  verifyEmail: (email: string, otp: string) => Promise<{ ok: boolean; message?: string }>;
  resendOtp: (email: string) => Promise<{ ok: boolean; demo_otp?: string; message?: string }>;
  forgotPassword: (email: string) => Promise<{ ok: boolean; demo_otp?: string; message?: string }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ ok: boolean; message?: string }>;
  refreshUserProfile: () => Promise<void>;
  logout: () => void;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setPersona: (persona: 'citizen' | 'authority') => void;
  alerts: AlertItem[];
  dismissAlert: (id: string) => void;
  offlineQueueCount: number;
  syncOfflineQueue: () => Promise<number>;
}

const defaultSettings: AppSettings = {
  language: 'en',
  notificationsEnabled: true,
  autoRefresh: true,
  darkMode: false,
  persona: 'citizen',
  audioAlertsEnabled: true,
};

const defaultAlerts: AlertItem[] = [
  {
    id: 'alt-01',
    title: 'Emergency Evacuation Warning',
    message: 'High landslide risk and slope saturation detected along Guwahati NH-27 Bypass (Sector 4B).',
    time: '4 min ago',
    level: 'critical',
    region_name: 'Guwahati, Assam',
    latitude: 26.1445,
    longitude: 91.7362,
  },
  {
    id: 'alt-02',
    title: 'Severe Hydrological Surcharge',
    message: 'Continuous torrential rainfall exceeded 185 mm in Cherrapunji - Mawsynram ridge. Pore pressure critical.',
    time: '22 min ago',
    level: 'critical',
    region_name: 'East Khasi Hills, Meghalaya',
    latitude: 25.2986,
    longitude: 91.7289,
  },
  {
    id: 'alt-03',
    title: 'Rockfall Joint Hazard Warning',
    message: 'Structural scarp movement observed near Singtam Teesta cut on NH-10. Single lane traffic advisory.',
    time: '1 hr ago',
    level: 'warning',
    region_name: 'Sikkim NH-10 Corridor',
    latitude: 27.3389,
    longitude: 88.6065,
  },
];

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [isSirenActive, setIsSirenActive] = useState<boolean>(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);

  const [reports, setReports] = useState<Report[]>(() => {
    try {
      const saved = localStorage.getItem('slopesense-reports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('slopesense-user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('slopesense-settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const [alerts, setAlerts] = useState<AlertItem[]>(defaultAlerts);

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-flush pending offline reports
      flushOfflineReports(API_BASE_URL).then((count) => {
        if (count > 0) {
          setOfflineQueueCount(getOfflineQueuedReports().length);
          loadBackendReports();
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of offline queue count
    setOfflineQueueCount(getOfflineQueuedReports().length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch reports from backend if online
  const loadBackendReports = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reports`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reports)) {
          const mapped: Report[] = data.reports.map((r: {
            id: string;
            report_type: string;
            description: string;
            location_name: string;
            landmark_description?: string;
            latitude?: number;
            longitude?: number;
            photo_filename: string | null;
            photo_url: string | null;
            status: string;
            severity: string;
            reporter_trust_score?: number;
            points_awarded?: number;
            admin_notes?: string;
            created_at: string;
          }) => ({
            id: r.id,
            type: (r.report_type as ReportType) || 'ground_cracks',
            description: r.description,
            location: r.location_name || 'Northeast Sector',
            landmark_description: r.landmark_description,
            latitude: r.latitude,
            longitude: r.longitude,
            photoName: r.photo_filename,
            photoUrl: r.photo_url ? (r.photo_url.startsWith('http') ? r.photo_url : `${API_BASE_URL}${r.photo_url}`) : undefined,
            status: (r.status as 'pending' | 'verified' | 'investigating' | 'resolved' | 'rejected') || 'pending',
            severity: (r.severity as 'low' | 'moderate' | 'critical') || 'moderate',
            reporter_trust_score: r.reporter_trust_score,
            points_awarded: r.points_awarded,
            admin_notes: r.admin_notes,
            createdAt: r.created_at,
            synced: true,
          }));
          setReports(mapped);
          localStorage.setItem('slopesense-reports', JSON.stringify(mapped));
        }
      }
    } catch {
      // Keep local reports if backend is temporarily unreachable
    }
  }, []);

  useEffect(() => {
    loadBackendReports();
  }, [loadBackendReports]);

  // Audio siren control
  const toggleSiren = useCallback(() => {
    if (isSirenActive) {
      sirenEngine.stop();
      setIsSirenActive(false);
    } else {
      const started = sirenEngine.start();
      setIsSirenActive(started);
    }
  }, [isSirenActive]);

  // Multilingual voice evacuation announcements
  const triggerVoiceAlert = useCallback((lang?: Lang, customMessage?: string) => {
    const selectedLang = lang || settings.language || 'en';
    speakEvacuationAlert(selectedLang, customMessage);
  }, [settings.language]);

  const stopVoice = useCallback(() => {
    stopVoiceAlert();
  }, []);

  // Persona toggle
  const setPersona = useCallback((persona: 'citizen' | 'authority') => {
    setSettings((prev) => {
      const next = { ...prev, persona };
      localStorage.setItem('slopesense-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  // Add report with instant offline queueing
  const addReport = useCallback(
    async (data: {
      type: ReportType;
      description: string;
      photoName: string | null;
      photoFile?: File | null;
      location?: string;
      landmark_description?: string;
      latitude?: number;
      longitude?: number;
      severity?: 'low' | 'moderate' | 'critical';
    }) => {
      const localId = crypto.randomUUID();
      const localReport: Report = {
        id: localId,
        type: data.type,
        description: data.description,
        location: data.location || 'Reported Location',
        landmark_description: data.landmark_description,
        latitude: data.latitude,
        longitude: data.longitude,
        photoName: data.photoName,
        status: 'pending',
        severity: data.severity || 'moderate',
        reporter_trust_score: user?.trust_score ?? 50.0,
        points_awarded: 0,
        createdAt: new Date().toISOString(),
        synced: navigator.onLine,
      };

      // Optimistically add to UI list
      setReports((prev) => {
        const next = [localReport, ...prev];
        localStorage.setItem('slopesense-reports', JSON.stringify(next));
        return next;
      });

      if (!navigator.onLine) {
        queueOfflineReport({
          report_type: data.type,
          description: data.description,
          latitude: data.latitude ?? 26.1445,
          longitude: data.longitude ?? 91.7362,
          location_name: data.location || 'Offline Recorded Location',
          landmark_description: data.landmark_description,
          severity: data.severity || 'moderate',
        });
        setOfflineQueueCount(getOfflineQueuedReports().length);
        return { ok: true, message: 'Saved offline. Report will synchronize automatically when internet reconnects.' };
      }

      // If online, upload directly to FastAPI backend
      try {
        const formData = new FormData();
        formData.append('report_type', data.type);
        formData.append('description', data.description);
        formData.append('latitude', (data.latitude ?? 26.1445).toString());
        formData.append('longitude', (data.longitude ?? 91.7362).toString());
        formData.append('location_name', data.location || 'Guwahati Monitoring Sector');
        if (data.landmark_description) {
          formData.append('landmark_description', data.landmark_description);
        }
        formData.append('severity', data.severity || 'moderate');
        if (data.photoFile) {
          formData.append('photo', data.photoFile);
        }

        const headers: Record<string, string> = {};
        if (user?.token) {
          headers['Authorization'] = `Bearer ${user.token}`;
        }

        const res = await fetch(`${API_BASE_URL}/api/v1/reports`, {
          method: 'POST',
          headers,
          body: formData,
        });

        if (res.ok) {
          await loadBackendReports();
          return { ok: true, message: 'Incident report verified and submitted to regional disaster control.' };
        } else {
          const err = await res.json().catch(() => ({ detail: 'Upload error' }));
          return { ok: false, message: err.detail || 'Could not save report to server.' };
        }
      } catch {
        // Fallback to queue if network dropped during flight
        queueOfflineReport({
          report_type: data.type,
          description: data.description,
          latitude: data.latitude ?? 26.1445,
          longitude: data.longitude ?? 91.7362,
          location_name: data.location || 'Guwahati Monitoring Sector',
          landmark_description: data.landmark_description,
          severity: data.severity || 'moderate',
        });
        setOfflineQueueCount(getOfflineQueuedReports().length);
        return { ok: true, message: 'Network dropped. Saved locally and queued for auto-sync.' };
      }
    },
    [user?.token, user?.trust_score, loadBackendReports]
  );

  // Refresh current user profile from server
  const refreshUserProfile = useCallback(async () => {
    const savedUser = localStorage.getItem('slopesense-user');
    const token = savedUser ? JSON.parse(savedUser).token : null;
    if (!token || !navigator.onLine) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const u = await res.json();
        setUser((prev) => {
          if (!prev) return null;
          const updated: User = {
            ...prev,
            name: u.name,
            role: (u.role as UserRole) || prev.role,
            organization: u.organization,
            badge_id: u.badge_id,
            district: u.district,
            phone: u.phone,
            is_verified: u.is_verified,
            trust_score: u.trust_score,
            reputation_points: u.reputation_points,
            verified_reports_count: u.verified_reports_count,
          };
          localStorage.setItem('slopesense-user', JSON.stringify(updated));
          return updated;
        });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (user?.token) {
      refreshUserProfile();
    }
  }, [user?.token, refreshUserProfile]);

  // Authority Triage status update
  const updateReportStatus = useCallback(
    async (
      id: string,
      newStatus: 'pending' | 'verified' | 'investigating' | 'resolved' | 'rejected',
      adminNotes?: string
    ) => {
      setReports((prev) => {
        const next = prev.map((r) => (r.id === id ? { ...r, status: newStatus, admin_notes: adminNotes ?? r.admin_notes } : r));
        localStorage.setItem('slopesense-reports', JSON.stringify(next));
        return next;
      });

      if (navigator.onLine) {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;
          const bodyPayload: { status: string; admin_notes?: string } = { status: newStatus };
          if (adminNotes !== undefined) {
            bodyPayload.admin_notes = adminNotes;
          }
          const res = await fetch(`${API_BASE_URL}/api/v1/reports/${id}/status`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(bodyPayload),
          });
          if (res.ok) {
            await loadBackendReports();
            await refreshUserProfile();
          }
        } catch {
          // Keep local state
        }
      }
    },
    [user?.token, loadBackendReports, refreshUserProfile]
  );

  // Authentication: Login
  const login = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (navigator.onLine) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password }),
        });

        if (res.ok) {
          const data = await res.json();
          const authUser: User = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: (data.user.role as UserRole) || 'citizen',
            organization: data.user.organization,
            badge_id: data.user.badge_id,
            district: data.user.district,
            phone: data.user.phone,
            token: data.access_token,
            is_verified: data.user.is_verified,
            trust_score: data.user.trust_score,
            reputation_points: data.user.reputation_points,
            verified_reports_count: data.user.verified_reports_count,
          };
          localStorage.setItem('slopesense-user', JSON.stringify(authUser));
          setUser(authUser);
          if (authUser.role === 'responder' || authUser.role === 'admin') {
            setPersona('authority');
          } else {
            setPersona('citizen');
          }
          return { ok: true };
        } else {
          const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }));
          if (res.status === 403 && typeof err.detail === 'string' && err.detail.toLowerCase().includes('not verified')) {
            return {
              ok: false,
              pending_verification: true,
              email: normalizedEmail,
              message: err.detail || 'Email not verified. Enter your 6-digit OTP to activate.',
            };
          }
          return { ok: false, message: err.detail || 'Email or password incorrect.' };
        }
      } catch {
        // Fallback to offline check
      }
    }

    // Offline login fallback
    const accounts = JSON.parse(localStorage.getItem('slopesense-accounts') ?? '{}');
    const account = accounts[normalizedEmail];
    if (!account || account.password !== password) {
      return { ok: false, message: 'Invalid credentials. (Note: Running offline)' };
    }
    const offlineUser: User = {
      email: normalizedEmail,
      name: account.name,
      role: account.role || 'citizen',
      organization: account.organization,
      badge_id: account.badge_id,
      district: account.district,
      is_verified: true,
      trust_score: 50.0,
      reputation_points: 10,
      verified_reports_count: 0,
    };
    localStorage.setItem('slopesense-user', JSON.stringify(offlineUser));
    setUser(offlineUser);
    if (offlineUser.role === 'responder') setPersona('authority');
    return { ok: true };
  }, [setPersona]);

  // Authentication: Register Citizen
  const registerCitizen = useCallback(async (data: RegisterCitizenPayload) => {
    const normalizedEmail = data.email.trim().toLowerCase();

    if (navigator.onLine) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name.trim(),
            email: normalizedEmail,
            password: data.password,
            role: 'citizen',
            phone: data.phone,
            preferred_language: data.preferred_language || 'en',
          }),
        });

        if (res.ok) {
          const resp = await res.json();
          return {
            ok: true,
            pending_verification: true,
            email: normalizedEmail,
            demo_otp: resp.demo_otp,
            message: resp.message || 'Verification code sent to your email.',
          };
        } else {
          const err = await res.json().catch(() => ({ detail: 'Registration failed.' }));
          return { ok: false, message: err.detail || 'Registration failed.' };
        }
      } catch {
        // Fall through to offline cache
      }
    }

    // Offline registration fallback
    const accounts = JSON.parse(localStorage.getItem('slopesense-accounts') ?? '{}');
    if (accounts[normalizedEmail]) {
      return { ok: false, message: 'An account with this email already exists.' };
    }
    accounts[normalizedEmail] = {
      name: data.name.trim(),
      password: data.password,
      role: 'citizen',
    };
    localStorage.setItem('slopesense-accounts', JSON.stringify(accounts));
    return {
      ok: true,
      pending_verification: true,
      email: normalizedEmail,
      demo_otp: '123456',
      message: 'Demo verification code: 123456 (Offline)',
    };
  }, []);

  // Authentication: Register Disaster Authority / First Responder
  const registerAuthority = useCallback(async (data: RegisterAuthorityPayload) => {
    const normalizedEmail = data.email.trim().toLowerCase();

    if (navigator.onLine) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name.trim(),
            email: normalizedEmail,
            password: data.password,
            role: 'responder',
            organization: data.organization,
            badge_id: data.badge_id,
            district: data.district,
            department_code: data.department_code,
            phone: data.phone,
            preferred_language: data.preferred_language || 'en',
          }),
        });

        if (res.ok) {
          const resp = await res.json();
          return {
            ok: true,
            pending_verification: true,
            email: normalizedEmail,
            demo_otp: resp.demo_otp,
            message: resp.message || 'Officer authorization code verified. Enter 6-digit OTP.',
          };
        } else {
          const err = await res.json().catch(() => ({ detail: 'Authority verification failed.' }));
          return { ok: false, message: err.detail || 'Authorization failed. Check your department key.' };
        }
      } catch {
        // Fallback for offline authority setup
      }
    }

    // Offline Authority Registration fallback
    const validLocalCodes = ['NDRF-SECURE-2026', 'SDMA-2026', 'GSI-OFFICER', 'PWD-ASSAM-2026'];
    if (!validLocalCodes.includes(data.department_code.trim().toUpperCase())) {
      return {
        ok: false,
        message: 'Invalid Department Authorization Code. First responder credentials require valid agency key (e.g. NDRF-SECURE-2026 or SDMA-2026).',
      };
    }

    const accounts = JSON.parse(localStorage.getItem('slopesense-accounts') ?? '{}');
    accounts[normalizedEmail] = {
      name: data.name.trim(),
      password: data.password,
      role: 'responder',
      organization: data.organization,
      badge_id: data.badge_id,
      district: data.district,
    };
    localStorage.setItem('slopesense-accounts', JSON.stringify(accounts));
    return {
      ok: true,
      pending_verification: true,
      email: normalizedEmail,
      demo_otp: '123456',
      message: 'Demo verification code: 123456 (Offline)',
    };
  }, []);

  // Verify Email with 6-digit OTP
  const verifyEmail = useCallback(
    async (email: string, otp: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (navigator.onLine) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normalizedEmail, otp: otp.trim() }),
          });
          if (res.ok) {
            const data = await res.json();
            const authUser: User = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: (data.user.role as UserRole) || 'citizen',
              organization: data.user.organization,
              badge_id: data.user.badge_id,
              district: data.user.district,
              phone: data.user.phone,
              token: data.access_token,
              is_verified: true,
              trust_score: data.user.trust_score,
              reputation_points: data.user.reputation_points,
              verified_reports_count: data.user.verified_reports_count,
            };
            localStorage.setItem('slopesense-user', JSON.stringify(authUser));
            setUser(authUser);
            if (authUser.role === 'responder' || authUser.role === 'admin') {
              setPersona('authority');
            } else {
              setPersona('citizen');
            }
            return { ok: true, message: 'Account verified successfully!' };
          } else {
            const err = await res.json().catch(() => ({ detail: 'Verification failed.' }));
            return { ok: false, message: err.detail || 'Invalid or expired verification code.' };
          }
        } catch {
          // offline fallback
        }
      }

      // Offline mode
      const offlineUser: User = {
        email: normalizedEmail,
        name: 'Verified User',
        role: 'citizen',
        is_verified: true,
        trust_score: 50.0,
        reputation_points: 10,
        verified_reports_count: 0,
      };
      localStorage.setItem('slopesense-user', JSON.stringify(offlineUser));
      setUser(offlineUser);
      return { ok: true, message: 'Verified locally (Offline mode).' };
    },
    [setPersona]
  );

  // Resend 6-digit OTP
  const resendOtp = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (navigator.onLine) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/resend-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail }),
        });
        if (res.ok) {
          const data = await res.json();
          return { ok: true, demo_otp: data.demo_otp, message: data.message };
        } else {
          const err = await res.json().catch(() => ({ detail: 'Failed to resend code' }));
          return { ok: false, message: err.detail || 'Failed to resend code' };
        }
      } catch {
        return { ok: false, message: 'Network error resending code' };
      }
    }
    return { ok: true, demo_otp: '123456', message: 'Demo verification code: 123456' };
  }, []);

  // Forgot Password: Request 6-digit Reset OTP
  const forgotPassword = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (navigator.onLine) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail }),
        });
        if (res.ok) {
          const data = await res.json();
          return { ok: true, demo_otp: data.demo_otp, message: data.message };
        } else {
          const err = await res.json().catch(() => ({ detail: 'Failed to dispatch reset code.' }));
          return { ok: false, message: err.detail || 'No account registered with this email address.' };
        }
      } catch {
        // fallback
      }
    }
    return { ok: true, demo_otp: '123456', message: 'Demo reset code: 123456 (Offline)' };
  }, []);

  // Reset Password: Validate OTP & update password
  const resetPassword = useCallback(
    async (email: string, otp: string, newPassword: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      if (navigator.onLine) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normalizedEmail, otp: otp.trim(), new_password: newPassword }),
          });
          if (res.ok) {
            const data = await res.json();
            const authUser: User = {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: (data.user.role as UserRole) || 'citizen',
              organization: data.user.organization,
              badge_id: data.user.badge_id,
              district: data.user.district,
              phone: data.user.phone,
              token: data.access_token,
              is_verified: true,
              trust_score: data.user.trust_score,
              reputation_points: data.user.reputation_points,
              verified_reports_count: data.user.verified_reports_count,
            };
            localStorage.setItem('slopesense-user', JSON.stringify(authUser));
            setUser(authUser);
            if (authUser.role === 'responder' || authUser.role === 'admin') {
              setPersona('authority');
            } else {
              setPersona('citizen');
            }
            return { ok: true, message: 'Password reset and signed in successfully!' };
          } else {
            const err = await res.json().catch(() => ({ detail: 'Failed to reset password.' }));
            return { ok: false, message: err.detail || 'Incorrect or expired reset code.' };
          }
        } catch {
          // offline fallback
        }
      }

      // Offline fallback
      const accounts = JSON.parse(localStorage.getItem('slopesense-accounts') ?? '{}');
      if (accounts[normalizedEmail]) {
        accounts[normalizedEmail].password = newPassword;
        localStorage.setItem('slopesense-accounts', JSON.stringify(accounts));
      }
      return { ok: true, message: 'Password updated locally (Offline mode).' };
    },
    [setPersona]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('slopesense-user');
    setUser(null);
    setPersona('citizen');
  }, [setPersona]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem('slopesense-settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    const synced = await flushOfflineReports(API_BASE_URL);
    setOfflineQueueCount(getOfflineQueuedReports().length);
    if (synced > 0) {
      await loadBackendReports();
    }
    return synced;
  }, [loadBackendReports]);

  return (
    <AppContext.Provider
      value={{
        isOnline,
        isSirenActive,
        toggleSiren,
        triggerVoiceAlert,
        stopVoice,
        reports,
        addReport,
        updateReportStatus,
        user,
        login,
        registerCitizen,
        registerAuthority,
        verifyEmail,
        resendOtp,
        forgotPassword,
        resetPassword,
        refreshUserProfile,
        logout,
        settings,
        updateSettings,
        setPersona,
        alerts,
        dismissAlert,
        offlineQueueCount,
        syncOfflineQueue,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
