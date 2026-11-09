import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Type,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Package,
  Search,
  Download,
  ArrowUpCircle,
  Trash2,
  RefreshCw,
  Terminal,
  Sparkles,
  Palette,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Globe,
  Wifi,
  RotateCcw,
  Check,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { ExecutionEngine, SyntaxColors } from '../types';
import { DEFAULT_CUSTOM_COLORS } from '../constants/themes';
import {
  testBrowserWebAssemblySupport,
  installPackageInPyodide,
  uninstallPackageInPyodide,
} from '../utils/pythonRunner';
import {
  getApiUrl,
  getApiBaseUrl,
  setApiBaseUrl,
  testApiGatewayConnection,
  testServerAiStatus,
  getGeminiApiKey,
  setGeminiApiKey,
  DEFAULT_CLOUD_API_URL,
  isAndroidApkEnvironment,
} from '../utils/apiConfig';

interface InstalledPackage {
  name: string;
  version: string;
}

interface PackageSearchItem {
  name: string;
  summary: string;
  version?: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  indentSpaces: number;
  setIndentSpaces: (spaces: number) => void;
  engine: ExecutionEngine;
  setEngine: (engine: ExecutionEngine) => void;
  onOpenColorPicker?: () => void;
  onOpenExportApk?: () => void;
  customColors?: SyntaxColors;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  indentSpaces,
  setIndentSpaces,
  engine,
  setEngine,
  onOpenColorPicker,
  onOpenExportApk,
  customColors,
}) => {
  const [versionInfo, setVersionInfo] = useState<{
    cpythonVersion: string;
    cpythonDetails: string;
    pyodideVersion: string;
    pyodideDetails: string;
  }>({
    cpythonVersion: '3.10.12',
    cpythonDetails: 'CPython 3.10.12 (Linux x86_64 Native)',
    pyodideVersion: '3.12.7',
    pyodideDetails: 'Pyodide v0.26.4 (Python 3.12.7 WebAssembly)',
  });

  const [wasmStatus, setWasmStatus] = useState<{ ok: boolean; message: string; details?: string } | null>(null);

  // Package Manager States
  const [isInstalledDropdownOpen, setIsInstalledDropdownOpen] = useState<boolean>(false);
  const [pkgTab, setPkgTab] = useState<'installed' | 'search'>('installed');
  const [installedPackages, setInstalledPackages] = useState<InstalledPackage[]>(() => {
    try {
      const saved = localStorage.getItem('pydroid3_installed_packages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });
  const [isLoadingPackages, setIsLoadingPackages] = useState<boolean>(false);
  const [installedFilter, setInstalledFilter] = useState<string>('');

  // Search & Install States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<PackageSearchItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [customPkgInput, setCustomPkgInput] = useState<string>('');

  // Execution / Terminal Output States
  const [activeActionPkg, setActiveActionPkg] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'install' | 'upgrade' | 'uninstall' | null>(null);
  const [actionOutput, setActionOutput] = useState<string>('');
  const [actionStatus, setActionStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [showLogTerminal, setShowLogTerminal] = useState<boolean>(false);

  // API Gateway / Cloud Server States for Android APK and Web
  const [apiGatewayUrl, setApiGatewayUrl] = useState<string>(() => getApiBaseUrl());
  const [isTestingApi, setIsTestingApi] = useState<boolean>(false);
  const [apiTestResult, setApiTestResult] = useState<{ ok: boolean; latencyMs: number; message: string } | null>(null);
  const [apiSaveSuccess, setApiSaveSuccess] = useState<boolean>(false);


  // Server Gemini AI Status States
  const [isTestingAiServer, setIsTestingAiServer] = useState<boolean>(false);
  const [aiServerStatus, setAiServerStatus] = useState<{ ok: boolean; model: string; message: string } | null>(null);

  // Gemini API Key Input States (For Web and Android APK)
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState<string>(() => getGeminiApiKey());
  const [showKeyPassword, setShowKeyPassword] = useState<boolean>(false);
  const [isVerifyingKey, setIsVerifyingKey] = useState<boolean>(false);
  const [keyVerifyResult, setKeyVerifyResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [keySaveSuccess, setKeySaveSuccess] = useState<boolean>(false);

  // Fetch installed packages
  const fetchInstalledPackages = async () => {
    setIsLoadingPackages(true);
    try {
      const res = await fetch(getApiUrl('/api/python/packages'));
      const data = await res.json();
      if (data && data.packages && Array.isArray(data.packages)) {
        setInstalledPackages(data.packages);
        try {
          localStorage.setItem('pydroid3_installed_packages', JSON.stringify(data.packages));
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Failed to load packages:', e);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  // Search packages
  const handleSearchPackages = async (q: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(getApiUrl(`/api/python/packages/search?q=${encodeURIComponent(q)}`));
      const data = await res.json();
      if (data && data.packages) {
        setSearchResults(data.packages);
      }
    } catch (e) {
      console.warn('Search packages error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger Install or Upgrade with Dual-Engine (Server CPython + Android On-Device Pyodide WASM)
  const handleInstallPackage = async (pkgName: string, isUpgrade: boolean = false) => {
    if (!pkgName.trim()) return;
    const clean = pkgName.trim();

    setActiveActionPkg(clean);
    setActionType(isUpgrade ? 'upgrade' : 'install');
    setActionStatus('running');
    setShowLogTerminal(true);

    let serverSucceeded = false;
    let serverOutput = '';

    // Step 1: Attempt Cloud Server installation (CPython Native)
    setActionOutput(`📦 [pip install${isUpgrade ? ' --upgrade' : ''} ${clean}]\n1. Đang kết nối máy chủ CPython...\n`);
    try {
      const res = await fetch(getApiUrl('/api/python/packages/install'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean, upgrade: isUpgrade }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          serverSucceeded = true;
          serverOutput = data.output || `Đã cài đặt ${clean} trên máy chủ CPython!`;
        }
      }
    } catch (_) {
      // Server is offline, unreachable, or app running in isolated APK
    }

    // Step 2: Install directly on-device into Pyodide WASM & micropip
    setActionOutput((prev) => prev + `2. Đang nạp gói [${clean}] vào bộ nhân Pyodide trên thiết bị Android (WASM & Micropip)...\n`);
    const pyodideResult = await installPackageInPyodide(clean);

    if (serverSucceeded || pyodideResult.success) {
      setActionStatus('success');
      const finalVersion = pyodideResult.version || 'đã cài đặt';

      const summaryLogs = [
        serverSucceeded ? `⚡ [Máy chủ CPython]: ${serverOutput}` : '⚡ [Máy chủ CPython]: Ngoại tuyến (Đã bỏ qua)',
        pyodideResult.success ? `📱 [Thiết bị Android]: ${pyodideResult.output}` : `📱 [Thiết bị Android]: ${pyodideResult.output}`,
        `\n🎉 Thư viện [${clean}] (${finalVersion}) đã sẵn sàng hoạt động trong ứng dụng!`
      ].join('\n');

      setActionOutput(summaryLogs);
      setCustomPkgInput('');

      // Update installedPackages state and persistent storage
      const newPkg: InstalledPackage = { name: clean, version: finalVersion };
      setInstalledPackages((prev) => {
        const filtered = prev.filter((p) => p.name.toLowerCase() !== clean.toLowerCase());
        const updated = [newPkg, ...filtered];
        try {
          localStorage.setItem('pydroid3_installed_packages', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      // Synchronize with server if available
      if (serverSucceeded) {
        fetchInstalledPackages().catch(() => {});
      }
    } else {
      setActionStatus('error');
      setActionOutput(
        `❌ Không thể cài đặt thư viện [${clean}]:\n${pyodideResult.output}\n\n` +
        `💡 Hướng dẫn:\n` +
        `• Hãy đảm bảo điện thoại của bạn có kết nối mạng Internet để tải gói từ PyPI.\n` +
        `• Hầu hết các thư viện Python thuần (pure Python) và các gói chính thức (numpy, pandas, matplotlib, sympy, pyfiglet, rich, requests...) đều được hỗ trợ đầy đủ.`
      );
    }

    setActiveActionPkg(null);
  };

  // Trigger Uninstall
  const handleUninstallPackage = async (pkgName: string) => {
    if (!pkgName.trim()) return;
    const clean = pkgName.trim();
    if (!confirm(`Bạn có chắc chắn muốn gỡ cài đặt thư viện [${clean}] không?`)) {
      return;
    }

    setActiveActionPkg(clean);
    setActionType('uninstall');
    setActionStatus('running');
    setActionOutput(`🗑️ [pip uninstall -y ${clean}]\nĐang tiến hành gỡ bỏ...\n`);
    setShowLogTerminal(true);

    // Try server uninstall
    try {
      await fetch(getApiUrl('/api/python/packages/uninstall'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean }),
      }).catch(() => {});
    } catch (_) {}

    // Pyodide local uninstall
    const pyodideUnResult = await uninstallPackageInPyodide(clean);

    setActionStatus('success');
    setActionOutput(pyodideUnResult.output || `✅ Đã gỡ bỏ thư viện [${clean}] thành công!`);

    // Update list & persistent storage
    setInstalledPackages((prev) => {
      const updated = prev.filter((p) => p.name.toLowerCase() !== clean.toLowerCase());
      try {
        localStorage.setItem('pydroid3_installed_packages', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    setActiveActionPkg(null);
  };

  useEffect(() => {
    if (isOpen) {
      setApiGatewayUrl(getApiBaseUrl());
      setApiTestResult(null);
      setGeminiApiKeyInput(getGeminiApiKey());
      setKeyVerifyResult(null);
      setKeySaveSuccess(false);
      testBrowserWebAssemblySupport().then(setWasmStatus).catch(() => {});
      fetchInstalledPackages();
      handleSearchPackages('');

      fetch(getApiUrl('/api/python/version'))
        .then((res) => res.json())
        .then((data) => {
          if (data && data.cpython && data.pyodide) {
            setVersionInfo({
              cpythonVersion: data.cpython.version || '3.10.12',
              cpythonDetails: data.cpython.details || `CPython ${data.cpython.version} Native`,
              pyodideVersion: data.pyodide.version || '3.12.7',
              pyodideDetails: data.pyodide.details || `Pyodide (Python ${data.pyodide.version})`,
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fontOptions = [
    { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
    { label: 'Fira Code', value: "'Fira Code', monospace" },
    { label: 'Monospace', value: "monospace" },
  ];

  const filteredInstalled = installedPackages.filter((p) =>
    p.name.toLowerCase().includes(installedFilter.toLowerCase())
  );

  const isPackageInstalled = (name: string): InstalledPackage | undefined => {
    return installedPackages.find((p) => p.name.toLowerCase() === name.toLowerCase());
  };

  const activePalette = customColors || DEFAULT_CUSTOM_COLORS;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-[#181824] border border-[#302f46] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col text-gray-200 shadow-2xl overflow-hidden">
        {/* Header - Nhỏ gọn, thanh lịch */}
        <div className="h-11 border-b border-[#29283d] px-3.5 flex items-center justify-between shrink-0 bg-[#1e1e2d]">
          <div className="flex items-center space-x-2">
            <div className="p-1 bg-amber-400/15 rounded-lg text-amber-400 border border-amber-400/30">
              <Settings className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-xs sm:text-sm text-gray-100">
              Cài Đặt Môi Trường
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content - Thu nhỏ kích thước các ô chức năng, loại bỏ các chú thích dài dòng */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs custom-scrollbar">
          {/* 1. Cỡ chữ Editor */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-[#262538]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-gray-200 flex items-center space-x-1.5">
                <Type className="w-3.5 h-3.5 text-sky-400" />
                <span>Cỡ chữ Editor</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                {fontSize}px
              </span>
            </div>
            <input
              type="range"
              min={12}
              max={26}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-amber-400 h-1.5 bg-[#252538] rounded cursor-pointer"
            />
          </div>

          {/* 2. Phông chữ lập trình */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-[#262538]">
            <div className="font-semibold text-gray-200 mb-1.5">
              Phông chữ lập trình
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {fontOptions.map((font) => (
                <button
                  key={font.value}
                  onClick={() => setFontFamily(font.value)}
                  className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer text-xs truncate ${
                    fontFamily === font.value
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                      : 'bg-[#191928] border-[#29283d] text-gray-300 hover:bg-[#202033]'
                  }`}
                  style={{ fontFamily: font.value }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Thụt lề Tab */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-[#262538]">
            <div className="flex items-center space-x-1.5 font-semibold text-gray-200 mb-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Thụt lề phím Tab</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setIndentSpaces(4)}
                className={`py-1.5 px-2.5 rounded-lg border text-center transition cursor-pointer text-xs font-semibold ${
                  indentSpaces === 4
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
                    : 'bg-[#191928] border-[#29283d] text-gray-300 hover:bg-[#202033]'
                }`}
              >
                4 khoảng trắng (PEP 8)
              </button>

              <button
                onClick={() => setIndentSpaces(2)}
                className={`py-1.5 px-2.5 rounded-lg border text-center transition cursor-pointer text-xs font-semibold ${
                  indentSpaces === 2
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
                    : 'bg-[#191928] border-[#29283d] text-gray-300 hover:bg-[#202033]'
                }`}
              >
                2 khoảng trắng
              </button>
            </div>
          </div>

          {/* 4. Bộ thực thi Python (Execution Engine) - Gọn gàng, không chú thích dài dòng */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-[#262538]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-gray-200 flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bộ thực thi Python</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#101b14] border border-emerald-500/30 text-emerald-300">
                {engine === 'cpython' ? `CPython ${versionInfo.cpythonVersion}` : `Pyodide ${versionInfo.pyodideVersion}`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {/* Option 1: CPython Native */}
              <button
                type="button"
                onClick={() => setEngine('cpython')}
                className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                  engine === 'cpython'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                    : 'bg-[#191928] border-[#29283d] text-gray-300 hover:bg-[#202033]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">⚡ CPython Native</span>
                  {engine === 'cpython' && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500 text-black font-black">
                      ✓ ĐANG CHẠY
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-gray-400 mt-1">
                  v{versionInfo.cpythonVersion}
                </div>
              </button>

              {/* Option 2: Pyodide WASM */}
              <button
                type="button"
                onClick={() => setEngine('pyodide')}
                className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                  engine === 'pyodide'
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200 font-bold'
                    : 'bg-[#191928] border-[#29283d] text-gray-300 hover:bg-[#202033]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs">🌐 Pyodide WASM</span>
                  {engine === 'pyodide' && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-sky-400 text-black font-black">
                      ✓ ĐANG CHẠY
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-gray-400 mt-1 flex items-center justify-between">
                  <span>v{versionInfo.pyodideVersion}</span>
                  {wasmStatus && !wasmStatus.ok && (
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* 5. Tô màu cú pháp (Color Designer) - Thu gọn, xóa chú thích */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-[#262538] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-200 flex items-center space-x-1.5">
                <Palette className="w-3.5 h-3.5 text-pink-400" />
                <span>Tô màu cú pháp</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (onOpenColorPicker) onOpenColorPicker();
                }}
                className="py-1 px-2.5 bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 hover:opacity-90 active:scale-95 text-black font-extrabold rounded-lg text-[11px] flex items-center space-x-1 cursor-pointer transition shadow-sm"
              >
                <Palette className="w-3 h-3 fill-current shrink-0" />
                <span>Tùy chỉnh màu</span>
              </button>
            </div>

            {/* Bảng màu mẫu nhỏ gọn */}
            <div className="p-1.5 rounded-lg bg-[#191928] border border-[#29283d] flex flex-wrap items-center gap-1.5 text-[10px]">
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/5 font-mono">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activePalette.keyword }} />
                <span style={{ color: activePalette.keyword }}>def / if</span>
              </div>
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/5 font-mono">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activePalette.function }} />
                <span style={{ color: activePalette.function }}>tên_hàm</span>
              </div>
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/5 font-mono">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activePalette.string }} />
                <span style={{ color: activePalette.string }}>"chuỗi"</span>
              </div>
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/5 font-mono">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activePalette.number }} />
                <span style={{ color: activePalette.number }}>123</span>
              </div>
              <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-black/40 border border-white/5 font-mono">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activePalette.comment }} />
                <span style={{ color: activePalette.comment }}># note</span>
              </div>
            </div>
          </div>

          {/* 6. Đóng gói APK & Tải mã nguồn */}
          {onOpenExportApk && (
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#0d2a1c] to-[#122129] border border-emerald-500/50 flex items-center justify-between shadow-sm">
              <div className="space-y-0.5 pr-2">
                <span className="font-semibold text-emerald-300 flex items-center space-x-1.5 text-xs">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Đóng gói APK Android (Không cần máy tính)</span>
                </span>
                <p className="text-[10px] text-gray-400 leading-tight">
                  Tải file .ZIP mã nguồn & Xem hướng dẫn build APK tự động qua GitHub Actions
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExportApk();
                }}
                className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-extrabold rounded-lg text-[11px] flex items-center space-x-1 transition cursor-pointer shrink-0 shadow"
              >
                <span>Mở</span>
                <span>➔</span>
              </button>
            </div>
          )}

          {/* 7. Cổng API & Máy chủ Trợ lý AI (Backend Gateway cho APK Android & Web) */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-[#262538] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-200 flex items-center space-x-1.5 text-xs">
                <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>1. Cổng Máy chủ Cloud (Server Gateway)</span>
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                isAndroidApkEnvironment()
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
              }`}>
                {isAndroidApkEnvironment() ? '📱 Môi trường APK' : '🌐 Môi trường Web'}
              </span>
            </div>

            <p className="text-[10px] text-gray-400 leading-tight">
              Cổng máy chủ để kết nối: <strong className="text-gray-200">Trợ lý AI Gemini</strong>, <strong className="text-gray-200">CPython Native</strong> và <strong className="text-gray-200">Pip Package Manager</strong>.
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={apiGatewayUrl}
                  onChange={(e) => {
                    setApiGatewayUrl(e.target.value);
                    setApiTestResult(null);
                    setApiSaveSuccess(false);
                  }}
                  placeholder="Cổng nội bộ (Mặc định: Tự động kết nối trực tiếp)"
                  className="flex-1 px-2.5 py-1.5 bg-[#0e0e18] border border-[#2b2a40] focus:border-cyan-400 rounded-lg text-xs font-mono text-gray-200 placeholder-gray-500 outline-none transition"
                />
                <button
                  type="button"
                  disabled={isTestingApi}
                  onClick={async () => {
                    setIsTestingApi(true);
                    setApiTestResult(null);
                    const res = await testApiGatewayConnection(apiGatewayUrl);
                    setApiTestResult(res);
                    setIsTestingApi(false);
                  }}
                  className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center space-x-1 transition cursor-pointer shrink-0"
                >
                  <Wifi className={`w-3 h-3 ${isTestingApi ? 'animate-pulse' : ''}`} />
                  <span>{isTestingApi ? 'Đang thử...' : 'Kiểm tra'}</span>
                </button>
              </div>

              {/* Action buttons: Reset to Local, Save */}
              <div className="flex items-center justify-between text-[11px] pt-0.5 flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setApiGatewayUrl('');
                    setApiBaseUrl('');
                    setApiTestResult(null);
                    setApiSaveSuccess(true);
                    setTimeout(() => setApiSaveSuccess(false), 2500);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer transition text-[10px]"
                  title="Dùng cổng nội bộ (khuyến nghị cho bản Web & Preview)"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Cổng Mặc Định Nội Bộ (Khuyến nghị)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setApiBaseUrl(apiGatewayUrl);
                    setApiSaveSuccess(true);
                    setTimeout(() => setApiSaveSuccess(false), 2500);
                  }}
                  className={`px-2.5 py-0.5 rounded font-bold transition flex items-center space-x-1 text-[11px] cursor-pointer ${
                    apiSaveSuccess
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-[#1e1d30] hover:bg-[#282740] text-gray-200 border border-[#353450]'
                  }`}
                >
                  {apiSaveSuccess ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Đã lưu!</span>
                    </>
                  ) : (
                    <span>Lưu Cổng Máy chủ</span>
                  )}
                </button>
              </div>

              {/* Status message */}
              {apiTestResult && (
                <div
                  className={`p-2 rounded-lg text-[10px] flex items-start space-x-2 border transition ${
                    apiTestResult.ok
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {apiTestResult.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 leading-tight">
                    <div className="font-semibold flex items-center space-x-1.5">
                      <span>{apiTestResult.message}</span>
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-black/40">
                        ⚡ {apiTestResult.latencyMs}ms
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 8. Trợ lý Trí tuệ Nhân tạo Google Gemini (Máy chủ Tích hợp) */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-[#262538] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-200 flex items-center space-x-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>2. Trợ lý Trí tuệ Nhân tạo Gemini AI</span>
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 border-amber-500/40 text-amber-300">
                ✨ Gemini 3.8 Flash & Live
              </span>
            </div>

            <p className="text-[10px] text-gray-400 leading-tight">
              Toàn bộ tính năng AI (Trò chuyện thông minh, Gỡ lỗi Python, Chuẩn hóa PEP 8, Tạo bài học và Live Audio) được hỗ trợ tự động trên Web và có thể cấu hình khóa API Gemini riêng cho bản APK Android độc lập.
            </p>

            <div className="space-y-2">
              {/* Cổng nhập khóa Gemini API Key */}
              <div className="p-2.5 rounded-lg bg-[#0e0e18] border border-[#2b2a40] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-200 flex items-center space-x-1.5 text-xs">
                    <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Cổng nhập khóa Google Gemini API Key</span>
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                    geminiApiKeyInput.trim()
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-gray-800/60 border-gray-700 text-gray-400'
                  }`}>
                    {geminiApiKeyInput.trim() ? 'Khóa cá nhân' : 'Khóa mặc định'}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <div className="relative flex-1">
                    <input
                      type={showKeyPassword ? 'text' : 'password'}
                      value={geminiApiKeyInput}
                      onChange={(e) => {
                        const val = e.target.value.trim().replace(/^['"]+|['"]+$/g, '');
                        setGeminiApiKeyInput(val);
                        setKeyVerifyResult(null);
                        setKeySaveSuccess(false);
                      }}
                      placeholder="Dán mã khóa API tại đây..."
                      className="w-full pl-2.5 pr-8 py-1.5 bg-[#141420] border border-[#302f48] focus:border-amber-400 rounded-lg text-xs font-mono text-gray-100 placeholder-gray-500 outline-none transition select-text"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyPassword(!showKeyPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition cursor-pointer"
                      title={showKeyPassword ? 'Ẩn khóa' : 'Hiện khóa'}
                    >
                      {showKeyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isVerifyingKey}
                    onClick={async () => {
                      const cleanKey = geminiApiKeyInput.trim().replace(/^['"]+|['"]+$/g, '');
                      setIsVerifyingKey(true);
                      setKeyVerifyResult(null);
                      try {
                        const res = await fetch(getApiUrl('/api/ai/verify-key'), {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ apiKey: cleanKey }),
                        });
                        const data = await res.json();
                        setKeyVerifyResult({
                          ok: data.ok,
                          message: data.message || (data.ok ? 'Khóa Gemini API hợp lệ!' : 'Khóa API không hợp lệ'),
                        });
                      } catch (err: any) {
                        setKeyVerifyResult({
                          ok: false,
                          message: 'Lỗi kiểm tra kết nối tới dịch vụ AI.',
                        });
                      } finally {
                        setIsVerifyingKey(false);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 active:scale-95 disabled:opacity-50 font-bold rounded-lg text-xs flex items-center space-x-1 transition cursor-pointer shrink-0"
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 ${isVerifyingKey ? 'animate-spin' : ''}`} />
                    <span>{isVerifyingKey ? 'Đang thử...' : 'Kiểm tra'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-0.5 flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setGeminiApiKeyInput('');
                      setGeminiApiKey('');
                      setKeyVerifyResult(null);
                      setKeySaveSuccess(true);
                      setTimeout(() => setKeySaveSuccess(false), 2500);
                    }}
                    className="text-amber-400 hover:text-amber-300 flex items-center space-x-1 cursor-pointer transition text-[10px]"
                    title="Xóa khóa tùy chỉnh để dùng kết nối mặc định"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Dùng Khóa Tự Động Mặc Định</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const clean = geminiApiKeyInput.trim().replace(/^['"]+|['"]+$/g, '');
                      setGeminiApiKey(clean);
                      setKeySaveSuccess(true);
                      setTimeout(() => setKeySaveSuccess(false), 2500);
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition flex items-center space-x-1 text-xs cursor-pointer ${
                      keySaveSuccess
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : 'bg-amber-400 hover:bg-amber-300 text-black font-extrabold shadow'
                    }`}
                  >
                    {keySaveSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Đã lưu khóa!</span>
                      </>
                    ) : (
                      <span>Lưu Khóa API</span>
                    )}
                  </button>
                </div>

                {keyVerifyResult && (
                  <div
                    className={`p-2 rounded-lg text-[10px] flex items-start space-x-2 border transition ${
                      keyVerifyResult.ok
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {keyVerifyResult.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 leading-tight font-medium">
                      {keyVerifyResult.message}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-gray-400 space-y-1.5 pt-1.5 border-t border-[#252438]">
                  <p>
                    📋 <strong>Cách lấy khóa từ Google AI Studio:</strong> Tại danh sách khóa (trên <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline hover:text-amber-300 font-bold">aistudio.google.com/app/apikey</a>), hãy bấm vào <strong>biểu tượng Sao chép</strong> (hình 2 ô vuông lồng nhau <span className="font-mono text-amber-300 font-bold">❐</span> ngay bên phải tên khóa như <em>...jspg</em> hoặc <em>...xfhw</em>), sau đó quay lại đây dán vào ô trên và bấm <strong>Lưu Khóa API</strong>.
                  </p>
                  <p>
                    ☁️ <strong>Ghi chú:</strong> Khi đã lưu khóa, Trợ lý AI sẽ kết nối trực tiếp với Google Gemini 3.8 Flash trong cả phiên bản Web lẫn bản APK trên điện thoại.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0e0e18] border border-[#2b2a40] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <div className="text-[11px] text-gray-200 font-medium">
                      Google Gemini 3.8 Flash & Live API
                    </div>
                    <div className="text-[9px] text-emerald-400 font-mono">
                      Hỗ trợ trực tiếp máy chủ (Server-Side) & Bản APK độc lập
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isTestingAiServer}
                  onClick={async () => {
                    setIsTestingAiServer(true);
                    setAiServerStatus(null);
                    const res = await testServerAiStatus();
                    setAiServerStatus(res);
                    setIsTestingAiServer(false);
                  }}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 active:scale-95 disabled:opacity-50 font-bold rounded-lg text-xs flex items-center space-x-1 transition cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3 h-3 ${isTestingAiServer ? 'animate-spin' : ''}`} />
                  <span>{isTestingAiServer ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái'}</span>
                </button>
              </div>

              {aiServerStatus && (
                <div
                  className={`p-2 rounded-lg text-[10px] flex items-start space-x-2 border transition ${
                    aiServerStatus.ok
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-tight space-y-0.5">
                    <div className="font-semibold">{aiServerStatus.message}</div>
                    <p className="text-[10px] text-emerald-400/80">
                      ⚡ Mô hình hoạt động: <strong className="font-mono text-white">{aiServerStatus.model}</strong>. Phản hồi tức thì cho tất cả người dùng!
                    </p>
                  </div>
                </div>
              )}

              <div className="p-2 rounded-lg bg-[#0e0e16] border border-[#222135] text-[10px] text-gray-400 space-y-1">
                <div className="font-semibold text-gray-300 flex items-center space-x-1">
                  <span>ℹ️ Tính năng AI trên Pydroid 3 Web & APK:</span>
                </div>
                <p>
                  • <strong>Hỗ trợ Streaming & Live API:</strong> Phản hồi văn bản dạng luồng (Server-Sent Events) và kết nối âm thanh/văn bản thời gian thực qua WebSockets máy chủ.
                </p>
                <p>
                  • <strong>Bảo mật & Tự động:</strong> Toàn bộ gọi API được ủy nhiệm qua máy chủ nền tảng, đảm bảo ứng dụng luôn hoạt động ổn định và nhất quán cho mọi người truy cập.
                </p>
                <p>
                  • <strong>Chế độ dự phòng thông minh:</strong> Khi mất kết nối mạng, ứng dụng tự động kích hoạt bộ phân tích cú pháp Python chuẩn PEP 8 và hệ thống bài học nội bộ, đảm bảo không bao giờ bị gián đoạn.
                </p>
              </div>
            </div>
          </div>

          {/* 8. Quản lý thư viện Python (Pip) - Gọn gàng, loại bỏ các chú thích dư thừa */}
          <div className="p-2.5 rounded-xl bg-[#141420] border border-[#262538] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-200 flex items-center space-x-1.5">
                <Package className="w-3.5 h-3.5 text-amber-400" />
                <span>Quản lý thư viện (Pip)</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300 font-semibold">
                Đã cài: {installedPackages.length} gói
              </span>
            </div>

            {/* Ô nhập tải gói & Cài đặt */}
            <div className="flex items-center space-x-1.5">
              <input
                type="text"
                placeholder="Nhập tên gói (numpy, pandas, requests...)"
                value={customPkgInput}
                onChange={(e) => setCustomPkgInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customPkgInput.trim() && actionStatus !== 'running') {
                    handleInstallPackage(customPkgInput.trim());
                  }
                }}
                className="flex-1 bg-[#181826] border border-[#2b2a3f] rounded-lg px-2.5 py-1.5 text-xs text-gray-100 placeholder-gray-500 outline-none focus:border-amber-400 font-mono select-text"
              />
              <button
                type="button"
                onClick={() => handleInstallPackage(customPkgInput.trim())}
                disabled={!customPkgInput.trim() || actionStatus === 'running'}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black font-extrabold rounded-lg text-xs flex items-center space-x-1 transition cursor-pointer disabled:opacity-40 shrink-0"
              >
                {actionStatus === 'running' && activeActionPkg === customPkgInput.trim() ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Đang cài...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    <span>Cài đặt</span>
                  </>
                )}
              </button>
            </div>

            {/* Gói phổ biến - dạng chip bấm nhanh */}
            <div className="flex flex-wrap gap-1">
              {[
                'numpy',
                'pandas',
                'matplotlib',
                'requests',
                'pillow',
                'pygame',
                'pyfiglet',
                'sympy',
                'flask',
                'openpyxl',
                'rich',
              ].map((pkgName) => {
                const isInstalled = isPackageInstalled(pkgName);
                return (
                  <button
                    key={pkgName}
                    type="button"
                    onClick={() => setCustomPkgInput(pkgName)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer border ${
                      isInstalled
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                        : 'bg-[#181826] text-gray-300 border-[#2a293e] hover:border-amber-400 hover:text-amber-300'
                    }`}
                    title={isInstalled ? `Đã cài v${isInstalled.version}` : `Chọn ${pkgName}`}
                  >
                    {isInstalled ? `✓ ${pkgName}` : `+ ${pkgName}`}
                  </button>
                );
              })}
            </div>

            {/* Tìm kiếm nhanh từ PyPI */}
            <div className="space-y-1">
              <div className="relative">
                <Search className="w-3 h-3 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm gói trong kho PyPI..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearchPackages(e.target.value);
                  }}
                  className="w-full bg-[#181826] border border-[#2b2a3f] rounded-lg pl-7 pr-2.5 py-1 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-amber-400"
                />
              </div>

              {searchQuery.trim() && (
                <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar bg-[#10101a] p-1.5 rounded-lg border border-[#242336]">
                  {isSearching ? (
                    <div className="p-2 text-center text-gray-400 text-xs flex items-center justify-center space-x-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                      <span>Đang tìm kiếm...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-1.5 text-center text-gray-500 text-xs">
                      Không tìm thấy gói phù hợp
                    </div>
                  ) : (
                    searchResults.map((pkg) => {
                      const installed = isPackageInstalled(pkg.name);
                      return (
                        <div
                          key={pkg.name}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-[#181826] border border-[#27263b] text-xs"
                        >
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="font-bold text-amber-300 font-mono truncate">{pkg.name}</span>
                            {installed && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                                v{installed.version}
                              </span>
                            )}
                          </div>
                          <div>
                            {installed ? (
                              <button
                                type="button"
                                onClick={() => handleInstallPackage(pkg.name, true)}
                                disabled={actionStatus === 'running'}
                                className="px-1.5 py-0.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 rounded text-[10px] font-bold border border-emerald-500/40 flex items-center space-x-1 cursor-pointer transition disabled:opacity-50"
                              >
                                <ArrowUpCircle className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Cập nhật</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleInstallPackage(pkg.name, false)}
                                disabled={actionStatus === 'running'}
                                className="px-2 py-0.5 bg-amber-400 hover:bg-amber-300 text-black rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition disabled:opacity-50"
                              >
                                <Download className="w-2.5 h-2.5" />
                                <span>Tải về</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Nút xem danh sách gói đã cài - Gọn gàng, không chú thích dài */}
            <div>
              <button
                type="button"
                onClick={() => setIsInstalledDropdownOpen(!isInstalledDropdownOpen)}
                className={`w-full py-1.5 px-2.5 rounded-lg border flex items-center justify-between transition cursor-pointer text-xs ${
                  isInstalledDropdownOpen
                    ? 'bg-amber-500/15 border-amber-400/80 text-amber-300'
                    : 'bg-[#181826] border-[#29283d] text-gray-200 hover:bg-[#202033]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold">Thư viện đã cài ({installedPackages.length})</span>
                </div>
                <div className="flex items-center space-x-1 text-amber-400">
                  {isInstalledDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Danh sách đã cài đặt khi mở */}
              {isInstalledDropdownOpen && (
                <div className="mt-1.5 p-2 rounded-lg bg-[#10101a] border border-[#262538] space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center space-x-1.5">
                    <div className="relative flex-1">
                      <Search className="w-3 h-3 text-gray-500 absolute left-2 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Lọc gói đã cài..."
                        value={installedFilter}
                        onChange={(e) => setInstalledFilter(e.target.value)}
                        className="w-full bg-[#181826] border border-[#2b2a3f] rounded-md pl-6 pr-2 py-1 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-amber-400 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={fetchInstalledPackages}
                      disabled={isLoadingPackages}
                      className="p-1 bg-[#1a1a28] border border-[#2e2d42] text-gray-300 hover:text-amber-400 rounded-md transition cursor-pointer"
                      title="Làm mới danh sách"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPackages ? 'animate-spin text-amber-400' : ''}`} />
                    </button>
                  </div>

                  <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
                    {isLoadingPackages ? (
                      <div className="p-3 text-center text-gray-400 text-xs flex items-center justify-center space-x-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Đang nạp danh sách...</span>
                      </div>
                    ) : filteredInstalled.length === 0 ? (
                      <div className="p-2.5 text-center text-gray-500 text-xs">
                        {installedFilter ? 'Không tìm thấy gói phù hợp' : 'Chưa có gói nào'}
                      </div>
                    ) : (
                      filteredInstalled.map((pkg) => (
                        <div
                          key={pkg.name}
                          className="flex items-center justify-between p-1.5 rounded-md bg-[#181826] border border-[#252438] text-xs"
                        >
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="font-semibold text-gray-200 truncate font-mono">{pkg.name}</span>
                            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-gray-800 text-gray-400">
                              v{pkg.version}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleInstallPackage(pkg.name, true)}
                              disabled={actionStatus === 'running'}
                              className="px-1.5 py-0.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 rounded text-[10px] font-semibold flex items-center space-x-0.5 transition cursor-pointer disabled:opacity-50"
                              title={`Cập nhật ${pkg.name}`}
                            >
                              <ArrowUpCircle className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Cập nhật</span>
                            </button>

                            {!['pip', 'setuptools', 'wheel'].includes(pkg.name.toLowerCase()) && (
                              <button
                                type="button"
                                onClick={() => handleUninstallPackage(pkg.name)}
                                disabled={actionStatus === 'running'}
                                className="p-1 bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-300 rounded transition cursor-pointer disabled:opacity-50"
                                title={`Gỡ bỏ ${pkg.name}`}
                              >
                                <Trash2 className="w-2.5 h-2.5 text-red-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Live Pip Terminal Output nếu đang chạy hoặc có log */}
            {showLogTerminal && (
              <div className="border border-[#29283d] rounded-lg overflow-hidden bg-[#0c0c14]">
                <div className="h-6 bg-[#161622] px-2 flex items-center justify-between border-b border-[#242336] text-[10px]">
                  <div className="flex items-center space-x-1.5 text-gray-300 font-mono font-bold">
                    <Terminal className="w-3 h-3 text-amber-400" />
                    <span>Pip Console</span>
                    {actionStatus === 'running' && (
                      <span className="text-amber-400 animate-pulse">(Đang cài...)</span>
                    )}
                    {actionStatus === 'success' && (
                      <span className="text-emerald-400">(Thành công ✓)</span>
                    )}
                    {actionStatus === 'error' && (
                      <span className="text-red-400">(Thất bại ✕)</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogTerminal(false)}
                    className="text-gray-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <pre className="p-2 max-h-28 overflow-y-auto text-[10px] font-mono text-gray-300 whitespace-pre-wrap leading-tight select-text bg-[#09090f]">
                  {actionOutput || 'Đang chờ tác vụ...'}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Nhỏ gọn */}
        <div className="h-11 border-t border-[#29283d] px-3.5 flex items-center justify-end shrink-0 bg-[#1e1e2d]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-lg text-xs transition shadow-sm cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
