/**
 * Quản lý thư viện (pip) chạy ngay trong APK, không cần máy chủ.
 * Dùng micropip của Pyodide để cài thư viện thẳng từ PyPI.
 * Chỉ bật khi chạy trong ứng dụng Android (Capacitor).
 */

import { PyodideRunner } from './pythonRunner.ts';

const STORE = 'pydroid3_installed_packages';
const realFetch: typeof fetch = window.fetch.bind(window);

function isNativeApp(): boolean {
  const w = window as any;
  if (w.Capacitor && typeof w.Capacitor.isNativePlatform === 'function') {
    return !!w.Capacitor.isNativePlatform();
  }
  return location.hostname === 'localhost' && location.protocol === 'https:' && !location.port;
}

type Pkg = { name: string; version: string };

function readList(): Pkg[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE) || '[]');
    return Array.isArray(parsed) ? parsed.filter((p) => p && p.name) : [];
  } catch {
    return [];
  }
}

function writeList(list: Pkg[]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(list));
  } catch {}
}

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const CATALOG: { name: string; summary: string }[] = [
  { name: 'numpy', summary: 'Tính toán số học, mảng và ma trận' },
  { name: 'pandas', summary: 'Xử lý và phân tích dữ liệu dạng bảng' },
  { name: 'matplotlib', summary: 'Vẽ biểu đồ và đồ thị' },
  { name: 'scipy', summary: 'Tính toán khoa học và thống kê' },
  { name: 'sympy', summary: 'Toán học ký hiệu (đại số, giải phương trình)' },
  { name: 'pillow', summary: 'Xử lý ảnh' },
  { name: 'requests', summary: 'Gửi yêu cầu HTTP' },
  { name: 'beautifulsoup4', summary: 'Phân tích HTML/XML' },
  { name: 'openpyxl', summary: 'Đọc và ghi tệp Excel' },
  { name: 'rich', summary: 'In chữ đẹp, bảng và màu trong Terminal' },
  { name: 'pyfiglet', summary: 'Tạo chữ nghệ thuật ASCII' },
  { name: 'colorama', summary: 'In chữ có màu' },
  { name: 'tabulate', summary: 'In dữ liệu thành bảng gọn đẹp' },
  { name: 'tqdm', summary: 'Thanh tiến trình' },
  { name: 'python-dateutil', summary: 'Xử lý ngày giờ nâng cao' },
  { name: 'pytz', summary: 'Múi giờ' },
  { name: 'pyyaml', summary: 'Đọc và ghi tệp YAML' },
  { name: 'networkx', summary: 'Đồ thị và mạng lưới' },
  { name: 'scikit-learn', summary: 'Học máy' },
  { name: 'seaborn', summary: 'Biểu đồ thống kê đẹp' },
  { name: 'jinja2', summary: 'Mẫu văn bản (template)' },
  { name: 'faker', summary: 'Tạo dữ liệu giả để thử nghiệm' },
  { name: 'emoji', summary: 'Làm việc với emoji' },
];

async function ensurePyodide(): Promise<any> {
  const w = window as any;
  if (!w.pyodideInstance) {
    try {
      await new PyodideRunner().warmup();
    } catch {}
  }
  // Có thể đang khởi động nền: chờ tối đa ~60 giây
  for (let i = 0; i < 120 && !w.pyodideInstance; i++) {
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!w.pyodideInstance) {
    throw new Error('Bộ chạy Python (Pyodide) chưa sẵn sàng. Hãy kiểm tra kết nối mạng, chờ vài giây rồi thử lại.');
  }
  const py = w.pyodideInstance;
  await py.loadPackage('micropip');
  return py;
}

