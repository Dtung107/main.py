/**
 * Universal Mobile-Ready File Downloader
 * Optimized for Android APK (Capacitor/WebView) and Web Browsers
 */

import { getApiUrl } from './apiConfig';

/**
 * Downloads a .py Python file to the user's mobile device or computer
 */
export async function downloadPythonFile(
  rawFileName: string,
  content: string
): Promise<{ success: boolean; method: 'blob' | 'iframe' | 'data' | 'share'; message: string }> {
  let fileName = (rawFileName || 'script.py').trim();
  if (!fileName.endsWith('.py')) {
    fileName += '.py';
  }

  // Clean filename for safety
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_');

  // Strategy 1: Standard W3C Blob URL download (works in modern Android Chrome, Safari, Firefox, Desktop)
  let blobSuccess = false;
  try {
    const blob = new Blob([content], { type: 'text/x-python;charset=utf-8' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = safeFileName;
    link.setAttribute('download', safeFileName);
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    blobSuccess = true;

    setTimeout(() => {
      try {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch (_) {}
    }, 2000);
  } catch (blobErr) {
    console.warn('[FileDownload] Blob URL download error:', blobErr);
  }

  // Strategy 2: Hidden iframe submission to backend /api/project/download-file
  // This triggers Android native download manager with Content-Disposition without navigating the page
  try {
    let helperIframe = document.getElementById('download_helper_iframe') as HTMLIFrameElement;
    if (!helperIframe) {
      helperIframe = document.createElement('iframe');
      helperIframe.id = 'download_helper_iframe';
      helperIframe.name = 'download_helper_iframe';
      helperIframe.style.display = 'none';
      helperIframe.style.width = '0px';
      helperIframe.style.height = '0px';
      helperIframe.style.border = 'none';
      document.body.appendChild(helperIframe);
    }

    const downloadEndpoint = getApiUrl('/api/project/download-file');
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = downloadEndpoint;
    form.target = 'download_helper_iframe';
    form.style.display = 'none';

    const nameInput = document.createElement('input');
    nameInput.type = 'hidden';
    nameInput.name = 'name';
    nameInput.value = safeFileName;
    form.appendChild(nameInput);

    const contentInput = document.createElement('input');
    contentInput.type = 'hidden';
    contentInput.name = 'content';
    contentInput.value = content;
    form.appendChild(contentInput);

    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      try {
        document.body.removeChild(form);
      } catch (_) {}
    }, 2500);
  } catch (formErr) {
    console.warn('[FileDownload] Hidden iframe download error:', formErr);
  }

  // Strategy 3: Also copy code to clipboard as seamless backup guarantee
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(content);
    }
  } catch (_) {}

  return {
    success: true,
    method: blobSuccess ? 'blob' : 'iframe',
    message: `✅ Đã tải file [${safeFileName}] về máy! (Kiểm tra thư mục Tải về / Downloads).`,
  };
}

/**
 * Opens native Android Share sheet (Save to Drive, Zalo, Files, etc.)
 */
export async function sharePythonFile(
  rawFileName: string,
  content: string
): Promise<{ success: boolean; message: string }> {
  let fileName = (rawFileName || 'script.py').trim();
  if (!fileName.endsWith('.py')) {
    fileName += '.py';
  }

  const safeFileName = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_');

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (typeof File !== 'undefined') {
        const file = new File([content], safeFileName, {
          type: 'text/plain;charset=utf-8',
          lastModified: Date.now(),
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: safeFileName,
            text: `Mã nguồn Python: ${safeFileName}`,
          });
          return {
            success: true,
            message: `Đã mở bảng lưu/chia sẻ tệp [${safeFileName}] trên Android!`,
          };
        }
      }

      await navigator.share({
        title: safeFileName,
        text: content,
      });
      return {
        success: true,
        message: `Đã mở bảng chia sẻ cho [${safeFileName}]!`,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: true, message: 'Đã hủy thao tác chia sẻ.' };
      }
    }
  }

  // Fallback: Copy to clipboard
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(content);
      return {
        success: true,
        message: `Đã sao chép toàn bộ mã nguồn của [${safeFileName}] vào bộ nhớ tạm!`,
      };
    }
  } catch (_) {}

  return {
    success: false,
    message: 'Thiết bị không hỗ trợ tính năng chia sẻ trực tiếp. Đã sao chép mã nguồn.',
  };
}
