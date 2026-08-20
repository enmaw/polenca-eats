import { AppData, Regiao, Conquista } from '../types';
import { db, auth } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const DEFAULT_REGIOES: Regiao[] = [
  { nome: "São Paulo", tipo: "estado", desbloqueada: true },
  { nome: "Rio de Janeiro", tipo: "estado", desbloqueada: false },
  { nome: "Minas Gerais", tipo: "estado", desbloqueada: false },
  { nome: "Bahia", tipo: "estado", desbloqueada: false },
  { nome: "Argentina", tipo: "pais", desbloqueada: false },
  { nome: "Chile", tipo: "pais", desbloqueada: false },
];

const DEFAULT_CONQUISTAS: Conquista[] = [
  { id: "primeiro_passeio", nome: "Primeiro Passeio", descricao: "Nós visitamos o primeiro lugar.", conquistada: false, dataConquista: null },
  { id: "exploradores_sp", nome: "Exploradores de SP", descricao: "Nós conhecemos 10 lugares em São Paulo.", conquistada: false, dataConquista: null },
  { id: "aventureiros", nome: "Aventureiros", descricao: "Nós conhecemos 5 cidades.", conquistada: false, dataConquista: null },
  { id: "primeira_viagem", nome: "Primeira Viagem", descricao: "Nós conhecemos 2 estados diferentes.", conquistada: false, dataConquista: null },
  { id: "colecionadores", nome: "Colecionadores", descricao: "Nós registramos 50 lugares na lista.", conquistada: false, dataConquista: null }
];

export const defaultData: AppData = {
  casal: { nome: "Nós", foto: "" },
  lugares: [],
  regioes: DEFAULT_REGIOES,
  conquistas: DEFAULT_CONQUISTAS
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Retro-compatibility helpers for memory
const STORAGE_KEY = 'nosso_role_data';

export const getLocalData = (): AppData | null => {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return null;
    
    const parsedData = JSON.parse(item);
    if (!parsedData.regioes) parsedData.regioes = DEFAULT_REGIOES;
    if (!parsedData.conquistas) parsedData.conquistas = DEFAULT_CONQUISTAS;
    return parsedData;
  } catch (error) {
    return null;
  }
};
