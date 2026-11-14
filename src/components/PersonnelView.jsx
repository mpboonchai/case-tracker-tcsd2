import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Shield,
  Edit3,
  Trash2,
  X,
  Briefcase,
  FileWarning,
  Filter
} from 'lucide-react';
import { POSITION_OPTIONS, DIVISION_OPTIONS } from '../data/initialData';
import { calculateAge, formatThaiDate } from '../services/storage';
import PersonnelModal from './PersonnelModal';

export default function PersonnelView({
  personnel,
  cases,
  warrants,
  onSavePerson,
  onDeletePerson
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [detailPerson, setDetailPerson] = useState(null);

  const filtered = personnel.filter((p) => {
    if (positionFilter !== 'all' && p.position !== positionFilter) return false;
    if (divisionFilter !== 'all' && p.division !== divisionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const full = `${p.prefix}${p.firstName} ${p.lastName}`.toLowerCase();
      return (
        full.includes(q) ||
        (p.position || '').toLowerCase().includes(q) ||
        (p.positionDetail || '').toLowerCase().includes(q) ||
        (p.division || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingPerson(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p) => {
    setDetailPerson(null);
    setEditingPerson(p);
    setIsFormOpen(true);
  };

  const handleDelete = (p) => {
    if (confirm(`คุณต้องการลบข้อมูลกำลังพล "${p.prefix}${p.firstName} ${p.lastName}" ใช่หรือไม่?`)) {
      onDeletePerson(p.id);
      setDetailPerson(null);
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'ปฏิบัติหน้าที่') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
    if (status === 'ช่วยราชการ') return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
    return 'bg-blue-500/15 text-blue-300 border-blue-500/40';
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3.5 rounded-xl bg-gradient-to-r from-blue-900/30 via-[#0B152E] to-[#0A1224] border border-blue-800/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-lg">
            👮‍♂️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white">ข้อมูลกำลังพล (Personnel)</h2>
              <span className="text-[11px] font-mono font-bold bg-amber-400/15 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                กำลังพลทั้งหมด: {personnel.length} นาย
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              ทำเนียบกำลังพล ฝ่ายสืบสวน และชุดปฏิบัติการ บก.ปอท. (คลิกการ์ดเพื่อดูรายละเอียดและงานที่รับผิดชอบ)
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>เพิ่มกำลังพล</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="cyber-card p-3 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ, ตำแหน่ง, สายงาน, เบอร์โทร..."
            className="w-full pl-8 pr-8 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Filter className="w-3 h-3 text-amber-400" />
            กรอง:
          </span>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="bg-[#070D1E] text-slate-200 border border-blue-900/60 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400"
          >
            <option value="all">ตำแหน่งทั้งหมด</option>
            {POSITION_OPTIONS.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>

          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="bg-[#070D1E] text-slate-200 border border-blue-900/60 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-400"
          >
            <option value="all">สายงานทั้งหมด</option>
            {DIVISION_OPTIONS.map((div) => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>

          <span className="text-[10px] font-mono text-slate-400 ml-auto">
            แสดง {filtered.length}/{personnel.length} นาย
          </span>
        </div>
      </div>

      {/* Card Grid */}
      {filtered.length === 0 ? (
        <div className="cyber-card p-10 rounded-xl text-center text-xs text-slate-400">
          ไม่พบข้อมูลกำลังพลที่ตรงกับเงื่อนไข
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filtered.map((p) => {
            const personCases = cases.filter(
              (c) => c.assignedTo === p.id || (Array.isArray(c.coAssignees) && c.coAssignees.includes(p.id))
            );
            return (
              <div
                key={p.id}
                onClick={() => setDetailPerson(p)}
                className="cyber-card p-4 rounded-xl cursor-pointer flex flex-col justify-between gap-3 group"
              >
                <div className="flex items-start gap-3">
                  {p.photoUrl ? (
                    <img
                      src={p.photoUrl}
                      alt={p.firstName}
                      className="w-12 h-12 rounded-xl object-cover border border-amber-400/40 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-800 to-slate-900 border border-amber-400/40 flex items-center justify-center text-2xl shrink-0">
                      {p.avatar || '👮‍♂️'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition truncate">
                      {p.prefix}{p.firstName} {p.lastName}
                    </h3>
                    <p className="text-[11px] text-cyan-300 truncate">
                      {p.positionDetail || p.position}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] font-mono bg-blue-950 text-blue-300 px-1.5 py-0.2 rounded border border-blue-800/50">
                        {p.division || '-'}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border flex items-center gap-1 ${getStatusBadge(p.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {p.status || 'ปฏิบัติหน้าที่'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#1E2E54]/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3 text-amber-400" />
                    {p.phone || '-'}
                  </span>
                  <span className="text-amber-400 font-semibold group-hover:underline">
                    ดูรายละเอียด ({personCases.length} งาน) →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      {detailPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-[#0B142B] border border-blue-900/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 py-3 bg-[#080E1E] border-b border-[#1E2E54] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(detailPerson)}
                  title="แก้ไขข้อมูลกำลังพล"
                  className="p-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(detailPerson)}
                  title="ลบข้อมูลกำลังพล"
                  className="p-1.5 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <h3 className="text-sm font-bold text-white ml-1">รายละเอียดกำลังพล</h3>
              </div>
              <button
                onClick={() => setDetailPerson(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center gap-4">
                {detailPerson.photoUrl ? (
                  <img
                    src={detailPerson.photoUrl}
                    alt={detailPerson.firstName}
                    className="w-16 h-16 rounded-xl object-cover border border-amber-400/50"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-blue-950 border border-amber-400/50 flex items-center justify-center text-3xl">
                    {detailPerson.avatar || '👮‍♂️'}
                  </div>
                )}
                <div>
                  <h4 className="text-base font-bold text-white">
                    {detailPerson.prefix}{detailPerson.firstName} {detailPerson.lastName}
                  </h4>
                  {(detailPerson.firstNameEn || detailPerson.lastNameEn) && (
                    <div className="text-[11px] text-slate-400 font-mono">
                      {detailPerson.rankEn} {detailPerson.firstNameEn} {detailPerson.lastNameEn}
                    </div>
                  )}
                  <div className="text-cyan-300 font-medium mt-0.5">
                    {detailPerson.positionDetail || detailPerson.position} • สายงาน {detailPerson.division || '-'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg bg-[#070D1E] border border-blue-900/50">
                <div><span className="text-slate-400">เบอร์โทร:</span> <span className="text-white font-mono">{detailPerson.phone || '-'}</span></div>
                <div><span className="text-slate-400">สถานะ:</span> <span className="text-emerald-400 font-semibold">{detailPerson.status || 'ปฏิบัติหน้าที่'}</span></div>
                <div><span className="text-slate-400">วันเกิด:</span> <span className="text-white">{formatThaiDate(detailPerson.dob)} ({calculateAge(detailPerson.dob) || '-'} ปี)</span></div>
                <div><span className="text-slate-400">หมู่โลหิต / ไซส์เสื้อ:</span> <span className="text-white">{detailPerson.bloodType || '-'} / {detailPerson.shirtSize || '-'}</span></div>
                {detailPerson.nationalId && (
                  <div className="col-span-2"><span className="text-slate-400">เลขประจำตัวประชาชน:</span> <span className="text-white font-mono">{detailPerson.nationalId}</span></div>
                )}
                {(detailPerson.bank || detailPerson.bankAccount) && (
                  <div className="col-span-2"><span className="text-slate-400">บัญชีธนาคาร:</span> <span className="text-white">{detailPerson.bank} {detailPerson.bankAccount}</span></div>
                )}
              </div>

              {/* Assigned Cases */}
              <div>
                <h5 className="font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>งานในความรับผิดชอบ ({cases.filter((c) => c.assignedTo === detailPerson.id || (c.coAssignees || []).includes(detailPerson.id)).length})</span>
                </h5>
                <div className="space-y-1.5">
                  {cases
                    .filter((c) => c.assignedTo === detailPerson.id || (c.coAssignees || []).includes(detailPerson.id))
                    .map((c) => (
                      <div key={c.id} className="p-2 rounded bg-[#070D1E] border border-blue-900/40 flex items-center justify-between">
                        <span className="text-slate-200 truncate pr-2">{c.title}</span>
                        <span className="text-[10px] font-mono text-amber-300 shrink-0">{c.docNumber || formatThaiDate(c.deadline)}</span>
                      </div>
                    ))}
                  {cases.filter((c) => c.assignedTo === detailPerson.id || (c.coAssignees || []).includes(detailPerson.id)).length === 0 && (
                    <div className="text-slate-500 text-[11px]">ยังไม่มีงานที่ได้รับมอบหมาย</div>
                  )}
                </div>
              </div>

              {/* Assigned Warrants */}
              <div>
                <h5 className="font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
                  <FileWarning className="w-3.5 h-3.5" />
                  <span>หมายจับที่รับผิดชอบสืบสวน ({warrants.filter((w) => w.assignedTo === detailPerson.id).length})</span>
                </h5>
                <div className="space-y-1.5">
                  {warrants
                    .filter((w) => w.assignedTo === detailPerson.id)
                    .map((w) => (
                      <div key={w.id} className="p-2 rounded bg-[#070D1E] border border-blue-900/40 flex items-center justify-between">
                        <span className="text-slate-200 truncate pr-2">
                          {w.prefix}{w.firstName} {w.lastName} ({w.court} {w.warrantNumber})
                        </span>
                        <span className={`text-[10px] font-bold shrink-0 ${w.status === 'จับกุมแล้ว' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {w.status}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <PersonnelModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        person={editingPerson}
        onSave={onSavePerson}
      />
    </div>
  );
}
