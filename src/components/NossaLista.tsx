import { motion, AnimatePresence } from 'motion/react';
import { IconWrapper } from './IconWrapper';
import React, { useState, useMemo } from 'react';
import { AppData, Lugar } from '../types';
import { cn, slimeSpring } from '../lib/utils';
import { haptics } from '../lib/haptics';

interface NossaListaProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
  onVisit: (lugar: Lugar) => void;
}

const CATEGORIES = [
  'Comida', 'Café', 'Natureza', 'Cultura', 'Entretenimento', 
  'Compras', 'Turismo', 'Diversão', 'Fotografia', 'Encontro'
];

const STATUS_OPTIONS = [
  { value: 'na_lista', label: 'Quero conhecer', color: 'bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] -100 text-blue-700' },
  { value: 'planejando', label: 'Planejando', color: 'bg-orange-100 text-orange-700' },
  { value: 'visitado', label: 'Visitado', color: 'bg-green-100 text-green-700' },
  { value: 'favorito', label: 'Favorito', color: 'bg-pink-100 text-pink-700' },
];
const FORM_STATUS_OPTIONS = STATUS_OPTIONS.filter(opt => opt.value !== 'favorito');

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

const emptyForm: Partial<Lugar> = {
  nome: '', categoria: 'Comida', endereco: '', cidade: '', estado: '', pais: 'Brasil',
  avaliacao: 0, preco: 1, descricao: '', linkMapa: '', observacao: '', status: 'na_lista'
};


