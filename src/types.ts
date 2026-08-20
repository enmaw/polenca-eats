export interface Casal {
  nome: string;
  foto: string;
  dataEspecial?: string;
}

export interface Visita {
  data: string | null;
  avaliacoes: Record<string, number>;
  comentario: string;
  fotos: string[];
}

export interface Lugar {
  id: string;
  nome: string;
  categoria: string;
  endereco: string;
  cidade: string;
  estado: string;
  pais: string;
  lat: number;
  lng: number;
  avaliacao: number;
  preco: number;
  descricao: string;
  linkMapa: string;
  dataAdicionada: string;
  status: 'na_lista' | 'planejando' | 'visitado' | 'favorito';
  observacao: string;
  visita: Visita;
}

export interface Regiao {
  nome: string;
  tipo: 'estado' | 'pais';
  desbloqueada: boolean;
}

export interface Conquista {
  id: string;
  nome: string;
  descricao: string;
  conquistada: boolean;
  dataConquista: string | null;
}

export interface AppData {
  casal: Casal;
  lugares: Lugar[];
  regioes: Regiao[];
  conquistas: Conquista[];
  ownerId?: string;
  inviteCode?: string;
  sharedWith?: string[];
}
