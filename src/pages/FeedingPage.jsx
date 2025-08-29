import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaDrumstickBite, FaSync, FaExclamationTriangle, FaCalendarAlt, FaSyringe, FaClock, FaDog } from 'react-icons/fa';
import { GiCow, GiChicken, GiSheep } from 'react-icons/gi';
import AIChatbot from '../components/AIChatbot';

const farmApiBase = 'http://localhost:8080/api/farms';

function fmt(dt) { if (!dt) return '—'; const d = new Date(dt); if (isNaN(d)) return dt; return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function isoFromTime(t){ if(!t) return null; const m=t.match(/^(\d{1,2}):(\d{2})$/); if(!m) return null; const now=new Date(); return new Date(now.getFullYear(),now.getMonth(),now.getDate(),+m[1],+m[2]).toISOString(); }

// ------------ fullness helpers ------------
function normalizeFullnessValue(raw){
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  if (Number.isNaN(n)) return null;
  if (n > 0 && n <= 1) return Math.round(n * 100);
  return Math.min(100, Math.max(0, Math.round(n)));
}

function getFullnessPct(a){
  const dbFullRaw = a?.fullness;
  const dbFull = normalizeFullnessValue(dbFullRaw);
  if (dbFull !== null) return dbFull;
  try{
    const intake = Number(a?.todayIntakeLiters) || 0;
    const rec = Number(a?.recommendedIntakeLiters) || ( (a?.species && { cow:25,dog:1.5,sheep:4,chicken:0.2 }[a.species.toLowerCase()]) || 1 );
    if(rec <= 0) return 0;
    const pct = Math.round((intake / rec) * 100);
    return Math.min(100, Math.max(0, pct));
  }catch(e){
    console.warn('[fullness] compute fallback failed', e);
    return 0;
  }
}

// ------------ Component ------------
export default function FeedingPage(){
  const [token,setToken]=useState(null);
  const [farmId,setFarmId]=useState(null);
  const [animals,setAnimals]=useState([]);
  const [schedule,setSchedule]=useState([]);
  const [nextFeeding,setNextFeeding]=useState(null);
  const [totalIntake,setTotalIntake]=useState(0);
  const [cowTank,setCowTank]=useState({level:0,low:false});
  const [dogTank,setDogTank]=useState({level:0,low:false});
  const [chickenTank,setChickenTank]=useState({level:0,low:false});
  const [sheepTank,setSheepTank]=useState({level:0,low:false});
  const [usageTotals,setUsageTotals]=useState({cow:0,dog:0,chicken:0,sheep:0});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [alert,setAlert]=useState(null);
  const [refreshing,setRefreshing]=useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const didMarkThisSession = useRef(false); // simple guard for front-only marking

  const FEEDING_TIMES = ['07:00','12:00','18:00'];
  const DEFAULT_INTAKE = { cow: 25, dog: 1.5, sheep: 4, chicken: 0.2 };

  function getRecommended(a){ const species = (a?.species||'').toLowerCase(); return Number(a?.recommendedIntakeLiters) || DEFAULT_INTAKE[species] || 1; }
  function getCurrent(a){ return Number(a?.todayIntakeLiters) || 0; }
  function hoursSinceLastIntake(a){ try{ const t = a?.intakeUpdatedAt; if(!t) return 24; const h = (Date.now() - new Date(t).getTime())/36e5; return isFinite(h)? h:24; }catch(e){ return 24; } }
  function hungerMultiplier(a){ const rec = getRecommended(a); const cur = getCurrent(a); if(rec<=0) return 1; const hungerRemaining = Math.max(0, 1 - (cur / rec)); const hours = hoursSinceLastIntake(a); let timeBonus = 0; if(hours > 12) timeBonus = 0.5; else if(hours > 6) timeBonus = 0.2; const m = Math.min(2, 1 + hungerRemaining * 0.8 + timeBonus); return m; }

  useEffect(()=>{ 
    const t=localStorage.getItem('token');
    if(!t){ setError('Not authenticated'); setLoading(false); return;}
    setToken(t);
    const fid=localStorage.getItem('farmId');
    if(!fid){ setError('No farm selected'); setLoading(false); return;}
    setFarmId(fid);
  },[]);

  // ---------- fetch core ----------
  const fetchCore = async()=>{
    if(!farmId||!token) return;
    setRefreshing(true);
    const headers={Authorization:`Bearer ${token}`};
    try{
      console.log('[Feeding] fetchCore: start', { farmId });
      const [animalsRes,todayRes,intakeRes] = await Promise.all([
        axios.get(`${farmApiBase}/${farmId}/animals`,{headers}).catch(err=>{ console.warn('[fetchCore] animals API failed', err); return {data:[]}; }),
        axios.get(`${farmApiBase}/${farmId}/animals/today-schedule`,{headers}).catch(err=>{ console.warn('[fetchCore] schedule API failed', err); return {data:[]}; }),
        axios.get(`${farmApiBase}/${farmId}/today-intake`,{headers}).catch(err=>{ console.warn('[fetchCore] intake API failed', err); return {data:{intake:0}}; }),
      ]);

      console.log('[Feeding] fetchCore: fetched counts', {
        animalsCount: animalsRes?.data?.length ?? 0,
        scheduleCount: todayRes?.data?.length ?? 0,
        todayIntake: intakeRes?.data
      });

      const serverAnimals = (animalsRes.data || []).map(sa => ({
        ...sa,
        todayIntakeLiters: Number(sa.todayIntakeLiters) || 0,
        recommendedIntakeLiters: sa.recommendedIntakeLiters === null || sa.recommendedIntakeLiters === undefined ? undefined : Number(sa.recommendedIntakeLiters),
        fullness: normalizeFullnessValue(sa.fullness)
      }));

      setAnimals(prev => {
        const prevList = prev || [];
        return serverAnimals.map(sa => {
          const local = prevList.find(p=>p.id === sa.id);
          if(local && (Number(local.todayIntakeLiters)||0) > (Number(sa.todayIntakeLiters)||0)){
            console.log('[Feeding] fetchCore: keeping local optimistic intake for', sa.id);
            return { ...sa, ...local, todayIntakeLiters: Number(local.todayIntakeLiters) || sa.todayIntakeLiters, fullness: sa.fullness ?? local.fullness };
          }
          return sa;
        });
      });

      setTotalIntake(intakeRes.data?.intake ?? 0);

      // Build static schedule for FEEDING_TIMES + server events
      const events = [];
      FEEDING_TIMES.forEach(t=> events.push({time:t, type:'feeding', label:'Feed animals'}));
      const list = todayRes.data || [];
      list.forEach(a=>{
        if(a.nextVisit) events.push({time:'09:00', type:'vet', label:`Vet: ${a.name}`});
        if(a.vaccinationDate) events.push({time:'10:00', type:'vaccination', label:`Vaccination: ${a.name}`});
      });
      events.sort((a,b)=> a.time.localeCompare(b.time));
      setSchedule(events);

      const now=new Date();
      const nextF = FEEDING_TIMES.map(t=>isoFromTime(t)).find(iso=> new Date(iso) > now) || isoFromTime(FEEDING_TIMES[0]);
      setNextFeeding(nextF);

      setError('');
      await fetchTanks(headers);
    }catch(e){
      console.error('[Feeding] fetchCore failed', e);
      setError('Failed to load feeding data');
    }
    setRefreshing(false);
    setLoading(false);
  };

  useEffect(()=>{ if(!farmId||!token) return; fetchCore(); },[farmId,token]);

  // ---------- tanks ----------
  const fetchTanks = async (headers) => {
    if(!farmId) return;
    try{
      const [cowRes,dogRes,chickenRes,sheepRes,cowUsage,dogUsage,chickenUsage,sheepUsage] = await Promise.all([
        axios.get(`${farmApiBase}/${farmId}/cow-tank-level`, { headers }).catch(()=>({data:{level:0,low:false}})),
        axios.get(`${farmApiBase}/${farmId}/dog-tank-level`, { headers }).catch(()=>({data:{level:0,low:false}})),
        axios.get(`${farmApiBase}/${farmId}/chicken-tank-level`, { headers }).catch(()=>({data:{level:0,low:false}})),
        axios.get(`${farmApiBase}/${farmId}/sheep-tank-level`, { headers }).catch(()=>({data:{level:0,low:false}})),
        axios.get(`${farmApiBase}/${farmId}/cow-tank/usage-total`, { headers }).catch(()=>({data:{total:0}})),
        axios.get(`${farmApiBase}/${farmId}/dog-tank/usage-total`, { headers }).catch(()=>({data:{total:0}})),
        axios.get(`${farmApiBase}/${farmId}/chicken-tank/usage-total`, { headers }).catch(()=>({data:{total:0}})),
        axios.get(`${farmApiBase}/${farmId}/sheep-tank/usage-total`, { headers }).catch(()=>({data:{total:0}})),
      ]);
      console.log('[Feeding] fetchTanks: raw responses', {
        cow: cowRes?.data, dog: dogRes?.data, chicken: chickenRes?.data, sheep: sheepRes?.data,
        cowUsage: cowUsage?.data, dogUsage: dogUsage?.data, chickenUsage: chickenUsage?.data, sheepUsage: sheepUsage?.data
      });
      setCowTank(cowRes.data || {level:0,low:false});
      setDogTank(dogRes.data || {level:0,low:false});
      setChickenTank(chickenRes.data || {level:0,low:false});
      setSheepTank(sheepRes.data || {level:0,low:false});
      setUsageTotals({
        cow: cowUsage.data?.total ?? 0,
        dog: dogUsage.data?.total ?? 0,
        chicken: chickenUsage.data?.total ?? 0,
        sheep: sheepUsage.data?.total ?? 0,
      });
    }catch(e){ console.error('[Feeding] fetchTanks failed', e); }
  };

  // ---------- Fullness decay over time (insert inside FeedingPage component) ----------
/*
  Strategy:
  - DECAY_RATES_PER_HOUR: percent fullness lost per hour per species.
  - A single interval runs every minute and applies decay proportional to elapsed hours.
  - State is updated with functional setState to avoid stale closures.
  - Persistence to server is commented out (optional). Persisting every minute is NOT recommended;
    batch or persist on certain thresholds instead if you want server sync.
*/

const DECAY_RATES_PER_HOUR = {
  cow: 2,      // cow loses 2% fullness per hour
  dog: 6,      // dog loses 6% per hour (more active)
  sheep: 3,    // sheep 3% per hour
  chicken: 10, // chicken 10% per hour (small body, fast depletion)
  // default fallback used if species unknown
};
const DECAY_INTERVAL_MS = 6 * 1000; // run every minute

const lastDecayRef = useRef(Date.now());
useEffect(() => {
  if (!farmId || !token) return;

  const headers = { Authorization: `Bearer ${token}` };

  const tick = async () => {
    try {
      // 1. Fetch animals
      const res = await axios.get(`${farmApiBase}/${farmId}/animals`, { headers });
      const animalsList = res.data || [];

      // 2. Trigger decay on backend for each animal
      for (const animal of animalsList) {
        try {
          const response = await axios.post(
            `${farmApiBase}/animals/${animal.id}/decrease-fullness`,
            {},
            { headers }
          );
          console.log(`[FullnessDecay] ${animal.species} (${animal.id}) updated`, response.data.fullness);
        } catch (err) {
          console.warn("[FullnessDecay] persist failed", animal.id, err);
        }
      }

      // 3. Refresh UI animals after backend update
      const refreshed = await axios.get(`${farmApiBase}/${farmId}/animals`, { headers });
      setAnimals(refreshed.data || []);
      console.log("[FullnessDecay] UI refreshed");
    } catch (err) {
      console.error("[FullnessDecay] tick failed", err);
    }
  };
    tick();

  // Run tick every 60s
  const intervalId = setInterval(tick, 360000 * 1000);

  // Cleanup
  return () => clearInterval(intervalId);
}, [farmId, token]);

  // run once immediately so UI updates right away (useful if the page was opened after some time passed)
  // ---------- refill ----------
  const handleRefill = async (species, amount) => {
    if(!farmId||!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try{
      console.log('[Feeding] handleRefill', { species, amount });
      await axios.post(`${farmApiBase}/${farmId}/${species}-tank/refill?amount=${amount}`, {}, { headers });
      await fetchTanks(headers);
      setAlert(`${species} tank refilled by ${amount} L`);
    }catch(e){ console.error('[Feeding] refill failed', e); setAlert('Refill failed'); }
  };

  // ---------- feed raw & feed all (kept simple) ----------
  const handleFeedRaw = async(animalId, liters=1)=>{
    if(!farmId||!token) return null;
    try{
      const url = `${farmApiBase}/${farmId}/animals/${animalId}/feed?liters=${liters}`;
      console.log('[Feeding] handleFeedRaw POST', { url, liters });
      const r = await axios.post(url, {}, {headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});
      const farm = r.data;
      console.log('[Feeding] handleFeedRaw response', { status: r.status, sample: farm && { animals: Array.isArray(farm.animals)?farm.animals.length:null } });
      if(farm) {
        if(farm.animals) applyFarmData(farm);
        else await fetchCore();
      }
      return farm;
    }catch(e){ console.error('[Feeding] Feed failed', e); setAlert('Feeding failed'); return null; }
  };

  const handleFeedAll = async(totalLiters)=>{
    if(!farmId||!token||!animals.length) return;
    const total = Number(totalLiters) || 0; if(total <= 0) return;
    const count = animals.length; const basePer = total / count;
    const posts = [];
    for(let i=0;i<count;i++){
      const a = animals[i];
      const rec = getRecommended(a); const cur = getCurrent(a); const remaining = Math.max(0, rec - cur);
      if(remaining <= 0) continue;
      const multiplier = hungerMultiplier(a);
      let amount = Math.round(Math.min(remaining, basePer * multiplier) * 10) / 10;
      if(amount <= 0) continue;
      posts.push({id:a.id, amount});
    }
    try{
      console.log('[Feeding] handleFeedAll posts', posts);
      for(const p of posts){
        await handleFeedRaw(p.id, p.amount);
      }
      await fetchCore();
      const totalDistributed = Math.round(posts.reduce((s,p)=>s+p.amount,0)*10)/10;
      setTotalIntake(t=> t + totalDistributed);
      setAlert(`Distributed ${totalDistributed} L`);
    }catch(e){ console.error('[Feeding] handleFeedAll failed', e); setAlert('Feed all failed'); }
  };

  // ---------- applyFarmData ----------
  const applyFarmData = (farmData) => {
    if(!farmData) return;
    console.log('[Feeding] applyFarmData', farmData && Object.keys(farmData));
    if(Array.isArray(farmData.animals)){
      const fa = farmData.animals.map(sa => ({
        ...sa,
        todayIntakeLiters: Number(sa.todayIntakeLiters) || 0,
        recommendedIntakeLiters: sa.recommendedIntakeLiters === null || sa.recommendedIntakeLiters === undefined ? undefined : Number(sa.recommendedIntakeLiters),
        fullness: normalizeFullnessValue(sa.fullness)
      }));
      setAnimals(fa);
    }
    try{
      if(farmData.cowFoodTank){ const lvl = Number(farmData.cowFoodTank.quantity||farmData.cowFoodTank.level||0); setCowTank({level: lvl, low: lvl < 50}); }
      if(farmData.dogFoodTank){ const lvl = Number(farmData.dogFoodTank.quantity||farmData.dogFoodTank.level||0); setDogTank({level: lvl, low: lvl < 20}); }
      if(farmData.chickenFoodTank){ const lvl = Number(farmData.chickenFoodTank.quantity||farmData.chickenFoodTank.level||0); setChickenTank({level: lvl, low: lvl < 20}); }
      if(farmData.sheepFoodTank){ const lvl = Number(farmData.sheepFoodTank.quantity||farmData.sheepFoodTank.level||0); setSheepTank({level: lvl, low: lvl < 50}); }
    }catch(e){ console.error('[Feeding] applyFarmData tanks parse failed', e); }
  };

  // ---------- admin set fullness ----------
  const adminSetFullness = async (animalOrId) => {
    if(!token) return;
    const id = animalOrId && typeof animalOrId === 'object' ? animalOrId.id : animalOrId;
    if(!id) return;
    try{
      const url = `${farmApiBase}/animals/${id}/set-fullness`;
      console.log('[Feeding] adminSetFullness POST', { url });
      const r = await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      console.log('[Feeding] adminSetFullness response', r.status, r.data);
      setAnimals(prev => prev.map(a => a.id === id ? ({ ...a, todayIntakeLiters: Number(a.recommendedIntakeLiters) || getRecommended(a), recommendedIntakeLiters: Number(a.recommendedIntakeLiters) || getRecommended(a), intakeUpdatedAt: new Date().toISOString(), fullness: 100 }) : a));
      await fetchCore();
      setAlert('Set animal to full (debug)');
    }catch(e){ console.error('[Feeding] adminSetFullness failed', e); setAlert('Admin set-fullness failed'); }
  };

  function refresh(){ fetchCore(); }

  // ---------- auto-mark effect: once marked done, stays done ----------
  // Mark the latest past feeding event as done if not already done; never unmark.
  useEffect(() => {
    try {
      if (!schedule.length) return;
      const now = new Date();
      // Find all feeding events in the schedule that are in FEEDING_TIMES
      const feedEvents = schedule.filter(ev => ev && ev.type === 'feeding' && FEEDING_TIMES.includes(ev.time));
      if (!feedEvents.length) return;
      // Map to { ev, iso } and keep only those with iso <= now
      const candidates = feedEvents.map(ev => {
        const iso = isoFromTime(ev.time);
        return { ev, iso: iso ? new Date(iso) : null };
      }).filter(x => x.iso && x.iso.getTime() <= now.getTime());
      if (!candidates.length) return;
      // pick the latest candidate (closest past feeding time)
      candidates.sort((a, b) => b.iso.getTime() - a.iso.getTime());
      const latest = candidates[0];
      // if that specific feeding event is already marked done, skip
      const alreadyMarked = schedule.some(ev => ev.type === 'feeding' && ev.time === latest.ev.time && ev.done);
      if (alreadyMarked || didMarkThisSession.current) return;
      // Mark only the feeding events that match latest.ev.time (there might be several with that same time)
      setSchedule(prev => prev.map(ev => {
        if (ev.type === 'feeding' && ev.time === latest.ev.time) {
          return { ...ev, done: true, doneAt: new Date().toISOString() };
        }
        return ev;
      }));
      didMarkThisSession.current = true;
    } catch (e) { console.error('[Feeding] auto-mark failed', e); }
  }, [schedule]);

  if(loading) return <div className='p-6'>Loading...</div>;
  if(error) return <div className='p-6 text-red-600 space-y-4'><div>{error}</div><div className='flex gap-2'><button onClick={()=>window.location.reload()} className='bg-blue-600 text-white px-3 py-1 rounded text-sm'>Retry</button></div></div>;

  const nextEvent = schedule.find(ev=> new Date(isoFromTime(ev.time)) > new Date());

  return (
    <div className='min-h-screen bg-gradient-to-br from-yellow-50 to-green-50 p-5 flex flex-col gap-6'>
      <div className='flex items-center justify-between flex-wrap gap-3'>
        <h1 className='text-2xl font-bold text-gray-800'>Feeding & Animal Care</h1>
        <div className='flex gap-2'>
          <button onClick={refresh} className='flex items-center gap-2 bg-white shadow px-3 py-2 rounded-lg text-sm hover:bg-gray-50'>
            <FaSync className={refreshing? 'animate-spin':''}/> Refresh
          </button>
        </div>
      </div>

      <div className='grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-9'>
        <OverviewCard icon={<FaClock className='text-blue-500'/>} title='Next Feed' value={nextFeeding? fmt(nextFeeding): '—'} />
        <OverviewCard icon={<FaClock className='text-amber-500'/>} title='Next Event' value={nextEvent? `${nextEvent.label} @ ${nextEvent.time}`: '—'} />
        <OverviewCard icon={<FaDrumstickBite className='text-orange-500'/>} title='Total Fed' value={`${totalIntake} L`} />
        <OverviewCard icon={<FaCalendarAlt className='text-cyan-500'/>} title='Animals' value={`${animals.length}`} />
        <OverviewCard icon={<FaSyringe className='text-green-500'/>} title='Vaccinations' value={`${schedule.filter(s=>s.type==='vaccination').length}`} />
        <TankMiniCard icon={<GiCow className='text-yellow-600'/>} title='Cow Tank' value={`${Math.round(cowTank.level||0)} L`} />
        <TankMiniCard icon={<FaDog className='text-indigo-600'/>} title='Dog Tank' value={`${Math.round(dogTank.level||0)} L`} />
        <TankMiniCard icon={<GiChicken className='text-rose-600'/>} title='Chicken Tank' value={`${Math.round(chickenTank.level||0)} L`} />
        <TankMiniCard icon={<GiSheep className='text-emerald-600'/>} title='Sheep Tank' value={`${Math.round(sheepTank.level||0)} L`} />
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-12 gap-6'>
        <div className='xl:col-span-5 bg-white rounded-xl shadow p-5 flex flex-col'>
          <SectionHeader title='Today Schedule' icon={<FaClock className='text-blue-500'/>} />
          <ul className='flex-1 divide-y text-sm'>
            {schedule.length ? schedule.map((s,i) => {
              const isDone = !!s.done;
              return (
                <li key={i} className='py-3 flex items-center justify-between'>
                  <div className='flex flex-col'>
                    <span className='font-medium'>
                      {s.time} • {s.label}
                      {isDone && <span className='ml-3 text-xs text-green-600 font-semibold'>✓ Done</span>}
                    </span>
                    <span className='text-[10px] uppercase tracking-wide text-gray-400'>
                      {s.type}{isDone && s.doneAt ? ` • ${new Date(s.doneAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` : ''}
                    </span>
                  </div>
                </li>
              );
            }) : (
              <li className='py-6 text-center text-gray-400'>No events</li>
            )}
          </ul>
        </div>

        <div className='xl:col-span-4 bg-white rounded-xl shadow p-5 flex flex-col'>
          <SectionHeader title='Animal Intake' icon={<FaDrumstickBite className='text-orange-500'/>} />
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1'>
            {animals.length? animals.map(a=>{
              const pct = getFullnessPct(a);
              const severity = pct<40? 'bg-red-100 text-red-600': pct<80? 'bg-yellow-100 text-yellow-600':'bg-green-100 text-green-600';
              return (
                <div key={a.id} className='border rounded-lg p-3 flex flex-col gap-2'>
                  <div className='flex justify-between items-center'>
                    <span className='font-semibold text-sm truncate'>{a.name||'Animal'}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${severity}`}>{Math.min(100,pct)}%</span>
                  </div>
                  <div className='h-2 w-full bg-gray-200 rounded overflow-hidden'><div className={`h-full ${pct<40?'bg-red-500': pct<80?'bg-yellow-400':'bg-green-500'}`} style={{width:`${Math.min(100,pct)}%`}}/></div>
                  <div className='text-[10px] text-gray-500'>Last Intake: {a.intakeUpdatedAt? new Date(a.intakeUpdatedAt).toLocaleString() : '—'}</div>
                  <div className='text-[10px] text-gray-500'>DB fullness raw: {String(a.fullness ?? 'n/a')}</div>
                  <div className='flex items-center justify-between'>
                    <div />
                    <button onClick={() => adminSetFullness(a)} className='text-blue-500 hover:underline'>Set Full</button>
                  </div>
                </div>
              );
            }): <div className='text-gray-400 text-sm'>No animals found.</div>}
          </div>
        </div>

        <div className='xl:col-span-3 flex flex-col gap-6'>
          <div className='bg-white rounded-xl shadow p-5'>
            <SectionHeader title='Food Tanks' icon={<FaDrumstickBite className='text-amber-500'/>} />
            <div className='grid grid-cols-1 gap-3'>
              <TankCard species='cow' tank={cowTank} totalUsed={usageTotals.cow} onRefill={handleRefill} />
              <TankCard species='dog' tank={dogTank} totalUsed={usageTotals.dog} onRefill={handleRefill} />
              <TankCard species='chicken' tank={chickenTank} totalUsed={usageTotals.chicken} onRefill={handleRefill} />
              <TankCard species='sheep' tank={sheepTank} totalUsed={usageTotals.sheep} onRefill={handleRefill} />
            </div>
          </div>
          <div className='bg-white rounded-xl shadow p-5 text-xs text-gray-600 space-y-3'>
            <FeedAllForm onFeedAll={handleFeedAll} />
            {alert && <div className='text-red-500'>{alert}</div>}
          </div>
        </div>
      </div>

      {/* AI Chatbot */}
      <AIChatbot 
        isOpen={chatbotOpen} 
        onToggle={() => setChatbotOpen(!chatbotOpen)}
        context="feeding_management"
        pageData={{
          animals: animals,
          totalAnimals: animals.length,
          feedingSchedule: schedule,
          nextFeeding: nextFeeding,
          totalIntake: totalIntake,
          fullnessStats: {
            hungry: animals.filter(a => getFullnessPct(a) < 40).length,
            moderate: animals.filter(a => getFullnessPct(a) >= 40 && getFullnessPct(a) < 80).length,
            satisfied: animals.filter(a => getFullnessPct(a) >= 80).length
          },
          tankLevels: {
            cow: cowTank,
            dog: dogTank,
            chicken: chickenTank,
            sheep: sheepTank
          },
          usageTotals: usageTotals,
          nextEvent: nextEvent ? `${nextEvent.label} @ ${nextEvent.time}` : null,
          farmId: farmId
        }}
      />
    </div>
  );
}

// ---------- subcomponents ----------
function TankCard({species,tank,totalUsed,onRefill}){
  const [amt,setAmt]=useState('10');
  const low = tank?.low;
  const level = tank?.level ?? 0;
  return (
    <div className='border rounded-lg p-3 flex flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <div className='font-semibold capitalize'>{species} tank</div>
        <div className='text-sm text-gray-700 font-semibold'>{Math.round(level)} L</div>
      </div>
      <div className='w-full h-2 bg-gray-200 rounded overflow-hidden'><div className={`h-full ${low? 'bg-red-500':'bg-green-500'}`} style={{width:`${Math.min(100, (level/Math.max(1, level+100))*100)}%`}}/></div>
      <div className='text-[11px] text-gray-500'>Used today: {totalUsed} L {low && <span className='text-red-500 ml-2'><FaExclamationTriangle/></span>}</div>
      <div className='flex gap-2'>
        <input type='number' min='0.1' step='0.1' className='border rounded px-2 py-1 w-20 text-sm' value={amt} onChange={e=>setAmt(e.target.value)} />
        <button onClick={()=>{ const a=parseFloat(amt)||0; if(a>0) onRefill(species,a); }} className='bg-blue-600 text-white px-3 py-1 rounded text-sm'>Refill</button>
      </div>
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

function TankMiniCard({icon,title,value}){ return (
  <div className='bg-white rounded-xl shadow px-3 py-2 flex items-center gap-3 text-sm'>
    <div className='w-8 h-8 flex items-center justify-center text-xl'>{icon}</div>
    <div className='flex-1'>
      <div className='font-medium'>{title}</div>
      <div className='text-xs text-gray-700 font-semibold'>{value}</div>
    </div>
  </div>
); }

function FeedForm(){ return null; /* removed */ }

function FeedAllForm({onFeedAll}){
  const [total,setTotal]=useState('5');
  return (
    <form onSubmit={e=>{e.preventDefault(); const t=parseFloat(total)||0; if(t>0) onFeedAll(t);}} className='flex flex-col gap-2 text-[11px]'>
      <label className='font-semibold'>Feed All (L)</label>
      <div className='flex gap-2'>
        <input type='number' min='0.1' step='0.1' className='border rounded px-2 py-1 w-20' value={total} onChange={e=>setTotal(e.target.value)}/>
        <button className='bg-orange-600 text-white px-3 py-1 rounded'>Apply</button>
      </div>
    </form>
  );
}
