/**
 * PlantStatsOverview.jsx
 * Statistics dashboard for plants.
 * Usage: import PlantStatsOverview and render alongside MyPlantes or within a /plants/stats route.
 * Requires: npm i recharts file-saver
 */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Save, RefreshCcw, Filter, Download } from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, AreaChart, Area,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { saveAs } from 'file-saver';

// Heuristic constants
const FLOWER_KEYWORD = 'flower';
const COLORS = ['#16a34a','#fbbf24','#dc2626','#9ca3af']; // healthy, warning, sick, unknown

// Mock fallback dataset (ISO date strings)
const MOCK_PLANTS = [
  { id:'m1', name:'Tomato A', type:'Vegetable', plantingDate:'2025-03-10', expectedHarvestDate:'2025-06-20', quantityOrArea:'50', healthStatus:'Healthy', nextTreatment:'2025-05-01 Fungicide', fertilizer:'NPK 20-20-20', irrigation:'Drip', diseaseHistory:'2025-04-01: Early blight', imageUrl:'' },
  { id:'m2', name:'Rose Bed', type:'Flower', plantingDate:'2025-02-14', expectedHarvestDate:'2025-09-01', quantityOrArea:'30', healthStatus:'Warning', nextTreatment:'2025-05-05 Insecticide', fertilizer:'Organic Compost', irrigation:'Sprinkler', diseaseHistory:'', imageUrl:'' },
  { id:'m3', name:'Olive Tree 1', type:'Tree', plantingDate:'2023-11-01', expectedHarvestDate:'2025-11-01', quantityOrArea:'1', healthStatus:'Healthy', nextTreatment:'', fertilizer:'Manure', irrigation:'Rain-fed', diseaseHistory:'2024-06: Leaf spot', imageUrl:'' },
  { id:'m4', name:'Wheat Plot', type:'Crop', plantingDate:'2025-01-15', expectedHarvestDate:'2025-07-30', quantityOrArea:'2.5ha', healthStatus:'Sick', nextTreatment:'2025-04-28 Fungicide', fertilizer:'Urea', irrigation:'Pivot', diseaseHistory:'2025-03-01: Rust; 2025-04-10: Powdery mildew', imageUrl:'' },
  { id:'m5', name:'Mint Patch', type:'Herb', plantingDate:'2025-03-25', expectedHarvestDate:'2025-05-30', quantityOrArea:'10', healthStatus:'Healthy', nextTreatment:'', fertilizer:'Organic Compost', irrigation:'Drip', diseaseHistory:'', imageUrl:'' },
  { id:'m6', name:'Sunflower Row', type:'Flower', plantingDate:'2025-04-05', expectedHarvestDate:'2025-08-10', quantityOrArea:'120', healthStatus:'Healthy', nextTreatment:'2025-05-15 Fertilizer', fertilizer:'NPK 10-10-10', irrigation:'Drip', diseaseHistory:'', imageUrl:'' }
];

// Utility: parse date string defensively
function parseDate(d){ if(!d) return null; const dt = new Date(d); return isNaN(dt.getTime()) ? null : dt; }

// Transform plants with derived fields
function enrichPlants(plants){
  const today = Date.now();
  return plants.map(p=>{
    const planting = parseDate(p.plantingDate);
    const harvest = parseDate(p.expectedHarvestDate);
    let growthProgress = 0; let daysUntilHarvest = null;
    if(planting && harvest){
      const total = harvest.getTime()-planting.getTime();
      const elapsed = today - planting.getTime();
      growthProgress = total>0 ? Math.min(100, Math.max(0, (elapsed/total)*100)) : 0;
      daysUntilHarvest = Math.ceil((harvest.getTime()-today)/86400000);
    }
    const monthKey = planting ? planting.toISOString().slice(0,7) : 'unknown';
    // disease incidents parse: lines with pattern YYYY-MM or YYYY-MM-DD
    let diseaseIncidents = [];
    if(p.diseaseHistory){
      const parts = p.diseaseHistory.split(/;|\n/).map(s=>s.trim()).filter(Boolean);
      parts.forEach(seg=>{
        const match = seg.match(/(20\d{2}-\d{2}(-\d{2})?)/); // simple date pattern
        if(match){
          const dt = parseDate(match[1]);
            if(dt) diseaseIncidents.push({ date: dt.toISOString().slice(0,10), text: seg });
        }
      });
    }
    let numericQuantity = null;
    if(p.quantityOrArea){
      const numMatch = p.quantityOrArea.match(/\d+(\.\d+)?/);
      if(numMatch) numericQuantity = parseFloat(numMatch[0]);
    }
    return { ...p, planting, harvest, growthProgress, daysUntilHarvest, monthKey, diseaseIncidents, numericQuantity };
  });
}

