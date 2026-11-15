import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

/**
 * Convert any date string (ISO YYYY-MM-DD or DD/MM/YYYY) to DD/MM/YYYY
 */
export const toDMY = (val) => {
  if (!val) return '';
  const s = String(val).trim();
  if (!s || s === '-') return '';

  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const dd = slashMatch[1].padStart(2, '0');
    const mm = slashMatch[2].padStart(2, '0');
    const yyyy = slashMatch[3];
    return `${dd}/${mm}/${yyyy}`;
  }

  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, '0');
    const dd = isoMatch[3].padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
  }

  return s;
};

/**
 * Convert any date string (DD/MM/YYYY or YYYY-MM-DD) to ISO YYYY-MM-DD for native picker
 */
export const toYMD = (val) => {
  if (!val) return '';
  const s = String(val).trim();
  if (!s || s === '-') return '';

  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const dd = slashMatch[1].padStart(2, '0');
    const mm = slashMatch[2].padStart(2, '0');
    const yyyy = slashMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, '0');
    const dd = isoMatch[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return '';
};

export const getTodayDMY = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export default function DateInput({
  value = '',
  onChange,
  placeholder = 'วว/ดด/ปปปป (dd/mm/yyyy)',
  className = '',
  name,
  required = false,
  disabled = false,
  ...props
}) {
  const [displayValue, setDisplayValue] = useState(() => toDMY(value));
  const pickerRef = useRef(null);

  // Sync with incoming value prop changes
  useEffect(() => {
    setDisplayValue(toDMY(value));
  }, [value]);

  const emitChange = (newVal) => {
    if (!onChange) return;
    const syntheticEvent = {
      target: { name, value: newVal },
      currentTarget: { name, value: newVal }
    };
    onChange(syntheticEvent);
  };

  const handleInputChange = (e) => {
    let val = e.target.value.replace(/[^\d/]/g, '').slice(0, 10);
    setDisplayValue(val);
    emitChange(val);
  };

  const handleBlur = () => {
    if (!displayValue) return;
    const digits = displayValue.replace(/\D/g, '');
    if (!displayValue.includes('/') && digits.length === 8) {
      const formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
      setDisplayValue(formatted);
      emitChange(formatted);
    } else {
      const normalized = toDMY(displayValue);
      if (normalized !== displayValue) {
        setDisplayValue(normalized);
        emitChange(normalized);
      }
    }
  };

  const handlePickerChange = (e) => {
    const ymd = e.target.value;
    if (!ymd) return;
    const dmy = toDMY(ymd);
    setDisplayValue(dmy);
    emitChange(dmy);
  };

  const openPicker = () => {
    if (disabled) return;
    if (pickerRef.current) {
      if (typeof pickerRef.current.showPicker === 'function') {
        try {
          pickerRef.current.showPicker();
          return;
        } catch {
          // fallback to focus
        }
      }
      pickerRef.current.focus();
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        name={name}
        required={required}
        disabled={disabled}
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`${className} pr-9 font-mono`}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={openPicker}
        disabled={disabled}
        title="เลือกวันที่จากปฏิทิน (dd/mm/yyyy)"
        className="absolute right-2 p-1 text-slate-400 hover:text-amber-400 disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
      >
        <Calendar className="w-4 h-4" />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        value={toYMD(displayValue)}
        onChange={handlePickerChange}
        className="sr-only absolute pointer-events-none opacity-0 w-0 h-0"
      />
    </div>
  );
}
