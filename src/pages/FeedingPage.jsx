import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaDrumstickBite, FaSync, FaExclamationTriangle, FaCalendarAlt, FaSyringe, FaClock, FaDog } from 'react-icons/fa';
import { GiCow, GiChicken, GiSheep } from 'react-icons/gi';

const farmApiBase = 'http://localhost:8080/api/farms';

function fmt(dt) { if (!dt) return '—'; const d = new Date(dt); if (isNaN(d)) return dt; return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
function isoFromTime(t){ if(!t) return null; const m=t.match(/^(\d{1,2}):(\d{2})$/); if(!m) return null; const now=new Date(); return new Date(now.getFullYear(),now.getMonth(),now.getDate(),+m[1],+m[2]).toISOString(); }

export default function FeedingPage(){
  const [token,setToken]=useState(null); const [farmId,setFarmId]=useState(null);
  const [animals,setAnimals]=useState([]);
  const [schedule,setSchedule]=useState([]);
  const [nextFeeding,setNextFeeding]=useState(null);
  const [totalIntake,setTotalIntake]=useState(0);
  const [cowTank,setCowTank]=useState({level:0,low:false});
  const [dogTank,setDogTank]=useState({level:0,low:false});
  const [chickenTank,setChickenTank]=useState({level:0,low:false});
  const [sheepTank,setSheepTank]=useState({level:0,low:false});
  const [usageTotals,setUsageTotals]=useState({cow:0,dog:0,chicken:0,sheep:0});
  const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const [alert,setAlert]=useState(null); const [refreshing,setRefreshing]=useState(false);
  const [geo,setGeo]=useState({lat:null,lon:null,denied:false});

  const FEEDING_TIMES=['07:00','12:00','18:00'];

  // defaults per species (daily liters)
  const DEFAULT_INTAKE = { cow: 25, dog: 1.5, sheep: 4, chicken: 0.2 };

  function getRecommended(a){
    const species = (a?.species||'').toLowerCase();
    return Number(a?.recommendedIntakeLiters) || DEFAULT_INTAKE[species] || 1;
  }

  function getCurrent(a){ return Number(a?.todayIntakeLiters) || 0; }

  function hoursSinceLastIntake(a){
    try{
      const t = a?.intakeUpdatedAt; if(!t) return 24; const h = (Date.now() - new Date(t).getTime())/36e5; return isFinite(h)? h:24;
    }catch(e){ return 24; }
  }

  function hungerMultiplier(a){
    const rec = getRecommended(a); const cur = getCurrent(a); if(rec<=0) return 1;
    const hungerRemaining = Math.max(0, 1 - (cur / rec));
    const hours = hoursSinceLastIntake(a);
    let timeBonus = 0;
    if(hours > 12) timeBonus = 0.5; else if(hours > 6) timeBonus = 0.2;
    // multiplier grows with hunger remaining, capped at 2x
    const m = Math.min(2, 1 + hungerRemaining * 0.8 + timeBonus);
    return m;
  }

  useEffect(()=>{ const t=localStorage.getItem('token'); if(!t){ setError('Not authenticated'); setLoading(false); return;} setToken(t); const fid=localStorage.getItem('farmId'); if(!fid){ setError('No farm selected'); setLoading(false); return;} setFarmId(fid); },[]);

  const fetchCore = async()=>{
    if(!farmId||!token) return;
    setRefreshing(true);
    const headers={Authorization:`Bearer ${token}`};
    try{
      const [animalsRes,todayRes,intakeRes] = await Promise.all([
        axios.get(`${farmApiBase}/${farmId}/animals`,{headers}).catch(()=>({data:[]})),
        axios.get(`${farmApiBase}/${farmId}/animals/today-schedule`,{headers}).catch(()=>({data:[]})),
        axios.get(`${farmApiBase}/${farmId}/today-intake`,{headers}).catch(()=>({data:{intake:0}})),
      ]);
      console.log('[Feeding] fetchCore: fetched animals/today-schedule/today-intake', {
        animalsCount: animalsRes?.data?.length ?? 0,
        scheduleCount: todayRes?.data?.length ?? 0,
        todayIntake: intakeRes?.data
      });
      const serverAnimals = animalsRes.data || [];
      // Merge server animals with any optimistic local updates: prefer larger todayIntakeLiters
      setAnimals(prev => serverAnimals.map(sa => {
        const serverIntake = Number(sa.todayIntakeLiters) || 0;
        const local = (prev || []).find(p => p.id === sa.id);
        if(local && (Number(local.todayIntakeLiters) || 0) > serverIntake){
          return { ...sa, ...local, todayIntakeLiters: Number(local.todayIntakeLiters) || serverIntake };
        }
        return { ...sa, todayIntakeLiters: serverIntake };
      }));
      setTotalIntake(intakeRes.data?.intake ?? 0);
      // build schedule
      const today = new Date(); const todayStr = today.toISOString().slice(0,10);
      const events = [];
      FEEDING_TIMES.forEach(t=> events.push({time:t, type:'feeding', label:'Feed animals'}));
      const list = todayRes.data || [];
      list.forEach(a=>{ if(a.nextVisit) events.push({time:'09:00', type:'vet', label:`Vet: ${a.name}`}); if(a.vaccinationDate) events.push({time:'10:00', type:'vaccination', label:`Vaccination: ${a.name}`}); });
      events.sort((a,b)=> a.time.localeCompare(b.time)); setSchedule(events);
      const now=new Date(); const nextF = FEEDING_TIMES.map(t=>isoFromTime(t)).find(iso=> new Date(iso) > now) || isoFromTime(FEEDING_TIMES[0]); setNextFeeding(nextF);
  setError('');
  // fetch tank levels and usage totals
  await fetchTanks(headers);
    }catch(e){ setError('Failed to load feeding data'); }
    setRefreshing(false); setLoading(false);
  };

  useEffect(()=>{ if(!farmId||!token) return; fetchCore(); },[farmId,token]);

  // fetch food tanks and usage totals
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
    }catch(e){ console.error('Failed to fetch tanks', e); }
  };

  const handleRefill = async (species, amount) => {
    if(!farmId||!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try{
      await axios.post(`${farmApiBase}/${farmId}/${species}-tank/refill?amount=${amount}`, {}, { headers });
      await fetchTanks(headers);
      setAlert(`${species} tank refilled by ${amount} L`);
    }catch(e){ setAlert('Refill failed'); }
  };

  // Apply farm-shaped response to local state (animals and tanks)
  const applyFarmData = (farmData) => {
  console.log('[Feeding] applyFarmData called - farmData keys:', farmData && Object.keys(farmData));
    if(!farmData) return;
    // update animals array if present
    if(Array.isArray(farmData.animals)){
      // Merge farm-provided animals with local optimistic values (prefer local higher intake)
      const fa = farmData.animals;
      setAnimals(prev => fa.map(sa => {
        const serverIntake = Number(sa.todayIntakeLiters) || 0;
        const local = (prev || []).find(p => p.id === sa.id);
        if(local && (Number(local.todayIntakeLiters) || 0) > serverIntake){
          return { ...sa, ...local, todayIntakeLiters: Number(local.todayIntakeLiters) || serverIntake };
        }
        return { ...sa, todayIntakeLiters: serverIntake };
      }));
    }
    // update per-species tanks if available on farm object
    try{
      if(farmData.cowFoodTank){ const lvl = Number(farmData.cowFoodTank.quantity||farmData.cowFoodTank.level||0); setCowTank({level: lvl, low: lvl < 50}); }
      if(farmData.dogFoodTank){ const lvl = Number(farmData.dogFoodTank.quantity||farmData.dogFoodTank.level||0); setDogTank({level: lvl, low: lvl < 20}); }
      if(farmData.chickenFoodTank){ const lvl = Number(farmData.chickenFoodTank.quantity||farmData.chickenFoodTank.level||0); setChickenTank({level: lvl, low: lvl < 20}); }
      if(farmData.sheepFoodTank){ const lvl = Number(farmData.sheepFoodTank.quantity||farmData.sheepFoodTank.level||0); setSheepTank({level: lvl, low: lvl < 50}); }
      console.log('[Feeding] applyFarmData updated tanks from farmData');
    }catch(e){ console.error('[Feeding] applyFarmData error parsing farmData', e); }
  };

  // low-level POST (send exact liters)
  const handleFeedRaw = async(animalId, liters=1)=>{
    if(!farmId||!token) return null;
    try{
  const url = `${farmApiBase}/${farmId}/animals/${animalId}/feed?liters=${liters}`;
  console.log('[Feeding] handleFeedRaw POST', { url, liters });
  const r = await axios.post(url, {}, {headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});
  const farm = r.data;
  console.log('[Feeding] handleFeedRaw response', { status: r.status, dataSample: farm && { animals: farm.animals?.length, hasCowTank: !!farm.cowFoodTank } });
      // If server returns farm object, apply it to local state
      if(farm) {
        applyFarmData(farm);
        // If server doesn't include animals array, re-fetch authoritative animals/tanks
        if(!Array.isArray(farm.animals)){
          console.log('[Feeding] handleFeedRaw: farm missing animals array; fetching core data');
          await fetchCore();
        }
      }
      return farm;
    }catch(e){ console.error('Feed failed', e); setAlert('Feeding failed'); return null; }
  };

  // hunger-aware feeder: caps at remaining recommended and adjusts by hunger/time
  const handleFeed = async(animal, requestedLiters=1)=>{
    if(!farmId||!token) return;
    const rec = getRecommended(animal); const cur = getCurrent(animal);
    const remaining = Math.max(0, rec - cur);
    if(remaining <= 0){ setAlert(`${animal.name || 'Animal'} already at or above recommended intake`); return; }
    // apply hunger multiplier
    const multiplier = hungerMultiplier(animal);
    let amount = Math.round(Math.min(remaining, requestedLiters * multiplier) * 10) / 10;
    if(amount <= 0) { setAlert('Nothing to feed'); return; }
    const farm = await handleFeedRaw(animal.id, amount);
    if(farm){
      // if server didn't return full animals payload, re-fetch authoritative data
      if(!Array.isArray(farm.animals)){
        console.log('[Feeding] handleFeed: server returned farm without animals; refreshing core data');
        await fetchCore();
      }
      // Optimistically update local animal state so UI reflects the feed immediately
      try{
        setAnimals(prev => prev.map(x => x.id === animal.id ? ({
          ...x,
          todayIntakeLiters: (Number(x.todayIntakeLiters) || 0) + amount,
          intakeUpdatedAt: new Date().toISOString()
        }) : x));
      }catch(e){ console.warn('Optimistic update failed', e); }
      // applyFarmData already ran inside handleFeedRaw for tanks; update totalIntake conservatively
      setTotalIntake(t=> t + amount);
    }
  };

  const handleFeedAll = async(totalLiters)=>{
    if(!farmId||!token||!animals.length) return;
    const total = Number(totalLiters) || 0;
    if(total <= 0) return;
    // compute per-animal base share then adjust by hunger multiplier and cap at remaining
    const count = animals.length;
    const basePer = total / count;
    const posts = [];
    const updates = [];
    let distributed = 0;
    for(let i=0;i<count;i++){
      const a = animals[i];
      const rec = getRecommended(a); const cur = getCurrent(a); const remaining = Math.max(0, rec - cur);
      if(remaining <= 0){ updates.push({id:a.id, added:0}); continue; }
      const multiplier = hungerMultiplier(a);
      let amount = Math.round(Math.min(remaining, basePer * multiplier) * 10) / 10;
      if(amount <= 0) amount = 0;
      posts.push({id:a.id, amount});
      distributed += amount;
      updates.push({id:a.id, added: amount});
    }
    // If rounding left some leftover, try to assign remainder to the hungriest animals
    let remainder = Math.round((total - distributed) * 10) / 10;
    if(remainder > 0){
      // sort animals by remaining need desc
      const needOrder = animals.map(a=>({id:a.id, need: Math.max(0, getRecommended(a)-getCurrent(a))})).sort((x,y)=> y.need - x.need);
      for(const n of needOrder){ if(remainder <= 0) break; const p = posts.find(pr=>pr.id===n.id); if(!p) continue; const avail = Math.max(0, Math.round((Math.max(0, getRecommended(animals.find(x=>x.id===n.id)) - getCurrent(animals.find(x=>x.id===n.id))) - p.amount) * 10)/10); const add = Math.min(avail, remainder); p.amount = Math.round((p.amount + add) * 10) /10; remainder = Math.round((remainder - add) *10)/10; updates.find(u=>u.id===n.id).added = p.amount; }
    }
    try{
      console.log('[Feeding] handleFeedAll posts to send', posts);
      // Use handleFeedRaw so we get authoritative farm responses; execute sequentially to reduce race on farm updates
      for(const p of posts){
        console.log('[Feeding] handleFeedAll posting', p);
        const farm = await handleFeedRaw(p.id, p.amount);
        console.log('[Feeding] handleFeedAll post result for', p.id, { farmReturned: !!farm });
      }
      // after all, refresh authoritative data
      await fetchCore();
      const totalDistributed = Math.round(posts.reduce((s,p)=>s+p.amount,0)*10)/10;
      setTotalIntake(t=> t + totalDistributed);
      setAlert(`Distributed ${totalDistributed} L to ${posts.length} animals`);
    }catch(e){ console.error('Feed all failed', e); setAlert('Feed all failed'); }
  };

  // Admin/debug: set an animal's fullness to 1.0 using backend admin endpoint
  const adminSetFullness = async (animalOrId) => {
    if(!token) return;
    // accept either an id string or the animal object passed from FeedForm
    const id = animalOrId && typeof animalOrId === 'object' ? animalOrId.id : animalOrId;
    if(!id) return;
    try{
      const url = `${farmApiBase}/animals/${id}/set-fullness`;
      console.log('[Feeding] adminSetFullness POST', { url });
      const r = await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      console.log('[Feeding] adminSetFullness response', r.status, r.data);
      // Optimistically update local animal state so UI shows 100%
      try{
        const current = animals.find(a=>a.id===id) || null;
        // compute a numeric recommended value (fall back to species default or 1)
        const recValue = current ? (Number(current.recommendedIntakeLiters) || getRecommended(current) || 1) : 1;
        const cur = current ? (Number(current.todayIntakeLiters) || 0) : 0;
        const added = Math.max(0, recValue - cur);
        // set both todayIntakeLiters and recommendedIntakeLiters so the UI pct = intake/rec becomes 100%
        setAnimals(prev => prev.map(a => a.id === id ? ({ ...a, todayIntakeLiters: recValue, recommendedIntakeLiters: recValue, intakeUpdatedAt: new Date().toISOString() }) : a));
        if(added > 0) setTotalIntake(t=> t + added);
      }catch(e){ console.warn('adminSetFullness optimistic update failed', e); }
      // refresh authoritative data
      await fetchCore();
      setAlert('Set animal to full (debug)');
    }catch(e){ console.error('[Feeding] adminSetFullness failed', e); setAlert('Admin set-fullness failed'); }
  };

  function refresh(){ fetchCore(); }

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
            {schedule.length? schedule.map((s,i)=>( <li key={i} className='py-3 flex items-center justify-between'><div className='flex flex-col'><span className='font-medium'>{s.time} • {s.label}</span><span className='text-[10px] uppercase tracking-wide text-gray-400'>{s.type}</span></div></li> )): <li className='py-6 text-center text-gray-400'>No events</li>}
          </ul>
        </div>

        <div className='xl:col-span-4 bg-white rounded-xl shadow p-5 flex flex-col'>
          <SectionHeader title='Animal Intake' icon={<FaDrumstickBite className='text-orange-500'/>} />
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1'>
            {animals.length? animals.map(a=>{
              const intake = a.todayIntakeLiters ?? 0; const rec = a.recommendedIntakeLiters ?? 1; const pct = Math.round((intake/rec)*100);
              const severity = pct<40? 'bg-red-100 text-red-600': pct<80? 'bg-yellow-100 text-yellow-600':'bg-green-100 text-green-600';
              return (
                <div key={a.id} className='border rounded-lg p-3 flex flex-col gap-2'>
                  <div className='flex justify-between items-center'>
                    <span className='font-semibold text-sm truncate'>{a.name||'Animal'}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${severity}`}>{Math.min(100,pct)}%</span>
                  </div>
                  <div className='h-2 w-full bg-gray-200 rounded overflow-hidden'><div className={`h-full ${pct<40?'bg-red-500': pct<80?'bg-yellow-400':'bg-green-500'}`} style={{width:`${Math.min(100,pct)}%`}}/></div>
                  <div className='text-[10px] text-gray-500'>Last Intake: {a.intakeUpdatedAt? new Date(a.intakeUpdatedAt).toLocaleString() : '—'}</div>
                  <div className='flex items-center justify-between'>
                    <FeedForm animal={a} onFeed={adminSetFullness} />
                    <button onClick={() => adminSetFullness(a.id)} className='text-blue-500 hover:underline'></button>
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
    </div>
  );
}

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

function TankMiniCard({icon,title,value}){
  return (
    <div className='bg-white rounded-xl shadow px-3 py-2 flex items-center gap-3 text-sm'>
      <div className='w-8 h-8 flex items-center justify-center text-xl'>{icon}</div>
      <div className='flex-1'>
        <div className='font-medium'>{title}</div>
  <div className='text-xs text-gray-700 font-semibold'>{value}</div>
      </div>
    </div>
  );
}

function FeedForm({animal,onFeed}){
  const [liters,setLiters]=useState('1');
  return (
    <form onSubmit={e=>{e.preventDefault(); const l=parseFloat(liters)||0; if(l>0) onFeed(animal,l);}} className='flex items-center gap-1 text-[10px]'>
      <input type='number' min='0.1' step='0.1' className='border rounded px-1 py-0.5 w-16' value={liters} onChange={e=>setLiters(e.target.value)}/>
      <button className='bg-orange-500 text-white px-2 py-0.5 rounded'>Feed</button>
    </form>
  );
}

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
