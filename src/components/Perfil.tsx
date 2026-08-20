import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useMemo } from 'react';
import { AppData, Casal, Lugar } from '../types';
import { cn, slimeSpring } from '../lib/utils';
import { User, Pencil, Camera, Check, Circle, MapPin, Compass, Heart, Star, Map, Navigation, CalendarHeart, Users, Plus, X } from 'lucide-react';

interface PerfilProps {
  onLogout?: () => void;
  data: AppData;
  onUpdate: (newData: AppData) => void;
}

export function Perfil({ data, onUpdate, onLogout }: PerfilProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [nomeForm, setNomeForm] = useState((data.casal?.nome || ""));
  const [dataEspForm, setDataEspForm] = useState((data.casal?.dataEspecial || ""));
  const [fotoForm, setFotoForm] = useState((data.casal?.foto || ""));
  
  const [emailForm, setEmailForm] = useState("");
  
  const fileInputRef1 = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Compress to jpeg, quality 0.7 to fit in Firestore safely
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setFotoForm(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Calcula estatísticas
  const stats = useMemo(() => {
    // Considera visitado quem tem visita com data OU status = visitado/favorito
    const visitados = (data.lugares || []).filter(l => !!(l.visita?.data) || l.status === 'visitado' || l.status === 'favorito');
    const favoritos = (data.lugares || []).filter(l => l.status === 'favorito');
    const planejados = (data.lugares || []).filter(l => l.status === 'planejando').sort((a, b) => new Date(a.dataAdicionada).getTime() - new Date(b.dataAdicionada).getTime());
    
    const cidades = new Set(visitados.map(l => l.cidade).filter(c => c && c.trim() !== ''));
    const estados = new Set(visitados.map(l => l.estado).filter(e => e && e.trim() !== ''));
    const paises = new Set(visitados.map(l => l.pais).filter(p => p && p.trim() !== ''));

    const categoryCount = visitados.reduce((acc, curr) => {
      acc[curr.categoria] = (acc[curr.categoria] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const getMedia = (avaliacoes: Record<string, number> = {}) => {
      const vals = Object.values(avaliacoes).filter(v => v > 0);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    const sortedVisitados = [...visitados].filter(l => l.visita?.data).sort((a, b) => new Date(b.visita!.data!).getTime() - new Date(a.visita!.data!).getTime());
    const lastVisit = sortedVisitados.length > 0 ? sortedVisitados[0] : null;

    const topFavorito = [...favoritos].sort((a, b) => getMedia(b.visita?.avaliacoes) - getMedia(a.visita?.avaliacoes))[0];

    return {
      visitados,
      totalCidades: cidades.size,
      totalEstados: estados.size,
      totalPaises: paises.size,
      totalFavoritos: favoritos.length,
      categoryCount,
      lastVisit,
      topFavorito,
      nextPlanned: planejados.length > 0 ? planejados[0] : null
    };
  }, [data.lugares]);

  const daysTogether = useMemo(() => {
    if (!(data.casal?.dataEspecial || "")) return 0;
    const diffTime = Math.abs(new Date().getTime() - new Date((data.casal?.dataEspecial || "")).getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, [(data.casal?.dataEspecial || "")]);

  const handleSaveProfile = () => {
    onUpdate({
      ...data,
      casal: {
        ...data.casal,
        nome: nomeForm,
        dataEspecial: dataEspForm,
        foto: fotoForm
      }
    });
    setIsEditing(false);
  };

  const handleAddEmail = () => {
    if (!emailForm.trim() || !emailForm.includes('@')) return;
    const currentShared = data.sharedWith || [];
    if (!currentShared.includes(emailForm.trim())) {
      onUpdate({
        ...data,
        sharedWith: [...currentShared, emailForm.trim()]
      });
    }
    setEmailForm("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    const currentShared = data.sharedWith || [];
    onUpdate({
      ...data,
      sharedWith: currentShared.filter(e => e !== emailToRemove)
    });
  };

  return (
    <div className="flex flex-col gap-6 ">
      <header className="flex justify-between items-center px-1">
        <h1 className="font-singsong text-[28px] font-medium text-[#5c4b51] font-black leading-tight flex items-center gap-2">
          <User className="w-7 h-7 inline-block text-[#a2d2ff]" strokeWidth={2.5} />
          Nosso Perfil
        </h1>
        <div className="flex gap-2">
          {!isEditing && (
            <motion.button whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.9, borderRadius: "2rem" }} transition={slimeSpring} 
              onClick={() => setIsEditing(true)}
              className="p-2 text-[#ff7597] font-bold hover:text-[#5c4b51] font-black bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  rounded-full shadow-xl shadow-pink-200/40 border border-white/30 transition-all"
            >
              <Pencil className="w-5 h-5 inline-block" strokeWidth={2.5} />
            </motion.button>
          )}
          {onLogout && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} transition={slimeSpring} 
              onClick={onLogout}
              className="p-2 text-red-400 font-bold hover:text-red-600 bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] rounded-full border border-white/30 transition-all"
            >
              Sair
            </motion.button>
          )}
        </div>
      </header>

      {/* HERO / PERFIL */}
      <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  rounded-[2rem] shadow-xl shadow-pink-200/40 border border-white/30 overflow-hidden">
        <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div 
            key="editing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={slimeSpring}>
            <div className="p-6 flex flex-col gap-4 ">
            <h2 className="font-singsong font-medium text-[#ff7597] font-bold text-lg mb-2 flex items-center gap-2">
              <Pencil className="w-5 h-5 inline-block" strokeWidth={2.5} />
              Editar Dados
            </h2>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#ff7597] font-bold">Nossos Nomes</label>
              <input 
                type="text" value={nomeForm} onChange={e => setNomeForm(e.target.value)}
                placeholder="Ex: João e Maria"
                className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 text-[#ff7597] font-bold rounded-[2rem] p-3 outline-none focus:ring-2 focus:ring-[#111827]/20 focus:border-[#ff9a9e]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#ff7597] font-bold">Data Especial</label>
              <input 
                type="date" value={dataEspForm} onChange={e => setDataEspForm(e.target.value)}
                className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 text-[#ff7597] font-bold rounded-[2rem] p-3 outline-none focus:ring-2 focus:ring-[#111827]/20 focus:border-[#ff9a9e]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#ff7597] font-bold">Foto do Casal</label>
              
              <input 
                type="file" accept="image/*" className="hidden" ref={fileInputRef1}
                onChange={handleFileChange}
              />
              
              <button
                type="button"
                onClick={() => fileInputRef1.current?.click()}
                className="w-full h-32 rounded-[2rem] bg-white/40 border-2 border-dashed border-[#ff9a9e] flex flex-col items-center justify-center gap-2 text-[#ff7597] hover:bg-white/60 transition-colors overflow-hidden relative"
              >
                {fotoForm ? (
                  <>
                    <img src={fotoForm} alt="Foto" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Camera className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="w-8 h-8" strokeWidth={2.5} />
                    <span className="text-sm font-bold text-center px-4">Toque para adicionar foto</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/40 flex flex-col gap-3">
              <label className="text-sm font-medium text-[#5c4b51] font-bold flex items-center gap-1.5">
                <Users className="w-4 h-4" /> Compartilhar Conta
              </label>
              <p className="text-xs text-[#ff7597] mb-3 leading-tight">
                Envie este código para o seu parceiro(a). Ele(a) deve inseri-lo na tela inicial para acessar a mesma lista.
              </p>
              
              <div className="bg-white/50 border-2 border-white/60 p-4 rounded-xl flex items-center justify-between">
                <span className="font-black text-2xl tracking-widest text-[#5c4b51]">{data.inviteCode || '------'}</span>
                <button 
                  onClick={() => {
                    if (data.inviteCode) {
                      navigator.clipboard.writeText(data.inviteCode);
                      alert('Código copiado!');
                    }
                  }}
                  className="bg-[#ff7597] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-pink-200"
                >
                  Copiar
                </button>
              </div>
            </div>

            <motion.button whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.9, borderRadius: "2rem" }} transition={slimeSpring} 
              onClick={handleSaveProfile}
              className="mt-4 w-full bg-gradient-to-r from-[#ff9a9e] to-[#fecfef] text-white font-black shadow-lg shadow-pink-300/50 border border-white transition-all duration-300 p-4 rounded-[2rem] font-medium shadow-md shadow-xl shadow-pink-200/40/30 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5 inline-block" strokeWidth={2.5} /> Salvar Perfil
            </motion.button>
            <motion.button whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.9, borderRadius: "2rem" }} transition={slimeSpring} 
              onClick={() => {
                setIsEditing(false);
                setNomeForm((data.casal?.nome || ""));
                setDataEspForm((data.casal?.dataEspecial || ""));
                setFotoForm((data.casal?.foto || ""));
                setEmailForm("");
              }}
              className="w-full text-[#ff7597] font-bold p-2 text-sm font-medium underline underline-offset-2"
            >
              Cancelar
            </motion.button>
          </div>
          </motion.div>
        ) : (
          <motion.div 
            key="viewing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={slimeSpring}
            className="flex flex-col items-center p-8 relative overflow-hidden bg-gradient-to-b from-[#FFFFFF] to-white">
            <div className="absolute top-0 inset-x-0 h-32 bg-gray-200 opacity-50 rounded-b-[40px]"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl shadow-pink-200/40 overflow-hidden bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]/40 border border-white/30 backdrop-blur-md flex items-center justify-center mb-4">
                {(data.casal?.foto || "") ? (
                  <img src={(data.casal?.foto || "")} alt="Casal" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = '')} />
                ) : (
                  <User className="w-7 h-7 inline-block text-[#a2d2ff]" strokeWidth={2.5} />
                )}
              </div>
              <h2 className="font-singsong text-2xl font-medium text-[#ff7597] font-bold mb-1">{(data.casal?.nome || "") || 'Casal'}</h2>
              
              {(data.casal?.dataEspecial || "") && (
                <div className="mt-3 flex flex-col items-center bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  px-4 py-2 rounded-[2rem] shadow-xl shadow-pink-200/40 border border-white/30">
                  <span className="text-xs font-medium uppercase tracking-wider text-[#5c4b51] font-black flex items-center gap-1.5">
                    <CalendarHeart className="w-5 h-5 inline-block" strokeWidth={2.5} /> Juntos há
                  </span>
                  <span className="text-xl font-medium text-[#5c4b51] font-black leading-tight">
                    {daysTogether} <span className="text-sm font-medium text-[#ff7597] font-bold lowercase">dias</span>
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* ESTATÍSTICAS */}
      <h3 className="font-singsong font-medium text-[#5c4b51] font-black text-lg pl-1 mt-2">Nossos Números</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  p-4 rounded-[2rem] shadow-xl shadow-pink-200/40 border border-white/30 flex flex-col items-center text-center">
          <MapPin className="w-5 h-5 inline-block" strokeWidth={2.5} />
          <span className="text-3xl font-medium text-[#5c4b51] font-singsong font-black">{stats.visitados.length}</span>
          <span className="text-xs font-medium text-[#ff7597] font-bold uppercase tracking-wider mt-1">Visitados</span>
        </div>
        <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  p-4 rounded-[2rem] shadow-xl shadow-pink-200/40 border border-white/30 flex flex-col items-center text-center">
          <Compass className="w-5 h-5 inline-block" strokeWidth={2.5} />
          <span className="text-3xl font-medium text-[#5c4b51] font-singsong font-black">{stats.totalCidades}</span>
          <span className="text-xs font-medium text-[#ff7597] font-bold uppercase tracking-wider mt-1">Cidades</span>
        </div>
        <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  p-4 rounded-[2rem] shadow-xl shadow-pink-200/40 border border-white/30 flex flex-col items-center text-center">
          <Map className="w-5 h-5 inline-block" strokeWidth={2.5} />
          <span className="text-3xl font-medium text-[#5c4b51] font-singsong font-black">{stats.totalEstados}</span>
          <span className="text-xs font-medium text-[#ff7597] font-bold uppercase tracking-wider mt-1">Estados</span>
        </div>
        <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  p-4 rounded-[2rem] shadow-xl shadow-pink-200/40 border border-white/30 flex flex-col items-center text-center">
          <Heart className="w-5 h-5 inline-block" strokeWidth={2.5} />
          <span className="text-3xl font-medium text-[#5c4b51] font-singsong font-black">{stats.totalFavoritos}</span>
          <span className="text-xs font-medium text-[#ff7597] font-bold uppercase tracking-wider mt-1">Favoritos</span>
        </div>
      </div>

      {/* HIGHLIGHTS / DESTAQUES */}
      <div className="flex flex-col gap-3 mt-2">
        
        {stats.lastVisit && (
          <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  p-5 rounded-[2rem] shadow-xl shadow-pink-200/40 border border-white/30 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[#ff7597] font-bold uppercase tracking-wider mb-1">
              <Check className="w-5 h-5 inline-block" strokeWidth={2.5} /> Último Encontro
            </div>
            <h4 className="font-medium text-[#5c4b51] font-black text-lg">{stats.lastVisit.nome}</h4>
            <span className="text-sm text-[#ff7597] font-bold">
              {new Date(stats.lastVisit.visita!.data!).toLocaleDateString('pt-BR')} • {stats.lastVisit.categoria}
            </span>
          </div>
        )}

        {stats.nextPlanned && (
          <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  p-5 rounded-[2rem] shadow-xl shadow-pink-200/40 border border-white/30 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-orange-400 uppercase tracking-wider mb-1">
              <Navigation className="w-5 h-5 inline-block" strokeWidth={2.5} /> Próximo Plano
            </div>
            <h4 className="font-medium text-[#5c4b51] font-black text-lg">{stats.nextPlanned.nome}</h4>
            <span className="text-sm text-[#ff7597] font-bold">{stats.nextPlanned.categoria}</span>
          </div>
        )}

      </div>

      {/* CATEGORIAS PROGRESS BAR */}
      {Object.keys(stats.categoryCount).length > 0 && (
        <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  p-5 rounded-[2rem] shadow-xl shadow-pink-200/40 border border-white/30 flex flex-col gap-4 mt-2">
          <h3 className="font-singsong font-medium text-[#5c4b51] font-black text-sm uppercase tracking-wider">Top Categorias</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(stats.categoryCount)
              .sort((a, b) => Number(b[1]) - Number(a[1]))
              .map(([cat, count]) => (
                <div key={cat} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-sm font-medium text-[#ff7597] font-bold">
                    <span>{cat}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#ff9a9e] to-[#fecfef] text-white font-black shadow-lg shadow-pink-300/50 border border-white transition-all duration-300 rounded-full" 
                      style={{ width: `${(Number(count) / stats.visitados.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
}
