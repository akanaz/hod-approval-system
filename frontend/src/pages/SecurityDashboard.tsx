import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { securityApi } from '../services/api';
import toast from 'react-hot-toast';
import jsQR from 'jsqr';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

interface VerifyResult {
  valid: boolean;
  timeWindowValid?: boolean;
  alreadyExited?: boolean;
  timeMessage?: string;
  status?: string;
  message?: string;
  request?: {
    id: string;
    exitPassNumber?: string;
    leaveType: string;
    departureDate: string;
    departureTime?: string;
    expectedReturnTime?: string;
    reason: string;
    destination?: string;
    urgencyLevel: string;
    approvedAt?: string;
    actualExitTime?: string;
    faculty: {
      name: string;
      employeeId: string;
      department: string;
      email: string;
      phoneNumber?: string;
    } | null;
  };
}

interface TodayEntry {
  id: string;
  exitPassNumber?: string;
  leaveType: string;
  departureDate: string;
  departureTime?: string;
  expectedReturnTime?: string;
  reason: string;
  destination?: string;
  urgencyLevel: string;
  approvedAt?: string;
  actualExitTime?: string;
  exited: boolean;
  faculty: {
    name: string;
    employeeId: string;
    department: string;
    email: string;
    phoneNumber?: string;
  } | null;
}

interface TodayStats {
  total: number;
  exited: number;
  pending: number;
  requests: TodayEntry[];
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

const URGENCY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border border-red-300',
  HIGH: 'bg-orange-100 text-orange-800 border border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  LOW: 'bg-green-100 text-green-800 border border-green-300',
};

const URGENCY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-green-500',
};

