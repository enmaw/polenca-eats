import { IconWrapper } from './IconWrapper';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppData, Lugar } from '../types';
import { cn, slimeSpring } from '../lib/utils';
import { haptics } from '../lib/haptics';

interface RoletaProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
  onVisit: (lugar: Lugar) => void;
}

const CATEGORIES = [
  'Comida', 'Café', 'Natureza', 'Cultura', 'Entretenimento', 
  'Compras', 'Turismo', 'Diversão', 'Fotografia', 'Encontro'
];

export function Roleta({ data, onUpdate, onVisit }: RoletaProps) {
  const [filterNotVisited, setFilterNotVisited] = useState(false);
  const [filterQueroConhecer, setFilterQueroConhecer] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('todas');

  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<Lugar | null>(null);
  const [spinText, setSpinText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const getEligiblePlaces = () => {
    let list = data.lugares || [];
    if (filterNotVisited) list = list.filter(l => l.status !== 'visitado');
    if (filterQueroConhecer) list = list.filter(l => l.status === 'na_lista');
    if (filterCategory !== 'todas') list = list.filter(l => l.categoria === filterCategory);
    return list;
  };

  const handleSpin = () => {
    const list = getEligiblePlaces();
    if (list.length === 0) {
      setErrorMsg('Poxa... Não achamos nenhum lugar com esses filtros! ');
      return;
    }
    setErrorMsg('');
    setResult(null);
    setIsSpinning(true);
    haptics.spin();

    let counter = 0;
    const duration = 3000;
    const intervalTime = 100;
    const maxSpins = duration / intervalTime;

    const interval = setInterval(() => {
      const randomPlace = list[Math.floor(Math.random() * list.length)];
      setSpinText(randomPlace.nome);
      counter++;

      if (counter >= maxSpins) {
        clearInterval(interval);
        const finalPlace = list[Math.floor(Math.random() * list.length)];
        setResult(finalPlace);
        setIsSpinning(false);
      }
    }, intervalTime);
  };

  const handleVamosNesse = () => {
    if (!result) return;
    const updatedLugares = (data.lugares || []).map(l => 
      l.id === result.id ? { ...l, status: 'planejando' as const } : l
    );
    onUpdate({ ...data, lugares: updatedLugares });
    setResult({ ...result, status: 'planejando' });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Comida': return <IconWrapper name="restaurant" className="" />;
      case 'Café': return <IconWrapper name="local_cafe" className="" />;
      case 'Natureza': return <IconWrapper name="park" className="" />;
      case 'Cultura': return <IconWrapper name="palette" className="" />;
      case 'Entretenimento': return <IconWrapper name="sports_esports" className="" />;
      case 'Compras': return <IconWrapper name="shopping_bag" className="" />;
      case 'Turismo': return <IconWrapper name="explore" className="" />;
      case 'Diversão': return <IconWrapper name="sports_esports" className="" />;
      case 'Fotografia': return <IconWrapper name="photo_camera" className="" />;
      case 'Encontro': return <IconWrapper name="favorite" className="" />;
      default: return <IconWrapper name="location_on" className="" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      <header className="pt-2 text-center">
        <div className="inline-flex items-center justify-center bg-white/30 backdrop-blur-md p-4 rounded-full border border-white/40 shadow-lg shadow-pink-200/30 mb-4 text-[#ff7597]">
          <IconWrapper name="casino" className="w-12 h-12" />
        </div>
        <h1 className="text-3xl font-singsong font-black text-[#5c4b51] leading-tight mb-2 drop-shadow-sm">
          Roleta
        </h1>
        <p className="text-[#ff7597] font-bold text-sm bg-white/20 backdrop-blur-md border border-white/40 shadow-sm inline-block px-4 py-1.5 rounded-full">
          Deixe o destino escolher por nós
        </p>
      </header>

      {!result && !isSpinning && (
        <div className="bg-white/20 backdrop-blur-md border border-white/40 shadow-xl shadow-pink-200/20 p-6 rounded-[2.5rem] flex flex-col gap-5">
          <div className="flex items-center gap-2 text-[#5c4b51] font-black pb-2 border-b border-white/30">
            <IconWrapper name="tune" className="icon-filled" />
            <h2 className="font-singsong text-lg">Filtros</h2>
          </div>
          
          <div className="flex flex-col gap-3">
            <motion.label whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.85 }} transition={slimeSpring} className="flex items-center gap-3 p-4 bg-white/20 backdrop-blur-md border border-white/40 rounded-full cursor-pointer hover:bg-white/40 transition-all duration-300 shadow-sm group">
              <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
                <input 
                  type="checkbox" 
                  checked={filterNotVisited} 
                  onChange={(e) => setFilterNotVisited(e.target.checked)}
                  className="peer appearance-none w-7 h-7 bg-white/40 border-2 border-white/60 rounded-full shadow-inner cursor-pointer checked:bg-[#ff7597] checked:border-[#ff7597] transition-all duration-300 outline-none"
                />
                <IconWrapper name="check" className="text-white text-[18px] absolute pointer-events-none opacity-0 peer-checked:opacity-100 peer-checked:scale-110 scale-50 transition-all duration-300" />
              </div>
              <span className="text-sm font-bold text-[#5c4b51] group-hover:text-[#ff7597] transition-colors">Apenas lugares novos (não visitados)</span>
            </motion.label>
            
            <motion.label whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.85 }} transition={slimeSpring} className="flex items-center gap-3 p-4 bg-white/20 backdrop-blur-md border border-white/40 rounded-full cursor-pointer hover:bg-white/40 transition-all duration-300 shadow-sm group">
              <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
                <input 
                  type="checkbox" 
                  checked={filterQueroConhecer} 
                  onChange={(e) => setFilterQueroConhecer(e.target.checked)}
                  className="peer appearance-none w-7 h-7 bg-white/40 border-2 border-white/60 rounded-full shadow-inner cursor-pointer checked:bg-[#ff7597] checked:border-[#ff7597] transition-all duration-300 outline-none"
                />
                <IconWrapper name="check" className="text-white text-[18px] absolute pointer-events-none opacity-0 peer-checked:opacity-100 peer-checked:scale-110 scale-50 transition-all duration-300" />
              </div>
              <span className="text-sm font-bold text-[#5c4b51] group-hover:text-[#ff7597] transition-colors">Da lista "Quero conhecer"</span>
            </motion.label>

            <div className="flex flex-col gap-1.5 mt-2">
              <label className="text-sm font-black text-[#ff7597] px-2 uppercase tracking-wider text-[10px]">Categoria</label>
              <div className="relative">
                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full bg-white/30 backdrop-blur-sm border border-white/50 text-[#5c4b51] font-bold rounded-3xl p-4 outline-none focus:ring-2 focus:ring-[#ff9a9e] appearance-none shadow-sm"
                >
                  <option value="todas">Todas as categorias</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5c4b51]">
                  <IconWrapper name="expand_more" className="" />
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-50/80 backdrop-blur-sm text-red-500 p-4 rounded-3xl text-sm font-bold border border-red-200 text-center animate-in zoom-in">
              {errorMsg}
            </div>
          )}

          <motion.button whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.9, borderRadius: "2rem" }} transition={slimeSpring} 
            onClick={handleSpin}
            className="w-full bg-gradient-to-r from-[#ff9a9e] to-[#fecfef] text-white font-black shadow-lg shadow-pink-300/40 border-2 border-white/80 p-5 rounded-3xl flex items-center justify-center gap-2 mt-4 transition-all duration-300 text-lg"
          >
            <IconWrapper name="casino" className="icon-filled animate-pulse" />
            GIRAR A ROLETA!
          </motion.button>
          <p className="text-center text-xs text-[#ff7597] font-bold">
            Sorteando entre {getEligiblePlaces().length} lugares possíveis
          </p>
        </div>
      )}

      {isSpinning && (
        <div className="bg-white/20 backdrop-blur-md border border-white/40 shadow-xl shadow-pink-200/30 h-[400px] rounded-[2.5rem] flex flex-col items-center justify-center p-6 animate-in zoom-in-95 duration-500">
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Outer spinning border */}
            <div className="absolute inset-0 rounded-full border-[8px] border-white/30 border-t-[#ff9a9e] border-l-[#fecfef] animate-spin" style={{ animationDuration: '1s' }} />
            {/* Inner spinning border */}
            <div className="absolute inset-4 rounded-full border-[6px] border-white/20 border-b-[#c2e9fb] animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
            {/* Center pulsing icon */}
            <div className="bg-white/50 backdrop-blur-sm w-24 h-24 rounded-full flex items-center justify-center shadow-inner border border-white/60">
               <IconWrapper name="star" className="text-[#ff7597] w-16 h-16 animate-bounce" />
            </div>
          </div>
          <h3 className="text-2xl font-singsong font-black text-[#5c4b51] mt-8 mb-3 animate-pulse">Sorteando...</h3>
          <div className="w-full bg-white/40 backdrop-blur-md p-4 rounded-full border border-white/50 text-center overflow-hidden shadow-inner">
            <span className="text-xl font-bold text-[#5c4b51] block">{spinText || '...'}</span>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
      {result && !isSpinning && (
        <motion.div 
          key="result"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={slimeSpring}
          className="flex flex-col gap-4"
        >
          <div className="bg-white/20 backdrop-blur-md border border-white/40 shadow-xl shadow-pink-200/30 rounded-[2.5rem] overflow-hidden">
            <div className="bg-gradient-to-br from-[#ff9a9e]/80 to-[#fecfef]/80 backdrop-blur-xl p-8 text-center relative border-b border-white/50">
              <div className="relative z-10 flex flex-col items-center">
                <span className="bg-white/40 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 border border-white/50 shadow-sm">
                  Tcharam!
                </span>
                <h2 className="text-3xl font-singsong font-black text-white mb-4 drop-shadow-md">{result.nome}</h2>
                <div className="flex items-center gap-2 text-[#5c4b51] bg-white/70 backdrop-blur-md px-4 py-2 rounded-3xl text-sm font-bold shadow-sm border border-white/50">
                  {getCategoryIcon(result.categoria)}
                  {result.categoria}
                </div>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {result.descricao && (
                <p className="font-whimsical text-[#5c4b51] text-[16px] text-center italic font-bold bg-white/30 p-4 rounded-full border border-white/50 shadow-inner">
                  "{result.descricao}"
                </p>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 bg-white/30 p-4 rounded-3xl border border-white/40 shadow-sm">
                  <IconWrapper name="location_on" className="text-[#ff7597] shrink-0 mt-0.5 icon-filled" />
                  <span className="text-sm font-bold text-[#5c4b51]">
                    {result.endereco || 'Endereço não informado'}
                    {result.cidade ? ` - ${result.cidade}` : ''}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-sm font-bold text-[#5c4b51]">
                  <div className="flex items-center gap-1.5 bg-white/40 border border-white/50 px-3 py-2 rounded-3xl text-yellow-600 flex-1 justify-center shadow-sm">
                    <IconWrapper name="star" className="icon-filled text-yellow-500" />
                    {result.avaliacao > 0 ? result.avaliacao.toFixed(1) : 'Sem nota'}
                  </div>
                  <div className="flex items-center gap-1 bg-white/40 border border-white/50 px-3 py-2 rounded-3xl text-green-600 tracking-widest flex-1 justify-center shadow-sm">
                    {'R$'.repeat(result.preco)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-2">
                <motion.button whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.9, borderRadius: "2rem" }} transition={slimeSpring} 
                  onClick={handleVamosNesse}
                  disabled={result.status === 'planejando' || result.status === 'visitado' || result.status === 'favorito'}
                  className={cn(
                    "w-full p-4 rounded-3xl font-black flex items-center justify-center gap-2 transition-all duration-300",
                    result.status === 'planejando' || result.status === 'visitado' || result.status === 'favorito'
                      ? "bg-white/30 border border-white/40 text-[#ffb3c1] cursor-not-allowed" 
                      : "bg-gradient-to-r from-[#ff9a9e] to-[#fecfef] text-white shadow-lg shadow-pink-300/40 border-2 border-white/80 active:scale-95"
                  )}
                >
                  {result.status === 'planejando' ? 'Já estamos planejando!' : (result.status === 'visitado' || result.status === 'favorito') ? 'Já visitamos!' : 'Vamos nesse!'}
                </motion.button>

                {result.status !== 'visitado' && result.status !== 'favorito' && (
                  <motion.button whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.9, borderRadius: "2rem" }} transition={slimeSpring} 
                    onClick={() => onVisit(result)}
                    className="w-full bg-white/40 backdrop-blur-md border border-white/60 text-[#5c4b51] p-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-white/60 transition-colors shadow-sm"
                  >
                    <IconWrapper name="check_circle" className="icon-filled" />
                    Já fomos! Registrar memória 
                  </motion.button>
                )}
                
                <motion.button whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.9, borderRadius: "2rem" }} transition={slimeSpring} 
                  onClick={handleSpin}
                  className="w-full bg-white/20 backdrop-blur-md text-[#5c4b51] border border-white/50 p-4 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-white/40 transition-all shadow-sm mt-2"
                >
                  <IconWrapper name="refresh" className="icon-filled" />
                  Girar novamente
                </motion.button>

                <motion.button whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.9, borderRadius: "2rem" }} transition={slimeSpring} 
                  onClick={() => setResult(null)}
                  className="w-full text-[#ff7597] font-bold p-3 text-sm mt-1 hover:text-[#5c4b51] transition-colors"
                >
                  Voltar aos filtros
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}