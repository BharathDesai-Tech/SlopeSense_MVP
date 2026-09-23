// ============================================================================
// SlopeSense AI: Offline-First Emergency Alert & Audio Siren Engine
// ============================================================================
// Operates 100% locally with zero internet connectivity.
// Uses browser-native Web Audio API synthesizer for acoustic warning sirens
// and SpeechSynthesisUtterance for multilingual evacuation directives.
// ============================================================================

export interface SafeShelter {
  id: string;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  capacity_persons: number;
  contact_helpline: string;
  type: 'Community Hall' | 'Sports Complex' | 'Govt College' | 'Army Relief Camp';
}

export const OFFLINE_SAFE_SHELTERS: SafeShelter[] = [
  {
    id: 'shelter-ghy-01',
    name: 'Sarusajai Indoor Sports Complex (Safe Assembly Zone A)',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    latitude: 26.1158,
    longitude: 91.7656,
    elevation_m: 65,
    capacity_persons: 4500,
    contact_helpline: '1070 / 1077 (NDRF Kamrup)',
    type: 'Sports Complex',
  },
  {
    id: 'shelter-shl-02',
    name: 'Polo Grounds Multi-Purpose Relief Center',
    district: 'East Khasi Hills',
    state: 'Meghalaya',
    latitude: 25.5892,
    longitude: 91.8885,
    elevation_m: 1490,
    capacity_persons: 2800,
    contact_helpline: '1070 (SDMA Meghalaya)',
    type: 'Community Hall',
  },
  {
    id: 'shelter-gtk-03',
    name: 'Paljor Stadium High-Ground Shelter Hub',
    district: 'East Sikkim',
    state: 'Sikkim',
    latitude: 27.3325,
    longitude: 88.6142,
    elevation_m: 1720,
    capacity_persons: 3200,
    contact_helpline: '03592-202461 (Sikkim Disaster Cell)',
    type: 'Sports Complex',
  },
  {
    id: 'shelter-sil-04',
    name: 'Silchar District Sports Association Ground',
    district: 'Cachar',
    state: 'Assam',
    latitude: 24.8333,
    longitude: 92.7789,
    elevation_m: 35,
    capacity_persons: 3500,
    contact_helpline: '1077 (Cachar Control Room)',
    type: 'Govt College',
  },
  {
    id: 'shelter-koh-05',
    name: 'Kohima Local Ground Community Assembly Shelter',
    district: 'Kohima',
    state: 'Nagaland',
    latitude: 25.6669,
    longitude: 94.1086,
    elevation_m: 1444,
    capacity_persons: 2100,
    contact_helpline: '1070 (Nagaland NSDMA)',
    type: 'Army Relief Camp',
  },
];

export const EVACUATION_BROADCASTS = {
  en: 'EMERGENCY EVACUATION WARNING. Critical landslide risk detected in this mountain sector. Avoid steep cut slopes, road embankments, and drainage ravines. Proceed calmly to the nearest designated high-ground relief shelter immediately.',
  hi: 'आपातकालीन चेतावनी! इस पर्वतीय क्षेत्र में गंभीर भूस्खलन का ख़तरा है। कृपया खड़ी ढलानों और नालों से तुरंत दूर हटें और नज़दीकी सुरक्षित राहत शिविर में पहुँचें।',
  as: 'জৰুৰী সতৰ্কবাণী! এই পাহাৰীয়া অঞ্চলত ভূমিস্খলনৰ চৰম বিপদ দেখা দিছে। সকলোলোকে অবিলম্বে থিয় পাহাৰ আৰু নলা-নৰ্দমাৰ কাষৰ পৰা আঁতৰি সুৰক্ষিত আশ্ৰয় শিবিৰলৈ যাওক।',
};

// ----------------------------------------------------------------------------
// Acoustic Siren Synthesizer (Web Audio API)
// ----------------------------------------------------------------------------
class SirenSynthesizer {
  private audioCtx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private isPlaying: boolean = false;

  public start(): boolean {
    if (this.isPlaying) return true;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      // Main siren carrier oscillator
      this.osc = this.audioCtx.createOscillator();
      this.osc.type = 'sawtooth';
      this.osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);

      // Low-frequency oscillator (LFO) to modulate carrier pitch like emergency civil defense siren (0.5 Hz sweep)
      this.lfo = this.audioCtx.createOscillator();
      this.lfo.frequency.setValueAtTime(0.65, this.audioCtx.currentTime); // 0.65 Hz sweep rate

      const lfoGain = this.audioCtx.createGain();
      lfoGain.gain.setValueAtTime(220, this.audioCtx.currentTime); // sweep ±220 Hz (580 Hz to 1020 Hz)