function lastLine(msg: string): string {
  const lines = String(msg || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines[lines.length - 1] || 'Lỗi không rõ';
}

async function getVersion(py: any, name: string): Promise<string> {
  try {
    py.globals.set('__pkg', name);
    const v = await py.runPythonAsync(
      `import importlib.metadata as _m\ntry:\n    _v = _m.version(__pkg)\nexcept Exception:\n    _v = ''\n_v`
    );
    return String(v || '');
  } catch {
    return '';
  }
}

async function install(body: any) {
  const name = String(body.name || '').trim();
  const upgrade = !!body.upgrade;
  if (!/^[A-Za-z0-9][A-Za-z0-9._\-\[\],=<>~! ]*$/.test(name)) {
    return json({ success: false, error: 'Tên thư viện không hợp lệ' });
  }
  try {
    const py = await ensurePyodide();
    py.globals.set('__pkg', name);
    py.globals.set('__upgrade', upgrade);
    await py.runPythonAsync(`import micropip\nawait micropip.install(__pkg, reinstall=__upgrade)`);

    const base = name.split(/[\[<>=~! ,]/)[0];
    const version = await getVersion(py, base);
    const list = readList().filter((p) => p.name.toLowerCase() !== base.toLowerCase());
    list.push({ name: base, version: version || '?' });
    list.sort((a, b) => a.name.localeCompare(b.name));
    writeList(list);

    return json({
      success: true,
      output: `📦 pip install ${upgrade ? '--upgrade ' : ''}${name}\n✅ Đã cài ${base}${version ? ' v' + version : ''} thành công!\n` +
        `(Thư viện nằm trong bộ nhớ của phiên làm việc hiện tại; khi mở lại ứng dụng, app sẽ tự cài lại khi mã của bạn có import.)`,
    });
  } catch (e: any) {
    const raw = lastLine(e?.message);
    const hint = /pure Python 3 wheel|No matching distribution|Can't find a pure/i.test(raw)
      ? '\n💡 Gói này cần biên dịch bằng C/C++ hoặc chưa hỗ trợ Pyodide (Python chạy trong ứng dụng), nên không cài được.'
      : '';
    return json({ success: false, error: raw, output: `❌ Cài đặt ${name} thất bại:\n${raw}${hint}` });
  }
}

async function uninstall(body: any) {
  const name = String(body.name || '').trim();
  try {
    const w = window as any;
    if (w.pyodideInstance) {
      try {
        const py = w.pyodideInstance;
        await py.loadPackage('micropip');
        py.globals.set('__pkg', name);
        await py.runPythonAsync(`import micropip\nmicropip.uninstall(__pkg)`);
      } catch {}
    }
    writeList(readList().filter((p) => p.name.toLowerCase() !== name.toLowerCase()));
    return json({ success: true, output: `🗑️ Đã gỡ cài đặt ${name} thành công!` });
  } catch (e: any) {
    return json({ success: false, error: lastLine(e?.message) });
  }
}

function search(q: string) {
  const query = (q || '').trim().toLowerCase();
  let list = CATALOG.filter((p) => !query || p.name.includes(query) || p.summary.toLowerCase().includes(query));
  if (query && /^[a-z0-9][a-z0-9._-]*$/.test(query) && !list.some((p) => p.name === query)) {
    list = [...list, { name: query, summary: 'Cài trực tiếp từ kho PyPI' }];
  }
  return json({ packages: list });
}

function urlOf(input: RequestInfo | URL): URL | null {
  try {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    return new URL(raw, location.href);
  } catch {
    return null;
  }
}

if (isNativeApp()) {
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const u = urlOf(input);
    const path = u ? u.pathname : '';
    if (!path.startsWith('/api/python/packages')) return realFetch(input as any, init);

    let body: any = {};
    try {
      body = JSON.parse(String(init?.body || '{}'));
    } catch {}

    if (path === '/api/python/packages/install') return install(body);
    if (path === '/api/python/packages/uninstall') return uninstall(body);
    if (path === '/api/python/packages/search') return search(u?.searchParams.get('q') || '');
    return json({ packages: readList() });
  };
}

export {};
