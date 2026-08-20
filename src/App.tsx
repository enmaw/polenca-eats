import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppData } from './types';
import { defaultData, getLocalData, handleFirestoreError, OperationType } from './lib/storage';
import { db, auth, signOut } from './lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Login } from './components/Login';
import { checkGamification } from './lib/gamification';
import { NossaLista } from './components/NossaLista';
import { Explorar } from './components/Explorar';
import { Roleta } from './components/Roleta';
import { Memorias } from './components/Memorias';
import { Perfil } from './components/Perfil';
import { Conquistas } from './components/Conquistas';
import { VisitaModal } from './components/VisitaModal';
import { Lugar, Visita } from './types';
import { cn, slimeSpring } from './lib/utils';
import { haptics } from './lib/haptics';
import { Dices, Compass, Bookmark, Home, History, User, Heart, CalendarHeart, Sparkles } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('inicio');
  const [visitingLugar, setVisitingLugar] = useState<Lugar | null>(null);
  const [toasts, setToasts] = useState<string[]>([]);
  const [activeToast, setActiveToast] = useState<string | null>(null);
  
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState<'name' | 'invite' | null>(null);
  const [onboardingName, setOnboardingName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Global Haptic Feedback for all buttons
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
        haptics.tap();
      }
    };
    document.addEventListener('click', handleGlobalClick, { capture: true });
    return () => document.removeEventListener('click', handleGlobalClick, { capture: true });
  }, []);

  // Setup Document Sync
  useEffect(() => {
    if (!user) {
      setData(null);
      setActiveDocId(null);
      return;
    }

    const checkDocuments = async () => {
      // 2. Check if user has their own document
      const docRef = doc(db, 'users', user.uid);
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setActiveDocId(user.uid);
        } else {
          // Check if we saved a document ID in local storage when we joined via invite code previously
          const joinedDocId = localStorage.getItem('joinedDocId');
          if (joinedDocId) {
             const joinedDocRef = doc(db, 'users', joinedDocId);
             const joinedSnap = await getDoc(joinedDocRef);
             if (joinedSnap.exists()) {
                setActiveDocId(joinedDocId);
                return;
             }
          }
          // If no doc exists, start onboarding
          setIsOnboarding(true);
        }
      } catch (e: any) {
        const errorMsg = e.message || String(e);
        if (errorMsg.includes('closing') || errorMsg.includes('hidden')) {
          console.warn('Ignoring transient Firestore error:', errorMsg);
          return;
        }
        setLoadError(errorMsg);
        console.error("Fetch falhou:", e);
        // We do not throw handleFirestoreError here to avoid breaking the UI hook
      }
    };

    checkDocuments();
  }, [user]);

  // Subscribe to active document
  useEffect(() => {
    if (!activeDocId) return;

    const docRef = doc(db, 'users', activeDocId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const firestoreData = snap.data() as AppData;
        const { newData } = checkGamification(firestoreData);
        setData(newData);
        
        // Se a gamificação mudou algo, atualiza no firestore silenciosamente
        if (JSON.stringify(newData) !== JSON.stringify(firestoreData)) {
          setDoc(docRef, { ...newData, ownerId: activeDocId }, { merge: true }).catch(err => {
            console.error("Erro gamificacao sync", err);
          });
        }
      }
    }, (error) => {
      console.warn("Firestore listener warning:", error.message || error);
      // Do not re-throw onSnapshot errors as they are often transient (e.g., HMR, connectivity)
    });

    return () => unsubscribe();
  }, [activeDocId]);

  // Sistema de Toast
  useEffect(() => {
    if (toasts.length > 0 && !activeToast) {
      setActiveToast(toasts[0]);
      setToasts(prev => prev.slice(1));
    }
  }, [toasts, activeToast]);

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateAccount = async () => {
    if (!user || !onboardingName.trim()) return;
    
    const newInviteCode = generateInviteCode();
    const initialDataToSave: AppData = { 
      ...defaultData, 
      casal: {
        nome: onboardingName.trim(),
        foto: ''
      },
      ownerId: user.uid,
      inviteCode: newInviteCode
    };

    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, initialDataToSave);
      
      const inviteRef = doc(db, 'invites', newInviteCode);
      await setDoc(inviteRef, { ownerId: user.uid });
      
      setIsOnboarding(false);
      setOnboardingMode(null);
      setActiveDocId(user.uid);
    } catch (error: any) {
      if (error?.message?.includes('closing') || error?.message?.includes('hidden')) return;
      alert(`Erro ao criar conta: ${error.message || 'Desconhecido'}`);
      console.error(error);
    }
  };

  const handleJoinAccount = async () => {
    if (!user || !inviteCode.trim()) return;
    try {
      const code = inviteCode.trim().toUpperCase();
      const inviteRef = doc(db, 'invites', code);
      const inviteSnap = await getDoc(inviteRef);
      
      if (!inviteSnap.exists()) {
        alert("Código de convite inválido ou não encontrado.");
        return;
      }
      
      const targetDocId = inviteSnap.data().ownerId;
      localStorage.setItem('joinedDocId', targetDocId);
      setIsOnboarding(false);
      setOnboardingMode(null);
      setActiveDocId(targetDocId);
    } catch (error: any) {
       if (error?.message?.includes('closing') || error?.message?.includes('hidden')) return;
       console.error("Erro ao juntar", error);
       alert("Erro ao tentar usar o código de convite.");
    }
  };

  const handleUpdateData = async (newData: AppData) => {
    if (!user || !activeDocId) return;

    const { newData: gamifiedData, toasts: newToasts } = checkGamification(newData);
    
    // Optimistic UI update
    setData(gamifiedData);
    
    try {
      const docRef = doc(db, 'users', activeDocId);
      await setDoc(docRef, gamifiedData, { merge: true });
    } catch (error: any) {
      if (error?.message?.includes('closing') || error?.message?.includes('hidden')) return;
      alert(`Erro ao salvar dados: ${error.message || 'Desconhecido'}`);
      console.error(error);
    }
    
    if (newToasts.length > 0) {
      setToasts(prev => [...prev, ...newToasts]);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-[#ff7597] font-singsong text-2xl font-black animate-pulse">Carregando...</div>;
  if (!user) return <Login />;
  
  if (isOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-[#5c4b51] relative overflow-hidden">
        {/* Background Decorative Circles */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-[#ff9a9e]/20 rounded-full blur-2xl" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-[#a2d2ff]/20 rounded-full blur-2xl" />
        
        <div className="bg-white/60 backdrop-blur-xl border-[3px] border-white/80 shadow-[0_8px_32px_rgba(255,154,158,0.3)] p-8 rounded-[2.5rem] text-center max-w-sm w-full relative z-10">
          <AnimatePresence mode="wait">
            {!onboardingMode && (
              <motion.div key="mode-selection" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={slimeSpring}>
                <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-[#ff9a9e] to-[#fecfef] rounded-full flex items-center justify-center mb-6 shadow-inner shadow-white/50 border-4 border-white">
                  <Heart className="w-12 h-12 text-white fill-white" />
                </div>
                <h1 className="text-4xl font-singsong font-black text-[#5c4b51] mb-2 tracking-tight">Polenca Eats</h1>
                <p className="text-[#ff7597] font-bold mb-8 text-sm px-4">Para nos definir e guardar nossos lugares.</p>
                
                <div className="flex flex-col gap-4 mt-6">
                  <motion.button 
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setOnboardingMode('name')}
                    className="w-full bg-gradient-to-r from-[#ff9a9e] to-[#fecfef] text-white p-4 rounded-[2rem] font-black shadow-lg shadow-pink-300/50 flex items-center justify-center gap-2"
                  >
                    Criar Nossa Lista
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setOnboardingMode('invite')}
                    className="w-full bg-white/80 text-[#ff7597] border-2 border-[#ff9a9e]/30 p-4 rounded-[2rem] font-black shadow-sm flex items-center justify-center gap-2"
                  >
                    Já tenho um convite
                  </motion.button>
                </div>
              </motion.div>
            )}

            {onboardingMode === 'name' && (
              <motion.div key="step-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={slimeSpring}>
                <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center mb-6 border-2 border-[#ff9a9e]/30 shadow-sm text-[#ff7597]">
                  <User className="w-8 h-8" />
                </div>
                <p className="text-[#ff7597] font-bold text-lg mb-6">Como vocês se chamam?</p>
                <input 
                  value={onboardingName}
                  onChange={e => setOnboardingName(e.target.value)}
                  placeholder="Ex: João e Maria"
                  className="w-full bg-white/80 border-2 border-white p-5 rounded-[1.5rem] mb-6 text-center text-[#5c4b51] text-lg font-black focus:outline-none focus:ring-4 focus:ring-[#ff7597]/20 focus:border-[#ff7597]/50 shadow-inner"
                />
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleCreateAccount}
                  disabled={!onboardingName.trim()}
                  className="w-full bg-gradient-to-r from-[#ff9a9e] to-[#fecfef] text-white p-4 rounded-[2rem] font-black shadow-lg shadow-pink-300/50 disabled:opacity-50 disabled:shadow-none mb-4 flex items-center justify-center gap-2"
                >
                  Começar
                </motion.button>
                <button onClick={() => setOnboardingMode(null)} className="text-[#ff7597]/70 hover:text-[#ff7597] text-sm font-bold transition-colors">Voltar</button>
              </motion.div>
            )}

            {onboardingMode === 'invite' && (
              <motion.div key="invite" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={slimeSpring}>
                <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center mb-6 border-2 border-[#ff9a9e]/30 shadow-sm text-[#ff7597]">
                  <User className="w-8 h-8" />
                </div>
                <p className="text-[#ff7597] font-bold text-lg mb-6">Digite o código recebido:</p>
                <input 
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="EX: X7B9K2"
                  maxLength={6}
                  className="w-full bg-white/80 border-2 border-white p-5 rounded-[1.5rem] mb-6 text-center text-[#5c4b51] font-black text-2xl tracking-[0.3em] focus:outline-none focus:ring-4 focus:ring-[#ff7597]/20 focus:border-[#ff7597]/50 shadow-inner uppercase"
                />
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleJoinAccount}
                  disabled={inviteCode.trim().length < 6}
                  className="w-full bg-gradient-to-r from-[#ff9a9e] to-[#fecfef] text-white p-4 rounded-[2rem] font-black shadow-lg shadow-pink-300/50 disabled:opacity-50 disabled:shadow-none mb-4 flex items-center justify-center gap-2"
                >
                  <Heart className="w-5 h-5 fill-white" /> Entrar na Lista
                </motion.button>
                <button onClick={() => setOnboardingMode(null)} className="text-[#ff7597]/70 hover:text-[#ff7597] text-sm font-bold transition-colors">Voltar</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-[#5c4b51]">
        <h2 className="text-3xl font-black text-red-500 mb-4">Ops! Ocorreu um erro.</h2>
        <p className="text-lg bg-white/50 p-4 rounded-xl border border-red-200">{loadError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 bg-[#ff7597] text-white px-6 py-3 rounded-full font-bold shadow-lg"
        >
          Recarregar Página
        </button>
      </div>
    );
  }

  if (!data) return <div className="min-h-screen flex items-center justify-center text-[#ff7597] font-singsong text-2xl font-black animate-pulse">Carregando Diário...</div>;

  // Contadores para o resumo
  const lugares = data.lugares || [];
  const lugaresCount = lugares.length;
  const visitadosCount = lugares.filter(l => l.status === 'visitado' || l.status === 'favorito').length;
  const favoritosCount = lugares.filter(l => l.status === 'favorito').length;

  return (
    <div className="flex flex-col h-full font-sans relative bg-transparent">
      
      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto pb-28 p-5 md:p-6 max-w-3xl mx-auto w-full z-10">
        
                <AnimatePresence mode="wait">
          {currentTab === 'inicio' && (
            <motion.div 
              key="inicio"
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={slimeSpring}
              className="flex flex-col gap-7"
            >
              {/* Cabeçalho */}
              <header className="pt-10 pb-6 text-center relative">
                <h1 className="text-4xl font-singsong font-black text-[#5c4b51] leading-tight mb-3 drop-shadow-sm">
                  Polenca Eats
                </h1>
                <p className="text-[#ff7597] text-[11px] font-black tracking-[0.2em] uppercase bg-white/30 backdrop-blur-md inline-block px-5 py-2.5 rounded-full border border-white shadow-lg shadow-pink-200/50">
                  {(data.casal?.nome || "") || 'Planejador de Encontros'}
                </p>
              </header>

              {/* Resumo / Contadores */}
              <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] p-6 rounded-3xl shadow-xl shadow-pink-200/40 border border-white/30 flex justify-between divide-x divide-gray-100">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-3xl font-medium text-[#5c4b51] font-singsong font-black">{lugaresCount}</span>
                  <span className="text-[10px] text-[#ff7597] font-bold uppercase tracking-wider mt-1">Na lista</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <span className="text-3xl font-medium text-[#a2d2ff]">{visitadosCount}</span>
                  <span className="text-[10px] text-[#ff7597] font-bold uppercase tracking-wider mt-1">Visitados</span>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <span className="text-3xl font-medium text-[#facc15]">{favoritosCount}</span>
                  <span className="text-[10px] text-[#ff7597] font-bold uppercase tracking-wider mt-1">Favoritos</span>
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="flex flex-col gap-4 mt-2">
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.92 }} transition={slimeSpring}
                  onClick={() => setCurrentTab('roleta')}
                  className="w-full bg-gradient-to-r from-[#ff9a9e] to-[#fecfef] text-[#5c4b51] shadow-lg shadow-pink-300/50 border border-white hover:scale-105 transition-transform duration-300 p-5 rounded-[2rem] font-semibold flex items-center justify-center gap-3 hover:bg-[#000000]"
                >
                  <Dices className="w-7 h-7 inline-block text-white" strokeWidth={2.5} />
                  <span className="text-lg tracking-wide text-white">Girar a Roleta</span>
                </motion.button>
                
                <div className="grid grid-cols-2 gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.92 }} transition={slimeSpring}
                    onClick={() => setCurrentTab('explorar')}
                    className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] text-[#5c4b51] font-black p-5 rounded-[2rem] font-medium shadow-xl shadow-pink-200/40 flex flex-col items-center justify-center gap-3 hover:bg-[#F3F4F6] transition-colors"
                  >
                    <Compass className="w-8 h-8 inline-block text-[#a2d2ff]" strokeWidth={2.5} />
                    <span className="text-sm font-semibold tracking-wide text-[#ff7597]">Locais perto</span>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.92 }} transition={slimeSpring}
                    onClick={() => setCurrentTab('lista')}
                    className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] text-[#5c4b51] font-black p-5 rounded-[2rem] font-medium shadow-xl shadow-pink-200/40 flex flex-col items-center justify-center gap-3 hover:bg-[#F3F4F6] transition-colors"
                  >
                    <Bookmark className="w-8 h-8 inline-block text-[#facc15]" strokeWidth={2.5} />
                    <span className="text-sm font-semibold tracking-wide text-[#ff7597]">Nossa lista</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* OUTRAS TELAS */}
          {currentTab === 'explorar' && (
            <motion.div key="explorar" initial={{ opacity: 0, y: 15, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -15, scale: 0.98 }} transition={slimeSpring}>
              <Explorar data={data} onUpdate={handleUpdateData} onVisit={(l) => setVisitingLugar(l)} />
            </motion.div>
          )}
          
          {currentTab === 'roleta' && (
            <motion.div key="roleta" initial={{ opacity: 0, y: 15, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -15, scale: 0.98 }} transition={slimeSpring}>
              <Roleta data={data} onUpdate={handleUpdateData} onVisit={(l) => setVisitingLugar(l)} />
            </motion.div>
          )}
          
          {currentTab === 'lista' && (
            <motion.div key="lista" initial={{ opacity: 0, y: 15, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -15, scale: 0.98 }} transition={slimeSpring}>
              <NossaLista data={data} onUpdate={handleUpdateData} onVisit={(l) => setVisitingLugar(l)} />
            </motion.div>
          )}
          
          {currentTab === 'memorias' && (
            <motion.div key="memorias" initial={{ opacity: 0, y: 15, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -15, scale: 0.98 }} transition={slimeSpring}>
              <Memorias data={data} onUpdate={handleUpdateData} onEdit={(l) => setVisitingLugar(l)} />
            </motion.div>
          )}
          
          {currentTab === 'perfil' && (
            <motion.div key="perfil" initial={{ opacity: 0, y: 15, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -15, scale: 0.98 }} transition={slimeSpring}>
              <Perfil data={data} onUpdate={handleUpdateData} onLogout={signOut} />
            </motion.div>
          )}

          {currentTab === 'trofeus' && (
            <motion.div key="trofeus" initial={{ opacity: 0, y: 15, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -15, scale: 0.98 }} transition={slimeSpring}>
              <Conquistas data={data} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Visita Modal Global */}
      <AnimatePresence mode="wait">
        {visitingLugar && (
          <VisitaModal 
            casal={data.casal} 
            lugar={visitingLugar} 
            onClose={() => setVisitingLugar(null)}
            onSave={(visitaData: Visita, isFavorito: boolean) => {
              const updatedLugares = (data.lugares || []).map(l => 
                l.id === visitingLugar.id ? (() => {
                  const notas = Object.values(visitaData.avaliacoes).filter(n => n > 0);
                  let novaAvaliacao = l.avaliacao;
                  if (notas.length > 0) {
                    const soma = notas.reduce((acc, n) => acc + n, 0);
                    novaAvaliacao = Math.round((soma / notas.length) * 10) / 10;
                  }
                  return { ...l, status: isFavorito ? 'favorito' : 'visitado', visita: visitaData, avaliacao: novaAvaliacao };
                })() : l
              );
              handleUpdateData({ ...data, lugares: updatedLugares });
              setVisitingLugar(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* TOAST DE NOTIFICAÇÃO (GAMIFICAÇÃO) */}
      {activeToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] backdrop-blur-none text-[#000000] px-6 py-3 rounded-full font-medium shadow-[0_8px_32px_rgba(17,24,39,0.2)] border border-white/30 animate-in slide-in-from-top-4 fade-in duration-300">
          {activeToast}
        </div>
      )}

      {/* MENU DE NAVEGAÇÃO INFERIOR (Mobile) */}
      <nav className="fixed bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md bg-white/50 backdrop-blur-xl border-2 border-white/70 shadow-[0_8px_32px_rgba(255,154,158,0.4)] rounded-[2.5rem] py-2 px-1 z-[9999] animate-float">
        <div className="w-full flex justify-evenly items-center">
          <NavItem icon="home" label="Início" active={currentTab === 'inicio'} onClick={() => setCurrentTab('inicio')} />
          <NavItem icon="explore" label="Explorar" active={currentTab === 'explorar'} onClick={() => setCurrentTab('explorar')} />
          <NavItem icon="casino" label="Roleta" active={currentTab === 'roleta'} onClick={() => setCurrentTab('roleta')} />
          <NavItem icon="bookmark" label="Lista" active={currentTab === 'lista'} onClick={() => setCurrentTab('lista')} />
          <NavItem icon="history" label="Memórias" active={currentTab === 'memorias'} onClick={() => setCurrentTab('memorias')} />
          <NavItem icon="person" label="Perfil" active={currentTab === 'perfil'} onClick={() => setCurrentTab('perfil')} />
        </div>
      </nav>
    </div>
  );
}

// Subcomponentes utilitários

interface NavItemProps {
  icon: string;
  label: string;
 active: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <motion.button 
      whileTap={{ scale: 0.8 }}
      transition={slimeSpring}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1.5 min-w-[3.2rem] p-1.5 transition-all group",
       active ? "text-[#ff7597]" : "text-[#ffb3c1] hover:text-[#ff7597]"
      )}
    >
      <div className={cn(
        "transition-transform duration-300", 
       active ? "-translate-y-1" : "translate-y-0 group-hover:-translate-y-0.5"
      )}>
        {icon === 'home' && <Home className={cn("w-6 h-6", active ? "text-[#ff7597]" : "")} strokeWidth={active ? 3 : 2} />}{icon === 'explore' && <Compass className={cn("w-6 h-6", active ? "text-[#ff7597]" : "")} strokeWidth={active ? 3 : 2} />}{icon === 'casino' && <Dices className={cn("w-6 h-6", active ? "text-[#ff7597]" : "")} strokeWidth={active ? 3 : 2} />}{icon === 'bookmark' && <Bookmark className={cn("w-6 h-6", active ? "text-[#ff7597]" : "")} strokeWidth={active ? 3 : 2} />}{icon === 'history' && <History className={cn("w-6 h-6", active ? "text-[#ff7597]" : "")} strokeWidth={active ? 3 : 2} />}{icon === 'person' && <User className={cn("w-6 h-6", active ? "text-[#ff7597]" : "")} strokeWidth={active ? 3 : 2} />}
      </div>
      <span className={cn(
        "text-[9px] uppercase tracking-wider transition-all duration-300",
       active ? "font-bold opacity-100" : "font-medium opacity-0 group-hover:opacity-100 absolute -bottom-4"
      )}>{label}</span>
      {active && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#ff7597] rounded-full" />
      )}
    </motion.button>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-[#ff7597] font-bold animate-in fade-in zoom-in-95 duration-300 pt-32">
      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-[#5c4b51] font-black">
        <Compass className="w-6 h-6 inline-block" strokeWidth={2.5} />
      </div>
      <h2 className="text-2xl font-medium text-[#5c4b51] font-singsong font-black mb-2">{title}</h2>
      <p className="text-sm">Em construção nos próximos passos...</p>
    </div>
  );
}
