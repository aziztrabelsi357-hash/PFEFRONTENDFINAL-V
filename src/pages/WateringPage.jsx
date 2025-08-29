import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaTint, FaClock, FaExclamationTriangle, FaLeaf, FaWater, FaCloudRain, FaSync } from 'react-icons/fa';
import AIChatbot from '../components/AIChatbot';
// Calendar removed per request

const farmApiBase = 'http://localhost:8080/api/farms';

function safeDecode(token){
  try {
    const p = token.split('.')[1];
    if(!p) return null;
    const json = JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')));
    return json;
  } catch { return null; }
}
function fmt(dt){ const d=new Date(dt); return isNaN(d)?'—':d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});} 
function isoFromTime(t){ if(!t) return null; const m=t.match(/^(\d{1,2}):(\d{2})$/); if(!m) return null; const now=new Date(); return new Date(now.getFullYear(),now.getMonth(),now.getDate(),+m[1],+m[2]).toISOString(); }

export default function WateringPage(){
  const [token,setToken]=useState(null); const [farmId,setFarmId]=useState(null); const [userId,setUserId]=useState(null);
  const [plants,setPlants]=useState([]);
  // Removed animals from watering scope per request
  const [animals]=useState([]);
  const [schedule,setSchedule]=useState([]); // dynamic (watering, feeding, treatments, vaccinations, harvest, visits)
  const [nextWatering,setNextWatering]=useState(null); // next watering slot iso
  const [tankLevel,setTankLevel]=useState(null); const [lowTank,setLowTank]=useState(false);
  const [rainForecast,setRainForecast]=useState(false);
  const [aiSuggestion,setAiSuggestion]=useState(null);
  const [totalWaterUsed,setTotalWaterUsed]=useState(0);
  const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const [alert,setAlert]=useState(null); const [refreshing,setRefreshing]=useState(false);
  const [geo,setGeo]=useState({lat:null,lon:null,denied:false});
  const [nextEvent,setNextEvent]=useState(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  // Reference to track auto-marking (similar to FeedingPage)
  const didMarkThisSession = useRef(false);

  // Static routine times
  const WATERING_TIMES=['06:30','12:30','18:30'];
  // Removed feeding times (focus only on watering + plant care)

  // Periodic soil moisture update based on temperature
  useEffect(() => {
    if (!farmId || !token) return;
    let intervalId;
    let stop = false;
    async function updateMoisture() {
      // Get geolocation
      let lat = geo.lat, lon = geo.lon;
      if (!lat || !lon) {
        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              pos => { lat = pos.coords.latitude; lon = pos.coords.longitude; resolve(); },
              err => reject(err)
            );
          });
        } catch { return; }
      }
      // Fetch temperature (current hour)
      let tempC = 25;
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
        const r = await fetch(url); const data = await r.json();
        tempC = data?.current_weather?.temperature ?? 25;
      } catch {}
      // Fetch latest plants from backend
      let latestPlants = [];
      try {
        const res = await axios.get(`${farmApiBase}/${farmId}/plants`, {headers: {Authorization: `Bearer ${token}`}});
        latestPlants = res.data || [];
      } catch (err) {
        console.error('[Moisture Update] Failed to fetch plants:', err);
        return;
      }
      // Calculate new moisture for each plant
      const newPlants = await Promise.all(latestPlants.map(async p => {
        let moisture = typeof p.soilMoisture === 'number' ? p.soilMoisture : 80;
        // Simple model: lose 1% per 10min at 20C, +0.5% per degree above 20C, -0.3% per degree below 20C
        let loss = 1 + Math.max(0, tempC-20)*0.5 - Math.max(0, 20-tempC)*0.3;
        moisture = Math.max(0, Math.min(100, moisture - loss));
        // POST to backend (liters=0, just update moisture)
        try {
          console.log(`[Moisture Update] Posting to: ${farmApiBase}/${farmId}/plants/${p.id}/water?liters=0`, {soilMoisture: moisture});
          const resp = await axios.post(`${farmApiBase}/${farmId}/plants/${p.id}/water?liters=0`, {soilMoisture: moisture}, {headers:{Authorization:`Bearer ${token}`}});
          console.log('[Moisture Update] POST success:', resp.status, resp.data);
          // notify dashboard and other listeners
          try { window.dispatchEvent(new Event('farmDataChanged')); } catch(e){}
        } catch (err) {
          console.error('[Moisture Update] POST failed:', err?.response?.status, err?.response?.data, err);
        }
        return {...p, soilMoisture: moisture};
      }));
      if (!stop) setPlants(newPlants);
    }
    updateMoisture();
    intervalId = setInterval(updateMoisture, 10*60*1000); // every 10 min
    return () => { stop = true; clearInterval(intervalId); };
  }, [farmId, token, geo.lat, geo.lon]);

  // Resolve token & farm
  useEffect(()=>{
    const t=localStorage.getItem('token');
    if(!t){setError('Not authenticated'); setLoading(false); return;}
    setToken(t);

    const attemptResolve = async () => {
      setLoading(true); setError('');
      let uid = null;
      try {
        const r = await axios.get('http://localhost:8080/auth/user',{ headers:{Authorization:`Bearer ${t}`}}); 
        const u = r.data || {};
        uid = u.id || u.userId || u._id || u.sub || u.uid || null;
      } catch {}
      if(!uid){
        const decoded = safeDecode(t) || {};
        uid = decoded.id || decoded.userId || decoded._id || decoded.sub || decoded.uid || null;
      }
      let fid = localStorage.getItem('farmId');
      if(!uid && !fid){
        setError('Cannot resolve user (token missing id/sub). Please re-login.');
        setLoading(false);
        return;
      }
      if(uid) setUserId(uid);
      if(!fid && uid){
        try {
          const fr = await axios.get(`${farmApiBase}/user/${uid}`,{headers:{Authorization:`Bearer ${t}`}}); 
          fid = fr.data?.id;
          if(fid) localStorage.setItem('farmId', fid);
        } catch {
          setError('Farm not found for this user');
          setLoading(false);
          return;
        }
      }
      if(!fid){
        setError('No farm associated. Create a farm first.');
        setLoading(false);
        return;
      }
      setFarmId(fid);
      setLoading(false);
    };
    attemptResolve();
  },[]);

  // Fetch core data
  useEffect(()=>{ if(!farmId||!token) return; let cancelled=false; (async()=>{
    setRefreshing(true);
    const headers={Authorization:`Bearer ${token}`};
    try {
      const [plantsRes, todayPlantRes, tankRes, suggestRes, rainRes, usageRes] = await Promise.all([
        axios.get(`${farmApiBase}/${farmId}/plants`,{headers}).catch(()=>({data:[]})),
        axios.get(`${farmApiBase}/${farmId}/plants/today-schedule`,{headers}).catch(()=>({data:[]})),
        axios.get(`${farmApiBase}/${farmId}/tank-level`,{headers}).catch(()=>({data:null})),
        axios.get(`${farmApiBase}/${farmId}/ai-suggestion`,{headers}).catch(()=>({data:null})),
        axios.get(`${farmApiBase}/${farmId}/rain-forecast`,{headers}).catch(()=>({data:null})),
        axios.get(`${farmApiBase}/${farmId}/water-usage`,{headers}).catch(()=>({data:null})),
      ]);
      if(cancelled) return;
      const pl=plantsRes.data||[];
      setPlants(pl);
      setTankLevel(tankRes.data?.level ?? null); setLowTank(Boolean(tankRes.data?.low));
      setRainForecast(prev=> prev || Boolean(rainRes.data?.rain));
      setAiSuggestion(suggestRes.data && Object.keys(suggestRes.data).length? suggestRes.data : null);
      setTotalWaterUsed(usageRes.data?.total ?? 0);
      // Build dynamic schedule
      const today = new Date();
      const todayStr = today.toISOString().slice(0,10); // YYYY-MM-DD
      const events=[];
      // Static watering
      WATERING_TIMES.forEach(t=> events.push({time:t, type:'watering', label:'Water plants'}));
      // Robust date matcher (handles whitespace, timezone, full ISO, zone IDs)
      const dateMatches=(raw)=>{
        if(!raw) return false;
        const str = String(raw).trim();
        const m = str.match(/\d{4}-\d{2}-\d{2}/); // extract date part
        if(!m) return false;
        return m[0] === todayStr;
      };
      pl.forEach(p=>{
        const treat = dateMatches(p.nextTreatment);
        const harvest = dateMatches(p.expectedHarvestDate);
        if(treat) events.push({time:'09:00', type:'treatment', label:`Treatment: ${p.name}`});
        if(harvest) events.push({time:'05:00', type:'harvest', label:`Harvest: ${p.name}`});
      });
      // Merge explicit today endpoint (already filtered server-side)
      const todayList = todayPlantRes.data || [];
      todayList.forEach(p=>{
        if(!events.some(e=> e.type==='treatment' && e.label.endsWith(p.name)) && p.nextTreatment) events.push({time:'09:05', type:'treatment', label:`Treatment: ${p.name}`});
        if(!events.some(e=> e.type==='harvest' && e.label.endsWith(p.name)) && p.expectedHarvestDate) events.push({time:'05:05', type:'harvest', label:`Harvest: ${p.name}`});
      });
      console.log('[Schedule Build]', {today:todayStr, plants:pl.map(p=>({n:p.name,harvest:p.expectedHarvestDate,treat:p.nextTreatment})), todayEndpoint: todayList.map(p=>({n:p.name,harvest:p.expectedHarvestDate,treat:p.nextTreatment})), final:events});
      events.sort((a,b)=> a.time.localeCompare(b.time));
      setSchedule(events);
      
      // Auto-mark past watering events as done (same logic as FeedingPage)
      setTimeout(() => {
        if (didMarkThisSession.current) return;
        
        const now = new Date();
        const pastWatering = events
          .filter(ev => ev.type === 'watering')
          .map(ev => ({ ev, datetime: new Date(isoFromTime(ev.time)) }))
          .filter(({ datetime }) => datetime <= now)
          .sort((a, b) => b.datetime - a.datetime)[0]; // latest past watering
        
        if (pastWatering) {
          // Check if already marked done
          const alreadyMarked = events.some(ev => 
            ev.type === 'watering' && ev.time === pastWatering.ev.time && ev.done
          );
          
          if (!alreadyMarked) {
            setSchedule(prev => prev.map(ev => {
              if (ev.type === 'watering' && ev.time === pastWatering.ev.time) {
                return { ...ev, done: true, doneAt: new Date().toISOString() };
              }
              return ev;
            }));
            didMarkThisSession.current = true;
          }
        }
      }, 1000);
      
      // Next watering
      const now=new Date();
      const nextW = WATERING_TIMES.map(t=>isoFromTime(t)).find(iso=> new Date(iso)> now) || isoFromTime(WATERING_TIMES[0]);
      setNextWatering(nextW);
      const nextEvt = events.find(ev=> new Date(isoFromTime(ev.time))> now);
      setNextEvent(nextEvt? `${nextEvt.label} at ${nextEvt.time}`: 'All Done');
      setAlert(null);
    } catch(e){ setError('Failed to load data'); }
    setRefreshing(false);
  })(); return ()=>{cancelled=true}; },[farmId,token]);

  // Geolocation-based rain probability (Open-Meteo)
  useEffect(()=>{
    if(rainForecast) return; // already got from backend
    if(!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(async pos=>{
      const {latitude, longitude}=pos.coords; setGeo({lat:latitude,lon:longitude,denied:false});
      try{
        const url=`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=precipitation_probability&forecast_days=1&timezone=auto`;
        const r= await fetch(url); const data= await r.json();
        const probs = data?.hourly?.precipitation_probability || [];
        if(probs.slice(0,6).some(p=> p>=50)) setRainForecast(true);
      }catch{}
    }, ()=> setGeo(g=>({...g,denied:true})) );
  },[rainForecast]);

  const handleRefill = async(amount)=>{
    if(!farmId||!token) return; 
    try{ 
      const r = await axios.post(`${farmApiBase}/${farmId}/tank/refill?amount=${amount}`,null,{headers:{Authorization:`Bearer ${token}`}});
      if(r.data?.level!=null) setTankLevel(r.data.level);
      setLowTank(false);
  try { window.dispatchEvent(new Event('farmDataChanged')); } catch(e){}
    }catch(e){ setError('Refill failed'); }
  };

  const handleWaterPlant = async(plantId, liters=5)=>{
    if(!farmId||!token) return; 
    try {
      const r = await axios.post(
        `${farmApiBase}/${farmId}/plants/${plantId}/water?liters=${liters}`,
        {}, // Always send a JSON body, even if empty
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );
      // update plant moisture and lastWatered if backend returns
      setPlants(prev=> prev.map(p=> p.id===plantId? {...p, ...r.data}: p));
      // Decrease tank locally (if backend already did, we fetched will be updated later; approximate now)
      setTankLevel(l=> l!=null? Math.max(0, l - liters): l);
      setTotalWaterUsed(u=> u + liters);
  try { window.dispatchEvent(new Event('farmDataChanged')); } catch(e){}
    }catch(e){ setError('Watering failed'); }
  };

  const handleWaterAllPlants = async(totalLiters)=>{
    if(!farmId||!token||!plants.length) return;
    const usable = tankLevel!=null? Math.min(tankLevel, totalLiters): totalLiters;
    if(usable<=0) return;
    const basePer = Math.floor(usable / plants.length);
    let remainder = usable - basePer * plants.length;
    for(const p of plants){
      const give = basePer + (remainder>0?1:0);
      if(remainder>0) remainder--;
      try{
        await axios.post(
          `${farmApiBase}/${farmId}/plants/${p.id}/water?liters=${give}`,
          {}, // Always send a JSON body, even if empty
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          }
        );
      }catch{/* ignore individual errors */}
    }
    // Update UI optimistically
    setPlants(prev=> prev.map(pl=> ({...pl, soilMoisture: Math.min(100,(pl.soilMoisture||50)+15), lastWatered:new Date().toISOString()})));
    setTankLevel(l=> l!=null? Math.max(0,l-usable): l);
    setTotalWaterUsed(u=> u + usable);
  try { window.dispatchEvent(new Event('farmDataChanged')); } catch(e){}
  };

  function refresh(){ setRefreshing(true); setTimeout(()=>{ setRefreshing(false); },400); }

  if(loading) return <div className='p-6'>Loading...</div>;
  if(error) return <div className='p-6 text-red-600 space-y-4'>
    <div>{error}</div>
    <div className='flex gap-2'>
      <button onClick={()=>window.location.reload()} className='bg-blue-600 text-white px-3 py-1 rounded text-sm'>Retry</button>
    </div>
  </div>;

  const nextHarvest = plants.map(p=>p.expectedHarvestDate).filter(Boolean).sort()[0] || null;
  // Removed next vaccination (animal scope removed here)

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-5 flex flex-col gap-6'>
      <div className='flex items-center justify-between flex-wrap gap-3'>
        <h1 className='text-2xl font-bold text-gray-800'>Watering & Care Dashboard</h1>
        <div className='flex gap-2'>
          <button onClick={refresh} className='flex items-center gap-2 bg-white shadow px-3 py-2 rounded-lg text-sm hover:bg-gray-50'>
            <FaSync className={refreshing? 'animate-spin':''}/> Refresh
          </button>
        </div>
      </div>
      {alert && (
        <div className='bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded flex items-center gap-2 text-sm'>
          <FaExclamationTriangle/> {alert}
        </div>
      )}
  <div className='grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6'>
        <OverviewCard icon={<FaClock className='text-blue-500'/>} title='Next Water' value={nextWatering? fmt(nextWatering):'—'} />
        <OverviewCard icon={<FaClock className='text-amber-500'/>} title='Next Event' value={nextEvent||'—'} />
        <OverviewCard icon={<FaTint className='text-indigo-500'/>} title='Water Used' value={`${totalWaterUsed} L`} />
        <OverviewCard icon={<FaWater className='text-cyan-500'/>} title='Tank' value={tankLevel!=null? `${tankLevel} L`: '—'} accent={lowTank?'text-red-600':''} />
        <OverviewCard icon={<FaCloudRain className='text-blue-400'/>} title='Rain' value={rainForecast?'Yes':'No'} />
  <OverviewCard icon={<FaLeaf className='text-emerald-600'/>} title='Next Harvest' value={nextHarvest? nextHarvest.slice(5):'—'} />
      </div>
      <div className='grid grid-cols-1 xl:grid-cols-12 gap-6'>
        <div className='xl:col-span-5 bg-white rounded-xl shadow p-5 flex flex-col'>
          <SectionHeader title='Today Schedule' icon={<FaClock className='text-blue-500'/>} />
          <ul className='flex-1 divide-y text-sm'>
            {schedule.length? schedule.map((s,i)=>{
              const isDone = !!s.done;
              return (
                <li key={i} className='py-3 flex items-center justify-between'>
                  <div className='flex flex-col'>
                    <div className='flex items-center'>
                      <span className='font-medium'>{s.time} • {s.label}</span>
                      {isDone && <span className='ml-3 text-xs text-green-600 font-semibold'>✓ Done</span>}
                    </div>
                    <span className='text-[10px] uppercase tracking-wide text-gray-400'>
                      {s.type}{isDone && s.doneAt ? ` • ${new Date(s.doneAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : ''}
                    </span>
                  </div>
                </li>
              );
            }): <li className='py-6 text-center text-gray-400'>No events</li>}
          </ul>
        </div>
  <div className='xl:col-span-4 bg-white rounded-xl shadow p-5 flex flex-col'>
          <SectionHeader title='Plant Moisture' icon={<FaLeaf className='text-green-500'/>} />
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1'>
            {plants.length? plants.map(p=>{
              const moisture=p.soilMoisture ?? 0; const severity = moisture<40? 'bg-red-100 text-red-600': moisture<60? 'bg-yellow-100 text-yellow-600':'bg-green-100 text-green-600';
              return (
                <div key={p.id} className='border rounded-lg p-3 flex flex-col gap-2'>
                  <div className='flex justify-between items-center'>
                    <span className='font-semibold text-sm truncate'>{p.name||'Plant'}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${severity}`}>{moisture}%</span>
                  </div>
                  <div className='h-2 w-full bg-gray-200 rounded overflow-hidden'>
                    <div className={`h-full ${moisture<40?'bg-red-500': moisture<60?'bg-yellow-400':'bg-green-500'}`} style={{width:`${moisture}%`}}/>
                  </div>
                  <div className='text-[10px] text-gray-500'>Last: {(() => {
                    if (!p.lastWatered) return '—';
                    let d;
                    // Try to parse ISO with zone info (e.g. 2025-08-20T02:01:59.256558800+01:00[Africa/Tunis])
                    if (typeof p.lastWatered === 'string') {
                      // Remove zone ID if present
                      const cleaned = p.lastWatered.replace(/\[.*\]$/, '');
                      d = new Date(cleaned);
                    } else if (typeof p.lastWatered === 'number') {
                      d = new Date(p.lastWatered);
                    } else if (p.lastWatered instanceof Date) {
                      d = p.lastWatered;
                    } else {
                      return '—';
                    }
                    if (isNaN(d)) return '—';
                    // Show both date and time if time is not midnight
                    const t = d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
                    if (t === '00:00' || t === '12:00 AM') return d.toLocaleDateString();
                    return d.toLocaleDateString() + ' ' + t;
                  })()}</div>
      <PlantWaterForm plantId={p.id} onWater={handleWaterPlant} disabled={tankLevel===0}/>
                </div>
              );
            }): <div className='text-gray-400 text-sm'>No plants found.</div>}
          </div>
        </div>
    <div className='xl:col-span-3 flex flex-col gap-6'>
          <div className='bg-white rounded-xl shadow p-5'>
            <SectionHeader title='AI Suggestion' icon={<FaLeaf className='text-emerald-500'/>} />
            {aiSuggestion? (
              <p className='text-sm text-gray-700'>Water <strong>{aiSuggestion.plant}</strong> now (soil {aiSuggestion.soilMoisture}%). Suggest {aiSuggestion.suggested} L.</p>
            ) : <p className='text-xs text-gray-400'>No suggestion available.</p>}
          </div>
          <div className='bg-white rounded-xl shadow p-5 text-xs text-gray-600 space-y-3'>
            <div><strong>Tip:</strong> Water early morning to reduce evaporation.</div>
            <div><strong>Rain (geo):</strong> {rainForecast? 'Likely soon.' : 'Low probability next hours.'}</div>
            <div className='flex items-center gap-2'>
              <strong>Tank:</strong> <span>{lowTank? 'Low – refill now.' : (tankLevel!=null? `${tankLevel} L` : 'N/A')}</span>
            </div>
            <RefillForm onRefill={handleRefill} loading={refreshing} />
      <WaterAllForm onWaterAll={handleWaterAllPlants} disabled={!plants.length || tankLevel===0} />
            {geo.denied && <div className='text-red-500'>Location denied – using backend only.</div>}
          </div>
        </div>
      </div>

      {/* AI Chatbot */}
      <AIChatbot 
        isOpen={chatbotOpen} 
        onToggle={() => setChatbotOpen(!chatbotOpen)}
        context="watering_management"
        pageData={{
          plants: plants,
          totalPlants: plants.length,
          moistureStats: {
            dry: plants.filter(p => (p.soilMoisture || 0) < 40).length,
            moderate: plants.filter(p => (p.soilMoisture || 0) >= 40 && (p.soilMoisture || 0) < 60).length,
            moist: plants.filter(p => (p.soilMoisture || 0) >= 60).length
          },
          wateringSchedule: schedule,
          nextWatering: nextWatering,
          tankLevel: tankLevel,
          lowTank: lowTank,
          totalWaterUsed: totalWaterUsed,
          rainForecast: rainForecast,
          aiSuggestion: aiSuggestion,
          nextEvent: nextEvent,
          farmId: farmId
        }}
      />
    </div>
  );
}

