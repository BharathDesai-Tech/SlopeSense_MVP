import { useState } from 'react';
import {
  Target,
  Droplets,
  MapPin,
  Clock,
  CheckCircle2,
  FileText,
  Download,
  ShieldCheck,
  AlertTriangle,
  Send,
  Eye,
  X,
  WifiOff,
  Mountain,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { ReportType } from '@/types';

const typeConfig: Record<ReportType, { icon: typeof Target; label: string; color: string; bg: string }> = {
  ground_cracks: { icon: Target, label: 'Ground Tension Crack', color: 'text-rose-600', bg: 'bg-rose-50' },
  water_seepage: { icon: Droplets, label: 'Water Seepage Breakout', color: 'text-blue-600', bg: 'bg-blue-50' },
  rockfall: { icon: Mountain, label: 'Rockfall & Scarp Failure', color: 'text-amber-600', bg: 'bg-amber-50' },
  road_subsidence: { icon: AlertTriangle, label: 'Highway Subsidence', color: 'text-purple-600', bg: 'bg-purple-50' },
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending Triage', color: 'text-amber-700', bg: 'bg-amber-100' },
  verified: { label: 'Verified Hazard', color: 'text-blue-700', bg: 'bg-blue-100' },
  investigating: { label: 'NDRF Dispatched', color: 'text-purple-700', bg: 'bg-purple-100' },
  resolved: { label: 'Mitigated / Resolved', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  rejected: { label: 'False Alarm / Rejected', color: 'text-rose-700', bg: 'bg-rose-100' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} days ago`;
}

const QUICK_NOTES: Record<string, string[]> = {
  verified: [
    'Confirmed active tension crack matching LiDAR fault line. Area cordoned off; warning signs erected.',
    'Geotechnical engineer inspected site: high shear strain detected in road embankment. Forwarded to PWD.',
    'Verified by local SDRF observer. Photo evidence corroborates ground fissure.',
  ],
  investigating: [
    'NDRF Battalion Quick Response Team deployed with heavy excavation and clearance machinery.',
    'Disaster management reconnaissance squad dispatched to evaluate slope toe stability.',
    'State Highway department and civil defense en route to establish traffic diversions.',
  ],
  resolved: [
    'Debris cleared, retaining gabions reinforced, and slope drainage culvert restored. Road open to traffic.',
    'Slope stabilization work completed with anchored wire mesh. Hazard neutralized.',
    'Surface runoff diverted via interceptor drains. Slip risk neutralized.',
  ],
  rejected: [
    'Field inspection confirmed minor surface asphalt wear; no structural bedrock movement detected.',
    'Duplicate submission. Incident already being actively managed under regional emergency queue.',
    'Location inspected by field sentinel: terrain is stable with no signs of tension or seepage.',
  ],
};

export default function MyReportsPage() {
  const { reports, updateReportStatus, settings, user } = useApp();
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'investigating' | 'resolved' | 'rejected'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [triageModal, setTriageModal] = useState<{
    isOpen: boolean;
    reportId: string;
    reportTitle: string;
    newStatus: 'pending' | 'verified' | 'investigating' | 'resolved' | 'rejected';
    notes: string;
  } | null>(null);

  const isAuthority = settings.persona === 'authority' || user?.role === 'responder' || user?.role === 'admin';

  const filteredReports = reports.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const exportReports = () => {
    const blob = new Blob([JSON.stringify(reports, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `slopesense-reports-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-slate-900 p-6 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
              <FileText className="h-4 w-4" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-blue-400">
              {isAuthority ? 'NDRF Regional Triage & Dispatch Desk' : 'Citizen Incident Submissions'}
            </span>
          </div>
          <h1 className="text-2xl font-black">
            {isAuthority ? 'Incident Verification & Response Queue' : 'My Reported Slope Hazards'}
          </h1>
          <p className="text-xs text-slate-400">
            {isAuthority
              ? 'Real-time feed of crowd-sourced geotechnical anomalies, photo verification, and response team dispatching.'
              : 'Keep track of ground cracks, slope seepage, and rockfall reports submitted to emergency authorities.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={exportReports}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            Export GeoJSON
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'pending', 'verified', 'investigating', 'resolved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition-all ${
              filter === s
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s === 'all' ? 'All Incidents' : s}
            {s === 'all' && ` (${reports.length})`}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-16 text-center border border-slate-100 shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Reports in this Queue</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {isAuthority
              ? 'No incoming hazard reports currently match the selected filter category.'
              : 'Reports submitted from the Home page or offline queue will appear here.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => {
            const config = typeConfig[report.type] || typeConfig.ground_cracks;
            const status = statusConfig[report.status] || statusConfig.pending;
            const Icon = config.icon;

            return (
              <div
                key={report.id}
                className="flex flex-col justify-between rounded-3xl bg-white p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all gap-4"
              >
                <div className="space-y-3">
                  {/* Top Row: Type & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${config.bg}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{config.label}</h4>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span>{report.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                      {report.synced === false && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <WifiOff className="h-2.5 w-2.5" />
                          Offline Queued
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Landmark and GPS Details */}
                  {report.landmark_description && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-amber-50/70 border border-amber-200/60 px-3 py-1.5 rounded-xl font-medium">
                      <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span><strong>Landmark:</strong> {report.landmark_description}</span>
                    </div>
                  )}

                  {/* Reporter Trust Rating & Points Badge */}
                  <div className="flex items-center justify-between gap-2 text-[11px] pt-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-600">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                      Reporter Trust: <strong className="text-slate-900">{Math.round(report.reporter_trust_score ?? 50)}%</strong>
                    </span>
                    {(report.points_awarded ?? 0) > 0 ? (
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                        +{report.points_awarded} Sentinel Pts Awarded
                      </span>
                    ) : report.status === 'rejected' ? (
                      <span className="font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[10px]">
                        -10 Pts (False Report)
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">
                        Pending verification (+20 pts)
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {report.description}
                  </p>

                  {/* Official NDRF / Authority Triage Directive */}
                  {report.admin_notes && (
                    <div className="flex items-start gap-2.5 bg-blue-50/90 border border-blue-200/90 rounded-2xl p-3 text-xs text-blue-950">
                      <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-[10px] text-blue-700 uppercase tracking-wider block">
                          Official NDRF / Authority Action Directive
                        </span>
                        <p className="font-medium text-slate-800 leading-relaxed">
                          {report.admin_notes}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Photo Preview Thumbnail */}
                  {(report.photoUrl || report.photoName) && (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-48 group">
                      <img
                        src={report.photoUrl || (report.photoName ? `/uploads/reports/${report.photoName}` : '')}
                        alt="Incident Field Photo"
                        className="w-full h-36 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/uploads/reports/crack_nh27.svg';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedPhoto(report.photoUrl || (report.photoName ? `/uploads/reports/${report.photoName}` : null))}
                        className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        Click to Inspect Evidence
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer: Timestamp & Authority Triage Actions */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{timeAgo(report.createdAt)}</span>
                    </div>
                    {report.severity && (
                      <span className={`font-bold uppercase tracking-wider text-[10px] ${
                        report.severity === 'critical' ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        Severity: {report.severity}
                      </span>
                    )}
                  </div>

                  {/* Authority Action Triage Bar */}
                  {isAuthority && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {report.status !== 'verified' && (
                        <button
                          type="button"
                          onClick={() =>
                            setTriageModal({
                              isOpen: true,
                              reportId: report.id,
                              reportTitle: `${config.label} (${report.location})`,
                              newStatus: 'verified',
                              notes: QUICK_NOTES['verified'][0],
                            })
                          }
                          className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-blue-50 hover:bg-blue-100 py-1.5 px-2 text-[11px] font-bold text-blue-700 transition-all active:scale-95"
                          title="Verify hazard and reward reporter with 25 points"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          Verify (+25 Pts)
                        </button>
                      )}

                      {report.status !== 'investigating' && (
                        <button
                          type="button"
                          onClick={() =>
                            setTriageModal({
                              isOpen: true,
                              reportId: report.id,
                              reportTitle: `${config.label} (${report.location})`,
                              newStatus: 'investigating',
                              notes: QUICK_NOTES['investigating'][0],
                            })
                          }
                          className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-purple-50 hover:bg-purple-100 py-1.5 px-2 text-[11px] font-bold text-purple-700 transition-all active:scale-95"
                        >
                          <Send className="h-3 w-3" />
                          Dispatch NDRF
                        </button>
                      )}

                      {report.status !== 'resolved' && (
                        <button
                          type="button"
                          onClick={() =>
                            setTriageModal({
                              isOpen: true,
                              reportId: report.id,
                              reportTitle: `${config.label} (${report.location})`,
                              newStatus: 'resolved',
                              notes: QUICK_NOTES['resolved'][0],
                            })
                          }
                          className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 py-1.5 px-2 text-[11px] font-bold text-emerald-700 transition-all active:scale-95"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Resolve
                        </button>
                      )}

                      {report.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() =>
                            setTriageModal({
                              isOpen: true,
                              reportId: report.id,
                              reportTitle: `${config.label} (${report.location})`,
                              newStatus: 'rejected',
                              notes: QUICK_NOTES['rejected'][0],
                            })
                          }
                          className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 py-1.5 px-2 text-[11px] font-bold text-rose-700 transition-all active:scale-95"
                          title="Mark as false alarm and penalize reporter"
                        >
                          <X className="h-3 w-3" />
                          Reject (-10 Pts)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Photo Zoom Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Geotechnical Field Photo Evidence</span>
              <button onClick={() => setSelectedPhoto(null)} className="p-1 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <img src={selectedPhoto} alt="Zoomed Inspection View" className="w-full max-h-[70vh] object-contain bg-slate-950" />
          </div>
        </div>
      )}

      {/* Authority Triage Feedback Modal */}
      {triageModal && triageModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setTriageModal(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    NDRF Operational Triage Action
                  </h3>
                  <p className="text-[11px] text-slate-500">{triageModal.reportTitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTriageModal(null)}
                className="p-1 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Action Type:</span>
                <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full ${statusConfig[triageModal.newStatus]?.bg} ${statusConfig[triageModal.newStatus]?.color}`}>
                  {statusConfig[triageModal.newStatus]?.label}
                </span>
              </div>

              {/* Quick Note Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Quick Standard Operating Directives (Click to Select)
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {(QUICK_NOTES[triageModal.newStatus] || []).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTriageModal((prev) => (prev ? { ...prev, notes: preset } : null))}
                      className="w-full text-left text-[11px] p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 transition-all font-medium"
                    >
                      "{preset}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Note Textarea */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Official Officer Remarks & Public Directive:
                </label>
                <textarea
                  rows={3}
                  value={triageModal.notes}
                  onChange={(e) =>
                    setTriageModal((prev) => (prev ? { ...prev, notes: e.target.value } : null))
                  }
                  placeholder="Enter official action taken or reason for citizen visibility..."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTriageModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (triageModal) {
                    await updateReportStatus(triageModal.reportId, triageModal.newStatus, triageModal.notes);
                    setTriageModal(null);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 transition-all shadow-md active:scale-95"
              >
                Confirm & Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
