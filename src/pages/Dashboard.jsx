import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaPaw, FaSeedling, FaBell, FaDrumstickBite, FaSun, FaCloudRain, FaTint, FaChartLine, FaArrowUp, FaArrowDown, FaEquals } from "react-icons/fa";

// Dynamic Plot component with fallback
const Plot = ({ data, layout, config, style, ...props }) => {
  const [PlotComponent, setPlotComponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadPlotly = async () => {
      try {
        const { default: PlotlyComponent } = await import('react-plotly.js');
        setPlotComponent(() => PlotlyComponent);
        setLoading(false);
      } catch (err) {
        console.warn('Failed to load Plotly:', err);
        setError(true);
        setLoading(false);
      }
    };
    loadPlotly();
  }, []);

  if (loading) {
    return (
      <div 
        style={{ 
          ...style, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#f9fafb', 
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          color: '#6b7280'
        }}
      >
        <div className="text-center">
          <div className="animate-spin text-green-600 text-xl mb-2">⭯</div>
          <div className="text-sm">Loading Chart...</div>
        </div>
      </div>
    );
  }

  if (error || !PlotComponent) {
    return (
      <div 
        style={{ 
          ...style, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626'
        }}
      >
        <div className="text-center">
          <div className="text-xl mb-2">📊</div>
          <div className="text-sm">Chart unavailable</div>
          <div className="text-xs mt-1">Check Plotly installation</div>
        </div>
      </div>
    );
  }

  return <PlotComponent data={data} layout={layout} config={config} style={style} {...props} />;
};

