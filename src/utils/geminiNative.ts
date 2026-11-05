/**
 * Trợ lý AI chạy trực tiếp trong APK (không cần máy chủ).
 * Khi chạy trong ứng dụng Android (Capacitor), các lệnh gọi tới
 * /api/ai/chat, /api/ai/debug, /api/ai/generate-lessons sẽ được chuyển
 * thẳng tới Gemini bằng khóa API của chính người dùng (lưu trên điện thoại).
 */

const KEY_STORE = 'pydroid_gemini_key';
const MODELS = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 30000;

const realFetch: typeof fetch = window.fetch.bind(window);

class KeyError extends Error {}

function isNativeApp(): boolean {
  const w = window as any;
  if (w.Capacitor && typeof w.Capacitor.isNativePlatform === 'function') {
    return !!w.Capacitor.isNativePlatform();
  }
  return location.hostname === 'localhost' && location.protocol === 'https:' && !location.port;
}

function readKey(): string {
  try {
    return (localStorage.getItem(KEY_STORE) || '').trim();
  } catch {
    return '';
  }
}

function saveKey(k: string) {
  try {
    if (k) localStorage.setItem(KEY_STORE, k);
    else localStorage.removeItem(KEY_STORE);
  } catch {}
}

function askKey(): string {
  const k = (
    window.prompt(
      'Nhập khóa Gemini API của bạn để dùng Trợ lý AI.\n' +
        'Lấy miễn phí tại: aistudio.google.com/apikey\n' +
        '(Khóa chỉ lưu trên điện thoại của bạn)',
      ''
    ) || ''
  ).trim();
  if (k) saveKey(k);
  return k;
}

function getKey(): string {
  return readKey() || askKey();
}

function cleanJson(text: string): any {
  const t = (text || '').replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(t);
}

