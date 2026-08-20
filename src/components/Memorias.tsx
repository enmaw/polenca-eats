import { slimeSpring } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { IconWrapper } from './IconWrapper';
import React, { useState } from 'react';
import { AppData, Lugar } from '../types';

interface MemoriasProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
  onEdit: (lugar: Lugar) => void;
}

export function Memorias({ data, onUpdate, onEdit }: MemoriasProps) {
  const [selectedLugar, setSelectedLugar] = useState<Lugar | null>(null);

  // Filtrar apenas visitados com histórico
  const memorias = (data.lugares || [])
    .filter(l => (l.status === 'visitado' || l.status === 'favorito') && l.visita && l.visita.data)
    .sort((a, b) => {
      // Sort by recency (newest first)
      if (!a.visita?.data) return 1;
      if (!b.visita?.data) return -1;
      return new Date(b.visita.data).getTime() - new Date(a.visita.data).getTime();
    });

  const getMediaRating = (avaliacoes: Record<string, number> = {}) => {
    const values = Object.values(avaliacoes).filter(v => v > 0);
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="flex flex-col gap-6 ">
      <header>
        <h1 className="font-singsong text-[28px] font-medium text-[#5c4b51] font-black leading-tight flex items-center gap-2">
          <IconWrapper name="favorite" className="w-7 h-7 text-[#ff7597]" />
          Memórias
        </h1>
        <p className="text-[#ff7597] font-bold mt-2 text-sm font-medium">
          Nossa linha do tempo de momentos inesquecíveis.
        </p>
      </header>

      {memorias.length === 0 ? (
        <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  p-8 rounded-[2rem] shadow-xl shadow-pink-200/40 border border-white/30 text-center flex flex-col items-center gap-4 mt-4">
          <div className="w-16 h-16 bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] rounded-full flex items-center justify-center text-[#d1babb]">
            <IconWrapper name="favorite" className="" />
          </div>
          <h2 className="font-singsong text-[#ff7597] font-bold font-medium text-lg">Ainda sem memórias</h2>
          <p className="text-[#ff7597] font-bold text-sm leading-relaxed">
            Ainda não registramos nenhuma visita. Use o botão <strong>"Já fomos!"</strong> na aba Lista ou Roleta quando visitarmos um lugar!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 relative before:absolute before:inset-y-0 before:left-[23px] before:w-0.5 before:bg-gray-200 ml-2">
          {memorias.map((lugar, idx) => {
            const media = getMediaRating(lugar.visita.avaliacoes);
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, ...slimeSpring }}
                key={lugar.id} 
                className="relative pl-12 flex flex-col gap-2 cursor-pointer group"
                onClick={() => setSelectedLugar(lugar)}
              >
                {/* Timeline dot */}
                <div className="absolute left-[15px] top-1 w-[18px] h-[18px] rounded-full bg-gradient-to-r from-[#ff9a9e] to-[#fecfef] text-[#5c4b51] shadow-lg shadow-pink-300/50 border border-white transition-transform duration-300 border-4 border-white shadow-xl shadow-pink-200/40 z-10"></div>
                
                <span className="text-xs font-medium text-[#ff7597] font-bold tracking-wider uppercase">
                  {formatDate(lugar.visita.data as string)}
                </span>
                
                <div className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  rounded-[2rem] shadow-xl shadow-pink-200/40 border border-white/30 overflow-hidden group-hover:border-[#ff9a9e]/30 transition-colors">
                  {lugar.visita.fotos && lugar.visita.fotos.length > 0 && (
                    <div className="h-32 w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]/40 border border-white/30 backdrop-blur-md overflow-hidden">
                      <img 
                        src={lugar.visita.fotos[0]} 
                        alt={lugar.nome} 
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )}
                  
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-singsong font-medium text-[#5c4b51] font-black leading-tight pr-2">{lugar.nome}</h3>
                      {lugar.status === 'favorito' && (
                        <div className="bg-red-50 text-[#5c4b51] font-black p-1.5 rounded-full shrink-0">
                          <IconWrapper name="favorite" className="icon-filled" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span className="text-[#ff7597] font-bold">{lugar.categoria}</span>
                      {media > 0 && (
                        <div className="flex items-center gap-1 text-[#f59e0b] bg-[#fffbeb] px-2 py-0.5 rounded-3xl">
                          <IconWrapper name="star" className="icon-filled" />
                          Média {media.toFixed(1)}
                        </div>
                      )}
                    </div>

                    {lugar.visita.comentario && (
                      <p className="font-whimsical text-[16px] text-[#7a6a6d] line-clamp-2 mt-1 italic">
                        "{lugar.visita.comentario}"
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL DE DETALHES DA MEMÓRIA */}
      <AnimatePresence mode="wait">
        {selectedLugar && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] /60 z-[99999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={slimeSpring}
            className="bg-white/60 backdrop-blur-2xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] rounded-[2.5rem] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
            <header className="sticky top-0 bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  z-10 px-6 py-4 border-b border-white/30 flex items-center justify-between">
              <h2 className="font-singsong text-xl font-medium text-[#5c4b51] font-black">Nossa Visita</h2>
              <motion.button whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.9, borderRadius: "2rem" }} transition={slimeSpring} onClick={() => setSelectedLugar(null)} className="p-2 text-[#ff7597] font-bold hover:text-[#ff7597] font-bold bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] rounded-full transition-transform">
                <IconWrapper name="close" className="" />
              </motion.button>
            </header>

            <div className="flex flex-col">
              {selectedLugar.visita.fotos && selectedLugar.visita.fotos.length > 0 ? (
                <div className="w-full aspect-video bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]/40 border border-white/30 backdrop-blur-md relative">
                  <img src={selectedLugar.visita.fotos[0]} alt={selectedLugar.nome} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <h3 className="font-singsong text-2xl font-medium text-white leading-tight">{selectedLugar.nome}</h3>
                  </div>
                </div>
              ) : (
                <div className="p-6 pb-2">
                  <h3 className="text-2xl font-medium text-[#5c4b51] font-singsong font-black leading-tight">{selectedLugar.nome}</h3>
                </div>
              )}

              <div className="p-6 flex flex-col gap-6">
                
                <div className="flex items-center justify-between border-b border-white/30 pb-4">
                  <div className="flex items-center gap-2 text-[#ff7597] font-bold font-medium text-sm">
                    <IconWrapper name="calendar_today" className="text-[#5c4b51] font-black" />
                    {formatDate(selectedLugar.visita.data as string)}
                  </div>
                  <div className="flex items-center gap-2 text-[#ff7597] font-bold font-medium text-sm">
                    <IconWrapper name="location_on" className="text-[#5c4b51] font-black" />
                    {selectedLugar.categoria}
                  </div>
                </div>

                {selectedLugar.visita.comentario && (
                  <div>
                    <h4 className="text-xs font-medium text-[#ff7597] font-bold uppercase tracking-wider mb-2">Comentário</h4>
                    <p className="font-whimsical text-[#7a6a6d] text-[16px] leading-relaxed italic bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] p-4 rounded-[2rem] border border-white/30">
                      "{selectedLugar.visita.comentario}"
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-medium text-[#ff7597] font-bold uppercase tracking-wider mb-3">Avaliações</h4>
                  <div className="flex flex-col gap-3">
                    {Object.entries(selectedLugar.visita.avaliacoes).map(([pessoa, nota]) => (
                      <div key={pessoa} className="flex items-center justify-between bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] p-3 rounded-[2rem] border border-white/30">
                        <span className="font-medium text-[#ff7597] font-bold text-sm">{pessoa}</span>
                        <div className="flex gap-0.5 text-yellow-400">
                          {[1,2,3,4,5].map(n => (
                            <span key={n}><IconWrapper name="star" className="" /></span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="p-6 pt-0 mt-auto border-t border-white/30">
                <motion.button whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.9, borderRadius: "2rem" }} transition={slimeSpring} 
                  onClick={() => {
                    const l = selectedLugar;
                    setSelectedLugar(null);
                    onEdit(l);
                  }}
                  className="mt-4 w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] text-[#5c4b51] font-black p-4 rounded-[2rem] font-medium border border-white/30 shadow-xl shadow-pink-200/40 flex items-center justify-center gap-2 transition-transform"
                >
                  <IconWrapper name="edit" className="" />
                  Editar Memória
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