function fmt(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtTime(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */

export default function SecurityDashboard() {
  const { user } = useAuth();

  const [scanInput, setScanInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [loggingExit, setLoggingExit] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);

  const [activeTab, setActiveTab] = useState<'scanner' | 'today'>('scanner');
  const inputRef = useRef<HTMLInputElement>(null);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);

  // Load today's approved exits
  const loadTodayApproved = async () => {
    setLoadingToday(true);
    try {
      const data = await securityApi.getTodayApproved();
      setTodayStats(data);
    } catch {
      toast.error("Failed to load today's exits");
    } finally {
      setLoadingToday(false);
    }
  };

  useEffect(() => {
    loadTodayApproved();
    inputRef.current?.focus();
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      scanningRef.current = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  /* ── Verify ── */
  const handleVerifyWithValue = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setVerifying(true);
    setResult(null);
    try {
      const data = await securityApi.verifyExitPass(trimmed);
      setResult(data);
    } catch (err: any) {
      setResult({ valid: false, message: err?.response?.data?.message || 'Verification failed.' });
    } finally {
      setVerifying(false);
    }
  }, []);

  const handleVerify = () => {
    const trimmed = scanInput.trim();
    if (!trimmed) {
      toast.error('Enter an exit pass number or scan QR');
      return;
    }
    handleVerifyWithValue(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify();
  };

  /* ── Log exit ── */
  const handleLogExit = async () => {
    if (!result?.request?.id) return;
    setLoggingExit(true);
    try {
      await securityApi.logExit(result.request.id);
      toast.success('Exit logged successfully!');
      await handleVerifyWithValue(scanInput);
      await loadTodayApproved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to log exit');
    } finally {
      setLoggingExit(false);
    }
  };

  /* ── Clear ── */
  const handleClear = () => {
    setScanInput('');
    setResult(null);
    inputRef.current?.focus();
  };

  /* ── Camera: start ── */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      streamRef.current = stream;
      setCameraActive(true);
      scanningRef.current = true;

      // jsQR canvas scan loop — works in all browsers
      const scan = () => {
        if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code) {
              setScanInput(code.data);
              stopCamera();
              toast.success('QR code detected!');
              handleVerifyWithValue(code.data);
              return;
            }
          }
        }
        if (scanningRef.current) requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    } catch {
      toast.error('Camera access denied. Please allow camera permission.');
    }
  };

  /* ── Camera: stop ── */
  const stopCamera = () => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  /* ─────────────── Render ─────────────── */

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ═══ HEADER ═══ */}
      <div className="bg-gradient-to-r from-slate-50 to-teal-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center shadow-md">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Gate Security Dashboard</h1>
              <p className="text-slate-500 text-sm">
                {user?.firstName} {user?.lastName} &nbsp;·&nbsp; {user?.department}
              </p>
            </div>
          </div>
          <LiveClock />
        </div>
      </div>

      {/* ═══ STATS BAR ═══ */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="✅" label="Today's Approved" value={loadingToday ? '—' : String(todayStats?.total ?? 0)} color="text-emerald-600" bg="bg-emerald-50 border-emerald-200" />
        <StatCard icon="🚶" label="Exited" value={loadingToday ? '—' : String(todayStats?.exited ?? 0)} color="text-teal-600" bg="bg-teal-50 border-teal-200" />
        <StatCard icon="⏳" label="Pending Exit" value={loadingToday ? '—' : String(todayStats?.pending ?? 0)} color="text-amber-600" bg="bg-amber-50 border-amber-200" />
      </div>

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'scanner'
              ? 'bg-white text-teal-700 shadow border border-slate-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          QR Scanner / Verify
        </button>
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'today'
              ? 'bg-white text-teal-700 shadow border border-slate-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Today's Exits
          {(todayStats?.pending ?? 0) > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {todayStats!.pending}
            </span>
          )}
        </button>
      </div>

      {/* ═══ TAB: SCANNER ═══ */}
      {activeTab === 'scanner' && (
        <div className="space-y-5">

          {/* Scanner input card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h2 className="text-slate-800 font-semibold">Scan or Enter Exit Pass</h2>
                <p className="text-slate-500 text-xs">Use a QR scanner device, open the camera, or type the pass number manually</p>
              </div>
            </div>

            {/* Text input row */}
            <div className="flex gap-2 mb-3">
              <input
                ref={inputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. EXIT-1234567890-ABCD"
                className="flex-1 border border-slate-300 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-mono tracking-wider"
                autoComplete="off"
              />
              {/* Camera button */}
              {cameraActive ? (
                <button
                  onClick={stopCamera}
                  className="px-4 py-3 bg-red-100 text-red-700 border border-red-300 font-semibold rounded-xl hover:bg-red-200 transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Stop Camera
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  title="Open camera to scan QR code"
                  className="px-4 py-3 font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap border bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Camera
                </button>
              )}
              {/* Verify button */}
              <button
                onClick={handleVerify}
                disabled={verifying || !scanInput.trim()}
                className="px-5 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap flex items-center gap-2"
              >
                {verifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verify
                  </>
                )}
              </button>
              {(result || scanInput) && (
                <button
                  onClick={handleClear}
                  className="px-4 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-all border border-slate-300"
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Hidden canvas for jsQR scanning */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera viewfinder */}
            {cameraActive && (
              <div className="mt-4 relative rounded-xl overflow-hidden border-2 border-teal-400 shadow-md bg-black">
                <video
                  ref={videoRef}
                  className="w-full max-h-72 object-cover"
                  muted
                  playsInline
                />
                {/* Scan overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-4 border-teal-400 rounded-xl opacity-70 relative">
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-sm" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-sm" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-sm" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-sm" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                  <p className="text-white text-sm text-center font-medium">
                    📷 Point the QR code at the camera
                  </p>
                </div>
              </div>
            )}

            <p className="text-slate-400 text-xs mt-2">
              Tip: A hardware QR scanner will auto-fill and press Enter to verify.
            </p>
          </div>

          {/* Verification result */}
          {result && (
            <VerificationResultCard result={result} onLogExit={handleLogExit} loggingExit={loggingExit} />
          )}
        </div>
      )}

      {/* ═══ TAB: TODAY'S EXITS ═══ */}
      {activeTab === 'today' && (
        <TodayExitsPanel stats={todayStats} loading={loadingToday} onRefresh={loadTodayApproved} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-right">
      <p className="text-slate-800 font-mono text-xl font-bold tabular-nums">
        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-slate-500 text-xs">
        {time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }: { icon: string; label: string; value: string; color: string; bg: string }) {
  return (
    <div className={`${bg} border rounded-2xl p-5 shadow-sm`}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <p className="text-slate-500 text-xs font-medium">{label}</p>
          <p className={`${color} text-2xl font-bold tabular-nums leading-tight`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function IdentityCheckItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-600 text-xs">
      <div className="w-4 h-4 rounded border-2 border-teal-400 bg-teal-50 flex items-center justify-center shrink-0">
        <svg className="w-2.5 h-2.5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      {label}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-base leading-5 shrink-0">{icon}</span>
      <div>
        <p className="text-slate-500 text-xs font-medium">{label}</p>
        <p className="text-slate-800 text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function VerificationResultCard({ result, onLogExit, loggingExit }: {
  result: VerifyResult;
  onLogExit: () => void;
  loggingExit: boolean;
}) {
  const req = result.request;
  const isValid = result.valid;
  const alreadyExited = result.alreadyExited;

  /* ── VALID — Green card ── */
  if (isValid && req) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-6 shadow-sm animate-fade-in">
        {/* Status banner */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-emerald-700 font-bold text-lg">APPROVED — EXIT PERMITTED</h3>
            <p className="text-emerald-600 text-sm">Request verified successfully</p>
          </div>
          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${URGENCY_STYLES[req.urgencyLevel] || 'bg-gray-100 text-gray-800'}`}>
            {req.urgencyLevel}
          </span>
        </div>

        {/* Identity Verification Section */}
        <div className="bg-white border border-emerald-200 rounded-xl p-4 mb-5">
          <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Identity Verification — Confirm Before Allowing Exit
          </p>
          <div className="flex items-center gap-4">
            {/* Avatar with initials */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-md shrink-0">
              <span className="text-white text-xl font-black tracking-tight">
                {req.faculty?.name
                  ? req.faculty.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  : '?'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-slate-800 text-xl font-bold leading-tight">{req.faculty?.name ?? '—'}</p>
              <p className="text-teal-600 text-sm font-mono mt-0.5">{req.faculty?.employeeId ?? '—'}</p>
              <p className="text-slate-500 text-sm">{req.faculty?.department ?? '—'}</p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <IdentityCheckItem label="Verify name on ID card matches above" />
            <IdentityCheckItem label="Verify employee ID matches above" />
            <IdentityCheckItem label="Verify face matches ID card photo" />
          </div>
        </div>

        {/* Faculty details grid */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <DetailRow icon="📱" label="Phone" value={req.faculty?.phoneNumber ?? '—'} />
          <DetailRow icon="📅" label="Departure Date" value={fmtDate(req.departureDate)} />
          <DetailRow icon="🕐" label="Departure Time" value={req.departureTime ?? 'Full Day'} />
          {req.expectedReturnTime && (
            <DetailRow icon="🔄" label="Expected Return" value={req.expectedReturnTime} />
          )}
          {req.destination && (
            <DetailRow icon="📍" label="Destination" value={req.destination} />
          )}
          <DetailRow icon="📝" label="Leave Type" value={req.leaveType === 'FULL_DAY' ? 'Full Day' : 'Partial Day'} />
          <DetailRow icon="✅" label="Approved At" value={fmt(req.approvedAt)} />
        </div>

        {/* Reason */}
        <div className="bg-white border border-emerald-200 rounded-xl p-3 mb-5">
          <p className="text-emerald-700 text-xs font-semibold mb-1">REASON FOR DEPARTURE</p>
          <p className="text-slate-700 text-sm">{req.reason}</p>
        </div>

        {/* Exit pass number */}
        {req.exitPassNumber && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mb-5 flex items-center gap-2">
            <span className="text-slate-500 text-xs font-mono">Pass #</span>
            <span className="text-slate-800 font-mono text-sm font-bold tracking-widest">{req.exitPassNumber}</span>
          </div>
        )}

        {/* LOG EXIT button */}
        <button
          onClick={onLogExit}
          disabled={loggingExit}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-lg rounded-xl hover:from-emerald-600 hover:to-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-3"
        >
          {loggingExit ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Logging Exit...
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              LOG EXIT — Allow Faculty to Leave
            </>
          )}
        </button>
      </div>
    );
  }

  /* ── ALREADY EXITED — blue card ── */
  if (!isValid && alreadyExited && req) {
    return (
      <div className="bg-blue-50 border-2 border-blue-400 rounded-2xl p-6 shadow-sm animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-blue-700 font-bold text-lg">ALREADY EXITED</h3>
            <p className="text-blue-600 text-sm">{result.timeMessage || 'Faculty has already logged their exit.'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 bg-white border border-blue-200 rounded-xl p-4">
          <DetailRow icon="👤" label="Faculty" value={req.faculty?.name ?? '—'} />
          <DetailRow icon="🏛️" label="Department" value={req.faculty?.department ?? '—'} />
          <DetailRow icon="🕐" label="Exit Logged At" value={fmt(req.actualExitTime)} />
          <DetailRow icon="📝" label="Leave Type" value={req.leaveType === 'FULL_DAY' ? 'Full Day' : 'Partial Day'} />
        </div>
      </div>
    );
  }

  /* ── INVALID — Red card ── */
  return (
    <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-6 shadow-sm animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center shadow-md">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h3 className="text-red-700 font-bold text-lg">EXIT NOT PERMITTED</h3>
          <p className="text-red-600 text-sm">
            {result.timeMessage || result.message || 'This exit pass is not valid.'}
          </p>
        </div>
      </div>

      {req && (
        <div className="bg-white border border-red-200 rounded-xl p-4 mt-2">
          <p className="text-red-700 text-xs font-semibold mb-2">REQUEST DETAILS</p>
          <div className="grid grid-cols-2 gap-3">
            <DetailRow icon="👤" label="Faculty" value={req.faculty?.name ?? '—'} />
            <DetailRow icon="📋" label="Status" value={result.status ?? req.urgencyLevel} />
            <DetailRow icon="📅" label="Date" value={fmtDate(req.departureDate)} />
            <DetailRow icon="🕐" label="Time" value={req.departureTime ?? 'Full Day'} />
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-red-100 rounded-xl border border-red-200">
        <p className="text-red-700 text-sm font-semibold text-center">
          Do NOT allow this faculty to exit. Contact HOD if needed.
        </p>
      </div>
    </div>
  );
}

function TodayExitsPanel({ stats, loading, onRefresh }: {
  stats: TodayStats | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'exited'>('all');
  const entries = stats?.requests ?? [];
  const filtered = entries.filter((e) => {
    if (filter === 'pending') return !e.exited;
    if (filter === 'exited') return e.exited;
    return true;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h2 className="text-slate-800 font-semibold">Today's Approved Departures</h2>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(['all', 'pending', 'exited'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                  filter === f
                    ? 'bg-white text-teal-700 shadow border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-all disabled:opacity-50 border border-slate-200"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin mr-3" />
          Loading today's exits...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="font-medium">No {filter !== 'all' ? filter + ' ' : ''}departures for today</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filtered.map((entry) => (
            <TodayEntryRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function TodayEntryRow({ entry }: { entry: TodayEntry }) {
  return (
    <div className={`px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors ${entry.exited ? 'opacity-60' : ''}`}>
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${URGENCY_DOT[entry.urgencyLevel] || 'bg-gray-400'}`} />

      <div className="flex-1 min-w-0">
        <p className="text-slate-800 font-semibold text-sm truncate">
          {entry.faculty?.name ?? 'Unknown Faculty'}
        </p>
        <p className="text-slate-500 text-xs truncate">
          {entry.faculty?.employeeId} · {entry.faculty?.department}
        </p>
      </div>

      <div className="text-right text-xs shrink-0">
        <p className="text-slate-700 font-medium">
          {entry.leaveType === 'FULL_DAY' ? 'Full Day' : (entry.departureTime ?? '—')}
        </p>
        {entry.expectedReturnTime && (
          <p className="text-slate-400">↩ {entry.expectedReturnTime}</p>
        )}
      </div>

      <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${URGENCY_STYLES[entry.urgencyLevel] || 'bg-gray-100 text-gray-800'}`}>
        {entry.urgencyLevel}
      </span>

      <div className="shrink-0 text-right min-w-[90px]">
        {entry.exited ? (
          <div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-700 text-xs font-semibold rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Exited
            </span>
            <p className="text-slate-400 text-xs mt-0.5">{fmtTime(entry.actualExitTime)}</p>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-700 text-xs font-semibold rounded-full">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            Pending
          </span>
        )}
      </div>
    </div>
  );
}
