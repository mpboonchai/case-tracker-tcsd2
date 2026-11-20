import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LeaderView from './components/LeaderView';
import MemberView from './components/MemberView';
import PersonnelView from './components/PersonnelView';
import ArrestsView from './components/ArrestsView';
import CaseOperationsView from './components/CaseOperationsView';
import CaseModal from './components/CaseModal';
import LoginModal from './components/LoginModal';
import CloudSettingsModal from './components/CloudSettingsModal';
import { 
  getCases, 
  saveCases, 
  getUsers, 
  saveUsers, 
  getCurrentUser, 
  setCurrentUser, 
  getSettings,
  getPersonnel,
  savePersonnel,
  getWarrants,
  saveWarrants,
  getOperations,
  saveOperations
} from './services/storage';

export default function App() {
  const [users, setUsers] = useState(getUsers());
  const [currentUser, setCurrentUserState] = useState(getCurrentUser());
  const [cases, setCases] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [warrants, setWarrants] = useState([]);
  const [operations, setOperations] = useState([]);
  const [selectedArrestCaseFilter, setSelectedArrestCaseFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Views: 'leader', 'member', 'operations', 'personnel', 'arrests'
  const [activeView, setActiveView] = useState(
    currentUser?.role === 'leader' ? 'leader' : 'member'
  );

  // Modals
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(!currentUser);
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [isCloudSettingsOpen, setIsCloudSettingsOpen] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  // Load cases, personnel, warrants, operations on mount
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const [loadedCases, loadedPersonnel, loadedWarrants, loadedOperations] = await Promise.all([
          getCases(),
          getPersonnel(),
          getWarrants(),
          getOperations()
        ]);
        setCases(loadedCases);
        setPersonnel(loadedPersonnel);
        setWarrants(loadedWarrants);
        setOperations(loadedOperations);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  // Auto-refresh Warrants & Case Operations when user switches back to this browser tab (e.g. after editing Google Sheet)
  useEffect(() => {
    let lastFocusRefresh = Date.now();
    const handleWindowFocus = async () => {
      // Do not background-refresh if user has any modal open or is actively typing
      if (
        document.querySelector('.fixed.inset-0') ||
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }
      if (Date.now() - lastFocusRefresh < 12000) return;
      lastFocusRefresh = Date.now();
      try {
        const [freshWarrants, freshOps] = await Promise.all([
          getWarrants(),
          getOperations()
        ]);
        if (Array.isArray(freshWarrants)) setWarrants(freshWarrants);
        if (Array.isArray(freshOps)) setOperations(freshOps);
      } catch {
        // ignore background focus sync error
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, []);

  // Check cloud connection
  useEffect(() => {
    const checkServer = async () => {
      const settings = getSettings();
      if (!settings.useCloudServer || !settings.serverUrl) {
        setIsCloudConnected(false);
        return;
      }
      try {
        const url = settings.serverUrl.replace(/\/$/, '');
        const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(3000) });
        setIsCloudConnected(res.ok);
      } catch {
        setIsCloudConnected(false);
      }
    };

    checkServer();
    const interval = setInterval(checkServer, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update view when currentUser changes
  useEffect(() => {
    if (currentUser?.role === 'leader') {
      setActiveView('leader');
    } else {
      setActiveView('member');
    }
  }, [currentUser]);

  // Auth handlers
  const handleLogin = (user) => {
    setCurrentUserState(user);
    setCurrentUser(user);
    setIsLoginModalOpen(false);
    if (user.role === 'leader') {
      setActiveView('leader');
    } else {
      setActiveView('member');
    }
  };

  const handleLogout = () => {
    setCurrentUserState(null);
    setCurrentUser(null);
    setIsLoginModalOpen(true);
  };

  // Toggle Checkbox handler (1. ขอข้อมูล, 2. ได้รับ, 3. ตรวจสอบ)
  const handleToggleCheck = async (caseId, field, newValue) => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const timestampStr = `${dd}/${mm}/${yyyy} ${timeStr} น.`;
    
    const fieldNames = {
      check1_requested: '1. ขอข้อมูลแล้ว',
      check2_received: '2. ได้รับแล้ว',
      check3_verified: '3. ตรวจสอบข้อมูลแล้ว'
    };

    const actionText = newValue 
      ? `ติ๊กเลือกเครื่องหมาย: ${fieldNames[field] || field}` 
      : `ยกเลิกการติ๊ก: ${fieldNames[field] || field}`;

    const updatedCases = cases.map(c => {
      if (c.id === caseId) {
        const updated = { ...c, [field]: newValue };

        // Determine new overall status
        if (updated.check1_requested && updated.check2_received && updated.check3_verified) {
          updated.status = 'completed';
        } else if (updated.check1_requested && !updated.check2_received) {
          updated.status = 'waiting_agency';
        } else if (updated.check2_received && !updated.check3_verified) {
          updated.status = 'in_progress';
        }

        // Add history audit record
        const historyEntry = {
          id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: timestampStr,
          userId: currentUser?.id,
          userName: currentUser?.name || 'เจ้าหน้าที่',
          action: actionText,
          details: `โดย ${currentUser?.rank || ''} ${currentUser?.name || ''}`
        };

        updated.history = [historyEntry, ...(c.history || [])];
        return updated;
      }
      return c;
    });

    setCases(updatedCases);
    await saveCases(updatedCases);
  };

  // Save case (Create or Update) — new cases append to the end of the list
  const handleSaveCase = async (caseData) => {
    const id = caseData.id || `case-${Date.now()}`;
    const record = { ...caseData, id };
    let updatedCases = [];
    const exists = cases.some(c => c.id === id);

    if (exists) {
      updatedCases = cases.map(c => (c.id === id ? { ...c, ...record } : c));
    } else {
      updatedCases = [...cases, record];
    }

    setCases(updatedCases);
    await saveCases(updatedCases);
  };

  // Delete case
  const handleDeleteCase = async (caseId) => {
    const target = cases.find(c => c.id === caseId);
    if (confirm(`คุณต้องการลบสำนวนคดี "${target?.title || caseId}" ใช่หรือไม่?`)) {
      const updated = cases.filter(c => c.id !== caseId);
      setCases(updated);
      await saveCases(updated);
    }
  };

  // Open modal handlers
  const handleOpenNewCaseModal = () => {
    setEditingCase(null);
    setIsCaseModalOpen(true);
  };

  const handleEditCase = (caseItem) => {
    setEditingCase(caseItem);
    setIsCaseModalOpen(true);
  };

  const handleOpenDetails = (caseItem) => {
    setEditingCase(caseItem);
    setIsCaseModalOpen(true);
  };

  const handleUpdateAllCases = async (newCases) => {
    setCases(newCases);
    await saveCases(newCases);
  };

  // Personnel handlers
  const handleSavePerson = async (personData) => {
    const id = personData.id || `per-${Date.now()}`;
    const record = { ...personData, id };
    const exists = personnel.some(p => p.id === id);
    const updated = exists
      ? personnel.map(p => (p.id === id ? record : p))
      : [...personnel, record];
    setPersonnel(updated);
    await savePersonnel(updated);
  };

  const handleDeletePerson = async (personId) => {
    const updated = personnel.filter(p => p.id !== personId);
    setPersonnel(updated);
    await savePersonnel(updated);
  };

  // Warrants & Arrests handlers — supports saving a single warrant or a batch array of warrants (multi-suspect arrest)
  const handleSaveWarrant = async (warrantDataOrList) => {
    const incomingList = Array.isArray(warrantDataOrList)
      ? warrantDataOrList
      : [warrantDataOrList];
    const normalized = incomingList.map((w, idx) => ({
      ...w,
      id: w.id || `war-${Date.now()}-${idx}`
    }));
    const byId = new Map(normalized.map((w) => [w.id, w]));
    const updated = warrants.map((w) => (byId.has(w.id) ? { ...w, ...byId.get(w.id) } : w));
    for (const item of normalized) {
      if (!warrants.some((w) => w.id === item.id)) {
        updated.push(item);
      }
    }
    setWarrants(updated);
    const synced = await saveWarrants(updated);
    if (Array.isArray(synced)) {
      setWarrants(synced);
    }
    return synced;
  };

  const handleDeleteWarrant = async (warrantId) => {
    const updated = warrants.filter(w => w.id !== warrantId);
    setWarrants(updated);
    const synced = await saveWarrants(updated);
    if (Array.isArray(synced)) {
      setWarrants(synced);
    }
  };

  const handleRefreshWarrants = async () => {
    try {
      const settings = getSettings();
      if (settings.useCloudServer && settings.serverUrl) {
        const res = await fetch(`${settings.serverUrl.replace(/\/$/, '')}/sync-from-sheet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.warrants)) setWarrants(data.warrants);
          if (Array.isArray(data.operations)) setOperations(data.operations);
          return;
        }
      }
    } catch (err) {
      console.warn('Sync from sheet failed:', err.message);
    }
    const fresh = await getWarrants();
    setWarrants(fresh);
  };

  // Case Operations handlers — new operations append to the end of the list
  const handleSaveOperation = async (opData) => {
    const id = opData.id || `op-${Date.now()}`;
    const record = { ...opData, id };
    const exists = operations.some(
      (o) =>
        o.id === id ||
        (o.caseName || '').trim().toLowerCase() ===
          (record.caseName || '').trim().toLowerCase()
    );
    const updated = exists
      ? operations.map((o) =>
          o.id === id ||
          (o.caseName || '').trim().toLowerCase() ===
            (record.caseName || '').trim().toLowerCase()
            ? { ...o, ...record, id: o.id || id }
            : o
        )
      : [...operations, record];
    setOperations(updated);
    await saveOperations(updated);
  };

  const handleDeleteOperation = async (opId) => {
    const updated = operations.filter((o) => o.id !== opId);
    setOperations(updated);
    await saveOperations(updated);
  };

  const handleJumpToArrestsCase = (caseName) => {
    setSelectedArrestCaseFilter(caseName || 'all');
    setActiveView('arrests');
  };

  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex flex-col font-['Prompt',sans-serif]">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeView={activeView}
        setActiveView={setActiveView}
        cases={cases}
        users={users}
        onOpenSettings={() => setIsCloudSettingsOpen(true)}
        isCloudConnected={isCloudConnected}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-12 h-12 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin"></div>
            <p className="text-xs font-mono text-amber-300">
              กำลังโหลดระบบสืบสวนและฐานข้อมูลสำนวนคดี TCSD...
            </p>
          </div>
        ) : activeView === 'operations' ? (
          <CaseOperationsView
            operations={operations}
            warrants={warrants}
            personnel={personnel}
            onSaveOperation={handleSaveOperation}
            onDeleteOperation={handleDeleteOperation}
            onJumpToArrestsCase={handleJumpToArrestsCase}
          />
        ) : activeView === 'personnel' ? (
          <PersonnelView
            personnel={personnel}
            cases={cases}
            warrants={warrants}
            onSavePerson={handleSavePerson}
            onDeletePerson={handleDeletePerson}
          />
        ) : activeView === 'arrests' ? (
          <ArrestsView
            warrants={warrants}
            cases={cases}
            operations={operations}
            initialCaseFilter={selectedArrestCaseFilter}
            users={users}
            personnel={personnel}
            onSaveWarrant={handleSaveWarrant}
            onDeleteWarrant={handleDeleteWarrant}
            onRefresh={handleRefreshWarrants}
          />
        ) : activeView === 'leader' ? (
          <LeaderView
            cases={cases}
            users={users}
            personnel={personnel}
            operations={operations}
            warrants={warrants}
            currentUser={currentUser}
            onToggleCheck={handleToggleCheck}
            onSaveCase={handleSaveCase}
            onEditCase={handleEditCase}
            onDeleteCase={handleDeleteCase}
            onOpenDetails={handleOpenDetails}
            onOpenNewCaseModal={handleOpenNewCaseModal}
          />
        ) : (
          <MemberView
            cases={cases}
            users={users}
            personnel={personnel}
            operations={operations}
            warrants={warrants}
            currentUser={currentUser}
            onToggleCheck={handleToggleCheck}
            onSaveCase={handleSaveCase}
            onEditCase={handleEditCase}
            onDeleteCase={handleDeleteCase}
            onOpenDetails={handleOpenDetails}
            onOpenNewCaseModal={handleOpenNewCaseModal}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-[#1E2E54]/60 bg-[#060A16] py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>TCSD Case Intelligence & Investigation Tracking System</span>
          </div>
          <div>
            กองบังคับการปราบปรามการกระทำความผิดเกี่ยวกับอาชญากรรมทางเทคโนโลยี (บก.ปอท.) • CIB ตำรวจสอบสวนกลาง
          </div>
        </div>
      </footer>

      {/* Case Add/Edit Modal */}
      <CaseModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        caseData={editingCase}
        onSave={handleSaveCase}
        currentUser={currentUser}
        users={users}
        personnel={personnel}
        operations={operations}
      />

      {/* Cloud & Backup Settings Modal */}
      <CloudSettingsModal
        isOpen={isCloudSettingsOpen}
        onClose={() => setIsCloudSettingsOpen(false)}
        cases={cases}
        onUpdateCases={handleUpdateAllCases}
        isCloudConnected={isCloudConnected}
      />

      {/* Login Authentication Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onLogin={handleLogin}
        users={users}
      />

    </div>
  );
}
