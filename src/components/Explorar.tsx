import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AppData, Lugar } from '../types';
import { cn, slimeSpring } from '../lib/utils';
import { haptics } from '../lib/haptics';
import { auth } from '../lib/firebase';
import { Compass, RefreshCw, Search, Circle, MapPin, Plus, AlertCircle, Navigation } from 'lucide-react';

interface ExplorarProps {
  data: AppData;
  onUpdate: (newData: AppData) => void;
  onVisit: (lugar: Lugar) => void;
}

const CATEGORIES = [
  { label: 'Restaurantes', tag: '["amenity"~"restaurant|fast_food"]', catLugar: 'Comida' },
  { label: 'Cafés', tag: '["amenity"="cafe"]', catLugar: 'Café' },
  { label: 'Parques', tag: '["leisure"="park"]', catLugar: 'Natureza' },
  { label: 'Museus', tag: '["tourism"="museum"]', catLugar: 'Cultura' },
  { label: 'Cinemas', tag: '["amenity"="cinema"]', catLugar: 'Entretenimento' },
  { label: 'Praças', tag: '["place"="square"]', catLugar: 'Natureza' },
  { label: 'Shoppings', tag: '["shop"="mall"]', catLugar: 'Compras' },
  { label: 'Pontos turísticos', tag: '["tourism"~"attraction|viewpoint"]', catLugar: 'Turismo' },
  { label: 'Lojas', tag: '["shop"]', catLugar: 'Compras' },
  { label: 'Atividades', tag: '["leisure"~"sports_centre|fitness_centre"]', catLugar: 'Diversão' },
];

const RADIUS_OPTIONS = [
  { label: '1 km', value: 1000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '20 km', value: 20000 },
  { label: 'Sem limite (50 km)', value: 50000 },
];

// Helper para calcular distância (Haversine)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Raio da terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distância em km
}