      this.lfo.connect(lfoGain);
      lfoGain.connect(this.osc.frequency);

      // Master output volume gain
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(0.18, this.audioCtx.currentTime); // loud but comfortable

      this.osc.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      this.osc.start();
      this.lfo.start();
      this.isPlaying = true;
      return true;
    } catch (e) {
      console.warn('Web Audio siren unavailable:', e);
      return false;
    }
  }

  public stop(): void {
    if (!this.isPlaying) return;
    try {
      if (this.osc) {
        this.osc.stop();
        this.osc.disconnect();
        this.osc = null;
      }
      if (this.lfo) {
        this.lfo.stop();
        this.lfo.disconnect();
        this.lfo = null;
      }
      if (this.audioCtx) {
        this.audioCtx.close();
        this.audioCtx = null;
      }
    } catch (e) {
      console.warn('Error stopping siren:', e);
    } finally {
      this.isPlaying = false;
    }
  }

  public getActive(): boolean {
    return this.isPlaying;
  }
}

export const sirenEngine = new SirenSynthesizer();

// ----------------------------------------------------------------------------
// Multilingual Speech Synthesis (Offline-Capable TTS)
// ----------------------------------------------------------------------------
export function speakEvacuationAlert(
  lang: 'en' | 'hi' | 'as' = 'en',
  customMessage?: string
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis not supported on this device');
    return;
  }

  // Cancel any running speech
  window.speechSynthesis.cancel();

  const textToSpeak = customMessage || EVACUATION_BROADCASTS[lang] || EVACUATION_BROADCASTS.en;
  const utterance = new SpeechSynthesisUtterance(textToSpeak);

  // Set language tags
  if (lang === 'hi') {
    utterance.lang = 'hi-IN';
  } else if (lang === 'as') {
    utterance.lang = 'as-IN';
  } else {
    utterance.lang = 'en-IN';
  }

  utterance.rate = 0.95; // Slightly measured for emergency clarity
  utterance.pitch = 1.05; // Slightly urgent
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
}

export function stopVoiceAlert(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// ----------------------------------------------------------------------------
// Offline Incident Reporting Queue (Indexed / LocalStorage)
// ----------------------------------------------------------------------------
export interface QueuedOfflineReport {
  id: string;
  report_type: string;
  description: string;
  latitude: number;
  longitude: number;
  location_name: string;
  landmark_description?: string;
  photo_base64?: string;
  photo_name?: string;
  severity: string;
  queued_at: string;
  synced: boolean;
}

const OFFLINE_REPORTS_KEY = 'slopesense-offline-queue';

export function getOfflineQueuedReports(): QueuedOfflineReport[] {
  try {
    const raw = localStorage.getItem(OFFLINE_REPORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineReport(report: Omit<QueuedOfflineReport, 'id' | 'queued_at' | 'synced'>): QueuedOfflineReport {
  const queued: QueuedOfflineReport = {
    ...report,
    id: crypto.randomUUID(),
    queued_at: new Date().toISOString(),
    synced: false,
  };
  const list = getOfflineQueuedReports();
  list.unshift(queued);
  localStorage.setItem(OFFLINE_REPORTS_KEY, JSON.stringify(list));
  return queued;
}

export async function flushOfflineReports(apiBaseUrl: string): Promise<number> {
  const list = getOfflineQueuedReports();
  const pending = list.filter((r) => !r.synced);
  if (pending.length === 0) return 0;

  let successCount = 0;
  const remaining: QueuedOfflineReport[] = [];

  for (const item of list) {
    if (item.synced) continue;
    try {
      const formData = new FormData();
      formData.append('report_type', item.report_type);
      formData.append('description', item.description);
      formData.append('latitude', item.latitude.toString());
      formData.append('longitude', item.longitude.toString());
      formData.append('location_name', item.location_name);
      if (item.landmark_description) {
        formData.append('landmark_description', item.landmark_description);
      }
      formData.append('severity', item.severity);

      // Attach user authentication token if logged in so points are credited to the user
      const headers: Record<string, string> = {};
      try {
        const savedUser = localStorage.getItem('slopesense-user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed?.token) {
            headers['Authorization'] = `Bearer ${parsed.token}`;
          }
        }
      } catch {
        // Continue without auth header
      }

      const resp = await fetch(`${apiBaseUrl}/api/v1/reports`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (resp.ok) {
        successCount++;
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }

  localStorage.setItem(OFFLINE_REPORTS_KEY, JSON.stringify(remaining));
  return successCount;
}