async function callGemini(payload: any): Promise<string> {
  const key = getKey();
  if (!key) throw new KeyError('Chưa nhập khóa Gemini API. Hãy thử lại và dán khóa vào khi được hỏi.');

  let lastErr = 'Không rõ nguyên nhân';
  for (const model of MODELS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await realFetch(`${ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const data: any = await res.json().catch(() => ({}));
      if (res.ok) {
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const text = parts.map((p: any) => p.text || '').join('');
        if (text) return text;
        lastErr = 'AI không trả về nội dung';
        continue;
      }
      const msg: string = data?.error?.message || `HTTP ${res.status}`;
      if (res.status === 401 || res.status === 403 || /API key not valid|API_KEY_INVALID|permission/i.test(msg)) {
        saveKey('');
        throw new KeyError('Khóa Gemini API không hợp lệ. Đã xóa khóa, lần sau ứng dụng sẽ hỏi lại để bạn nhập khóa mới.');
      }
      lastErr = msg;
      // 404 (sai tên model), 429 (hết lượt), 5xx -> thử model kế tiếp
    } catch (e: any) {
      if (e instanceof KeyError) throw e;
      lastErr = e?.name === 'AbortError' ? 'Hết thời gian chờ' : e?.message || String(e);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(lastErr);
}

const jsonResponse = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/* ---------------- Trò chuyện ---------------- */

const DEFAULT_PROMPTS: Record<string, string> = {
  fix_error:
    'Hãy phân tích chi tiết lỗi trong mã nguồn hiện tại: chỉ rõ lỗi ở dòng nào, nguyên nhân, và viết mã mới đã sửa hoàn chỉnh chuẩn PEP 8 trong khối ```python ... ```.',
  analyze_fix_clean:
    'Hãy phân tích chi tiết lỗi trong mã nguồn hiện tại: chỉ rõ lỗi ở dòng nào, nguyên nhân, và viết mã mới đã sửa hoàn chỉnh chuẩn PEP 8 trong khối ```python ... ```.',
  explain_source_code: 'Hãy giải thích chi tiết mã nguồn Python này, luồng thực thi và các điểm cần lưu ý.',
  initial_explain: 'Hãy giải thích chi tiết mã nguồn Python này, luồng thực thi và các điểm cần lưu ý.',
  optimize_pep8:
    'Hãy tối ưu và chuẩn hóa mã nguồn này theo PEP 8: thụt lề 4 khoảng trắng, snake_case, Pythonic, bỏ mã thừa. Đưa mã hoàn chỉnh trong khối ```python ... ```.',
  explain_line_by_line: 'Hãy giải thích từng dòng trong đoạn mã Python hiện tại một cách dễ hiểu nhất.',
  pythonic: 'Hãy viết lại đoạn mã này theo phong cách Pythonic ngắn gọn, tối ưu, chuẩn PEP 8.',
  try_except: 'Hãy bổ sung khối try...except cho các vị trí có nguy cơ lỗi trong mã này.',
  add_comments: 'Hãy thêm chú thích tiếng Việt chi tiết, rõ ràng vào các phần quan trọng của mã này.',
  test_data: 'Hãy cho một số bộ dữ liệu chạy thử (input và output mong đợi) kèm giải thích cho đoạn code này.',
};

async function handleChat(body: any) {
  const code: string = body.code || '';
  const messages: any[] = Array.isArray(body.messages) ? body.messages : [];
  const instruction: string = body.instruction || '';
  const errorText: string = body.errorText || '';

  const numbered = code
    .split('\n')
    .map((l, i) => `${i + 1}: ${l}`)
    .join('\n');

  const system =
    `Bạn là Trợ lý AI Lập trình Python thông minh, tận tâm trên ứng dụng Pydroid 3 Web cho Android.\n` +
    `Hỗ trợ người dùng học, viết, phân tích, tối ưu và sửa lỗi mã Python.\n\n` +
    `Quy tắc:\n` +
    `1. Luôn dùng tiếng Việt thân thiện, rõ ràng, dễ hiểu.\n` +
    `2. Mã hiện tại trong Editor (kèm số dòng):\n\`\`\`python\n${numbered || '# 1: (Chưa có mã nguồn)'}\n\`\`\`\n` +
    (errorText ? `Lỗi/Traceback gần nhất từ Terminal:\n\`\`\`\n${errorText}\n\`\`\`\n` : '') +
    `3. Ghi nhớ lịch sử trò chuyện để trả lời mạch lạc.\n` +
    `4. Khi đưa mã, luôn bọc trong khối \`\`\`python ... \`\`\` (KHÔNG kèm số dòng trong khối mã hoàn chỉnh) để giao diện có nút Sao chép / Áp dụng vào Editor.\n` +
    `5. Tuân thủ PEP 8: thụt lề 4 khoảng trắng, snake_case, xử lý ngoại lệ an toàn, phong cách Pythonic.\n` +
    `6. Khi người dùng yêu cầu SỬA LỖI: nêu rõ "📍 Lỗi ở Dòng X", "⚠️ Nguyên nhân", "⚡ Mã mới hoàn chỉnh đã sửa" (trong khối python) và "💡 Các điểm cải tiến".\n` +
    `7. Nếu người dùng mới mở chat hoặc yêu cầu giải thích ban đầu: tóm tắt mã, mục đích, cấu trúc và gợi ý nâng cấp.`;

  const last = messages[messages.length - 1];
  const userPrompt = (last && last.text) || DEFAULT_PROMPTS[instruction] || 'Hãy phân tích mã nguồn hiện tại của mình.';

  const history = messages.slice(0, -1).map((m) => ({
    role: m.sender === 'user' ? 'user' : 'model',
    parts: [{ text: String(m.text || '') }],
  }));

  const contextTurn = {
    role: 'user',
    parts: [
      {
        text:
          `[Mã Python hiện tại trong Editor]:\n\`\`\`python\n${numbered || '# (Trống)'}\n\`\`\`\n` +
          (errorText ? `\n[Lỗi / Traceback gần nhất]:\n\`\`\`\n${errorText}\n\`\`\`\n` : '') +
          `\n[Yêu cầu của người dùng]:\n${userPrompt}`,
      },
    ],
  };

  // Gemini cần lượt hội thoại bắt đầu bằng "user" và xen kẽ user/model
  const contents: any[] = [];
  for (const turn of [...history, contextTurn]) {
    if (contents.length === 0 && turn.role !== 'user') continue;
    const prev = contents[contents.length - 1];
    if (prev && prev.role === turn.role) prev.parts[0].text += '\n\n' + turn.parts[0].text;
    else contents.push({ role: turn.role, parts: [{ text: turn.parts[0].text }] });
  }

  const text = await callGemini({
    systemInstruction: { parts: [{ text: system }] },
    contents,
  });
  return jsonResponse({ reply: text });
}

/* ---------------- Gỡ lỗi AI ---------------- */

async function handleDebug(body: any) {
  const code: string = body.code || '';
  const errorText: string = body.errorText || '';
  if (!code && !errorText) return jsonResponse({ error: 'Thiếu thông tin mã hoặc lỗi' }, 400);

  const prompt =
    `Bạn là Trình gỡ lỗi Python AI trên ứng dụng Pydroid 3 Android.\n\n` +
    `=== MÃ PYTHON HIỆN TẠI ===\n${code}\n\n` +
    `=== THÔNG BÁO LỖI / TRACEBACK ===\n${errorText || '(Hãy phân tích toàn bộ cú pháp, thụt lề và lỗi runtime có thể có)'}\n\n` +
    `Nhiệm vụ:\n1. Nhận diện chính xác tên loại lỗi (SyntaxError, IndentationError, NameError, TypeError...).\n` +
    `2. Giải thích nguyên nhân gốc rễ bằng tiếng Việt ngắn gọn, thân thiện.\n` +
    `3. Đưa ra các mẹo khắc phục và quy tắc PEP 8 liên quan.\n` +
    `4. Cung cấp mã Python ĐÃ SỬA HOÀN CHỈNH, chuẩn PEP 8, giữ nguyên ý đồ thuật toán.\n` +
    `5. Tóm tắt nhanh các thay đổi quan trọng.\nTrả về JSON đúng schema.`;

  const text = await callGemini({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          errorType: { type: 'STRING' },
          vietnameseSummary: { type: 'STRING' },
          rootCause: { type: 'STRING' },
          tips: { type: 'ARRAY', items: { type: 'STRING' } },
          fixedCode: { type: 'STRING' },
          diffExplanation: { type: 'STRING' },
        },
        required: ['errorType', 'vietnameseSummary', 'rootCause', 'tips', 'fixedCode', 'diffExplanation'],
      },
    },
  });
  return jsonResponse(cleanJson(text));
}