export function Explorar({ data, onUpdate, onVisit }: ExplorarProps) {
  const [userLoc, setUserLoc] = useState<{ lat: number, lng: number } | null>(null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [radius, setRadius] = useState(RADIUS_OPTIONS[1].value);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Estados de Adicionar à Lista
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Tenta pegar a localização ao abrir a aba
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setError("Permissão de localização negada. Usando São Paulo como padrão."),
        { enableHighAccuracy: true }
      );
    } else {
      setUserLoc({ lat: -23.5505, lng: -46.6333 });
    }
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    let searchCenter = userLoc;

    if (navigator.geolocation) {
      try {
        searchCenter = await new Promise<{lat: number, lng: number}>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
          );
        });
        setUserLoc(searchCenter);
      } catch (err: any) {
        let msg = "Não conseguimos pegar nossa localização exata agora.";
        if (err.code === 1) {
           msg = "Acesso à localização negado. Permita a localização no seu navegador.";
        } else if (err.code === 2) {
           msg = "Sinal de GPS/localização indisponível no momento.";
        } else if (err.code === 3) {
           msg = "O GPS demorou muito para responder.";
        }
        
        console.warn(`Erro de localização (código ${err.code}): ${err.message}`);
        searchCenter = userLoc || { lat: -23.5505, lng: -46.6333 };
        
        // Em vez de um erro vermelho grande, apenas avisa se não tivermos *nenhuma* localização anterior
        if (!userLoc) {
          setError(`${msg} Usando São Paulo como padrão.`);
        }
      }
    } else if (!searchCenter) {
      searchCenter = { lat: -23.5505, lng: -46.6333 };
    }

    const finalRadius = radius;
    // Limit the query radius to 15km to avoid Overpass server timeouts in dense areas (like São Paulo)
    const overpassRadius = Math.min(finalRadius, 50000);
    // Trim all extra whitespace from the query to reduce URL size and prevent parsing issues
    const query = `[out:json][timeout:50];(node${category.tag}(around:${overpassRadius},${searchCenter.lat},${searchCenter.lng});way${category.tag}(around:${overpassRadius},${searchCenter.lat},${searchCenter.lng}););out center;`;

    try {
      let token = "";
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }

      const response = await fetch('/api/overpass', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: query
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Servidor ocupado ou reiniciando (aguardando conexão).");
      }

      const json = await response.json();

      if (!json || !json.elements || json.elements.length === 0) {
        setError('Nenhum local encontrado. Tente aumentar a distância ou buscar outra categoria.');
        setResults([]);
        setLoading(false);
        return;
      }

      // Filtrar apenas elementos com nome e calcular distância
      let processedResults = json.elements
        .filter((el: any) => el.tags && el.tags.name)
        .map((el: any) => {
          const lat = el.lat || el.center?.lat;
          const lon = el.lon || el.center?.lon;
          const dist = getDistanceFromLatLonInKm(searchCenter.lat, searchCenter.lng, lat, lon);
          return { ...el, lat, lon, dist, categoryLabel: category.label };
        })
        .sort((a: any, b: any) => a.dist - b.dist)
        .slice(0, 50); // Limita a 50 resultados para não travar a UI

      setResults(processedResults);

    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('JSON') || msg.includes('Unexpected token') || msg.includes('<!doctype') || msg.includes('Servidor ocupado')) {
        setError('O servidor está inicializando. Por favor, aguarde alguns segundos e tente novamente.');
      } else if (msg.includes('timeout') || msg.includes('Failed to fetch') || msg.includes('HTTP 502') || msg.includes('HTTP 504')) {
        setError('A conexão com o mapa falhou ou excedeu o tempo limite. Buscas de 50km podem demorar. Verifique sua internet ou tente novamente.');
      } else {
        setError('Ocorreu um erro temporário ao buscar os locais. Tente novamente em breve.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddToList = async (poi: any, triggerVisit: boolean = false) => {
    setAddingIds(prev => new Set(prev).add(poi.id));

    let enderecoFinal = poi.tags['addr:street'] 
      ? `${poi.tags['addr:street']}, ${poi.tags['addr:housenumber'] || 'S/N'}`
      : '';
    let cidadeFinal = poi.tags['addr:city'] || '';

    // Geocodificação reversa usando Nominatim (Uso Justo)
    if (!enderecoFinal) {
      try {
        const nomResp = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${poi.lat}&lon=${poi.lon}`,
          { headers: { 'User-Agent': 'NossoRoleApp/1.0' } }
        );
        if (nomResp.ok) {
          const text = await nomResp.text();
          try {
            const nomData = JSON.parse(text);
            if (nomData && nomData.address) {
              enderecoFinal = nomData.address.road 
                ? `${nomData.address.road}, ${nomData.address.house_number || 'S/N'}` 
                : nomData.display_name.split(',')[0];
              cidadeFinal = nomData.address.city || nomData.address.town || nomData.address.village || '';
            }
          } catch (jsonErr) {
            console.warn('Nominatim não retornou um JSON válido:', text.substring(0, 50));
          }
        }
      } catch (e) {
        console.error('Erro no Nominatim', e);
      }
    }

    const newLugar: Lugar = {
      id: `osm_${poi.id}_${Date.now()}`,
      nome: poi.tags.name,
      categoria: category.catLugar,
      endereco: enderecoFinal,
      cidade: cidadeFinal,
      estado: '',
      pais: 'Brasil',
      lat: poi.lat,
      lng: poi.lon,
      avaliacao: 0,
      preco: 1,
      descricao: '',
      linkMapa: `https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lon}`,
      dataAdicionada: new Date().toISOString(),
      status: 'na_lista',
      observacao: '',
      visita: { data: null, avaliacoes: {}, comentario: '', fotos: [] }
    };

    onUpdate({ ...data, lugares: [newLugar, ...(data.lugares || [])] });
    
    setAddingIds(prev => {
      const next = new Set(prev);
      next.delete(poi.id);
      return next;
    });
    setAddedIds(prev => new Set(prev).add(poi.id));

    if (triggerVisit) {
      onVisit(newLugar);
    }
  };

  return (
    <div className="flex flex-col gap-5 ">
      <div className="pt-2 relative">
        <div className="absolute top-0 right-4 text-[#D1D5DB] ">
          <Compass className="w-12 h-12 text-[#ff9a9e] opacity-20" strokeWidth={1} />
        </div>
        <h2 className="text-2xl font-medium text-[#5c4b51] font-singsong font-black tracking-wide">EXPLORAR</h2>
        <p className="text-sm text-[#ff7597] font-bold">Descubra novos lugares perto de nós</p>
      </div>

      {/* Formulário de Busca */}
      <div className="bg-white/60 backdrop-blur-2xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] p-6 rounded-[2.5rem] flex flex-col gap-5 relative overflow-hidden">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#ff7597] font-bold ml-1">O que queremos fazer?</label>
          <select 
            value={category.label}
            onChange={(e) => setCategory(CATEGORIES.find(c => c.label === e.target.value) || CATEGORIES[0])}
            className="w-full bg-white/40 border-2 border-white text-[#5c4b51] rounded-[2rem] p-4 font-bold shadow-inner focus:outline-none focus:ring-4 focus:ring-[#ff7597]/20"
          >
            {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#ff7597] font-bold ml-1">Qual a distância máxima?</label>
          <select 
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full bg-white/40 border-2 border-white text-[#5c4b51] rounded-[2rem] p-4 font-bold shadow-inner focus:outline-none focus:ring-4 focus:ring-[#ff7597]/20"
          >
            {RADIUS_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <div className="mt-2">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} 
            onClick={() => handleSearch()}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#ff9a9e] to-[#fecfef] font-singsong uppercase tracking-widest text-lg text-[#5c4b51] font-black shadow-lg shadow-pink-300/50 border-2 border-white transition-all duration-300 p-4 rounded-[2rem] flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-70 disabled:cursor-wait"
          >
            {loading ? <RefreshCw className="w-5 h-5 inline-block animate-spin text-white" strokeWidth={2.5} /> : <Search className="w-5 h-5 inline-block text-white" strokeWidth={2.5} />}
            <span className="text-white">Buscar lugares próximos</span>
          </motion.button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-orange-50 text-orange-600 p-4 rounded-[2rem] text-sm flex gap-2 items-start border border-orange-100">
          <AlertCircle className="w-5 h-5 inline-block" strokeWidth={2.5} />
          <p>{error}</p>
        </div>
      )}

      {/* Resultados em Lista */}
      {results.length > 0 && (
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-singsong text-xl text-[#5c4b51] font-black uppercase tracking-wider">Resultados ({results.length})</h3>
          </div>
          
          {results.map((poi, idx) => (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={idx} className="bg-white/60 backdrop-blur-2xl border-2 border-white/60 shadow-[0_8px_32px_rgba(255,154,158,0.4)] rounded-[2.5rem] p-6 flex flex-col gap-4 relative">
              <div className="flex justify-between items-start gap-2">
                <div className="flex flex-col">
                  <h4 className="font-singsong text-[#5c4b51] font-black text-xl leading-tight uppercase tracking-wide">{poi.tags.name}</h4>
                  <span className="text-[#ff7597] font-bold text-xs mt-1 bg-white/60 border-2 border-white px-3 py-1 rounded-[2rem] w-fit shadow-inner">{poi.categoryLabel}</span>
                </div>
                <div className="bg-white border-2 border-white px-3 py-2 rounded-[2rem] text-xs font-bold text-[#ff7597] shadow-inner flex items-center gap-1 whitespace-nowrap">
                  <MapPin className="w-4 h-4 inline-block" strokeWidth={2.5} />
                  {poi.dist.toFixed(1)} km
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-1">
                <div className="flex gap-3">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} 
                    onClick={() => {
                      if (!addedIds.has(poi.id) && !addingIds.has(poi.id)) handleAddToList(poi);
                      haptics.success(); 
                    }}
                    disabled={addedIds.has(poi.id) || addingIds.has(poi.id)}
                    className={cn(
                      "flex-1 py-4 rounded-[2rem] text-sm font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-80 disabled:active:scale-[0.98] shadow-sm",
                      addedIds.has(poi.id) ? "bg-[#e8f5e9] text-[#2e7d32] border-2 border-[#a5d6a7]" :
                      addingIds.has(poi.id) ? "bg-white/40 border-2 border-white/60 text-[#5c4b51]" : "bg-white border-2 border-[#ff7597] text-[#ff7597] hover:bg-[#fff0f3]"
                    )}
                  >
                    <Plus className="w-5 h-5 inline-block" strokeWidth={2.5} /> 
                    {addedIds.has(poi.id) ? 'Adicionado ' : addingIds.has(poi.id) ? '...' : 'Adicionar'}
                  </motion.button>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lon}`}
                    target="_blank" rel="noreferrer"
                    className="flex-1 bg-gradient-to-r from-[#ff9a9e] to-[#fecfef] font-singsong uppercase tracking-widest text-[#5c4b51] font-black shadow-lg shadow-pink-300/50 border-2 border-white transition-all duration-300 py-4 rounded-[2rem] text-base flex items-center justify-center gap-1.5 hover:opacity-90"
                  >
                    <Navigation className="w-5 h-5 inline-block text-white" strokeWidth={2.5} /> <span className="text-white">Rota</span>
                  </a>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} 
                  onClick={() => {
                    if (!addedIds.has(poi.id) && !addingIds.has(poi.id)) handleAddToList(poi, true);
                    haptics.success(); 
                  }}
                  disabled={addedIds.has(poi.id) || addingIds.has(poi.id)}
                  className="w-full bg-white/80 border-2 border-white/60 shadow-inner text-[#ff7597] font-bold py-4 rounded-[2rem] hover:bg-white transition-colors disabled:opacity-50"
                >
                  {addingIds.has(poi.id) ? 'Carregando...' : 'Já fomos'}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}