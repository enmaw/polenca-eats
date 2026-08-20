import { motion } from 'motion/react';
import { slimeSpring } from '../lib/utils';
import { IconWrapper } from './IconWrapper';
import React, { useState, useRef } from 'react';
import { Casal, Lugar, Visita } from '../types';

interface VisitaModalProps {
  casal: Casal;
  lugar: Lugar;
  onClose: () => void;
  onSave: (visita: Visita, isFavorito: boolean) => void;
}

export function VisitaModal({ casal, lugar, onClose, onSave }: VisitaModalProps) {
  const isEditing = !!(lugar.visita && lugar.visita.data);
  const [dataVisita, setDataVisita] = useState(isEditing && lugar.visita.data ? lugar.visita.data : new Date().toISOString().split('T')[0]);
  const [comentario, setComentario] = useState(isEditing ? lugar.visita.comentario : '');
  const [fotoUrl, setFotoUrl] = useState(isEditing && lugar.visita.fotos.length > 0 ? lugar.visita.fotos[0] : '');
  const [isFavorito, setIsFavorito] = useState(lugar.status === 'favorito');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Try to extract two names if user typed "A e B" in name
  const names = casal.nome.split(/ e | & | \+ /i);
  const name1 = names[0]?.trim() || 'Eu';
  const name2 = names[1]?.trim() || 'Meu Amor';

  // Fix: when editing, map ratings to the correct parsed names
  const [nota1, setNota1] = useState(isEditing ? (lugar.visita.avaliacoes[name1] || 0) : 0);
  const [nota2, setNota2] = useState(isEditing ? (lugar.visita.avaliacoes[name2] || 0) : 0);

  const handleSave = () => {
    onSave({
      data: dataVisita,
      avaliacoes: {
        [name1]: nota1,
        [name2]: nota2
      },
      comentario,
      fotos: fotoUrl ? [fotoUrl] : []
    }, isFavorito);
  };

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
        setFotoUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const StarRating = ({ nota, onChange }: { nota: number, onChange: (n: number) => void }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`p-1 ${n <= nota ? 'text-yellow-400' : 'text-gray-300'} transition-colors`}
          >
            <IconWrapper name="star" className={n <= nota ? "icon-filled" : ""} />
          </button>
        ))}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-white/10 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={slimeSpring}
        className="bg-white/60 backdrop-blur-2xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] rounded-[2.5rem] w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl"
      >
        <header className="sticky top-0 bg-white/60 backdrop-blur-2xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] z-10 px-6 py-4 border-b border-white/30 flex items-center justify-between">
          <h2 className="font-singsong text-xl font-medium text-[#5c4b51] font-black uppercase tracking-wider">
            {isEditing ? 'Editar Memória' : 'Registrar Visita'}
          </h2>
          <motion.button whileHover={{ scale: 1.15, rotate: -5 }} whileTap={{ scale: 0.6, borderRadius: "50%" }} transition={slimeSpring} onClick={onClose} className="p-2 text-[#ff7597] font-bold hover:text-[#ff7597] font-bold bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] rounded-full active:scale-95 transition-transform">
            <IconWrapper name="close" className="" />
          </motion.button>
        </header>

        <div className="p-6 flex flex-col gap-6">
          <div className="text-center mb-2">
            <h3 className="font-singsong text-lg font-medium text-[#5c4b51] font-black leading-tight">{lugar.nome}</h3>
            <p className="text-[#ff7597] font-bold text-sm">{lugar.categoria}</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#ff7597] font-bold">Quando foi o nosso encontro?</label>
            <input 
              type="date" 
              value={dataVisita}
              onChange={(e) => setDataVisita(e.target.value)}
              className="w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 text-[#ff7597] font-bold rounded-[2rem] p-3 outline-none focus:ring-2 focus:ring-[#111827]/20 focus:border-[#ff9a9e]"
            />
          </div>

          <div className="flex flex-col gap-4 bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 p-4 rounded-[2rem]">
            <label className="text-sm font-medium text-[#ff7597] font-bold block">Avaliações</label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#ff7597] font-bold font-medium">{name1}</span>
              <StarRating nota={nota1} onChange={setNota1} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#ff7597] font-bold font-medium">{name2}</span>
              <StarRating nota={nota2} onChange={setNota2} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#ff7597] font-bold">Nosso momento / Comentário</label>
            <textarea 
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="O que marcou esse nosso momento? O que pediram? Foi divertido?"
              rows={3}
              className="font-whimsical text-[16px] w-full bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 text-[#ff7597] font-bold rounded-[2rem] p-3 outline-none focus:ring-2 focus:ring-[#111827]/20 focus:border-[#ff9a9e] resize-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#ff7597] font-bold">Foto marcante</label>
            
            <input 
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            {!fotoUrl ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 bg-white/40 backdrop-blur-xl border-2 border-dashed border-[#ff9a9e] text-[#ff7597] font-bold rounded-[2rem] py-8 outline-none hover:bg-white/60 transition-colors"
              >
                <IconWrapper name="add_a_photo" className="text-3xl" />
                <span>Adicionar foto da galeria</span>
              </button>
            ) : (
              <div className="relative mt-2 aspect-video w-full rounded-[2rem] overflow-hidden bg-white/40 backdrop-blur-xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] border border-white/30 group">
                <img src={fotoUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                <button
                  onClick={() => setFotoUrl('')}
                  className="absolute top-2 right-2 bg-white/80 p-2 rounded-full text-[#ff7597] hover:bg-white transition-colors opacity-80 hover:opacity-100"
                >
                  <IconWrapper name="delete" className="text-lg" />
                </button>
              </div>
            )}
          </div>
          
          <motion.button 
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsFavorito(!isFavorito)}
            className={`flex items-center justify-center gap-3 w-full p-4 rounded-[2rem] font-bold text-lg shadow-sm border-2 transition-colors ${
              isFavorito 
                ? 'bg-[#ff7597] border-[#ff7597] text-white' 
                : 'bg-white/40 backdrop-blur-xl border-white/60 text-[#ff7597]'
            }`}
          >
            <IconWrapper name="favorite" className={`text-2xl transition-all ${isFavorito ? 'icon-filled text-white scale-110' : 'text-[#ff7597]'}`} />
            {isFavorito ? 'É o nosso favorito!' : 'Marcar como favorito'}
          </motion.button>

        </div>
        <div className="p-6 pt-0 mt-auto">
          <button 
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-[#ff9a9e] to-[#fecfef] font-singsong uppercase tracking-widest text-xl text-[#5c4b51] shadow-lg shadow-pink-300/50 border border-white hover:scale-105 transition-transform duration-300 text-white p-4 rounded-[2rem] font-medium shadow-md shadow-xl shadow-pink-200/40/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            Salvar Memória
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