/* ---------------- Tạo bài tập ---------------- */

async function handleLessons(body: any) {
  const topic = (typeof body.topic === 'string' && body.topic.trim()) || 'Python ứng dụng thực tế';
  const level = body.level || 'cơ bản';
  const existing: string[] = (Array.isArray(body.existingTitles) ? body.existingTitles : []).filter(Boolean);

  const prompt =
    `Bạn là giảng viên Python cho ứng dụng Pydroid 3 Web trên Android.\n` +
    `Hãy tạo 2 đến 3 bài tập thực hành Python HOÀN TOÀN MỚI theo chủ đề: "${topic}", cấp độ: "${level}".\n\n` +
    `QUY TẮC 1: Không trùng với các bài đã có:\n` +
    `${existing.length ? existing.slice(-30).map((t) => `- ${t}`).join('\n') : '(Kho bài đang trống)'}\n` +
    `Sáng tạo bài toán gần gũi đời sống (tính tiền quán trà sữa, quản lý chi tiêu, tiền điện, xếp loại học lực...).\n\n` +
    `QUY TẮC 2: Mọi tên biến, tên hàm, tham số trong starterCode và solutionCode phải bằng tiếng Việt không dấu, dạng snake_case ` +
    `(ví dụ: tong_tien, danh_sach_diem, tinh_diem_trung_binh). Không dùng tên tiếng Anh như x, i, n, arr, data, result, total. ` +
    `Ghi chú và chuỗi in ra bằng tiếng Việt.\n\n` +
    `Mỗi bài gồm: id (snake_case, bắt đầu bằng lesson_ai_), title, level ('basic' | 'intermediate' | 'advanced'), description, ` +
    `starterCode (có comment # TODO), solutionCode (chuẩn PEP 8), explanation, sampleInput, sampleOutput.\nTrả về JSON.`;

  const text = await callGemini({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          lessons: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                id: { type: 'STRING' },
                title: { type: 'STRING' },
                level: { type: 'STRING' },
                description: { type: 'STRING' },
                starterCode: { type: 'STRING' },
                solutionCode: { type: 'STRING' },
                explanation: { type: 'STRING' },
                sampleInput: { type: 'STRING' },
                sampleOutput: { type: 'STRING' },
              },
              required: ['id', 'title', 'level', 'description', 'starterCode', 'solutionCode', 'explanation'],
            },
          },
        },
        required: ['lessons'],
      },
    },
  });
  const parsed = cleanJson(text);
  return jsonResponse({ lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [] });
}

/* ---------------- Chặn fetch ---------------- */

function urlPath(input: RequestInfo | URL): string {
  try {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    return new URL(raw, location.href).pathname;
  } catch {
    return '';
  }
}

function friendlyError(e: any): string {
  if (e instanceof KeyError) return e.message;
  return `Không gọi được Gemini AI: ${e?.message || e}. Kiểm tra mạng rồi thử lại.`;
}

if (isNativeApp()) {
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = urlPath(input);
    const isAi = path === '/api/ai/chat' || path === '/api/ai/debug' || path === '/api/ai/generate-lessons';
    if (!isAi) return realFetch(input as any, init);

    let body: any = {};
    try {
      body = JSON.parse(String(init?.body || '{}'));
    } catch {}

    try {
      if (path === '/api/ai/chat') return await handleChat(body);
      if (path === '/api/ai/debug') return await handleDebug(body);
      return await handleLessons(body);
    } catch (e: any) {
      const msg = friendlyError(e);
      if (path === '/api/ai/chat') return jsonResponse({ reply: `⚠️ ${msg}` });
      return jsonResponse({ error: msg }, 500);
    }
  };
}

export {};