export function NossaLista({ data, onUpdate, onVisit }: NossaListaProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Lugar>>(emptyForm);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [sortBy, setSortBy] = useState<'data' | 'nome' | 'avaliacao'>('data');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredLugares = useMemo(() => {
    let result = [...(data.lugares || [])];

    if (searchTerm) {
      result = result.filter(l => (l.nome || '').toLowerCase().includes((searchTerm || '').toLowerCase()));
    }
    if (statusFilter !== 'todos') {
      if (statusFilter === 'visitado') {
        result = result.filter(l => l.status === 'visitado' || l.status === 'favorito');
      } else {
        result = result.filter(l => l.status === statusFilter);
      }
    }
    if (categoryFilter !== 'todas') {
      result = result.filter(l => l.categoria === categoryFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'nome') return a.nome.localeCompare(b.nome);
      if (sortBy === 'avaliacao') return b.avaliacao - a.avaliacao;
      // Default: data (newest first)
      return new Date(b.dataAdicionada).getTime() - new Date(a.dataAdicionada).getTime();
    });

    return result;
  }, [data.lugares, searchTerm, statusFilter, categoryFilter, sortBy]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = !!formData.id;
    
    const newLugar: Lugar = {
      ...(formData as Lugar),
      id: formData.id || Date.now().toString(),
      dataAdicionada: formData.dataAdicionada || new Date().toISOString(),
      lat: formData.lat || 0,
      lng: formData.lng || 0,
      visita: formData.visita || { data: null, avaliacoes: {}, comentario: '', fotos: [] }
    };

    let newLugares;
    if (isEditing) {
      newLugares = (data.lugares || []).map(l => l.id === newLugar.id ? newLugar : l);
    } else {
      newLugares = [newLugar, ...(data.lugares || [])];
    }

    onUpdate({ ...data, lugares: newLugares });
    setShowForm(false);
    setFormData(emptyForm);
  };

  const handleDelete = (id: string) => {
    const newLugares = (data.lugares || []).filter(l => l.id !== id);
    onUpdate({ ...data, lugares: newLugares });
  };

  const handleEdit = (lugar: Lugar) => {
    setFormData(lugar);
    setShowForm(true);
  };

  const updateStatus = (id: string, newStatus: Lugar['status']) => {
    const newLugares = (data.lugares || []).map(l => l.id === id ? { ...l, status: newStatus } : l);
    onUpdate({ ...data, lugares: newLugares });
  };

  
  return (
    <AnimatePresence mode="wait">
      {showForm ? (
        <motion.div 
          key="form"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={slimeSpring}
          className="flex flex-col gap-5 "
        >
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.9, borderRadius: "2rem" }} transition={slimeSpring} onClick={() => setShowForm(false)} className="p-2 bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  rounded-full text-[#5c4b51] font-black shadow-xl shadow-pink-200/40">
              <IconWrapper name="chevron_left" className="" />
            </motion.button>
            <h2 className="font-singsong text-xl font-medium text-[#5c4b51] font-black">
              {formData.id ? 'Editar Lugar' : 'Adicionar Lugar'}
            </h2>
          </div>

          <form onSubmit={handleSave} className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  p-5 rounded-[2rem] shadow-xl shadow-pink-200/40 border border-white/30 flex flex-col gap-4">
            
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#ff7597] font-bold ml-1">Nome do lugar *</label>
              <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 rounded-[2rem] p-3 text-[#5c4b51] font-black focus:ring-2 focus:ring-[#111827]/30 outline-none" placeholder="Ex: Parque Ibirapuera" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[#ff7597] font-bold ml-1">Categoria *</label>
                <select required value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 rounded-[2rem] p-3 text-[#5c4b51] font-black focus:ring-2 focus:ring-[#111827]/30 outline-none">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[#ff7597] font-bold ml-1">Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 rounded-[2rem] p-3 text-[#5c4b51] font-black focus:ring-2 focus:ring-[#111827]/30 outline-none">
                  {FORM_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  {formData.status === 'favorito' && <option value="favorito">Favorito</option>}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#ff7597] font-bold ml-1">Endereço</label>
              <div className="relative">
                <IconWrapper name="map" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ff7597]/60 w-5 h-5" />
                <input type="text" value={formData.endereco} onChange={e => setFormData({...formData, endereco: e.target.value})} className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 rounded-[2rem] py-3 pl-10 pr-3 text-[#5c4b51] font-black outline-none" placeholder="Rua, Número" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[#ff7597] font-bold ml-1">Cidade</label>
                <div className="relative">
                  <IconWrapper name="location_on" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ff7597]/60 w-5 h-5" />
                  <input type="text" value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 rounded-[2rem] py-3 pl-10 pr-3 text-[#5c4b51] font-black outline-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[#ff7597] font-bold ml-1">Estado</label>
                <div className="relative">
                  <IconWrapper name="map" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ff7597]/60 w-5 h-5" />
                  <input type="text" value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 rounded-[2rem] py-3 pl-10 pr-3 text-[#5c4b51] font-black outline-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[#ff7597] font-bold ml-1">Avaliação (0-5)</label>
                <input type="number" min="0" max="5" step="0.5" value={formData.avaliacao} onChange={e => setFormData({...formData, avaliacao: Number(e.target.value)})} className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 rounded-[2rem] p-3 text-[#5c4b51] font-black outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[#ff7597] font-bold ml-1">Preço ($)</label>
                <select value={formData.preco} onChange={e => setFormData({...formData, preco: Number(e.target.value)})} className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 rounded-[2rem] p-3 text-[#5c4b51] font-black outline-none">
                  <option value={1}>$ (Barato)</option>
                  <option value={2}>$$ (Moderado)</option>
                  <option value={3}>$$$ (Caro)</option>
                  <option value={4}>$$$$ (Luxo)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#ff7597] font-bold ml-1">Link do Mapa</label>
              <input type="url" value={formData.linkMapa} onChange={e => setFormData({...formData, linkMapa: e.target.value})} className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 rounded-[2rem] p-3 text-[#5c4b51] font-black outline-none" placeholder="https://maps.google.com/..." />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#ff7597] font-bold ml-1">Descrição / Observações</label>
              <textarea value={formData.observacao} onChange={e => setFormData({...formData, observacao: e.target.value})} className="font-whimsical text-[16px] w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 rounded-[2rem] p-3 text-[#5c4b51] font-black outline-none min-h-[100px] resize-none" placeholder="Por que queremos ir lá?..." />
            </div>

            <motion.button whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.9, borderRadius: "2rem" }} transition={slimeSpring} type="submit" className="w-full bg-gradient-to-r from-[#ff9a9e] to-[#fecfef] text-white font-black shadow-lg shadow-pink-300/50 border border-white transition-all duration-300 text-white font-medium p-4 rounded-[2rem] mt-2 shadow-xl shadow-pink-200/40 border border-[#ff9a9e] transition-all">
              Salvar Lugar
            </motion.button>
          </form>
        </motion.div>
      ) : (
        <motion.div 
          key="list"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={slimeSpring}
          className="flex flex-col gap-5 "
        >
          
          {/* Header */}
          <div className="flex justify-between items-center pt-2 ">
        <h2 className="text-3xl font-medium text-[#5c4b51] font-singsong font-black ">Nossa Lista </h2>
        <motion.button whileHover={{ scale: 1.05, rotate: -2 }} whileTap={{ scale: 0.9, borderRadius: "2rem" }} transition={slimeSpring} 
          onClick={() => { setFormData(emptyForm); setShowForm(true); }}
          className="bg-gradient-to-r from-[#ff9a9e] to-[#fecfef] text-white font-black shadow-lg shadow-pink-300/50 border border-white transition-all duration-300 text-white p-3 rounded-full shadow-xl shadow-pink-200/40 border border-[#ff9a9e] transition-all"
        >
          <IconWrapper name="add" className="" />
        </motion.button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <IconWrapper name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ff7597] font-bold" />
          <input 
            type="text" 
            placeholder="Buscar lugares..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  border border-white/30 rounded-[2rem] py-3 pl-10 pr-4 text-sm text-[#5c4b51] font-black focus:ring-2 focus:ring-[#111827]/30 outline-none shadow-xl shadow-pink-200/40"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  border border-white/30 text-[#ff7597] font-bold text-sm rounded-[2rem] px-3 py-2 outline-none shadow-xl shadow-pink-200/40 whitespace-nowrap min-w-max"
          >
            <option value="todos">Todos Status</option>
            {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  border border-white/30 text-[#ff7597] font-bold text-sm rounded-[2rem] px-3 py-2 outline-none shadow-xl shadow-pink-200/40 whitespace-nowrap min-w-max"
          >
            <option value="todas">Todas Categorias</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)]  border border-white/30 text-[#ff7597] font-bold text-sm rounded-[2rem] px-3 py-2 outline-none shadow-xl shadow-pink-200/40 whitespace-nowrap min-w-max"
          >
            <option value="data">Mais recentes</option>
            <option value="nome">Nome (A-Z)</option>
            <option value="avaliacao">Maior Avaliação</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-4">
        {filteredLugares.length === 0 ? (
          <div className="text-center py-10 text-[#ff7597] font-bold">
            Nenhum lugar encontrado.
          </div>
        ) : (
          filteredLugares.map((lugar) => {
            const statusConfig = STATUS_OPTIONS.find(s => s.value === lugar.status) || STATUS_OPTIONS[0];
            return (
              <motion.div 
                layout 
                initial={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }} 
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} 
                exit={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }} 
                transition={slimeSpring}
                key={lugar.id} 
                className="bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.25)] rounded-[2rem] p-5 flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Top Row: Info */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-4 items-center">
                    {/* Category Icon */}
                    <div className="w-14 h-14 shrink-0 rounded-[1.2rem] bg-gradient-to-br from-white/90 to-white/40 backdrop-blur-xl shadow-inner border border-white/80 flex items-center justify-center text-[#ff7597] shadow-sm">
                      {getCategoryIcon(lugar.categoria)}
                    </div>
                    
                    {/* Title and Sub */}
                    <div className="flex flex-col">
                      <h3 className="font-singsong font-black text-[#5c4b51] text-[20px] leading-none mb-1">{lugar.nome}</h3>
                      <span className="text-[#ff7597] font-bold text-[12px] opacity-90 leading-none">
                        {lugar.categoria} {lugar.cidade && `• ${lugar.cidade}`}
                      </span>
                    </div>
                  </div>
                  
                  
                </div>

                {/* Middle Row: Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Dropdown */}
                  <div className="relative">
                    <select 
                      value={lugar.status}
                      onChange={(e) => updateStatus(lugar.id, e.target.value as any)}
                      className={cn(
                        "appearance-none text-[12px] font-black py-1.5 pl-3 pr-7 rounded-xl outline-none shadow-sm transition-colors cursor-pointer border border-white/50",
                        statusConfig.color
                      )}
                    >
                      {FORM_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      {lugar.status === 'favorito' && <option value="favorito">Favorito</option>}
                    </select>
                    <IconWrapper name="expand_more" className={cn("absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4", statusConfig.color.includes('text-blue') ? 'text-blue-700' : statusConfig.color.includes('text-orange') ? 'text-orange-700' : statusConfig.color.includes('text-green') ? 'text-green-700' : 'text-pink-700')} />
                  </div>

                  {/* Rating */}
                  {lugar.avaliacao > 0 && (
                    <div className="flex items-center gap-1 text-[#f59e0b] bg-white/70 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/50 shadow-sm font-black text-[12px]">
                      <IconWrapper name="star" className="fill-[#f59e0b] w-4 h-4 -mt-0.5" />
                      {lugar.avaliacao}
                    </div>
                  )}

                  {/* Price */}
                  {lugar.preco > 0 && (
                    <div className="text-[#ff7597] font-black bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/50 shadow-sm tracking-widest flex items-center h-[28px] text-[13px]">
                      <span className="font-singsongDigits mt-0.5">{'$'.repeat(lugar.preco)}</span>
                    </div>
                  )}
                </div>

                {/* Observation */}
                {lugar.observacao && (
                  <div className="bg-white/40 rounded-xl p-3 border border-white/50 shadow-inner">
                    <p className="text-[13.5px] text-[#7a6a6d] font-bold leading-snug">
                      {lugar.observacao}
                    </p>
                  </div>
                )}

                {/* Bottom Row: Actions */}
                <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/30">
                  {/* Mark as visited button */}
                  <div>
                    {lugar.status !== 'visitado' && lugar.status !== 'favorito' ? (
                      <motion.button 
                        whileHover={{ scale: 1.08, rotate: -2 }} 
                        whileTap={{ scale: 0.85, borderRadius: "2rem" }}
                        transition={slimeSpring}
                        onClick={() => onVisit(lugar)}
                        className="bg-gradient-to-r from-[#ff7597] to-[#ff5e84] shadow-md shadow-pink-300 text-white font-black text-[12px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
                      >
                        JÁ FOMOS!
                      </motion.button>
                    ) : (
                      <div className={cn("font-black text-[11px] uppercase tracking-widest px-1 py-1 flex items-center gap-1", lugar.status === 'favorito' ? "text-[#facc15]/80" : "text-green-600/70")}>
                        <IconWrapper name={lugar.status === 'favorito' ? "star" : "check_circle"} className="w-4 h-4" />
                        {lugar.status === 'favorito' ? 'Favorito' : 'Visitado'}
                      </div>
                    )}
                  </div>

                  {/* Edit & Delete */}
                  <div className="flex gap-2">
                    <motion.button 
                      whileHover={{ scale: 1.15, rotate: -10 }} 
                      whileTap={{ scale: 0.7 }} 
                      transition={slimeSpring}
                      onClick={() => handleEdit(lugar)} 
                      className="p-2 text-[#ff7597] bg-white/70 backdrop-blur-md rounded-xl border border-white/50 shadow-sm"
                    >
                      <IconWrapper name="edit" className="w-5 h-5" />
                    </motion.button>

                    <motion.button 
                      layout
                      whileHover={{ scale: 1.15, rotate: deleteConfirmId === lugar.id ? 0 : 10 }} 
                      whileTap={{ scale: 0.7 }} 
                      transition={slimeSpring}
                      onClick={() => {
                        if (deleteConfirmId === lugar.id) {
                          handleDelete(lugar.id);
                          setDeleteConfirmId(null);
                        } else {
                          setDeleteConfirmId(lugar.id);
                          setTimeout(() => setDeleteConfirmId(null), 3000);
                        }
                      }} 
                      className={cn(
                        "p-2 rounded-xl transition-all shadow-sm border flex items-center gap-1 overflow-hidden",
                        deleteConfirmId === lugar.id 
                          ? "bg-red-500 text-white border-red-600" 
                          : "text-red-400 bg-white/70 backdrop-blur-md border-white/50 hover:bg-red-50"
                      )}
                    >
                      <IconWrapper name="delete" className="w-5 h-5 shrink-0" />
                      {deleteConfirmId === lugar.id && (
                        <motion.span 
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: "auto", opacity: 1 }}
                          className="font-black text-[13px] whitespace-nowrap pr-1"
                        >
                          Certeza?
                        </motion.span>
                      )}
                    </motion.button>
                  </div>
                </div>

              </motion.div>
            );
          })
        )}
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}