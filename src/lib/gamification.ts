import { AppData, Conquista, Regiao } from '../types';

export function checkGamification(data: AppData): { newData: AppData, toasts: string[] } {
  const toasts: string[] = [];
  let updated = false;

  const newData: AppData = { 
    ...data, 
    conquistas: [...(data.conquistas || [])],
    regioes: [...(data.regioes || [])]
  };

  const lugares = data.lugares || [];
  const visitados = lugares.filter(l => l.status === 'visitado' || l.status === 'favorito');
  const visitadosSP = visitados.filter(l => l.estado?.toLowerCase().includes('paulo') || l.estado?.toLowerCase() === 'sp');
  const cidadesDiferentes = new Set(visitados.map(l => l.cidade).filter(c => c)).size;
  const estadosVisitados = new Set(visitados.map(l => l.estado).filter(e => e)).size;

  // 1. Checar Conquistas
  newData.conquistas = newData.conquistas.map(c => {
    if (c.conquistada) return c;
    
    let met = false;
    if (c.id === 'primeiro_passeio' && visitados.length >= 1) met = true;
    if (c.id === 'exploradores_sp' && visitadosSP.length >= 10) met = true;
    if (c.id === 'aventureiros' && cidadesDiferentes >= 5) met = true;
    if (c.id === 'primeira_viagem' && estadosVisitados >= 2) met = true;
    if (c.id === 'colecionadores' && lugares.length >= 50) met = true;

    if (met) {
      updated = true;
      toasts.push(`Conquista: ${c.nome}!`);
      return { ...c, conquistada: true, dataConquista: new Date().toISOString() };
    }
    return c;
  });

  // 2. Checar Regiões
  newData.regioes = newData.regioes.map(r => {
    if (r.desbloqueada) return r;
    
    let met = false;
    // Lógica de desbloqueio simples
    if (r.nome === 'Rio de Janeiro' && visitadosSP.length >= 10) met = true;
    if (r.nome === 'Minas Gerais' && estadosVisitados >= 2) met = true;
    if (r.nome === 'Bahia' && estadosVisitados >= 3) met = true;
    if (r.nome === 'Argentina' && estadosVisitados >= 4) met = true;
    if (r.nome === 'Chile' && estadosVisitados >= 5) met = true;

    if (met) {
      updated = true;
      toasts.push(`Novo lugar desbloqueado: ${r.nome}!`);
      return { ...r, desbloqueada: true };
    }
    return r;
  });

  return { newData: updated ? newData : data, toasts };
}
