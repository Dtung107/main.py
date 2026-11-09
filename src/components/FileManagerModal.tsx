import React, { useState, useRef, useEffect } from 'react';
import {
  FolderOpen,
  X,
  FilePlus,
  Download,
  Upload,
  Edit2,
  Trash2,
  Save,
  Check,
  FileCode,
  Copy,
  Share2,
} from 'lucide-react';
import { SavedFile } from '../types';
import { downloadPythonFile, sharePythonFile } from '../utils/fileDownload';

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFileName: string;
  onRenameCurrentFile: (newName: string) => void;
  currentCode: string;
  onLoadFile: (file: SavedFile) => void;
  onSaveCurrentFile: () => void;
  onNewFile: () => void;
  savedFiles: SavedFile[];
  onDeleteFile: (id: string) => void;
  onUploadFile: (fileName: string, code: string) => void;
}

export const FileManagerModal: React.FC<FileManagerModalProps> = ({
  isOpen,
  onClose,
  currentFileName,
  onRenameCurrentFile,
  currentCode,
  onLoadFile,
  onSaveCurrentFile,
  onNewFile,
  savedFiles,
  onDeleteFile,
  onUploadFile,
}) => {
  const [editingName, setEditingName] = useState(currentFileName);
  const [isRenaming, setIsRenaming] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEditingName(currentFileName);
      setIsRenaming(false);
      setDownloadNotice(null);
      setCopiedCode(false);
    }
  }, [isOpen, currentFileName]);

  if (!isOpen) return null;

  const handleSaveRename = () => {
    let name = editingName.trim();
    if (!name) name = 'untitled.py';
    if (!name.endsWith('.py')) name += '.py';
    onRenameCurrentFile(name);
    setIsRenaming(false);
  };

  const handleDownload = async (fileToDownload?: { name: string; code: string }) => {
    const targetName = fileToDownload ? fileToDownload.name : currentFileName;
    const targetCode = fileToDownload ? fileToDownload.code : currentCode;

    setDownloadNotice('⏳ Đang tạo file .py và gửi lệnh tải về...');
    const result = await downloadPythonFile(targetName, targetCode);
    setDownloadNotice(result.message);
    setTimeout(() => setDownloadNotice(null), 5000);
  };

  const handleShare = async (fileToShare?: { name: string; code: string }) => {
    const targetName = fileToShare ? fileToShare.name : currentFileName;
    const targetCode = fileToShare ? fileToShare.code : currentCode;

    setDownloadNotice('⏳ Đang mở bảng chia sẻ/lưu file trên Android...');
    const result = await sharePythonFile(targetName, targetCode);
    setDownloadNotice(result.message);
    setTimeout(() => setDownloadNotice(null), 4500);
  };

  const handleCopyCode = async (codeToCopy?: string) => {
    const target = codeToCopy ?? currentCode;
    try {
      await navigator.clipboard.writeText(target);
      setCopiedCode(true);
      setDownloadNotice('📋 Đã sao chép toàn bộ mã nguồn vào bộ nhớ tạm!');
      setTimeout(() => {
        setCopiedCode(false);
        setDownloadNotice(null);
      }, 3500);
    } catch (_) {
      setDownloadNotice('⚠️ Không thể sao chép mã nguồn tự động.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onUploadFile(file.name, content);
      onClose();
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-[#1b1b26] border border-[#373550] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col text-gray-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-[#2d2b42] px-4 flex items-center justify-between shrink-0 bg-[#222134]">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-sky-950/80 border border-sky-500/40 rounded-lg text-sky-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-sky-300">
                Quản Lý Tập Tin Python (.py)
              </h2>
              <p className="text-[10px] text-gray-400">
                Tạo mới, đổi tên, lưu trữ và tải về điện thoại Android
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Current File Banner */}
          <div className="p-3 bg-[#222232] rounded-xl border border-[#36364e] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">Tập tin đang mở:</span>
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                <button
                  type="button"
                  onClick={() => handleCopyCode()}
                  className="flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 font-medium px-2 py-1 rounded bg-sky-950/60 border border-sky-500/30 transition active:scale-95 cursor-pointer"
                  title="Sao chép toàn bộ mã nguồn vào bộ nhớ tạm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedCode ? 'Đã chép!' : 'Chép mã'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShare()}
                  className="flex items-center space-x-1 text-xs text-purple-300 hover:text-purple-200 font-medium px-2 py-1 rounded bg-purple-950/60 border border-purple-500/30 transition active:scale-95 cursor-pointer"
                  title="Chia sẻ hoặc lưu tệp qua Zalo/Drive/Files trên Android"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Chia sẻ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload()}
                  className="flex items-center space-x-1 text-xs text-black font-black px-2.5 py-1 rounded bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition active:scale-95 cursor-pointer shadow-md"
                  title="Tải trực tiếp file .py về thư mục Download"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải .py về máy</span>
                </button>
              </div>
            </div>

            {downloadNotice && (
              <div className="p-2 bg-sky-950/80 border border-sky-500/50 rounded-lg text-[11px] text-sky-200 flex items-center space-x-1.5 animate-in fade-in">
                <span>{downloadNotice}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-gray-400 px-0.5">
              <span>Định dạng Python (.py)</span>
              <a
                href={`/api/project/download-file?name=${encodeURIComponent(currentFileName)}&content=${encodeURIComponent(currentCode)}`}
                download={currentFileName}
                className="text-amber-300/90 hover:text-amber-200 underline flex items-center space-x-1"
              >
                <span>Tải tệp [{currentFileName}] qua trình duyệt</span>
              </a>
            </div>

            {isRenaming ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  lang="vi"
                  spellCheck={false}
                  autoCapitalize="none"
                  autoCorrect="on"
                  autoComplete="on"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing || (e as any).keyCode === 229) return;
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveRename();
                    }
                  }}
                  className="flex-1 bg-[#14141e] border border-amber-400 rounded px-2.5 py-1.5 text-xs text-amber-300 font-mono focus:outline-none select-text"
                  autoFocus
                />
                <button
                  onClick={handleSaveRename}
                  className="p-1.5 bg-amber-400 text-black font-bold rounded"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-[#151520] p-2.5 rounded-lg border border-[#2c2c3e]">
                <div className="flex items-center space-x-2">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono font-bold text-emerald-300 text-sm">
                    {currentFileName}
                  </span>
                </div>
                <button
                  onClick={() => setIsRenaming(true)}
                  className="p-1 text-gray-400 hover:text-amber-300 transition"
                  title="Đổi tên file"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Action Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* New File */}
            <button
              onClick={() => {
                onNewFile();
                onClose();
              }}
              className="p-3 bg-[#20202e] hover:bg-[#28283a] rounded-xl border border-[#33334a] flex items-center space-x-2 transition text-left active:scale-95"
            >
              <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
                <FilePlus className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-gray-200">Tạo File Mới</div>
                <div className="text-[10px] text-gray-400">Tạo trang mã trắng</div>
              </div>
            </button>

            {/* Save file to localStorage */}
            <button
              onClick={() => {
                onSaveCurrentFile();
                onClose();
              }}
              className="p-3 bg-[#20202e] hover:bg-[#28283a] rounded-xl border border-[#33334a] flex items-center space-x-2 transition text-left active:scale-95"
            >
              <div className="p-2 bg-sky-500/20 text-sky-300 rounded-lg">
                <Save className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-gray-200">Lưu Trữ File</div>
                <div className="text-[10px] text-gray-400">Lưu vào bộ nhớ máy</div>
              </div>
            </button>

            {/* Open / Upload file from Android */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-[#20202e] hover:bg-[#28283a] rounded-xl border border-[#33334a] flex items-center space-x-2 transition text-left active:scale-95 col-span-2"
            >
              <div className="p-2 bg-purple-500/20 text-purple-300 rounded-lg">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-gray-200">Mở File .py từ Điện thoại</div>
                <div className="text-[10px] text-gray-400">Chọn file .py từ bộ nhớ Android để nạp vào IDE</div>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".py,text/plain"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* Saved Files List */}
          <div>
            <span className="block font-semibold text-gray-300 mb-2">
              Các file đã lưu ({savedFiles.length}):
            </span>

            {savedFiles.length === 0 ? (
              <div className="p-4 text-center text-gray-500 italic bg-[#151520] rounded-xl border border-[#2b2b3c]">
                Chưa có file nào được lưu trong bộ nhớ.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {savedFiles.map((f) => (
                  <div
                    key={f.id}
                    className="p-2.5 bg-[#171722] hover:bg-[#20202e] rounded-xl border border-[#2d2d40] flex items-center justify-between transition"
                  >
                    <button
                      onClick={() => {
                        onLoadFile(f);
                        onClose();
                      }}
                      className="flex-1 text-left flex items-center space-x-2 overflow-hidden"
                    >
                      <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
                      <div className="overflow-hidden">
                        <div className="font-mono font-bold text-gray-200 text-xs truncate">
                          {f.name}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {new Date(f.lastModified).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload({ name: f.name, code: f.code });
                        }}
                        className="p-1.5 text-gray-400 hover:text-amber-300 rounded transition cursor-pointer"
                        title="Tải file .py này về máy"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteFile(f.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 rounded transition cursor-pointer"
                        title="Xóa file khỏi danh sách"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 border-t border-[#2d2b42] px-4 flex items-center justify-end shrink-0 bg-[#222134]">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-extrabold rounded-xl text-xs transition shadow-md"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
