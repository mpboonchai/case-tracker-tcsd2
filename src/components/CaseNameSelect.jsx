import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Briefcase, Plus } from 'lucide-react';

/**
 * Searchable dropdown + free-text combobox for selecting or typing an existing Case Name.
 */
export default function CaseNameSelect({
  value = '',
  onChange,
  operations = [],
  warrants = [],
  cases = [],
  placeholder = 'เลือกจากรายการเคส หรือพิมพ์เพื่อค้นหา...',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const options = useMemo(() => {
    const map = new Map();
    operations.forEach((op) => {
      const name = (op.caseName || '').trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), {
          name,
          code: (op.caseCode || '').trim(),
          status: (op.status || '').trim(),
        });
      }
    });
    warrants.forEach((w) => {
      const name = (w.caseName || '').trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), { name, code: '', status: '' });
      }
    });
    cases.forEach((c) => {
      const name = (c.caseName || c.title || '').trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), { name, code: '', status: '' });
      }
    });
    return Array.from(map.values());
  }, [operations, warrants, cases]);

  const filteredOptions = useMemo(() => {
    const q = String(value || '').trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        (opt.code && opt.code.toLowerCase().includes(q))
    );
  }, [options, value]);

  const exactMatch = options.some(
    (opt) => opt.name.toLowerCase() === String(value || '').trim().toLowerCase()
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (name) => {
    onChange(name);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value || ''}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          placeholder={placeholder}
          className={
            className ||
            'w-full pl-3 pr-14 py-2 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-cyan-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition'
          }
          style={{ paddingRight: '3.25rem' }}
        />
        <div className="absolute right-1.5 flex items-center gap-0.5">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(true);
              }}
              title="ล้างชื่อเคส"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            title="แสดงรายการเคสทั้งหมด"
            className="p-1 rounded text-amber-400 hover:bg-blue-900/50 transition"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl bg-[#0A1329] border border-blue-700/70 shadow-2xl py-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected =
                opt.name.toLowerCase() === String(value || '').trim().toLowerCase();
              return (
                <button
                  key={opt.name}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt.name);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 font-semibold'
                      : 'text-slate-200 hover:bg-blue-900/50'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Briefcase className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{opt.name}</span>
                  </span>
                  {opt.code && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-cyan-300 border border-blue-800/70 shrink-0">
                      {opt.code}
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-[11px] text-slate-400">
              ไม่พบเคสที่ตรงกับ &quot;{value}&quot;
            </div>
          )}

          {value && value.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(value.trim());
              }}
              className="w-full px-3 py-2 text-left text-xs text-emerald-300 hover:bg-emerald-950/50 border-t border-blue-900/50 flex items-center gap-1.5 font-semibold"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">ใช้ชื่อเคสใหม่: &quot;{value.trim()}&quot;</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
