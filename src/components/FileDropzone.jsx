import React, { useState } from 'react';
import {
  Upload,
  ClipboardPaste,
  Trash2,
  FileText,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';
import { normalizeImageUrl } from '../services/storage';

const compressImageToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปภาพไม่สำเร็จ'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1400;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(ev.target.result);
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

const readFileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

/**
 * Extract readable link/name if value is a legacy JSON string like [{"name":"...","url":"..."}]
 */
export function parseFileValue(val) {
  if (!val || typeof val !== 'string') return { url: '', name: '' };
  const s = val.trim();
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      if (Array.isArray(arr) && arr[0]?.url) {
        return { url: arr[0].url, name: arr[0].name || 'ไฟล์แนบ' };
      }
    } catch {
      // fallback to plain string
    }
  }
  return { url: s, name: '' };
}

export default function FileDropzone({
  label,
  hint = 'ลากไฟล์ (PDF / รูปภาพ) มาวาง หรือกด Ctrl+V เพื่อวาง',
  value = '',
  onChange,
  accept = 'application/pdf,image/*,.doc,.docx',
  placeholder = 'https://drive.google.com/... หรือลากไฟล์มาวาง'
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [pasteNotice, setPasteNotice] = useState(false);
  const [fileNameHint, setFileNameHint] = useState('');

  const showNotice = () => {
    setPasteNotice(true);
    setTimeout(() => setPasteNotice(false), 2000);
  };

  const processFile = async (file) => {
    if (!file) return;
    try {
      setFileNameHint(file.name);
      if (file.type && file.type.startsWith('image/')) {
        const dataUrl = await compressImageToDataUrl(file);
        onChange(dataUrl);
      } else {
        const dataUrl = await readFileToDataUrl(file);
        onChange(dataUrl);
      }
      showNotice();
    } catch (err) {
      alert(err.message || 'ไม่สามารถอ่านไฟล์ได้');
    }
  };

  const handlePasteEvent = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file') {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await processFile(file);
          return;
        }
      }
    }
  };

  const handleClipboardButton = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            const file = new File([blob], `clipboard_${Date.now()}.png`, { type: imgType });
            await processFile(file);
            return;
          }
        }
      }
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = (await navigator.clipboard.readText()).trim();
        if (text) {
          onChange(text);
          showNotice();
          return;
        }
      }
      alert('ไม่พบไฟล์ รูปภาพ หรือลิงก์ใน Clipboard (สามารถคลิกที่กรอบแล้วกด Ctrl+V ได้)');
    } catch {
      alert('กรุณาคลิกที่กรอบช่องนี้แล้วกด Ctrl+V บนคีย์บอร์ด');
    }
  };

  const parsed = parseFileValue(value);
  const rawUrl = parsed.url;
  const isImage =
    rawUrl.startsWith('data:image/') ||
    /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(rawUrl) ||
    rawUrl.includes('lh3.googleusercontent.com');
  const isPdfData = rawUrl.startsWith('data:application/pdf');

  return (
    <div
      tabIndex={0}
      onPaste={handlePasteEvent}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
      }}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) {
          await processFile(file);
          return;
        }
        const textData = e.dataTransfer?.getData('text/plain');
        if (textData && textData.trim()) {
          onChange(textData.trim());
          showNotice();
        }
      }}
      className={`p-2.5 rounded-xl border transition focus:outline-none ${
        isDragging
          ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/40'
          : 'border-blue-900/70 bg-[#070D1E]/90 focus:border-amber-400'
      }`}
    >
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <label className="text-[11px] font-bold text-slate-200 truncate">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => {
              setFileNameHint('');
              onChange('');
            }}
            className="p-1 rounded text-red-400 hover:bg-red-950/60 transition"
            title="ลบไฟล์/ลิงก์"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Preview Box */}
      {rawUrl ? (
        <div className="mb-2 relative rounded-lg overflow-hidden border border-blue-800/60 bg-slate-950 p-2 flex items-center justify-center min-h-[68px]">
          {isImage ? (
            <img
              src={normalizeImageUrl(rawUrl)}
              alt={label}
              onError={(e) => {
                const m = String(rawUrl || '').match(/([a-zA-Z0-9_-]{25,})/);
                if (m && !e.target.src.includes('thumbnail')) {
                  e.target.src = `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200`;
                }
              }}
              className="max-h-24 max-w-full object-contain rounded"
            />
          ) : isPdfData || rawUrl.startsWith('data:') ? (
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
              <FileText className="w-5 h-5 shrink-0 text-amber-400" />
              <span className="truncate max-w-[220px]">
                {fileNameHint || (isPdfData ? 'ไฟล์ PDF พร้อมอัปโหลดขึ้น Drive' : 'ไฟล์เอกสารพร้อมอัปโหลด')}
              </span>
            </div>
          ) : (
            <a
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 underline break-all"
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span className="line-clamp-2">{parsed.name || rawUrl}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          )}
          {pasteNotice && (
            <div className="absolute inset-x-0 bottom-0 bg-emerald-600/90 text-white text-[10px] font-bold py-0.5 text-center">
              ✓ นำเข้าไฟล์สำเร็จ (จะอัปโหลดเข้าโฟลเดอร์ผู้ต้องหาเมื่อบันทึก)
            </div>
          )}
        </div>
      ) : (
        <div className="mb-2 rounded-lg border border-dashed border-blue-800/80 hover:border-amber-400/70 bg-[#0A1329]/70 py-3 px-2 flex flex-col items-center justify-center text-center transition">
          <div className="flex items-center gap-1.5 text-slate-400 mb-1">
            <FileText className="w-4 h-4" />
            <ImageIcon className="w-4 h-4" />
          </div>
          <span className="text-[10px] text-slate-300 leading-tight">{hint}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
        <label className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-200 border border-blue-800/60 text-[10px] font-semibold cursor-pointer transition">
          <Upload className="w-3 h-3" />
          <span>เลือกไฟล์ (PDF/รูป)</span>
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await processFile(file);
              e.target.value = '';
            }}
          />
        </label>

        <button
          type="button"
          onClick={handleClipboardButton}
          className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[10px] font-semibold transition"
        >
          <ClipboardPaste className="w-3 h-3" />
          <span>วาง Clipboard</span>
        </button>
      </div>

      {/* Direct URL fallback input */}
      <input
        type="text"
        value={rawUrl.startsWith('data:') ? '' : rawUrl}
        onChange={(e) => onChange(e.target.value)}
        placeholder={rawUrl.startsWith('data:') ? 'แนบไฟล์จากเครื่องเรียบร้อย (พร้อมอัปโหลด)' : placeholder}
        className="w-full px-2 py-1 bg-[#050A17] rounded border border-blue-900/50 text-[10px] text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
      />
    </div>
  );
}