// Dashboard overview replicating provided mockup (cards, health stats, alerts)
export default function Dashboard() {
  const [animals, setAnimals] = useState([]);
  const [plants, setPlants] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [tanks, setTanks] = useState({}); // { cow: liters, dog: liters, sheep: liters, chicken: liters }
  const [totalWaterAvailable, setTotalWaterAvailable] = useState(null);
  const [lowTank, setLowTank] = useState(false);
  const [totalFoodAvailable, setTotalFoodAvailable] = useState(null);
  const [nextWatering, setNextWatering] = useState(null);
  const [nextFeeding, setNextFeeding] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [insights, setInsights] = useState([]);
  const [weather, setWeather] = useState(null);
  const [rainForecast, setRainForecast] = useState(false);
  const [apiCapabilities, setApiCapabilities] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('apiCaps')||'{}');
      const defaults = {
        farmTanks: false,
        globalTanks: false,
        farmFoodStores: false,
        globalFoodStores: false,
        farmWeather: false
      };
      return { ...defaults, ...stored };
    } catch { return { farmTanks:false, globalTanks:false, farmFoodStores:false, globalFoodStores:false, farmWeather:false }; }
  });

  const markCap = (key, value) => {
    const next = { ...(apiCapabilities||{}), [key]: value };
    try { localStorage.setItem('apiCaps', JSON.stringify(next)); } catch(e){}
    setApiCapabilities(next);
  };
  const canTry = (key) => apiCapabilities[key] !== false;

  // User-initiated probe for optional endpoints (kept for completeness)
  const probeOptionalEndpoints = async (activeFarmId) => {
    if(!activeFarmId) return;
    const token = localStorage.getItem('token');
    const headers = { headers: { Authorization: `Bearer ${token}` } };
    const probes = [
      { key: 'farmTanks', url: `${farmApiBase}/${activeFarmId}/tanks` },
      { key: 'globalTanks', url: 'http://localhost:8080/api/tanks' },
      { key: 'farmFoodStores', url: `${farmApiBase}/${activeFarmId}/food-stores` },
      { key: 'globalFoodStores', url: 'http://localhost:8080/api/food-stores' },
      { key: 'farmWeather', url: `${farmApiBase}/${activeFarmId}/weather` }
    ];
    for(const p of probes){
      try {
        const r = await axios.get(p.url, headers);
        if(r && (r.status === 200 || r.status === 204)) markCap(p.key, true);
      } catch(e){ if(e?.response?.status === 404) markCap(p.key, false); else markCap(p.key, false); }
    }
    await loadData(activeFarmId);
  };
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
      return json.id || json.userId || json.sub || json.uid || null;
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
      if(!userId) userId = extractUserIdFromToken(token);
      if(!userId){ setError('Cannot resolve user id'); setFarmLoading(false); return; }
      try {
        const farmRes = await axios.get(`${farmApiBase}/user/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${token}` }});
        if(farmRes.data && (farmRes.data.id || farmRes.data._id)) setFarmId(farmRes.data.id || farmRes.data._id);
        else if(farmRes.data && farmRes.data.farmId) setFarmId(farmRes.data.farmId);
        else setError('No farm found for user');
      } catch(fErr){
        if(fErr.response?.status === 404) setError('No farm yet. Create one.');
        else setError('Failed to load farm');
      }
    } catch(uErr){
      userId = extractUserIdFromToken(token);
      if(!userId){ setError('Failed to load user'); setFarmLoading(false); return; }
      try {
        const farmRes = await axios.get(`${farmApiBase}/user/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${token}` }});
        if(farmRes.data && (farmRes.data.id || farmRes.data._id)) setFarmId(farmRes.data.id || farmRes.data._id);
        else if(farmRes.data && farmRes.data.farmId) setFarmId(farmRes.data.farmId);
        else setError('No farm found for user');
      } catch(fErr){
        if(fErr.response?.status === 404) setError('No farm yet. Create one.'); else setError('Failed to load farm');
      }
    } finally { setFarmLoading(false); }
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

    // Alerts fetch - only use farm notifications endpoint
    try {
      const token = localStorage.getItem('token');
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      let combinedAlerts = [];
      try {
        await axios.post(`${farmApiBase}/${activeFarmId}/notifications/generate-samples`, headers);
        const res = await axios.get(`${farmApiBase}/${activeFarmId}/notifications`, headers);
        combinedAlerts = res.data || [];
        console.log('📱 Farm notifications fetched:', combinedAlerts);
      } catch (err) {
        console.warn('❌ Farm notifications failed:', err.response?.status, err.message);
        combinedAlerts = [];
      }

      console.log('📊 Total alerts before normalization:', combinedAlerts.length, combinedAlerts);

      // If no alerts from API, add some sample alerts based on farm data
      if (combinedAlerts.length === 0) {
        const sampleAlerts = [];
        
        // Low tank alerts
        if (typeof totalWaterAvailable === 'number' && totalWaterAvailable < 20) {
          sampleAlerts.push({
            id: 'low-water',
            type: 'Water',
            message: `Low water level: ${totalWaterAvailable}L remaining`,
            severity: 'high',
            createdAt: new Date().toISOString()
          });
        }
        
        // Low food alerts
        if (typeof totalFoodAvailable === 'number' && totalFoodAvailable < 10) {
          sampleAlerts.push({
            id: 'low-food',
            type: 'Food',
            message: `Low food level: ${totalFoodAvailable}kg remaining`,
            severity: 'medium',
            createdAt: new Date().toISOString()
          });
        }

        // Animals health alerts
        if (animals && animals.length > 0) {
          animals.forEach(animal => {
            if (animal.healthStatus === 'sick' || animal.healthStatus === 'warning') {
              sampleAlerts.push({
                id: `animal-${animal.id}`,
                type: 'Health',
                message: `${animal.name || 'Animal'} needs attention: ${animal.healthStatus}`,
                severity: animal.healthStatus === 'sick' ? 'high' : 'medium',
                createdAt: new Date().toISOString()
              });
            }
          });
        }

        // Plants health alerts
        if (plants && plants.length > 0) {
          plants.forEach(plant => {
            if (plant.healthStatus === 'sick' || plant.healthStatus === 'warning') {
              sampleAlerts.push({
                id: `plant-${plant.id}`,
                type: 'Plant Health',
                message: `${plant.name || 'Plant'} needs attention: ${plant.healthStatus}`,
                severity: plant.healthStatus === 'sick' ? 'high' : 'medium',
                createdAt: new Date().toISOString()
              });
            }
          });
        }

        // Add sample alerts if we generated any
        if (sampleAlerts.length > 0) {
          combinedAlerts.push(...sampleAlerts);
          console.log('➕ Added sample alerts:', sampleAlerts);
        }

        // If still no alerts, add a demo alert
        if (combinedAlerts.length === 0) {
          combinedAlerts.push({
            id: 'demo-alert',
            type: 'System',
            message: 'Farm monitoring system is active',
            severity: 'low',
            createdAt: new Date().toISOString()
          });
        }
      }

      const inferType = (msg='') => {
        const m = String(msg).toLowerCase();
        if(m.includes('vacc')) return 'Vaccination';
        if(m.includes('visit')) return 'Visit';
        if(m.includes('treat')) return 'Treatment';
        if(m.includes('disease')) return 'Disease';
        if(m.includes('water')) return 'Water';
        if(m.includes('food') || m.includes('feed')) return 'Food';
        if(m.includes('health')) return 'Health';
        return 'General';
      };
      const inferSeverity = (msg='') => /overdue|late|élevée|high|urgent|sick/i.test(msg) ? 'high' : (/warning|manquant|missing|low/i.test(msg)?'medium':'low');
      const normalize = (arr) => (arr||[]).map((a,i)=>{
        if(typeof a === 'string') {
          return { id: `str-${i}`, type: inferType(a), message: a, severity: inferSeverity(a), createdAt: new Date().toISOString() };
        }
        return { 
          id: a.id ?? `obj-${i}`, 
          type: a.type || inferType(a.message), 
          message: a.message || a.title || a.description || '', 
          severity: a.severity || a.priority || inferSeverity(a.message||''), 
          createdAt: a.createdAt || a.created_at || a.timestamp || new Date().toISOString(), 
          entityId: a.entityId || a.entity_id 
        };
      });
      
      const normalizedAlerts = normalize(combinedAlerts);
      console.log('✅ Final normalized alerts:', normalizedAlerts);
      setAlerts(normalizedAlerts);
    } catch (err) {
      console.debug('[Dashboard] alerts fetch failed', err);
    }

    // Tanks / resources
    try {
      const token = localStorage.getItem('token');
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      let tanksData = {};
      let waterTotal = 0;

      // primary water endpoint
      let tankLevelRes = null;
      try { tankLevelRes = await axios.get(`${farmApiBase}/${activeFarmId}/tank-level`, headers).catch(()=>null); } catch(e) { tankLevelRes = null; }

      if (tankLevelRes && tankLevelRes.data) {
        const level = Number(tankLevelRes.data.level ?? (tankLevelRes.data.level === 0 ? 0 : null));
        waterTotal = Number.isFinite(level) ? level : 0;
        tanksData = tankLevelRes.data || {};
        setTanks(tanksData);
        setTotalWaterAvailable(waterTotal);
        setLowTank(Boolean(tanksData.low) || waterTotal < 20);
      } else {
        let tanksRes = null;
        try { if (canTry('farmTanks')) tanksRes = await axios.get(`${farmApiBase}/${activeFarmId}/tanks`, headers); }
        catch (tErr){ if (tErr?.response?.status === 404) markCap('farmTanks', false); }
        if(!tanksRes && canTry('globalTanks')){
          try { tanksRes = await axios.get('http://localhost:8080/api/tanks', headers); }
          catch(gErr){ if(gErr?.response?.status === 404) markCap('globalTanks', false); }
        }
        tanksData = (tanksRes && tanksRes.data) ? tanksRes.data : {};
        setTanks(tanksData);
        waterTotal = Object.values(tanksData).filter(v=>typeof v === 'number').reduce((s,v)=>s+v,0);
        setTotalWaterAvailable(waterTotal || 0);
        setLowTank(Boolean(tanksData.low) || (waterTotal || 0) < 20);
      }

      // food per species
      try {
        const speciesUrls = [
          `${farmApiBase}/${activeFarmId}/cow-tank-level`,
          `${farmApiBase}/${activeFarmId}/dog-tank-level`,
          `${farmApiBase}/${activeFarmId}/chicken-tank-level`,
          `${farmApiBase}/${activeFarmId}/sheep-tank-level`
        ];
        const speciesPromises = speciesUrls.map(u => axios.get(u, headers).catch(()=>({data:null})));
        const [cowRes, dogRes, chickenRes, sheepRes] = await Promise.all(speciesPromises);
        const cowLvl = Number(cowRes?.data?.level ?? cowRes?.data?.quantity ?? cowRes?.data?.amount ?? null);
        console.log('Cow tank level:', cowLvl);
        const dogLvl = Number(dogRes?.data?.level ?? dogRes?.data?.quantity ?? dogRes?.data?.amount ?? null);
        const chickenLvl = Number(chickenRes?.data?.level ?? chickenRes?.data?.quantity ?? chickenRes?.data?.amount ?? null);
        const sheepLvl = Number(sheepRes?.data?.level ?? sheepRes?.data?.quantity ?? sheepRes?.data?.amount ?? null);
        const anyValid = [cowLvl, dogLvl, chickenLvl, sheepLvl].some(Number.isFinite);
        if (anyValid) {
          const cowV = Number.isFinite(cowLvl) ? cowLvl : 0;
          const dogV = Number.isFinite(dogLvl) ? dogLvl : 0;
          const chickenV = Number.isFinite(chickenLvl) ? chickenLvl : 0;
          const sheepV = Number.isFinite(sheepLvl) ? sheepLvl : 0;
          const combined = cowV + dogV + chickenV + sheepV;
          tanksData = { ...(tanksData||{}), cow: cowV, dog: dogV, chicken: chickenV, sheep: sheepV, food: combined };
          setTanks(tanksData);
          setTotalFoodAvailable(combined);
          console.log('Food total from species tanks:', combined);
          // Don't try other endpoints if we got valid species tank data
          return;
        } 
      } catch(e) {
        console.log('Species tanks failed, trying fallback endpoints');
      }

      // Only try fallback if species tanks didn't work
      let fallbackFoodTotal = 0;
      try {
        const todayIntakeRes = await axios.get(`${farmApiBase}/${activeFarmId}/today-intake`, headers).catch(()=>null);
        if (todayIntakeRes && todayIntakeRes.data) {
          const intakeVal = Number(todayIntakeRes.data.intake ?? todayIntakeRes.data.total ?? null);
          if (Number.isFinite(intakeVal)) {
            fallbackFoodTotal = intakeVal;
          }
        }
      } catch(e) {
        console.log('Today intake endpoint also failed');
      }
      
      setTotalFoodAvailable(fallbackFoodTotal);

      // next actions
      const nextPlantWater = (plants||[]).map(p=>p.nextWatering).filter(Boolean).sort()[0] || null;
      const nextAnimalFeed = (animals||[]).map(a=>a.nextFeeding).filter(Boolean).sort()[0] || null;
      setNextWatering(nextPlantWater);
      setNextFeeding(nextAnimalFeed);

      // tasks
      const todays = [];
      if(nextAnimalFeed) todays.push({ time: nextAnimalFeed, title: 'Nourrir les animaux', meta: `${animals.length} animaux` });
      if(nextPlantWater) todays.push({ time: nextPlantWater, title: 'Arroser les plantes', meta: `${plants.length} plantes` });
      (alerts||[]).filter(a=>/overdue|urgent|empty|low|sèche|sec/i.test(a.message||'')).forEach(a=>{
        todays.push({ time: a.createdAt || new Date().toISOString(), title: a.message, meta: a.type });
      });
      const normalizedTasks = todays.map(t=>({ ...t, timeISO: new Date(t.time).toISOString() })).sort((x,y)=>new Date(x.timeISO)-new Date(y.timeISO));
      setTasks(normalizedTasks);

      // insights
      const ins = [];
      const waterForInsight = Number.isFinite(waterTotal) ? waterTotal : (totalWaterAvailable || 0);
      if((waterForInsight||0) < 20) ins.push(`Réservoir bas: prévoir ${Math.max(0, 20 - (waterForInsight||0))} L supplémentaires`);
      if((foodTotal||0) < 10) ins.push(`Stock nourriture faible: ${foodTotal||0} unités restantes`);
      if((alerts||[]).length===0) ins.push('Aucune alerte critique pour l’instant — tout va bien ✅');
      setInsights(ins.slice(0,5));

      // weather
      try {
        let got = false;
        if (canTry('farmWeather')) {
          try {
            const wRes = await axios.get(`${farmApiBase}/${activeFarmId}/weather`, headers).catch(()=>null);
            if (wRes && wRes.data && Object.keys(wRes.data).length) {
              const w = wRes.data;
              setWeather({ summary: w.summary || w.description || null, temperature: w.temperature ?? w.temp ?? null, humidity: null, rainProbability: w.rainProbability ?? w.rainChance ?? w.rain ?? null });
              setRainForecast(Boolean(w.rain ?? (w.rainProbability != null && w.rainProbability >= 50)));
              got = true;
            }
          } catch(e) { if (e?.response?.status === 404) markCap('farmWeather', false); }
        }
        if (!got) {
          try {
            const rf = await axios.get(`${farmApiBase}/${activeFarmId}/rain-forecast`, headers).catch(()=>null);
            if (rf && rf.data) {
              const prob = rf.data.probability ?? rf.data.prob ?? rf.data.percent ?? (rf.data.rain ? 100 : null) ?? null;
              setWeather({ summary: rf.data.summary || (prob >= 50 ? 'Pluie probable' : 'Pas de pluie attendue'), temperature: rf.data.temperature ?? null, humidity: null, rainProbability: prob != null ? prob : Boolean(rf.data.rain) });
              setRainForecast(prob != null ? (prob >= 50) : Boolean(rf.data.rain));
              got = true;
            }
          } catch {}
        }
        if (!got) {
          if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
            try {
              const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
              const lat = pos.coords.latitude; const lon = pos.coords.longitude;
              try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
                const r = await fetch(url); const data = await r.json();
                const tempC = data?.current_weather?.temperature ?? null;
                const pUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&forecast_days=1&timezone=auto`;
                const pr = await fetch(pUrl); const pData = await pr.json();
                const probs = pData?.hourly?.precipitation_probability || [];
                const rainLikely = Array.isArray(probs) && probs.slice(0,6).some(p=> p>=50);
                const rainProb = rainLikely ? 60 : (Array.isArray(probs) ? (probs[0] ?? null) : null);
                setWeather({ summary: data?.current_weather ? 'Météo locale' : null, temperature: tempC, humidity: null, rainProbability: rainProb });
                setRainForecast(Boolean(rainLikely));
                got = true;
              } catch {}
            } catch {}
          }
        }
        if (!got) { setWeather(null); setRainForecast(false); }
      } catch(wErr) {
        console.debug('[Dashboard] weather fetch failed', wErr?.response?.status);
        setWeather(null);
      }
    } catch(e) {
      console.debug('[Dashboard] tanks/insights fetch failed', e?.response?.status);
    }
  };

  useEffect(()=>{ resolveFarm(); }, []);
  useEffect(()=>{ if(farmId) loadData(farmId); }, [farmId]);

  // Geolocation fallback for weather
  useEffect(()=>{
    if (!farmId) return;
    if (weather && (weather.rainProbability || weather.temperature != null)) return;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    let mounted = true;
    navigator.geolocation.getCurrentPosition(async pos => {
      if (!mounted) return;
      const latitude = pos.coords.latitude;
      const longitude = pos.coords.longitude;
      try {
        const curUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
        const r = await fetch(curUrl);
        const data = await r.json();
        const tempC = data?.current_weather?.temperature ?? null;
        const pUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=precipitation_probability&forecast_days=1&timezone=auto`;
        const pr = await fetch(pUrl);
        const pData = await pr.json();
        const probs = pData?.hourly?.precipitation_probability || [];
        const rainLikely = Array.isArray(probs) && probs.slice(0,6).some(p=> p>=50);
        const rainProb = rainLikely ? 60 : (Array.isArray(probs) ? (probs[0] ?? null) : null);
        if (mounted) {
          setWeather({ summary: data?.current_weather ? 'Météo locale' : null, temperature: tempC, humidity: null, rainProbability: rainProb });
          setRainForecast(Boolean(rainLikely));
        }
      } catch {}
    }, ()=>{});
    return ()=>{ mounted = false; };
  }, [farmId]);

  // Keep dashboard in sync (poll + event)
  useEffect(()=>{
    if(!farmId) return;
    let mounted = true;
    const handler = () => { if(mounted) loadData(farmId); };
    window.addEventListener('farmDataChanged', handler);
    const iv = setInterval(()=>{ if(mounted) loadData(farmId); }, 30_000);
    return ()=>{ mounted = false; window.removeEventListener('farmDataChanged', handler); clearInterval(iv); };
  }, [farmId]);

  // Advanced KPI calculations for Power BI-style analytics
  const calculateKPIs = useMemo(() => {
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    
    // Animal KPIs
    const animalStats = {
      total: animals.length,
      healthy: animals.filter(a => (a.healthStatus||'').toLowerCase() === 'healthy').length,
      warning: animals.filter(a => (a.healthStatus||'').toLowerCase() === 'warning').length,
      sick: animals.filter(a => (a.healthStatus||'').toLowerCase() === 'sick').length,
      unknown: animals.filter(a => (a.healthStatus||'').toLowerCase() === 'unknown').length,
    };
    
    // Plant KPIs
    const plantStats = {
      total: plants.length,
      healthy: plants.filter(p => (p.healthStatus||'').toLowerCase() === 'healthy').length,
      warning: plants.filter(p => (p.healthStatus||'').toLowerCase() === 'warning').length,
      sick: plants.filter(p => (p.healthStatus||'').toLowerCase() === 'sick').length,
      unknown: plants.filter(p => (p.healthStatus||'').toLowerCase() === 'unknown').length,
    };
    
    // Health percentages
    const animalHealthPercentage = animalStats.total > 0 ? (animalStats.healthy / animalStats.total * 100) : 0;
    const plantHealthPercentage = plantStats.total > 0 ? (plantStats.healthy / plantStats.total * 100) : 0;
    
    // Critical alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length;
    
    // Trends (mock calculation - in real app would compare with previous period)
    const trends = {
      animalHealth: Math.random() > 0.5 ? 'up' : 'down',
      plantHealth: Math.random() > 0.5 ? 'up' : 'down',
      alerts: Math.random() > 0.5 ? 'up' : 'down',
    };
    
    return {
      animalStats,
      plantStats,
      animalHealthPercentage: Number(animalHealthPercentage.toFixed(1)),
      plantHealthPercentage: Number(plantHealthPercentage.toFixed(1)),
      criticalAlerts,
      trends,
      totalAssets: animalStats.total + plantStats.total,
      overallHealthScore: Number(((animalHealthPercentage + plantHealthPercentage) / 2).toFixed(1))
    };
  }, [animals, plants, alerts]);

  // Health score helpers - YOUR BACKEND DATA STRUCTURE:
  // healthStatus: 'healthy', 'warning', 'sick', 'unknown'
  // Maps to: Healthy = 0, Warning = 1, Sick = 2, Unknown = 3
  const score = (statusOrRisk) => {
    // If it's a number (risk score 0-1), convert to 0-3 scale
    if (typeof statusOrRisk === 'number') {
      return Math.min(3, Math.max(0, statusOrRisk * 3));
    }
    
    // Map your actual backend health status values
    switch((statusOrRisk||'').toLowerCase()) {
      case 'healthy': return 0;           // Best health
      case 'warning': return 1;           // Needs attention
      case 'sick': return 2;              // Unhealthy
      case 'unknown': 
      case 'suspected':
      case 'confirmed':
      default: return 3;                  // Critical/Unknown
    }
  };

  const healthSeries = (list, dateFieldGuessArray) => {
    const now = new Date();
    const fmtMonth = (d) => new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d);
    const months = [];
    
    // Generate last 6 months
    for(let i=5;i>=0;i--){
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      months.push({ 
        key: d.getFullYear()+ '-' + (d.getMonth()+1).toString().padStart(2,'0'), 
        label: fmtMonth(d), 
        items: [],
        healthStatusCounts: { healthy: 0, warning: 0, sick: 0, unknown: 0 }
      });
    }
    
    // Group items by month based on creation/birth date
    list.forEach(item => {
      let dtStr = dateFieldGuessArray.map(f=>item[f]).find(Boolean);
      if(!dtStr) {
        // If no date found, use current month
        dtStr = now.toISOString();
      }
      
      const dt = new Date(dtStr); 
      if(isNaN(dt)) return;
      
      const key = dt.getFullYear()+ '-' + (dt.getMonth()+1).toString().padStart(2,'0');
      const bucket = months.find(m=>m.key===key); 
      if(!bucket) {
        // If date is outside our 6-month window, add to current month
        months[months.length - 1].items.push(item);
        return;
      }
      
      bucket.items.push(item);
      
      // Count health statuses for this month
      const status = (item.healthStatus || 'unknown').toLowerCase();
      if (bucket.healthStatusCounts[status] !== undefined) {
        bucket.healthStatusCounts[status]++;
      } else {
        bucket.healthStatusCounts.unknown++;
      }
    });
    
    // Calculate average health score for each month
    const raw = months.map(m => {
      if(m.items.length === 0) return { 
        month: m.label, 
        score: null, 
        count: 0,
        breakdown: m.healthStatusCounts
      };
      
      // Calculate weighted average based on your backend health statuses
      const scores = m.items.map(item => score(item.healthStatus || item.riskScore));
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      
      return { 
        month: m.label, 
        score: Number(avgScore.toFixed(2)),
        count: m.items.length,
        breakdown: m.healthStatusCounts
      };
    });
    
    // Fill null values with previous month's value or default to 'warning' level
    let lastValidScore = 1; // Default to 'warning' level if no data
    return raw.map(r => {
      let s = r.score;
      if(s == null){ 
        s = lastValidScore; 
      } else { 
        lastValidScore = s; 
      }
      return { 
        month: r.month, 
        score: s, 
        count: r.count || 0,
        breakdown: r.breakdown || { healthy: 0, warning: 0, sick: 0, unknown: 0 }
      };
    });
  };

  const animalHealth = useMemo(()=>healthSeries(animals, ['birthDate','createdAt']), [animals]);
  const plantHealth = useMemo(()=>healthSeries(plants, ['plantingDate','createdAt']), [plants]);

  // Advanced Power BI-style chart configurations
  const createAdvancedChart = (data, title, color, type = 'line') => {
    const baseConfig = {
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'autoScale2d'],
      modeBarButtonsToAdd: [
        {
          name: 'Export to PNG',
          icon: {
            width: 857.1,
            height: 1000,
            path: 'm214-7h429v214h-429z',
            transform: 'matrix(1 0 0 -1 0 850)'
          },
          click: function(gd) {
            Plotly.downloadImage(gd, {format: 'png', width: 1200, height: 600, filename: `health-chart-${Date.now()}`});
          }
        }
      ],
      responsive: true
    };

    const layout = {
      title: {
        text: title,
        font: { size: 16, color: '#1f2937', family: 'Inter, system-ui, sans-serif' },
        x: 0.02
      },
      autosize: true,
      margin: { l: 80, r: 20, t: 50, b: 50 },
      paper_bgcolor: 'rgba(255,255,255,1)',
      plot_bgcolor: 'rgba(249,250,251,1)',
      font: { family: 'Inter, system-ui, sans-serif', size: 12, color: '#374151' },
      xaxis: { 
        showgrid: true,
        gridcolor: 'rgba(229,231,235,0.8)',
        showline: true,
        linecolor: 'rgba(209,213,219,1)',
        tickfont: { size: 11, color: '#6b7280' },
        title: { text: 'Période', font: { size: 12, color: '#4b5563' } }
      },
      yaxis: { 
        range: [0, 3.2],
        tickvals: [0, 1, 2, 3],
        ticktext: ['Excellent', 'Bon', 'Attention', 'Critique'],
        tickfont: { size: 11, color: '#6b7280' },
        showgrid: true,
        gridcolor: 'rgba(229,231,235,0.8)',
        showline: true,
        linecolor: 'rgba(209,213,219,1)',
        title: { text: 'Indice de Santé', font: { size: 12, color: '#4b5563' } }
      },
      hovermode: 'x unified',
      hoverlabel: {
        bgcolor: 'rgba(255,255,255,0.95)',
        bordercolor: color,
        font: { size: 12, color: '#1f2937' }
      },
      showlegend: false
    };

    return { config: baseConfig, layout };
  };

  // Advanced donut chart for health distribution
  const createHealthDistributionChart = (stats, title, colors) => {
    const data = [{
      values: [stats.healthy, stats.warning, stats.sick, stats.unknown],
      labels: ['Sain', 'Attention', 'Malade', 'Inconnu'],
      type: 'pie',
      hole: 0.6,
      marker: {
        colors: colors,
        line: { color: '#ffffff', width: 3 }
      },
      textinfo: 'label+percent',
      textfont: { size: 11, color: '#1f2937' },
      hovertemplate: '<b>%{label}</b><br>Nombre: %{value}<br>Pourcentage: %{percent}<extra></extra>'
    }];

    const layout = {
      title: {
        text: title,
        font: { size: 16, color: '#1f2937', family: 'Inter, system-ui, sans-serif' },
        x: 0.5,
        xanchor: 'center'
      },
      autosize: true,
      margin: { l: 40, r: 40, t: 60, b: 40 },
      paper_bgcolor: 'rgba(255,255,255,1)',
      font: { family: 'Inter, system-ui, sans-serif', size: 12 },
      showlegend: true,
      legend: {
        orientation: 'h',
        x: 0.5,
        xanchor: 'center',
        y: -0.1,
        bgcolor: 'rgba(255,255,255,0.8)'
      },
      annotations: [{
        text: `<b>${stats.total}</b><br><span style="font-size:12px">Total</span>`,
        x: 0.5, y: 0.5,
        font: { size: 20, color: '#1f2937' },
        showarrow: false
      }]
    };

    return { data, layout };
  };

  const alertsBar = useMemo(()=>{
    const map = {};
    (alerts||[]).forEach(a => { const t = a?.type || 'Autre'; map[t] = (map[t]||0)+1; });
    const arr = Object.entries(map).map(([type,value])=>({ type, value }));
    if(arr.length === 0) return [{ type: 'Aucun', value: 0 }];
    return arr.sort((x,y)=> y.value - x.value);
  }, [alerts]);

  const latestAlerts = useMemo(()=>[...alerts].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5), [alerts]);

  const cardClass = 'bg-white border border-green-100 rounded-xl p-5 flex flex-col justify-center shadow-sm';
  const titleClass = 'text-sm font-bold text-green-700 flex items-center gap-2';

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Power BI Style Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Analytique</h1>
            <p className="text-sm text-gray-600 mt-1">Surveillance en temps réel de votre exploitation agricole</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-xs text-gray-500">
              Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
            </div>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
              🟢 Connecté
            </div>
          </div>
        </div>
      </div>

      {farmLoading && (
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">🔄 Chargement des données de la ferme...</p>
          </div>
        </div>
      )}
      
      {!farmLoading && !farmId && (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">⚠️ {error || 'Aucune ferme associée à votre compte.'}</p>
          </div>
        </div>
      )}

      {/* Executive KPI Dashboard */}
      <div className="p-6 space-y-6">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Overall Health Score */}
          <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Score de Santé Global</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{calculateKPIs.overallHealthScore}%</p>
                <div className="flex items-center mt-2">
                  {calculateKPIs.trends.animalHealth === 'up' ? (
                    <FaArrowUp className="text-green-500 text-xs mr-1" />
                  ) : calculateKPIs.trends.animalHealth === 'down' ? (
                    <FaArrowDown className="text-red-500 text-xs mr-1" />
                  ) : (
                    <FaEquals className="text-gray-500 text-xs mr-1" />
                  )}
                  <span className="text-xs text-gray-500">vs. mois précédent</span>
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <FaChartLine className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>

          {/* Total Assets */}
          <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Actifs Totaux</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{calculateKPIs.totalAssets}</p>
                <p className="text-xs text-gray-500 mt-2">{calculateKPIs.animalStats.total} animaux • {calculateKPIs.plantStats.total} plantes</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <FaSeedling className="text-green-600 text-xl" />
              </div>
            </div>
          </div>

          {/* Animal Health Rate */}
          <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taux de Santé Animaux</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{calculateKPIs.animalHealthPercentage}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${calculateKPIs.animalHealthPercentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <FaPaw className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Alertes Critiques</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{calculateKPIs.criticalAlerts}</p>
                <p className="text-xs text-gray-500 mt-2">Nécessitent une attention immédiate</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <FaBell className="text-red-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Health Trends Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Tendances de Santé - 6 Derniers Mois</h3>
              <p className="text-sm text-gray-600 mt-1">Évolution des indices de santé par catégorie</p>
            </div>
            <div className="p-6">
              <div style={{ height: 400 }}>
                <Plot
                  data={[
                    {
                      x: (animalHealth || []).map(d => d.month),
                      y: (animalHealth || []).map(d => d.score),
                      type: 'scatter',
                      mode: 'lines+markers',
                      name: 'Animaux',
                      line: { color: '#8b5cf6', width: 3, shape: 'spline' },
                      marker: { size: 8, color: '#8b5cf6', symbol: 'circle' },
                      fill: 'tonexty',
                      fillcolor: 'rgba(139, 92, 246, 0.1)',
                      hovertemplate: '<b>Animaux</b><br>%{x}: %{y:.1f}<br>Statut: %{customdata}<extra></extra>',
                      customdata: (animalHealth || []).map(d => {
                        if (d.score <= 0.5) return 'Excellent';
                        if (d.score <= 1.5) return 'Bon';
                        if (d.score <= 2.5) return 'Attention';
                        return 'Critique';
                      })
                    },
                    {
                      x: (plantHealth || []).map(d => d.month),
                      y: (plantHealth || []).map(d => d.score),
                      type: 'scatter',
                      mode: 'lines+markers',
                      name: 'Plantes',
                      line: { color: '#10b981', width: 3, shape: 'spline' },
                      marker: { size: 8, color: '#10b981', symbol: 'circle' },
                      fill: 'tonexty',
                      fillcolor: 'rgba(16, 185, 129, 0.1)',
                      hovertemplate: '<b>Plantes</b><br>%{x}: %{y:.1f}<br>Statut: %{customdata}<extra></extra>',
                      customdata: (plantHealth || []).map(d => {
                        if (d.score <= 0.5) return 'Excellent';
                        if (d.score <= 1.5) return 'Bon';
                        if (d.score <= 2.5) return 'Attention';
                        return 'Critique';
                      })
                    }
                  ]}
                  layout={{
                    autosize: true,
                    margin: { l: 60, r: 40, t: 20, b: 50 },
                    paper_bgcolor: 'rgba(255,255,255,0)',
                    plot_bgcolor: 'rgba(249,250,251,0.5)',
                    font: { family: 'Inter, system-ui, sans-serif', size: 12, color: '#374151' },
                    xaxis: {
                      showgrid: true,
                      gridcolor: 'rgba(229,231,235,0.8)',
                      showline: true,
                      linecolor: 'rgba(209,213,219,1)',
                      tickfont: { size: 11, color: '#6b7280' }
                    },
                    yaxis: {
                      range: [0, 3.2],
                      tickvals: [0, 1, 2, 3],
                      ticktext: ['Excellent', 'Bon', 'Attention', 'Critique'],
                      tickfont: { size: 11, color: '#6b7280' },
                      showgrid: true,
                      gridcolor: 'rgba(229,231,235,0.8)',
                      showline: true,
                      linecolor: 'rgba(209,213,219,1)'
                    },
                    hovermode: 'x unified',
                    legend: {
                      x: 1.02,
                      y: 1,
                      bgcolor: 'rgba(255,255,255,0.8)',
                      bordercolor: 'rgba(229,231,235,1)',
                      borderwidth: 1
                    }
                  }}
                  config={{
                    displayModeBar: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
                    responsive: true
                  }}
                  useResizeHandler
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Health Distribution */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Distribution de Santé</h3>
              <p className="text-sm text-gray-600 mt-1">Répartition par statut</p>
            </div>
            <div className="p-6">
              <div style={{ height: 350 }}>
                <Plot
                  {...createHealthDistributionChart(
                    calculateKPIs.animalStats,
                    '',
                    ['#10b981', '#f59e0b', '#ef4444', '#6b7280']
                  )}
                  config={{
                    displayModeBar: false,
                    responsive: true
                  }}
                  useResizeHandler
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plant Health Distribution */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Santé des Plantes</h3>
              <p className="text-sm text-gray-600 mt-1">Répartition détaillée par statut</p>
            </div>
            <div className="p-6">
              <div style={{ height: 300 }}>
                <Plot
                  {...createHealthDistributionChart(
                    calculateKPIs.plantStats,
                    '',
                    ['#10b981', '#f59e0b', '#ef4444', '#6b7280']
                  )}
                  config={{
                    displayModeBar: false,
                    responsive: true
                  }}
                  useResizeHandler
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Recent Alerts Analysis */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Analyse des Alertes</h3>
              <p className="text-sm text-gray-600 mt-1">Répartition par type d'alerte</p>
            </div>
            <div className="p-6">
              <div style={{ height: 300 }}>
                <Plot
                  data={[{
                    x: (alertsBar || []).map(d => d.type),
                    y: (alertsBar || []).map(d => d.value),
                    type: 'bar',
                    marker: {
                      color: ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'],
                      line: { color: '#ffffff', width: 2 }
                    },
                    hovertemplate: '<b>%{x}</b><br>Nombre: %{y}<extra></extra>'
                  }]}
                  layout={{
                    autosize: true,
                    margin: { l: 50, r: 20, t: 20, b: 80 },
                    paper_bgcolor: 'rgba(255,255,255,0)',
                    plot_bgcolor: 'rgba(249,250,251,0.5)',
                    font: { family: 'Inter, system-ui, sans-serif', size: 12, color: '#374151' },
                    xaxis: {
                      tickfont: { size: 11, color: '#6b7280' },
                      tickangle: -45
                    },
                    yaxis: {
                      tickfont: { size: 11, color: '#6b7280' },
                      showgrid: true,
                      gridcolor: 'rgba(229,231,235,0.8)'
                    }
                  }}
                  config={{
                    displayModeBar: false,
                    responsive: true
                  }}
                  useResizeHandler
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className={`${cardClass} hover:shadow-md transition-shadow`}> 
          <div className={titleClass}><FaTint className="text-green-600"/> Eau disponible</div>
          <div className="text-4xl font-extrabold text-gray-900">{totalWaterAvailable == null ? '—' : `${totalWaterAvailable} L`}</div>
          <div className="mt-3 text-sm text-green-700 font-medium">Réservoir</div>
          <div className="text-xs text-gray-400 mt-1">{lowTank ? 'Niveau bas — considérer de remplir' : 'Niveau OK'}</div>
        </div>

        <div className={`${cardClass} hover:shadow-md transition-shadow`}>
          <div className={titleClass}><FaDrumstickBite className="text-green-600"/> Nourriture disponible</div>
          <div className="text-4xl font-extrabold text-gray-900">{totalFoodAvailable == null ? '—' : `${totalFoodAvailable} kg`}</div>
          <div className="mt-3 text-sm text-green-700 font-medium">Stocks</div>
          <div className="text-xs text-gray-400 mt-1">Consultez les détails de chaque réservoir dans la section alimentation.</div>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6 mb-6">
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-green-800">Tâches du jour</h3>
            <div className="flex gap-2">
              <button onClick={()=> window.location.href = '/watering'} className="px-3 py-1 bg-white text-green-600 border border-green-600 rounded text-sm flex items-center gap-2">
                <FaTint/> Arrosage
              </button>
              <button onClick={()=> window.location.href = '/feeding'} className="px-3 py-1 bg-white text-green-600 border border-green-600 rounded text-sm flex items-center gap-2">
                <FaDrumstickBite/> Nourrir
              </button>
            </div>
          </div>
          <ul className="text-sm text-gray-700 space-y-2 max-h-56 overflow-auto">
            {tasks && tasks.length ? tasks.map((t, i)=> (
              <li key={t.timeISO + i} className="flex justify-between items-center py-2">
                <div>
                  <div className="text-sm font-medium text-gray-800">{t.title}</div>
                  <div className="text-[11px] text-gray-400">{new Date(t.timeISO).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {t.meta}</div>
                </div>
              </li>
            )) : (
              <li className="flex items-center justify-center py-6">
                <div className="text-center text-gray-400">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 text-green-500 mb-3">✓</div>
                  <div className="text-sm">Tout est à jour</div>
                </div>
              </li>
            )}
          </ul>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-green-800 mb-3">Insights / Suggestions</h3>
          <ul className="text-sm text-gray-700 space-y-2 max-h-56 overflow-auto">
            {insights && insights.length ? insights.map((s,i)=>(<li key={i} className="text-sm">💡 {s}</li>)) : <li className="text-gray-400">Aucun insight</li>}
          </ul>
        </div>

        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-green-800 mb-3">Météo (ferme)</h3>
          {weather ? (
            <div>
              <p className="font-medium">{weather.summary || '—'}</p>
              <p className="text-sm"><FaSun className="inline mr-2 text-yellow-400"/> <span className="font-bold">Temp: {weather.temperature ?? '—'} °C</span></p>
              <p className="text-xs mt-2"><FaCloudRain className="inline mr-2 text-blue-400"/> <span className="font-bold">Pluie prévue: {weather.rainProbability ? `${weather.rainProbability}%` : (rainForecast ? 'Oui' : 'Non')}</span></p>
            </div>
          ) : (
            <p className="text-gray-400">Météo indisponible</p>
          )}
        </div>
      </div>

      {/* Critical Alerts Section */}
      {calculateKPIs.criticalAlerts > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FaBell className="text-red-500 text-lg mr-3" />
              <h3 className="text-lg font-bold text-red-800">Alertes Critiques ({calculateKPIs.criticalAlerts})</h3>
            </div>
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
              🚨 Action Requise
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.filter(a => a.severity === 'high' || a.severity === 'critical').slice(0, 6).map((alert, index) => (
              <div key={alert.id || index} className="bg-white border border-red-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">
                        {alert.type || 'Alerte'}
                      </span>
                      <span className={`ml-2 text-xs px-2 py-1 rounded ${
                        alert.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                      }`}>
                        {alert.severity === 'critical' ? 'CRITIQUE' : 'URGENT'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 font-medium mb-2">{alert.message}</p>
                    <p className="text-xs text-gray-500">
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Maintenant'}
                    </p>
                  </div>
                  <div className={`text-lg ${alert.severity === 'critical' ? 'text-red-600' : 'text-orange-500'}`}>
                    {alert.type === 'Water' ? '💧' : 
                     alert.type === 'Food' ? '🍽️' : 
                     alert.type === 'Health' ? '🏥' : 
                     alert.type === 'Plant Health' ? '🌱' : '⚠️'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length > 6 && (
            <div className="text-center mt-4">
              <span className="text-sm text-red-600 font-medium">
                +{alerts.filter(a => a.severity === 'high' || a.severity === 'critical').length - 6} autres alertes critiques
              </span>
            </div>
          )}
        </div>
      )}

      {/* All Alerts Section */}
      {alerts && alerts.length > 0 && (
        <div className="bg-white border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FaBell className="text-blue-500 mr-3" />
              Toutes les Alertes ({alerts.length})
            </h3>
            <div className="flex space-x-2">
              {['high', 'medium', 'low'].map(severity => {
                const count = alerts.filter(a => a.severity === severity).length;
                if (count === 0) return null;
                return (
                  <span key={severity} className={`px-3 py-1 rounded-full text-xs font-medium ${
                    severity === 'high' ? 'bg-red-100 text-red-800' :
                    severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {severity === 'high' ? 'Critique' : severity === 'medium' ? 'Moyen' : 'Faible'}: {count}
                  </span>
                );
              })}
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {alerts.slice(0, 10).map((alert, index) => (
              <div key={alert.id || index} className={`border-l-4 p-4 rounded-r-lg ${
                alert.severity === 'high' || alert.severity === 'critical' ? 'border-red-400 bg-red-50' :
                alert.severity === 'medium' ? 'border-yellow-400 bg-yellow-50' :
                'border-gray-300 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className={`text-xs font-medium px-2 py-1 rounded mr-2 ${
                        alert.severity === 'high' || alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {alert.type || 'Général'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {alert.createdAt ? new Date(alert.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Maintenant'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{alert.message}</p>
                  </div>
                  <div className={`text-lg ml-4 ${
                    alert.severity === 'high' || alert.severity === 'critical' ? 'text-red-500' :
                    alert.severity === 'medium' ? 'text-yellow-500' :
                    'text-gray-500'
                  }`}>
                    {alert.type === 'Water' ? '💧' : 
                     alert.type === 'Food' ? '🍽️' : 
                     alert.type === 'Health' ? '🏥' : 
                     alert.type === 'Plant Health' ? '🌱' : 
                     alert.type === 'System' ? '⚙️' : '📢'}
                  </div>
                </div>
              </div>
            ))}
            
            {alerts.length > 10 && (
              <div className="text-center py-3 border-t">
                <span className="text-sm text-gray-500">
                  ... et {alerts.length - 10} autres alertes
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}