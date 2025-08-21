import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { FaPaw, FaSeedling, FaBell, FaDrumstickBite, FaSun, FaCloudRain, FaTint } from 'react-icons/fa';

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
        farmPlantAlerts: false,
        globalPlantAlerts: false,
        farmTanks: false,
        globalTanks: false,
        farmFoodStores: false,
        globalFoodStores: false,
        farmWeather: false
      };
      return { ...defaults, ...stored };
    } catch { return { farmPlantAlerts:false, globalPlantAlerts:false, farmTanks:false, globalTanks:false, farmFoodStores:false, globalFoodStores:false, farmWeather:false }; }
  });

  const markCap = (key, value) => {
    const next = { ...(apiCapabilities||{}), [key]: value };
    try { localStorage.setItem('apiCaps', JSON.stringify(next)); } catch(e){}
    setApiCapabilities(next);
  };
  const canTry = (key) => apiCapabilities[key] !== false;

  // User-initiated probe for optional endpoints. This avoids making these calls automatically
  // on page load and causing 404 spam; the user can decide when to check availability.
  const probeOptionalEndpoints = async (activeFarmId) => {
    if(!activeFarmId) return;
    const token = localStorage.getItem('token');
    const headers = { headers: { Authorization: `Bearer ${token}` } };
    const probes = [
      { key: 'farmPlantAlerts', url: `${farmApiBase}/${activeFarmId}/plants/alerts` },
      { key: 'globalPlantAlerts', url: 'http://localhost:8080/api/plants/alerts' },
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
    // reload data after probing so newly-enabled endpoints are used
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

    // Alerts fetch (optional) – do this defensively so missing endpoints don't spam 404s
    try {
      const token = localStorage.getItem('token');
      const headers = { headers: { Authorization: `Bearer ${token}` } };

      // fetch animal alerts safely
      let animalAlerts = [];
      try {
        const res = await axios.get('http://localhost:8080/api/animals/alerts', headers);
        animalAlerts = res.data || [];
      } catch (aErr) {
        console.debug('[Dashboard] animal alerts not available', aErr?.response?.status);
        animalAlerts = [];
      }

      // fetch plant alerts: try farm-scoped, fallback to global if 404
      let plantAlerts = [];
      try {
        if (canTry('farmPlantAlerts')) {
          const res = await axios.get(`${farmApiBase}/${activeFarmId}/plants/alerts`, headers);
          plantAlerts = res.data || [];
        } else {
          plantAlerts = [];
        }
      } catch (pErr) {
        const status = pErr?.response?.status;
        console.debug('[Dashboard] farm-scoped plant alerts failed', status);
        if (status === 404) {
          markCap('farmPlantAlerts', false);
          try {
            if (canTry('globalPlantAlerts')) {
              const res2 = await axios.get('http://localhost:8080/api/plants/alerts', headers);
              plantAlerts = res2.data || [];
            }
          } catch (gErr) {
            console.debug('[Dashboard] global plant alerts also not available');
            if (gErr?.response?.status === 404) markCap('globalPlantAlerts', false);
            plantAlerts = [];
          }
        } else {
          plantAlerts = [];
        }
      }

      const combinedAlerts = [ ...(animalAlerts||[]), ...(plantAlerts||[]) ];
      const inferType = (msg='') => {
        const m = String(msg).toLowerCase();
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
    } catch (err) {
      console.debug('[Dashboard] alerts fetch failed', err);
    }

      // Tanks / resources (defensive fetches)
    try {
      const token = localStorage.getItem('token');
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      // We'll expose a shared tanksData so subsequent food logic can read from it
      let tanksData = {};

      // First, try the single tank-level endpoint (used by WateringPage) so Dashboard shows the same value
      let tankLevelRes = null;
      try {
        tankLevelRes = await axios.get(`${farmApiBase}/${activeFarmId}/tank-level`, headers).catch(()=>null);
      } catch(e) { tankLevelRes = null; }

      if (tankLevelRes && tankLevelRes.data) {
        // Backend returns an object like { level: 120, low: false }
        const level = Number(tankLevelRes.data.level ?? (tankLevelRes.data.level === 0 ? 0 : null));
        tanksData = tankLevelRes.data || {};
        setTanks(tanksData);
        setTotalWaterAvailable(Number.isFinite(level) ? level : 0);
      } else {
        // try farm-scoped tanks endpoint then fallback to global
        let tanksRes = null;
        try {
          if (canTry('farmTanks')) {
            tanksRes = await axios.get(`${farmApiBase}/${activeFarmId}/tanks`, headers);
          }
        } catch (tErr) {
          const status = tErr?.response?.status;
          if (status === 404) { markCap('farmTanks', false); }
        }
        if(!tanksRes && canTry('globalTanks')) {
          try { tanksRes = await axios.get('http://localhost:8080/api/tanks', headers); } catch(e){ if(e?.response?.status===404) markCap('globalTanks', false); tanksRes = null; }
        }
        tanksData = (tanksRes && tanksRes.data) ? tanksRes.data : {};
        setTanks(tanksData);
        // totals (sum numeric fields)
        const waterTotal = Object.values(tanksData).filter(v=>typeof v === 'number').reduce((s,v)=>s+v,0);
        setTotalWaterAvailable(waterTotal || 0);
      }

      // Food: prefer per-species tank endpoints (cow/dog/chicken/sheep) so Dashboard aggregates the same tank data as FeedingPage
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
        } else {
          // fallback: prefer the same source FeedingPage uses (today-intake) so Dashboard matches "Total Fed"
          let todayIntakeRes = null;
          try { todayIntakeRes = await axios.get(`${farmApiBase}/${activeFarmId}/today-intake`, headers).catch(()=>null); } catch(e) { todayIntakeRes = null; }
          if (todayIntakeRes && todayIntakeRes.data) {
            const intakeVal = Number(todayIntakeRes.data.intake ?? todayIntakeRes.data.total ?? null);
            if (Number.isFinite(intakeVal)) {
              tanksData = { ...(tanksData||{}), food: intakeVal };
              setTanks(tanksData);
              setTotalFoodAvailable(intakeVal);
            } else { setTotalFoodAvailable(0); }
          } else {
            // Food-level endpoint fallback
            let foodLevelRes = null;
            try { foodLevelRes = await axios.get(`${farmApiBase}/${activeFarmId}/food-level`, headers).catch(()=>null); } catch(e) { foodLevelRes = null; }
            if (foodLevelRes && foodLevelRes.data) {
              const levelVal = Number(foodLevelRes.data.level ?? foodLevelRes.data.amount ?? foodLevelRes.data.total ?? null);
              tanksData = { ...(tanksData||{}), food: Number.isFinite(levelVal) ? levelVal : (tanksData.food || 0) };
              setTanks(tanksData);
              setTotalFoodAvailable(Number.isFinite(levelVal) ? levelVal : 0);
            } else {
              // last fallback: /food-stores or tanksData.food
              let foodTotal = null;
              try {
                if (canTry('farmFoodStores')) {
                  const fRes = await axios.get(`${farmApiBase}/${activeFarmId}/food-stores`, headers).catch(()=>null);
                  if(fRes && fRes.data) foodTotal = (Array.isArray(fRes.data) ? fRes.data.reduce((s,i)=>s+(i.amount||0),0) : (fRes.data.total||null));
                }
              } catch(fErr) { if(fErr?.response?.status === 404) markCap('farmFoodStores', false); foodTotal = null; }
              if(foodTotal === null && canTry('globalFoodStores')) {
                try { const gf = await axios.get('http://localhost:8080/api/food-stores', headers); if(gf && gf.data) foodTotal = Array.isArray(gf.data)? gf.data.reduce((s,i)=>s+(i.amount||0),0) : (gf.data.total||null); } catch(gfErr){ if(gfErr?.response?.status===404) markCap('globalFoodStores', false); }
              }
              if(foodTotal === null) { foodTotal = (tanksData && tanksData.food) || 0; }
              setTotalFoodAvailable(foodTotal || 0);
            }
          }
        }
      } catch(e) {
        // on any failure, fall back to today-intake / food-level logic
        console.debug('[Dashboard] per-species food tanks fetch failed', e);
        let todayIntakeRes = null;
        try { todayIntakeRes = await axios.get(`${farmApiBase}/${activeFarmId}/today-intake`, headers).catch(()=>null); } catch(e2) { todayIntakeRes = null; }
        if (todayIntakeRes && todayIntakeRes.data) {
          const intakeVal = Number(todayIntakeRes.data.intake ?? todayIntakeRes.data.total ?? null);
          if (Number.isFinite(intakeVal)) { tanksData = { ...(tanksData||{}), food: intakeVal }; setTanks(tanksData); setTotalFoodAvailable(intakeVal); }
          else setTotalFoodAvailable(0);
        }
      }

      // food total: try endpoint /api/food-stores or compute from tanksData.food
      let foodTotal = null;
      try {
        if (canTry('farmFoodStores')) {
          const fRes = await axios.get(`${farmApiBase}/${activeFarmId}/food-stores`, headers).catch(()=>null);
          if(fRes && fRes.data) {
            foodTotal = (Array.isArray(fRes.data) ? fRes.data.reduce((s,i)=>s+(i.amount||0),0) : (fRes.data.total||null));
          }
        }
      } catch(fErr) {
        if(fErr?.response?.status === 404) markCap('farmFoodStores', false);
        foodTotal = null;
      }
      if(foodTotal === null && canTry('globalFoodStores')) {
        try { const gf = await axios.get('http://localhost:8080/api/food-stores', headers); if(gf && gf.data) foodTotal = Array.isArray(gf.data)? gf.data.reduce((s,i)=>s+(i.amount||0),0) : (gf.data.total||null); } catch(gfErr){ if(gfErr?.response?.status===404) markCap('globalFoodStores', false); }
      }
      if(foodTotal === null) { foodTotal = tanksData.food || 0; }
      setTotalFoodAvailable(foodTotal || 0);

      // Next watering/feeding heuristics: find nearest scheduled times on plants/animals
      const nextPlantWater = (plants||[]).map(p=>p.nextWatering).filter(Boolean).sort()[0] || null;
      const nextAnimalFeed = (animals||[]).map(a=>a.nextFeeding).filter(Boolean).sort()[0] || null;
      setNextWatering(nextPlantWater);
      setNextFeeding(nextAnimalFeed);

      // Daily tasks: combine feedings and waterings and alerts into a time-sorted list
      const todays = [];
      if(nextAnimalFeed) todays.push({ time: nextAnimalFeed, title: 'Nourrir les animaux', meta: `${animals.length} animaux` });
      if(nextPlantWater) todays.push({ time: nextPlantWater, title: 'Arroser les plantes', meta: `${plants.length} plantes` });
      // add tasks from alerts that look urgent
      (alerts||[]).filter(a=>/overdue|urgent|empty|low|sèche|sec/i.test(a.message||'')).forEach(a=>{
        todays.push({ time: a.createdAt || new Date().toISOString(), title: a.message, meta: a.type });
      });
      // normalize times and sort
      const normalizedTasks = todays.map(t=>({ ...t, timeISO: new Date(t.time).toISOString() })).sort((x,y)=>new Date(x.timeISO)-new Date(y.timeISO));
      setTasks(normalizedTasks);

      // Insights: simple heuristics based on tanks and alerts
      const ins = [];
      if((waterTotal||0) < 20) ins.push(`Réservoir bas: prévoir ${20 - (waterTotal||0)} L supplémentaires`);
      if((foodTotal||0) < 10) ins.push(`Stock nourriture faible: ${foodTotal||0} unités restantes`);
      if((alerts||[]).length===0) ins.push('Aucune alerte critique pour l’instant — tout va bien ✅');
      setInsights(ins.slice(0,5));

      // Weather: try farm-scoped endpoint(s) first, then fall back to geolocation + Open-Meteo like WateringPage
      try {
        let got = false;
        if (canTry('farmWeather')) {
          // prefer a structured /weather endpoint
          try {
            const wRes = await axios.get(`${farmApiBase}/${activeFarmId}/weather`, headers).catch(()=>null);
              if (wRes && wRes.data && Object.keys(wRes.data).length) {
              // normalize shape
              const w = wRes.data;
              setWeather({ summary: w.summary || w.description || null, temperature: w.temperature ?? w.temp ?? null, humidity: null, rainProbability: w.rainProbability ?? w.rainChance ?? w.rain ?? null });
              // mirror WateringPage: provide boolean rain flag when available
              setRainForecast(Boolean(w.rain ?? (w.rainProbability != null && w.rainProbability >= 50)));
              got = true;
            }
          } catch(e) {
            const status = e?.response?.status;
            if (status === 404) markCap('farmWeather', false);
          }
        }

        // If farm didn't provide structured weather, try a rain-forecast endpoint (used by WateringPage)
        if (!got) {
          try {
            const rf = await axios.get(`${farmApiBase}/${activeFarmId}/rain-forecast`, headers).catch(()=>null);
              if (rf && rf.data) {
              // backend may return { rain: true } or { probability: 70 } or similar
              const prob = rf.data.probability ?? rf.data.prob ?? rf.data.percent ?? (rf.data.rain ? 100 : null) ?? null;
              setWeather({ summary: rf.data.summary || (prob >= 50 ? 'Pluie probable' : 'Pas de pluie attendue'), temperature: rf.data.temperature ?? null, humidity: null, rainProbability: prob != null ? prob : Boolean(rf.data.rain) });
              setRainForecast(prob != null ? (prob >= 50) : Boolean(rf.data.rain));
              got = true;
            }
          } catch(e) {
            // ignore - fallback to client-side fetch
          }
        }

        // If still no weather info, try geolocation + Open-Meteo like WateringPage does
        if (!got) {
          // avoid calling geolocation on servers / when not available
          if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
            try {
              const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject));
              const lat = pos.coords.latitude; const lon = pos.coords.longitude;
              // fetch current weather
              try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
                const r = await fetch(url); const data = await r.json();
                const tempC = data?.current_weather?.temperature ?? null;
                // also fetch precipitation probability for today (next 6 hours)
                const pUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation_probability&forecast_days=1&timezone=auto`;
                const pr = await fetch(pUrl); const pData = await pr.json();
                const probs = pData?.hourly?.precipitation_probability || [];
                const rainLikely = Array.isArray(probs) && probs.slice(0,6).some(p=> p>=50);
                const rainProb = rainLikely ? 60 : (Array.isArray(probs) ? (probs[0] ?? null) : null);
                setWeather({ summary: data?.current_weather ? 'Météo locale' : null, temperature: tempC, humidity: null, rainProbability: rainProb });
                setRainForecast(Boolean(rainLikely));
                got = true;
              } catch(e) {
                // ignore
              }
            } catch(e) {
              // geolocation denied or failed — leave weather null
            }
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

  // Geolocation-based rain probability & current weather fallback (mirror WateringPage logic)
  useEffect(()=>{
    // If we already have weather with a rainProbability, skip
    if (!farmId) return;
    if (weather && (weather.rainProbability || weather.temperature != null)) return;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    let mounted = true;
    navigator.geolocation.getCurrentPosition(async pos => {
      if (!mounted) return;
      const latitude = pos.coords.latitude;
      const longitude = pos.coords.longitude;
      try {
        // fetch current weather (temperature)
        const curUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
        const r = await fetch(curUrl);
        const data = await r.json();
        const tempC = data?.current_weather?.temperature ?? null;

        // fetch precipitation probability for next hours
        const pUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=precipitation_probability&forecast_days=1&timezone=auto`;
        const pr = await fetch(pUrl);
        const pData = await pr.json();
        const probs = pData?.hourly?.precipitation_probability || [];
        // if any of the next ~6 hours has prob >= 50, consider rain likely
        const rainLikely = Array.isArray(probs) && probs.slice(0,6).some(p=> p>=50);
        const rainProb = rainLikely ? 60 : (Array.isArray(probs) ? (probs[0] ?? null) : null);

        if (mounted) {
          setWeather({ summary: data?.current_weather ? 'Météo locale' : null, temperature: tempC, humidity: null, rainProbability: rainProb });
          setRainForecast(Boolean(rainLikely));
        }
      } catch (e) {
        // ignore geolocation/open-meteo errors — leave weather null
      }
    }, ()=>{
      // user denied geolocation — nothing to do
    });
    return ()=>{ mounted = false; };
  }, [farmId]);

  // Keep dashboard in sync:
  // 1) poll periodically for changes
  // 2) listen for a global event so other pages can notify (window.dispatchEvent)
  useEffect(()=>{
    if(!farmId) return;
    let mounted = true;
    const handler = () => { if(mounted) loadData(farmId); };
    window.addEventListener('farmDataChanged', handler);
    // poll every 30s
    const iv = setInterval(()=>{ if(mounted) loadData(farmId); }, 30_000);
    return ()=>{ mounted = false; window.removeEventListener('farmDataChanged', handler); clearInterval(iv); };
  }, [farmId]);


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
    // helper to format month short (fr)
    const fmtMonth = (d) => new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d);
    const months = [];
    for(let i=5;i>=0;i--){
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      months.push({ key: d.getFullYear()+ '-' + (d.getMonth()+1).toString().padStart(2,'0'), label: fmtMonth(d), total:0, count:0 });
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
    // Return month label and numeric score; fill gaps by carrying forward last known score
    const raw = months.map(m=>({ month: m.label, score: m.count ? Number((m.total / m.count).toFixed(2)) : null }));
    // Carry-forward fill: use previous month's value when null, otherwise use neutral 2
    let last = null;
    const filled = raw.map(r => {
      let s = r.score;
      if(s === null || typeof s === 'undefined'){
        s = last !== null ? last : 2; // neutral baseline
      } else {
        last = s;
      }
      return { month: r.month, score: s };
    });
    return filled;
  };

  const animalHealth = useMemo(()=>healthSeries(animals, ['birthDate','createdAt']), [animals]);
  const plantHealth = useMemo(()=>healthSeries(plants, ['plantingDate','createdAt']), [plants]);

  // Alerts aggregated (bar chart): count per type, sorted desc and graceful empty state
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
    <div className="min-h-screen bg-neutral-50 w-full py-6 px-4 md:px-8">
  <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 bg-green-600 rounded-md px-4 py-3 inline-block">Dashboard</h1>
  {/* probe button removed per request */}
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
  {/* feedings card removed as requested */}
      </div>

      {/* New: Resources summary & quick actions */}
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

      {/* New row: Tasks, Insights, Weather */}
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
