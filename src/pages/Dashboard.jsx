import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { FaPaw, FaSeedling, FaBell, FaDrumstickBite } from 'react-icons/fa';

// Dashboard overview replicating provided mockup (cards, health stats, alerts)
export default function Dashboard() {
  const [animals, setAnimals] = useState([]);
  const [plants, setPlants] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [farmId, setFarmId] = useState(null);
  const [farmLoading, setFarmLoading] = useState(true);

  const farmApiBase = 'http://localhost:8080/api/farms';

  // Helper to decode JWT and extract possible user identifier
  const extractUserIdFromToken = (token) => {
    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) return null;
      const json = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
      return (
        json.id ||
        json.userId ||
        json.sub ||
        json.uid ||
        null
      );
    } catch (e) {
      return null;
    }
  };

  const resolveFarm = async () => {
    const token = localStorage.getItem('token');
    if(!token){ setError('Not authenticated'); setFarmLoading(false); return; }
    let userId = null;
    try {
      const userRes = await axios.get('http://localhost:8080/auth/user', { headers: { Authorization: `Bearer ${token}` }});
      userId = userRes.data.id || userRes.data.userId || userRes.data._id || userRes.data.sub || null;
      if(!userId) {
        // fallback: decode JWT
        userId = extractUserIdFromToken(token);
      }
      if(!userId){ setError('Cannot resolve user id'); setFarmLoading(false); return; }
      try {
        const farmRes = await axios.get(`${farmApiBase}/user/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${token}` }});
        if(farmRes.data && (farmRes.data.id || farmRes.data._id)) {
          setFarmId(farmRes.data.id || farmRes.data._id);
        } else if(farmRes.data && farmRes.data.farmId) {
          setFarmId(farmRes.data.farmId);
        } else {
          setError('No farm found for user');
        }
      } catch(fErr){
        if(fErr.response?.status === 404) setError('No farm yet. Create one.'); else setError('Failed to load farm');
      }
    } catch(uErr){
      // fallback: decode JWT
      userId = extractUserIdFromToken(token);
      if(!userId){ setError('Failed to load user'); setFarmLoading(false); return; }
      try {
        const farmRes = await axios.get(`${farmApiBase}/user/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${token}` }});
        if(farmRes.data && (farmRes.data.id || farmRes.data._id)) {
          setFarmId(farmRes.data.id || farmRes.data._id);
        } else if(farmRes.data && farmRes.data.farmId) {
          setFarmId(farmRes.data.farmId);
        } else {
          setError('No farm found for user');
        }
      } catch(fErr){
        if(fErr.response?.status === 404) setError('No farm yet. Create one.'); else setError('Failed to load farm');
      }
    }
    finally { setFarmLoading(false); }
  };

  const loadData = async (activeFarmId) => {
    if(!activeFarmId){ setLoading(false); return; }
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('token');
      const [aRes, pRes] = await Promise.all([
        axios.get(`${farmApiBase}/${activeFarmId}/animals`, { headers: { Authorization: `Bearer ${token}` }}).catch(()=>({data:[]})),
        axios.get(`${farmApiBase}/${activeFarmId}/plants`, { headers: { Authorization: `Bearer ${token}` }}).catch(()=>({data:[]}))
      ]);
      setAnimals(aRes.data||[]);
      setPlants(pRes.data||[]);
    } catch(e){ setError('Load failed'); }
    finally { setLoading(false); }

    // Alerts fetch (optional) – adjust if you add farm-scoped alerts endpoints
    try {
      const token = localStorage.getItem('token');
      const [animalAlertsRes, plantAlertsRes] = await Promise.all([
        axios.get('http://localhost:8080/api/animals/alerts', { headers: { Authorization: `Bearer ${token}` }}).catch(()=>({data:[]})),
        // Use farm-scoped endpoint for plant alerts
        axios.get(`${farmApiBase}/${activeFarmId}/plants/alerts`, { headers: { Authorization: `Bearer ${token}` }}).catch(()=>({data:[]}))
      ]);
      const combinedAlerts = [ ...(animalAlertsRes.data||[]), ...(plantAlertsRes.data||[]) ];
      const inferType = (msg='') => {
        const m = msg.toLowerCase();
        if(m.includes('vacc')) return 'Vaccination';
        if(m.includes('visit')) return 'Visit';
        if(m.includes('treat')) return 'Treatment';
        if(m.includes('disease')) return 'Disease';
        return 'General';
      };
      const inferSeverity = (msg='') => /overdue|late|élevée|high|urgent/i.test(msg) ? 'high' : (/warning|manquant|missing/i.test(msg)?'medium':'low');
      const normalize = (arr) => (arr||[]).map((a,i)=>{
        if(typeof a === 'string') {
          return { id: `str-${i}`, type: inferType(a), message: a, severity: inferSeverity(a), createdAt: new Date().toISOString() };
        }
        return { id: a.id ?? `obj-${i}`, type: a.type || inferType(a.message), message: a.message || '', severity: a.severity || inferSeverity(a.message||''), createdAt: a.createdAt || new Date().toISOString(), entityId: a.entityId };
      });
      setAlerts(normalize(combinedAlerts));
    } catch { /* ignore alerts errors */ }
  };

  useEffect(()=>{ resolveFarm(); }, []);
  useEffect(()=>{ if(farmId) loadData(farmId); }, [farmId]);


  // Feedings due today (assumption: any animal with feeding field defined)
  const feedingsDue = useMemo(()=>animals.filter(a => (a.feeding||'').trim() !== '').length, [animals]);

  // Health status mapping -> numeric score
  const score = (s) => {
    switch((s||'').toLowerCase()) {
      case 'healthy': return 3; case 'warning': return 2; case 'sick': return 1; default: return 2; }
  };

  // Produce monthly average health score last 6 months for animals / plants
  const healthSeries = (list, dateFieldGuessArray) => {
    const now = new Date();
    const months = [];
    for(let i=5;i>=0;i--){
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      months.push({ key: d.getFullYear()+ '-' + (d.getMonth()+1).toString().padStart(2,'0'), total:0, count:0 });
    }
    list.forEach(item => {
      // try to find a date field to bucket by (plantingDate, birthDate, createdAt)
      let dtStr = dateFieldGuessArray.map(f=>item[f]).find(Boolean);
      if(!dtStr) return;
      const dt = new Date(dtStr); if(isNaN(dt)) return;
      const key = dt.getFullYear()+ '-' + (dt.getMonth()+1).toString().padStart(2,'0');
      const bucket = months.find(m=>m.key===key); if(!bucket) return;
      bucket.total += score(item.healthStatus); bucket.count += 1;
    });
    return months.map(m=>({ month: m.key.slice(5), score: m.count? (m.total/m.count).toFixed(2): null }));
  };

  const animalHealth = useMemo(()=>healthSeries(animals, ['birthDate','createdAt']), [animals]);
  const plantHealth = useMemo(()=>healthSeries(plants, ['plantingDate','createdAt']), [plants]);

  // Alerts aggregated (bar chart): count per type
  const alertsBar = useMemo(()=>{
    const map = {};
    alerts.forEach(a => { map[a.type] = (map[a.type]||0)+1; });
    return Object.entries(map).map(([type,value])=>({ type, value }));
  }, [alerts]);

  const latestAlerts = useMemo(()=>[...alerts].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5), [alerts]);

  const cardClass = 'bg-white border rounded-xl p-5 flex flex-col justify-center shadow-sm';
  const titleClass = 'text-sm font-medium text-gray-600 flex items-center gap-2';

  return (
    <div className="min-h-screen bg-neutral-50 w-full py-6 px-4 md:px-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      {farmLoading && <p className="text-sm text-gray-500 mb-4">Loading farm...</p>}
      {!farmLoading && !farmId && <p className="text-sm text-red-500 mb-4">{error || 'No farm associated.'}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={cardClass}>
          <div className={titleClass}><FaPaw/> Animaux suivis</div>
          <div className="text-3xl font-bold text-gray-900">{loading? '—' : animals.length}</div>
        </div>
        <div className={cardClass}>
          <div className={titleClass}><FaSeedling/> Plantes suivies</div>
          <div className="text-3xl font-bold text-gray-900">{loading? '—' : plants.length}</div>
        </div>
        <div className={cardClass}>
          <div className={titleClass}><FaBell/> Alertes en cours</div>
          <div className="text-3xl font-bold text-gray-900">{loading? '—' : alerts.length}</div>
        </div>
        <div className={cardClass}>
          <div className={titleClass}><FaDrumstickBite/> Nourritures à distribuer aujourd'hui</div>
          <div className="text-3xl font-bold text-gray-900">{loading? '—' : feedingsDue}</div>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6 mb-6">
        {/* Health Stats (Animaux) */}
        <div className="bg-white border rounded-xl p-5 shadow-sm xl:col-span-2 flex flex-col">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Statistiques de santé (Animaux)</h2>
          <div className="flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={animalHealth} margin={{left:0,right:8,top:10,bottom:0}}>
                <XAxis dataKey="month" tick={{fontSize:12}} stroke="#94a3b8"/>
                <YAxis domain={[0,3]} ticks={[1,2,3]} tick={{fontSize:12}} stroke="#94a3b8"/>
                <Tooltip cursor={{stroke:'#e2e8f0'}}/>
                <Line type="monotone" dataKey="score" stroke="#16a34a" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Latest Alerts Bar */}
        <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Dernières alertes</h2>
          <div className="flex-1 min-h-[180px]">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={alertsBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="type" stroke="#94a3b8" tick={{fontSize:12}}/>
                <YAxis allowDecimals={false} stroke="#94a3b8" tick={{fontSize:12}}/>
                <Tooltip/>
                <Bar dataKey="value" fill="#16a34a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Plant Health */}
        <div className="bg-white border rounded-xl p-5 shadow-sm xl:col-span-2 flex flex-col">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Statistiques de santé (Plantes)</h2>
          <div className="flex-1 min-h-[160px]">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={plantHealth} margin={{left:0,right:8,top:10,bottom:0}}>
                <XAxis dataKey="month" tick={{fontSize:12}} stroke="#94a3b8"/>
                <YAxis domain={[0,3]} ticks={[1,2,3]} tick={{fontSize:12}} stroke="#94a3b8"/>
                <Tooltip/>
                <Line type="monotone" dataKey="score" stroke="#16a34a" strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Alert List */}
        <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Dernières alertes</h2>
          <ul className="text-sm text-gray-700 space-y-3 overflow-y-auto max-h-64 pr-1">
            {latestAlerts.map((a,idx) => {
              const d = new Date(a.createdAt);
              const dateLabel = isNaN(d) ? '-' : d.toLocaleString();
              return (
              <li key={a.id ?? `${a.type || 'alert'}-${a.createdAt || idx}-${idx}` } className="flex gap-2 items-start">
                <span className="text-red-500 mt-0.5">⚠️</span>
                <div>
                  <p className="font-medium leading-tight">{a.message}</p>
                  <p className="text-[11px] text-gray-400">{a.type} • {dateLabel}</p>
                </div>
              </li>
            );})}
            {latestAlerts.length===0 && <li className="text-gray-400">No alerts</li>}
          </ul>
        </div>
      </div>
      <p className="mt-8 text-[11px] text-gray-400">* Some statistics use simple heuristics / mock data until backend endpoints provide richer metrics.</p>
    </div>
  );
}
