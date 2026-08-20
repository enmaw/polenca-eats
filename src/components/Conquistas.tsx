import { motion } from 'motion/react';
import { IconWrapper } from "./IconWrapper";
import React, { useState } from 'react';
import { AppData } from '../types';
import { cn, slimeSpring } from '../lib/utils';
import { Trophy, Check, Compass, Lock } from 'lucide-react';

interface ConquistasProps {
  data: AppData;
}

export function Conquistas({ data }: ConquistasProps) {
  const [activeTab, setActiveTab] = useState<'conquistas' | 'regioes'>('conquistas');

  const conquistas = data.conquistas || [];
  const regioes = data.regioes || [];

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div className="flex flex-col gap-6 ">
      <header>
        <h1 className="font-singsong text-[28px] font-medium text-[#5c4b51] font-black leading-tight flex items-center gap-2">
          <Trophy className="w-7 h-7 inline-block text-[#facc15]" strokeWidth={2.5} />
          Troféus
        </h1>
        <p className="text-[#ff7597] font-bold mt-2 text-sm font-medium">
          Acompanhe o que já desbravamos.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] p-1 rounded-[2rem] border border-white/30">
        <button 
          onClick={() => setActiveTab('conquistas')}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-[2rem] transition-all",
           activeTab === 'conquistas' ? "bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  text-[#5c4b51] font-black shadow-xl shadow-pink-200/40" : "text-[#ff7597] font-bold"
          )}
        >
          Conquistas
        </button>
        <button 
          onClick={() => setActiveTab('regioes')}
          className={cn(
            "flex-1 py-2 text-sm font-medium rounded-[2rem] transition-all",
           activeTab === 'regioes' ? "bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  text-[#5c4b51] font-black shadow-xl shadow-pink-200/40" : "text-[#ff7597] font-bold"
          )}
        >
          Explorar Regiões
        </button>
      </div>

      {activeTab === 'conquistas' && (
        <div className="flex flex-col gap-3">
          {conquistas.map((c, idx) => (
            <motion.div 
              key={c.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, ...slimeSpring }}
              className={cn(
                "p-4 rounded-[2rem] border flex items-center gap-4 transition-all",
                c.conquistada 
                  ? "bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  border-white/30 shadow-xl shadow-pink-200/40" 
                  : "bg-transparent border-white/30 opacity-75 grayscale-[50%]"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                c.conquistada ? "bg-gray-200 text-[#5c4b51] font-black" : "bg-gray-200 text-[#ffb3c1]"
              )}>
<IconWrapper name="emoji_events" className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col flex-1">
                <h3 className={cn("font-medium text-base", c.conquistada ? "text-[#5c4b51] font-black" : "text-[#ff7597] font-bold")}>
                  {c.nome}
                </h3>
                <p className={cn("font-whimsical text-[16px] leading-snug mt-0.5", c.conquistada ? "text-[#ff7597] font-bold" : "text-[#ffb3c1]")}>
                  {c.descricao}
                </p>
                {c.conquistada && c.dataConquista && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-medium text-[#ff7597] font-bold uppercase tracking-wider">
                    <Check className="w-4 h-4 inline-block" strokeWidth={2.5} />
                    Desbloqueado em {formatDate(c.dataConquista)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'regioes' && (
        <div className="grid grid-cols-2 gap-3">
          {regioes.map((r, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05, ...slimeSpring }}
              className={cn(
                "p-4 rounded-[2rem] border flex flex-col items-center justify-center text-center gap-3 aspect-square transition-all",
                r.desbloqueada
                  ? "bg-gradient-to-b from-[#FFFFFF] to-white border-white/30 shadow-xl shadow-pink-200/40" 
                  : "bg-transparent border-white/30 opacity-60 grayscale"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                r.desbloqueada ? "bg-gray-200 text-[#5c4b51] font-black" : "bg-gray-200 text-[#ffb3c1]"
              )}>
                {r.desbloqueada ? <Compass className="w-5 h-5 inline-block" strokeWidth={2.5} /> : <Lock className="w-5 h-5 inline-block" strokeWidth={2.5} />}
              </div>
              <div className="flex flex-col">
                <span className={cn(
                  "font-medium text-base",
                  r.desbloqueada ? "text-[#5c4b51] font-black" : "text-[#ff7597] font-bold"
                )}>{r.nome}</span>
                <span className={cn(
                  "text-[10px] font-medium uppercase tracking-wider",
                  r.desbloqueada ? "text-[#ff7597] font-bold" : "text-[#ffb3c1]"
                )}>{r.tipo}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