// Aggregations
function aggregateHealthPerMonth(items){
  const map = {};
  items.forEach(p=>{
    const k = p.monthKey;
    if(!map[k]) map[k] = { month: k, Healthy:0, Warning:0, Sick:0, Unknown:0 };
    const status = (p.healthStatus||'Unknown');
    if(!map[k][status] && map[k][status]!==0) map[k][status]=0; // ensure key
    map[k][status]++;
  });
  return Object.values(map).sort((a,b)=>a.month.localeCompare(b.month));
}

function countActivePlantsPerMonth(items){
  // Active defined by having plantingDate in or before month; simplification
  const months = {};
  items.forEach(p=>{ if(p.monthKey!=='unknown') months[p.monthKey]=true; });
  const keys = Object.keys(months).sort();
  return keys.map(k=>({ month:k, active: items.filter(p=>p.monthKey<=k).length }));
}

function averageHarvestDaysByType(items){
  const groups = {};
  items.forEach(p=>{ if(p.daysUntilHarvest!=null){ const t=p.type||'Unknown'; (groups[t]=groups[t]||[]).push(p); }});
  return Object.entries(groups).map(([type,arr])=>({ type, avgDays: Math.round(arr.reduce((s,p)=>s+p.daysUntilHarvest,0)/arr.length) })).sort((a,b)=>b.avgDays-a.avgDays);
}

function upcomingHarvestsSeries(items){
  const today = new Date();
  const horizon = new Date(today.getTime()+90*86400000);
  const buckets = {}; // YYYY-MM-DD -> count
  items.forEach(p=>{ if(p.harvest && p.harvest<=horizon && p.harvest>=today){ const key=p.harvest.toISOString().slice(0,10); buckets[key]=(buckets[key]||0)+1; }});
  return Object.entries(buckets).sort(([a],[b])=>a.localeCompare(b)).map(([date,count])=>({ date,count }));
}

function growthScatterData(items){
  return items.filter(p=>p.numericQuantity!=null).map(p=>({ x:p.numericQuantity, y:parseFloat(p.growthProgress.toFixed(2)), z: p.daysUntilHarvest==null?5:Math.max(5, Math.min(40, p.daysUntilHarvest)), name:p.name, type:p.type }));
}

function fertilizerDistribution(items){
  const map={}; items.forEach(p=>{ if(p.fertilizer) map[p.fertilizer]=(map[p.fertilizer]||0)+1; });
  return Object.entries(map).map(([name,value])=>({ name,value })).sort((a,b)=>b.value-a.value).slice(0,8);
}

function irrigationDistribution(items){
  const map={}; items.forEach(p=>{ if(p.irrigation) map[p.irrigation]=(map[p.irrigation]||0)+1; });
  return Object.entries(map).map(([name,value])=>({ name,value })).sort((a,b)=>b.value-a.value).slice(0,8);
}

function treatmentSchedule(items){
  const map={};
  items.forEach(p=>{ if(p.nextTreatment){ const dtMatch = p.nextTreatment.match(/(20\d{2}-\d{2}-\d{2})/); if(dtMatch){ const d=dtMatch[1]; map[d]=(map[d]||0)+1; } }});
  return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).map(([date,count])=>({ date,count }));
}

function diseaseHeatmap(items){
  const map={};
  items.forEach(p=> p.diseaseIncidents.forEach(di=>{ map[di.date]=(map[di.date]||0)+1; }));
  return Object.entries(map).map(([date,count])=>({ date,count }));
}