function OverviewCard({icon,title,value,accent=''}){ return (
  <div className='bg-white rounded-xl shadow p-4 flex flex-col gap-2'>
    <div className='flex items-center gap-2 text-xs font-medium text-gray-500'>{icon}<span>{title}</span></div>
    <div className={`text-lg font-bold ${accent}`}>{value}</div>
  </div>
);} 
function SectionHeader({icon,title}){ return <div className='flex items-center gap-2 mb-4'><div>{icon}</div><h2 className='font-semibold text-sm tracking-wide'>{title}</h2></div>; }

// Refill tank small form component
function RefillForm({onRefill,loading}){
  const [amount,setAmount]=React.useState('50');
  return (
    <form onSubmit={e=>{e.preventDefault(); const amt=parseFloat(amount); if(amt>0) onRefill(amt);}} className='flex flex-col gap-2 text-[11px]'>
      <label className='font-semibold'>Refill Tank (L)</label>
      <div className='flex gap-2'>
        <input type='number' min='1' step='1' value={amount} onChange={e=>setAmount(e.target.value)} className='border rounded px-2 py-1 w-20'/>
        <button disabled={loading} className='bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50'>Add</button>
      </div>
    </form>
  );
}

// Per-plant quick water form
function PlantWaterForm({plantId,onWater,disabled}){
  const [liters,setLiters]=React.useState('3');
  return (
    <form onSubmit={e=>{e.preventDefault(); const l=parseInt(liters)||0; if(l>0) onWater(plantId,l);}} className='flex items-center gap-1 text-[10px]'>
      <input type='number' min='1' className='border rounded px-1 py-0.5 w-12' value={liters} onChange={e=>setLiters(e.target.value)}/>
      <button disabled={disabled} className='bg-blue-500 text-white px-2 py-0.5 rounded disabled:opacity-40'>Water</button>
    </form>
  );
}

// Water all plants form
function WaterAllForm({onWaterAll,disabled}){
  const [total,setTotal]=React.useState('20');
  return (
    <form onSubmit={e=>{e.preventDefault(); const t=parseInt(total)||0; if(t>0) onWaterAll(t);}} className='flex flex-col gap-2 text-[11px]'>
      <label className='font-semibold'>Water All (L)</label>
      <div className='flex gap-2'>
        <input type='number' min='1' className='border rounded px-2 py-1 w-20' value={total} onChange={e=>setTotal(e.target.value)}/>
        <button disabled={disabled} className='bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-40'>Apply</button>
      </div>
    </form>
  );
}