// Export helpers
function exportCSV(rows, filename){
  if(!rows.length) return;
  const header = Object.keys(rows[0]);
  const csv = [header.join(','), ...rows.map(r=>header.map(h=>JSON.stringify(r[h]??'')).join(','))].join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
}

// Chart components (kept lightweight)
const HealthDonut = ({ data, onFilter }) => {
  const total = data.reduce((s,d)=>s+d.value,0);
  return (
    <div className="bg-white border rounded-lg p-4 flex flex-col" aria-label="Health status distribution">
      <h3 className="text-sm font-semibold mb-3">Health Status</h3>
      <div className="h-56">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} onClick={(d)=>onFilter && onFilter({healthStatus:[d.name]})}>
              {data.map((entry,i)=>(<Cell key={entry.name} fill={COLORS[i]}/>))}
            </Pie>
            <ReTooltip formatter={(v,n)=>[v, n]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-500 mt-2">Total: {total}</p>
    </div>
  );
};

const MonthlyStatusStack = ({ data, onFilter }) => (
  <div className="bg-white border rounded-lg p-4" aria-label="Monthly health status trends">
    <h3 className="text-sm font-semibold mb-3">Monthly Health Trends</h3>
    <div className="h-64">
      <ResponsiveContainer>
        <AreaChart data={data} stackOffset="expand">
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="month" tick={{fontSize:10}} />
          <YAxis tickFormatter={v=>Math.round(v*100)+'%'} width={40} />
          <ReTooltip formatter={(v)=> (Math.round(v*100)+'%')} />
          <Area type="monotone" dataKey="Healthy" stackId="1" stroke="none" fill={COLORS[0]} onClick={()=>onFilter && onFilter({healthStatus:['Healthy']})}/>
          <Area type="monotone" dataKey="Warning" stackId="1" stroke="none" fill={COLORS[1]} onClick={()=>onFilter && onFilter({healthStatus:['Warning']})}/>
          <Area type="monotone" dataKey="Sick" stackId="1" stroke="none" fill={COLORS[2]} onClick={()=>onFilter && onFilter({healthStatus:['Sick']})}/>
          <Area type="monotone" dataKey="Unknown" stackId="1" stroke="none" fill={COLORS[3]} onClick={()=>onFilter && onFilter({healthStatus:[null]})}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const ActivePlantsLine = ({ data }) => (
  <div className="bg-white border rounded-lg p-4" aria-label="Active plants over time">
    <h3 className="text-sm font-semibold mb-3">Active Plants</h3>
    <div className="h-64">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="month" tick={{fontSize:10}} />
            <YAxis />
            <ReTooltip />
            <Line type="monotone" dataKey="active" stroke="#16a34a" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const AvgHarvestByType = ({ data }) => (
  <div className="bg-white border rounded-lg p-4" aria-label="Average days until harvest by type">
    <h3 className="text-sm font-semibold mb-3">Avg Days Until Harvest / Type</h3>
    <div className="h-64">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{left:60}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="type" width={60} />
          <ReTooltip />
          <Bar dataKey="avgDays" fill="#16a34a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const UpcomingHarvests = ({ data }) => (
  <div className="bg-white border rounded-lg p-4" aria-label="Upcoming harvests next 90 days">
    <h3 className="text-sm font-semibold mb-3">Upcoming Harvests (90d)</h3>
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="date" tick={{fontSize:10}} />
          <YAxis allowDecimals={false} />
          <ReTooltip />
          <Bar dataKey="count" fill="#fbbf24" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const GrowthScatter = ({ data }) => (
  <div className="bg-white border rounded-lg p-4" aria-label="Growth vs Quantity scatter">
    <h3 className="text-sm font-semibold mb-3">Growth % vs Quantity</h3>
    <div className="h-64">
      <ResponsiveContainer>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="x" name="Quantity" />
          <YAxis dataKey="y" name="Growth%" />
          <ZAxis dataKey="z" range={[60,400]} name="Days Until Harvest" />
          <ReTooltip cursor={{stroke:'#16a34a'}} formatter={(v,n,props)=>[v, n]} contentStyle={{fontSize:'0.75rem'}} />
          <Scatter data={data} fill="#16a34a" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const DistributionBar = ({ title, data }) => (
  <div className="bg-white border rounded-lg p-4" aria-label={title}>
    <h3 className="text-sm font-semibold mb-3">{title}</h3>
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{left:80}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={80} />
          <ReTooltip />
          <Bar dataKey="value" fill="#16a34a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const TreatmentSchedule = ({ data }) => (
  <div className="bg-white border rounded-lg p-4" aria-label="Treatment schedule">
    <h3 className="text-sm font-semibold mb-3">Scheduled Treatments</h3>
    <div className="h-56">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="date" tick={{fontSize:10}} />
          <YAxis allowDecimals={false} />
          <ReTooltip />
          <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Main container
const PlantStatsOverview = ({ endpoint='http://localhost:8080/api/plants' }) => {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ types:[], healthStatus:[], startMonth:null, endMonth:null });

  const fetchData = useCallback(async()=>{
    setLoading(true); setError(null);
    try {
      const res = await axios.get(endpoint);
      const arr = Array.isArray(res.data) ? res.data : [];
      setRaw(arr.length? arr : MOCK_PLANTS); // fallback if empty
    } catch (e){
      setRaw(MOCK_PLANTS);
      setError('Using mock data (API error)');
    } finally { setLoading(false); }
  }, [endpoint]);

  useEffect(()=>{ fetchData(); }, [fetchData]);

  const enriched = useMemo(()=> enrichPlants(raw), [raw]);

  // Apply filters
  const filtered = enriched.filter(p=>{
    if(filters.types.length && !filters.types.includes(p.type||'Unknown')) return false;
    if(filters.healthStatus.length){
      const hs = p.healthStatus || 'Unknown';
      if(!filters.healthStatus.includes(hs)) return false;
    }
    if(filters.startMonth){ if(p.monthKey < filters.startMonth) return false; }
    if(filters.endMonth){ if(p.monthKey > filters.endMonth) return false; }
    return true;
  });

  // Aggregated datasets
  const healthCounts = useMemo(()=>{
    const map = { Healthy:0, Warning:0, Sick:0, Unknown:0 };
    filtered.forEach(p=>{ const key = p.healthStatus || 'Unknown'; if(map[key]==null) map[key]=0; map[key]++; });
    return Object.entries(map).map(([name,value])=>({ name,value }));
  }, [filtered]);

  const healthPerMonth = useMemo(()=> aggregateHealthPerMonth(filtered), [filtered]);
  const activePerMonth = useMemo(()=> countActivePlantsPerMonth(filtered), [filtered]);
  const avgHarvest = useMemo(()=> averageHarvestDaysByType(filtered), [filtered]);
  const upcoming = useMemo(()=> upcomingHarvestsSeries(filtered), [filtered]);
  const scatter = useMemo(()=> growthScatterData(filtered), [filtered]);
  const fertilizer = useMemo(()=> fertilizerDistribution(filtered), [filtered]);
  const irrigation = useMemo(()=> irrigationDistribution(filtered), [filtered]);
  const treatment = useMemo(()=> treatmentSchedule(filtered), [filtered]);
  const disease = useMemo(()=> diseaseHeatmap(filtered), [filtered]);

  // KPI metrics (reuse existing heuristics)
  const kpis = useMemo(()=>{
    const total = filtered.length;
    const flowering = filtered.filter(p => (p.type||'').toLowerCase().includes(FLOWER_KEYWORD)).length;
    const withNextTreatment = filtered.filter(p=> p.nextTreatment && p.nextTreatment.trim()!=='' ).length;
    const upcomingHarvests = filtered.filter(p=> p.daysUntilHarvest!=null && p.daysUntilHarvest>=0 && p.daysUntilHarvest<=30).length;
    return { total, flowering, withNextTreatment, upcomingHarvests };
  }, [filtered]);

  function handleFilter(part){ setFilters(prev=> ({ ...prev, ...part })); }

  function exportAggregates(){
    exportCSV(enriched.map(p=>({ id:p.id, name:p.name, type:p.type, health:p.healthStatus, daysUntilHarvest:p.daysUntilHarvest, growth: p.growthProgress.toFixed(1) })), 'plants_export.csv');
  }

  function exportChartsPNG(){
    // Placeholder: instruct user to use browser screenshot for now.
    alert('PNG export placeholder – implement html2canvas if needed.');
  }

  const monthOptions = useMemo(()=> Array.from(new Set(enriched.map(p=>p.monthKey))).filter(m=>m!=='unknown').sort(), [enriched]);
  const typeOptions = useMemo(()=> Array.from(new Set(enriched.map(p=>p.type||'Unknown'))).sort(), [enriched]);

  if(loading) return <div className="p-6 text-sm">Loading statistics...</div>;

  return (
    <div className="space-y-6">
      {error && <div className="text-xs text-red-500">{error}</div>}
      {/* Controls */}
      <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">Types</label>
          <select multiple value={filters.types} onChange={e=>handleFilter({types: Array.from(e.target.selectedOptions).map(o=>o.value)})} className="border rounded px-2 py-1 text-xs h-24 min-w-[130px]">
            {typeOptions.map(t=> <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Health</label>
          <select multiple value={filters.healthStatus} onChange={e=>handleFilter({healthStatus: Array.from(e.target.selectedOptions).map(o=>o.value)})} className="border rounded px-2 py-1 text-xs h-24 min-w-[120px]">
            {['Healthy','Warning','Sick','Unknown'].map(h=> <option key={h}>{h}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Start Month</label>
          <select value={filters.startMonth||''} onChange={e=>handleFilter({startMonth: e.target.value||null})} className="border rounded px-2 py-1 text-xs">
            <option value="">--</option>
            {monthOptions.map(m=> <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">End Month</label>
          <select value={filters.endMonth||''} onChange={e=>handleFilter({endMonth: e.target.value||null})} className="border rounded px-2 py-1 text-xs">
            <option value="">--</option>
            {monthOptions.map(m=> <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"><RefreshCcw size={14}/>Refresh</button>
          <button onClick={exportAggregates} className="flex items-center gap-1 text-xs bg-green-600 text-white hover:bg-green-700 px-3 py-1 rounded"><Download size={14}/>CSV</button>
          <button onClick={exportChartsPNG} className="flex items-center gap-1 text-xs bg-gray-800 text-white hover:bg-black px-3 py-1 rounded"><Save size={14}/>PNG</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total', value:kpis.total },
          { label:'Flowering', value:kpis.flowering },
          { label:'With Next Treatment', value:kpis.withNextTreatment },
          { label:'Upcoming Harvests (30d)', value:kpis.upcomingHarvests }
        ].map(k=>(
          <div key={k.label} className="bg-white border rounded-lg p-4 flex flex-col">
            <span className="text-xs text-gray-500">{k.label}</span>
            <span className="text-2xl font-bold text-gray-900">{k.value}</span>
          </div>
        ))}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HealthDonut data={healthCounts} onFilter={handleFilter} />
        <MonthlyStatusStack data={healthPerMonth} onFilter={handleFilter} />
        <ActivePlantsLine data={activePerMonth} />
        <AvgHarvestByType data={avgHarvest} />
        <UpcomingHarvests data={upcoming} />
        <GrowthScatter data={scatter} />
        <DistributionBar title="Fertilizers" data={fertilizer} />
        <DistributionBar title="Irrigation" data={irrigation} />
        <TreatmentSchedule data={treatment} />
      </div>

      {/* Disease Heatmap simplified list */}
      {disease.length>0 && (
        <div className="bg-white border rounded-lg p-4" aria-label="Disease incidents list">
          <h3 className="text-sm font-semibold mb-3">Disease Incidents</h3>
          <div className="max-h-40 overflow-y-auto text-xs space-y-1">
            {disease.sort((a,b)=>a.date.localeCompare(b.date)).map(d=> <p key={d.date}>{d.date}: {d.count}</p>)}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantStatsOverview;

export {
  enrichPlants,
  aggregateHealthPerMonth,
  countActivePlantsPerMonth,
  averageHarvestDaysByType,
  upcomingHarvestsSeries,
  growthScatterData
};
