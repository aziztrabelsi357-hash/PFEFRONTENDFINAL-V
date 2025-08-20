import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { PawPrint, Plus, Search, CalendarClock, Syringe, HeartPulse, Activity, Edit2, Trash2, Eye, X, Stethoscope } from 'lucide-react';

// Modern dashboard version (parity with PlantPage layout)
const MyAnimals = () => {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [farmId, setFarmId] = useState(null);
  const [farmLoading, setFarmLoading] = useState(true);

  // Add form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newForm, setNewForm] = useState({ name:'', imageUrl:'', species:'', breed:'', birthDate:'', sex:'', weight:'', healthStatus:'', feeding:'', activity:'', notes:'', vet:'', nextVisit:'', vaccinationDate:'' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

  // Editing
  const [editingAnimal, setEditingAnimal] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Selection (detail pane)
  const [selectedAnimal, setSelectedAnimal] = useState(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Local weight tracking (per animal) {id: [{date, weight}]}
  const [weightEntries, setWeightEntries] = useState({});
  const [weightInput, setWeightInput] = useState('');
  const [weightDateInput, setWeightDateInput] = useState('');

  // Medical processes
  const [processes, setProcesses] = useState({}); // {animalId: steps[]}
  const [newStepType, setNewStepType] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');
  const [processLoading, setProcessLoading] = useState(false);

  const baseAnimalsFallback = 'http://localhost:8080/api/animals'; // legacy
  const farmApiBase = 'http://localhost:8080/api/farms';

  const resolveUserAndFarm = async () => {
    const token = localStorage.getItem('token');
    const storedFarmId = localStorage.getItem('farmId');
    if (storedFarmId) {
      setFarmId(storedFarmId);
      setFarmLoading(false);
      return;
    }
    if(!token) { setError('Not authenticated'); setFarmLoading(false); return; }
    try {
      const userRes = await axios.get('http://localhost:8080/auth/user', { headers: { Authorization: `Bearer ${token}` }});
      const userId = userRes.data.id || userRes.data.userId || userRes.data._id || userRes.data.sub || null;
      if(!userId) { setError('Could not resolve user id'); setFarmLoading(false); return; }
      try {
        const farmRes = await axios.get(`${farmApiBase}/user/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${token}` }});
        const fId = farmRes.data?.id || farmRes.data?.farmId || farmRes.data?.FarmId;
        if(fId) { setFarmId(fId); localStorage.setItem('farmId', fId); } else setError('No farm found for this user');
      } catch(fErr) {
        if(fErr.response?.status === 404) setError('You have no farm yet. Create one first.'); else setError('Failed to load farm');
      }
    } catch(uErr) { setError('Failed to load user'); }
    finally { setFarmLoading(false); }
  };

  const fetchAnimals = async (activeFarmId) => {
    if(!activeFarmId) return;
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('token');
      // Try preferred farm-scoped endpoint patterns
      const endpoints = [
        `${farmApiBase}/${activeFarmId}/animals`, // e.g., /api/farms/{farmId}/animals
        `${baseAnimalsFallback}/farm/${activeFarmId}` // fallback: /api/animals/farm/{farmId}
      ];
      let data = [];
      let lastErr = null;
      for(const ep of endpoints){
        try {
          const res = await axios.get(ep, { headers: { Authorization: `Bearer ${token}` }});
          data = res.data || [];
          if(Array.isArray(data)) break; // success if array
          if(data.animals && Array.isArray(data.animals)) { data = data.animals; break; }
        } catch(e){ lastErr = e; continue; }
      }
      if(!Array.isArray(data)) data = [];
      data = data.map(a => ({ healthStatus:'Unknown', ...a }));
      setAnimals(data);
    } catch(e){ setError('Failed to load animals for farm'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ resolveUserAndFarm(); }, []);
  useEffect(()=>{ if(farmId) fetchAnimals(farmId); }, [farmId]);

  const fetchMedicalProcesses = async (id) => {
    if(!id) return;
    setProcessLoading(true);
    try { const res = await axios.get(`http://localhost:8080/api/medical-process/${id}`); setProcesses(p=>({...p,[id]: res.data||[]})); }
    catch(e){ /* silent */ }
    finally { setProcessLoading(false); }
  };

  // Auto fetch processes when selecting an animal if not cached
  useEffect(()=>{ if(selectedAnimal && !processes[selectedAnimal.id]) fetchMedicalProcesses(selectedAnimal.id); }, [selectedAnimal]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if(!farmId) { setAddError('No farm id'); return; }
    setAddLoading(true); setAddError(null);
    const token = localStorage.getItem('token');
    const payload = { ...newForm, farmId };
    // Validate species
    const allowedSpecies = ['cow','dog','sheep','chicken'];
    if(!newForm.species || !allowedSpecies.includes(newForm.species.toLowerCase())){
      setAddError('Species must be one of: cow, dog, sheep, chicken');
      setAddLoading(false);
      return;
    }
    let posted = false;
    let errorMsg = '';
  
    // 2. POST to /api/farms/{farmId}/animals
    try {
      await axios.post(`${farmApiBase}/${farmId}/animals`, payload, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }});
      posted = true;
    } catch(e) {
      errorMsg += 'Failed to add animal to farm. ';
    }
    if(posted){
      setShowAddModal(false);
      setNewForm({ name:'', imageUrl:'', species:'', breed:'', birthDate:'', sex:'', weight:'', healthStatus:'', feeding:'', activity:'', notes:'', vet:'', nextVisit:'', vaccinationDate:'' });
      fetchAnimals(farmId);
    } else {
      setAddError(errorMsg || 'Add failed (both endpoints)');
    }
    setAddLoading(false);
  };

  const handleDelete = async (id) => {
    if(!window.confirm('Supprimer cet animal ?')) return;
    try { await axios.delete(`${baseUrl}/${id}`); if(selectedAnimal?.id===id) setSelectedAnimal(null); fetchAnimals(); } catch { alert('Delete failed'); }
  };

  const startEdit = (a) => { setEditingAnimal(a); setEditForm({ ...a }); };
  const saveEdit = async (e) => { e.preventDefault(); try { await axios.put(`${baseUrl}/${editingAnimal.id}`, editForm); setEditingAnimal(null); fetchAnimals(); } catch { alert('Update failed'); } };
  const cancelEdit = () => { setEditingAnimal(null); setEditForm({}); };

  const addWeightEntry = (animalId) => {
    if(!weightInput) return;
    const date = weightDateInput || new Date().toISOString().slice(0,10);
    setWeightEntries(prev => ({...prev, [animalId]: [...(prev[animalId]||[]), {date, weight: parseFloat(weightInput)}]}));
    setWeightInput(''); setWeightDateInput('');
  };

  const renderWeightChart = (animalId) => {
    const entries = (weightEntries[animalId]||[]).slice(-12);
    if(!entries.length) return <p className="text-xs text-gray-400">No weight data.</p>;
    const max = Math.max(...entries.map(e=>e.weight));
    const min = Math.min(...entries.map(e=>e.weight));
    const pts = entries.map((e,i)=>{
      const x = (i/(entries.length-1))*100;
      const y = max===min?50:100-((e.weight-min)/(max-min))*100;
      return `${x},${y}`;
    }).join(' ');
    return (
      <svg viewBox="0 0 100 100" className="w-full h-24 bg-gray-50 rounded border">
        <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={pts} />
      </svg>
    );
  };

  const calcAge = (birthDate) => { if(!birthDate) return ''; try { const diff=Date.now()-new Date(birthDate).getTime(); const y=Math.floor(diff/31557600000); return y + ' yr' + (y>1?'s':''); } catch { return ''; } };
  const vaccinationDue = (vaccinationDate) => { if(!vaccinationDate) return false; const last=new Date(vaccinationDate).getTime(); const sixMonths=1000*60*60*24*30*6; return Date.now()-last>sixMonths; };

  const handleAddStep = async (e) => {
    e.preventDefault();
    if(!selectedAnimal) return;
    try {
      await axios.post(`http://localhost:8080/api/medical-process/${selectedAnimal.id}/steps`, { type: newStepType, description: newStepDescription });
      setNewStepType(''); setNewStepDescription('');
      fetchMedicalProcesses(selectedAnimal.id);
    } catch {/* ignore */}
  };

  const filteredAnimals = animals.filter(a => {
    if(!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (a.name||'').toLowerCase().includes(q) || (a.species||'').toLowerCase().includes(q) || (a.breed||'').toLowerCase().includes(q);
  });

  const stats = useMemo(()=>{
    const total = animals.length;
    const upcomingVisits = animals.filter(a => a.nextVisit && (new Date(a.nextVisit).getTime()-Date.now()) < 30*86400000 && new Date(a.nextVisit) > new Date()).length;
    const vaccinationAlerts = animals.filter(a => vaccinationDue(a.vaccinationDate)).length;
    const healthy = animals.filter(a => (a.healthStatus||'').toLowerCase()==='healthy').length;
    return { total, upcomingVisits, vaccinationAlerts, healthy };
  }, [animals]);

  const healthColor = (status) => {
    switch((status||'').toLowerCase()) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'sick': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {farmLoading && <p className="text-sm text-gray-500 mb-4">Loading farm...</p>}
        {!farmLoading && !farmId && <p className="text-sm text-red-500 mb-4">{error || 'No farm associated. Create a farm first.'}</p>}
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex-1 flex items-center gap-2"><PawPrint size={30}/> Animal Management</h1>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search..." className="pl-8 pr-8 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"/>
              {searchQuery && <button onClick={()=>setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>}
            </div>
            <button onClick={()=>setShowAddModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"><Plus size={16}/> Add Animal</button>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border rounded-lg p-4 flex flex-col gap-2"><div className="flex items-center gap-2 text-sm font-medium text-gray-600"><PawPrint size={16}/> Total</div><div className="text-2xl font-bold">{stats.total}</div></div>
          <div className="bg-white border rounded-lg p-4 flex flex-col gap-2"><div className="flex items-center gap-2 text-sm font-medium text-gray-600"><CalendarClock size={16}/> Upcoming Visits</div><div className="text-2xl font-bold">{stats.upcomingVisits}</div><p className="text-[11px] text-gray-400">next 30 days</p></div>
          <div className="bg-white border rounded-lg p-4 flex flex-col gap-2"><div className="flex items-center gap-2 text-sm font-medium text-gray-600"><Syringe size={16}/> Vaccination Due</div><div className="text-2xl font-bold">{stats.vaccinationAlerts}</div></div>
          <div className="bg-white border rounded-lg p-4 flex flex-col gap-2"><div className="flex items-center gap-2 text-sm font-medium text-gray-600"><HeartPulse size={16}/> Healthy</div><div className="text-2xl font-bold">{stats.healthy}</div></div>
        </div>
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Animal List */}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Animal List</h2>
            {loading ? (
              <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-t-4 border-indigo-500"/></div>
            ) : error ? (<p className="text-red-500 text-sm">{error}</p>) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAnimals.map((a,idx)=>(
                  <motion.div key={a.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay: idx*0.05}} className={`bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition cursor-pointer ${selectedAnimal?.id===a.id?'ring-2 ring-indigo-500':''}`} onClick={()=>setSelectedAnimal(a)}>
                    <div className="h-28 bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                      {a.imageUrl ? <img src={a.imageUrl} alt={a.name} className="h-full w-full object-cover"/> : (a.name||'?').charAt(0)}
                    </div>
                    <div className="p-4 flex flex-col gap-3 flex-1">
                      <div>
                        <p className="font-semibold text-gray-900 leading-tight">{a.name}</p>
                        <p className="text-xs text-gray-500">{a.species||'-'} {a.breed}</p>
                      </div>
                      <div className="text-[11px] text-gray-500 space-y-1">
                        {a.healthStatus && <p className={healthColor(a.healthStatus)}>{a.healthStatus}</p>}
                        {a.weight && <p>Weight: {a.weight}kg</p>}
                        {a.nextVisit && <p className="flex items-center gap-1"><CalendarClock size={10}/> {a.nextVisit}</p>}
                        {vaccinationDue(a.vaccinationDate) && <p className="text-red-500">Vaccination Due</p>}
                      </div>
                      <div className="mt-auto flex gap-2 pt-1 text-xs">
                        <button className="flex-1 border rounded-md py-1 flex items-center justify-center gap-1 hover:bg-gray-50" onClick={(e)=>{e.stopPropagation();setSelectedAnimal(a);}}><Eye size={14}/> View</button>
                        <button className="flex-1 border rounded-md py-1 flex items-center justify-center gap-1 hover:bg-gray-50" onClick={(e)=>{e.stopPropagation();startEdit(a);}}><Edit2 size={14}/> Edit</button>
                      </div>
                      <button className="mt-2 w-full border rounded-md py-1 text-xs flex items-center justify-center gap-1 text-red-600 hover:bg-red-50" onClick={(e)=>{e.stopPropagation();handleDelete(a.id);}}><Trash2 size={14}/> Delete</button>
                    </div>
                  </motion.div>
                ))}
                {filteredAnimals.length===0 && <p className="text-sm text-gray-500">No animals found.</p>}
              </div>
            )}
          </div>
          {/* Details Pane */}
          <div className="w-full xl:w-80 2xl:w-96">
            <div className="bg-white border rounded-xl p-5 h-fit sticky top-4">
              {selectedAnimal ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                      {selectedAnimal.imageUrl ? <img src={selectedAnimal.imageUrl} alt={selectedAnimal.name} className="h-full w-full object-cover"/> : (selectedAnimal.name||'?').charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedAnimal.name}</p>
                      <p className="text-xs text-gray-500">{selectedAnimal.species||'-'} {selectedAnimal.breed}</p>
                      {selectedAnimal.healthStatus && <p className={'text-[11px] '+healthColor(selectedAnimal.healthStatus)}>{selectedAnimal.healthStatus}</p>}
                    </div>
                  </div>
                  {/* Weight Trend */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Activity size={14}/> Weight Trend</p>
                    {renderWeightChart(selectedAnimal.id)}
                    <div className="flex gap-2 mt-2">
                      <input type="number" step="0.01" placeholder="kg" className="border rounded p-1 w-20 text-xs" value={weightInput} onChange={e=>setWeightInput(e.target.value)} />
                      <input type="date" className="border rounded p-1 text-xs" value={weightDateInput} onChange={e=>setWeightDateInput(e.target.value)} />
                      <button type="button" className="bg-indigo-600 text-white px-2 rounded text-xs" onClick={()=>addWeightEntry(selectedAnimal.id)}>+</button>
                    </div>
                  </div>
                  {/* Stored Fields */}
                  <div className="space-y-2 text-xs text-gray-600">
                    {selectedAnimal.birthDate && <p><span className="font-medium">Birth:</span> {selectedAnimal.birthDate} ({calcAge(selectedAnimal.birthDate)})</p>}
                    {selectedAnimal.sex && <p><span className="font-medium">Sex:</span> {selectedAnimal.sex}</p>}
                    {selectedAnimal.weight && <p><span className="font-medium">Weight:</span> {selectedAnimal.weight} kg</p>}
                    {selectedAnimal.vet && <p><span className="font-medium">Vet:</span> {selectedAnimal.vet}</p>}
                    {selectedAnimal.nextVisit && <p><span className="font-medium">Next Visit:</span> {selectedAnimal.nextVisit}</p>}
                    {selectedAnimal.vaccinationDate && <p><span className="font-medium">Last Vaccination:</span> {selectedAnimal.vaccinationDate}</p>}
                    {selectedAnimal.feeding && <p className="whitespace-pre-wrap"><span className="font-medium">Feeding:</span> {selectedAnimal.feeding}</p>}
                    {selectedAnimal.activity && <p className="whitespace-pre-wrap"><span className="font-medium">Activity:</span> {selectedAnimal.activity}</p>}
                    {selectedAnimal.notes && <p className="whitespace-pre-wrap"><span className="font-medium">Notes:</span> {selectedAnimal.notes}</p>}
                  </div>
                  {/* Medical Process */}
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"><Stethoscope size={14}/> Medical Process</p>
                    {processLoading && <p className="text-xs text-gray-400">Loading...</p>}
                    <ul className="text-xs text-gray-600 space-y-1 max-h-40 overflow-y-auto pr-1">
                      {(processes[selectedAnimal.id]||[]).map((s,i)=>(<li key={i}><span className="font-medium">{s.type}:</span> {s.description}</li>))}
                      {(!processes[selectedAnimal.id]||processes[selectedAnimal.id].length===0) && !processLoading && <li className="text-gray-400">No steps.</li>}
                    </ul>
                    <form onSubmit={handleAddStep} className="mt-2 flex flex-col gap-2">
                      <select required value={newStepType} onChange={e=>setNewStepType(e.target.value)} className="border rounded p-2 text-xs">
                        <option value="">Type...</option>
                        <option value="Symptome">Symptome</option>
                        <option value="Diagnostic">Diagnostic</option>
                        <option value="Traitement">Traitement</option>
                        <option value="Suivi">Suivi</option>
                      </select>
                      <textarea required value={newStepDescription} onChange={e=>setNewStepDescription(e.target.value)} className="border rounded p-2 text-xs h-16" placeholder="Description"/>
                      <button className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700">Add Step</button>
                    </form>
                  </div>
                </div>
              ) : (<p className="text-sm text-gray-500">Select an animal to see details.</p>)}
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={()=>setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold">Add Animal</h3><button onClick={()=>setShowAddModal(false)}><X/></button></div>
            <form className="grid md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2" onSubmit={handleAdd}>
              {['name','imageUrl','breed','weight','vet'].map(f => (
                <label key={f} className="text-xs font-medium capitalize">{f}<input className="w-full border rounded-md p-2 mt-1" value={newForm[f]} onChange={e=>setNewForm(p=>({...p,[f]:e.target.value}))} /></label>
              ))}
              <label className="text-xs font-medium">Species
                <select className="w-full border rounded-md p-2 mt-1" value={newForm.species} onChange={e=>setNewForm(p=>({...p,species:e.target.value}))}>
                  <option value="">Select species</option>
                  <option value="cow">Cow</option>
                  <option value="dog">Dog</option>
                  <option value="sheep">Sheep</option>
                  <option value="chicken">Chicken</option>
                </select>
              </label>
              <label className="text-xs font-medium">Birth Date<input type="date" className="w-full border rounded-md p-2 mt-1" value={newForm.birthDate} onChange={e=>setNewForm(p=>({...p,birthDate:e.target.value}))}/></label>
              <label className="text-xs font-medium">Sex<select className="w-full border rounded-md p-2 mt-1" value={newForm.sex} onChange={e=>setNewForm(p=>({...p,sex:e.target.value}))}><option value="">--</option><option value="M">M</option><option value="F">F</option></select></label>
              <label className="text-xs font-medium">Health<select className="w-full border rounded-md p-2 mt-1" value={newForm.healthStatus} onChange={e=>setNewForm(p=>({...p,healthStatus:e.target.value}))}><option value="">--</option><option>Healthy</option><option>Warning</option><option>Sick</option></select></label>
              <label className="text-xs font-medium">Next Visit<input type="date" className="w-full border rounded-md p-2 mt-1" value={newForm.nextVisit} onChange={e=>setNewForm(p=>({...p,nextVisit:e.target.value}))}/></label>
              <label className="text-xs font-medium">Vaccination<input type="date" className="w-full border rounded-md p-2 mt-1" value={newForm.vaccinationDate} onChange={e=>setNewForm(p=>({...p,vaccinationDate:e.target.value}))}/></label>
              <label className="text-xs font-medium md:col-span-2">Feeding<textarea className="w-full border rounded-md p-2 mt-1 h-20" value={newForm.feeding} onChange={e=>setNewForm(p=>({...p,feeding:e.target.value}))}/></label>
              <label className="text-xs font-medium md:col-span-2">Activity<textarea className="w-full border rounded-md p-2 mt-1 h-20" value={newForm.activity} onChange={e=>setNewForm(p=>({...p,activity:e.target.value}))}/></label>
              <label className="text-xs font-medium md:col-span-2">Notes<textarea className="w-full border rounded-md p-2 mt-1 h-24" value={newForm.notes} onChange={e=>setNewForm(p=>({...p,notes:e.target.value}))}/></label>
              <div className="md:col-span-2 flex gap-3 pt-2">
                <button disabled={addLoading} className="bg-indigo-600 text-white px-5 py-2 rounded-md text-sm hover:bg-indigo-700 flex items-center gap-2"><Plus size={16}/>{addLoading?'Adding...':'Add'}</button>
                <button type="button" onClick={()=>setShowAddModal(false)} className="bg-gray-200 text-gray-700 px-5 py-2 rounded-md text-sm hover:bg-gray-300">Cancel</button>
                {addError && <span className="text-red-500 text-xs self-center">{addError}</span>}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAnimal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={cancelEdit}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold">Modifier {editingAnimal.name}</h3><button onClick={cancelEdit}><X/></button></div>
            <form className="space-y-3 max-h-[70vh] overflow-y-auto pr-1" onSubmit={saveEdit}>
              {['name','imageUrl','breed','weight','vet'].map(f=>(<label key={f} className="text-xs font-medium capitalize">{f}<input className="w-full border rounded-lg p-2 mt-1" value={editForm[f]||''} onChange={e=>setEditForm(prev=>({...prev,[f]:e.target.value}))} /></label>))}
              <label className="text-xs font-medium">Species
                <select className="w-full border rounded-lg p-2 mt-1" value={editForm.species||''} onChange={e=>setEditForm(prev=>({...prev,species:e.target.value}))}>
                  <option value="">Select species</option>
                  <option value="cow">Cow</option>
                  <option value="dog">Dog</option>
                  <option value="sheep">Sheep</option>
                  <option value="chicken">Chicken</option>
                </select>
              </label>
              <label className="text-xs font-medium">Birth<input type="date" className="w-full border rounded-lg p-2 mt-1" value={editForm.birthDate||''} onChange={e=>setEditForm(prev=>({...prev,birthDate:e.target.value}))} /></label>
              <label className="text-xs font-medium">Sex<select className="w-full border rounded-lg p-2 mt-1" value={editForm.sex||''} onChange={e=>setEditForm(prev=>({...prev,sex:e.target.value}))}><option value="">--</option><option value="M">M</option><option value="F">F</option></select></label>
              <label className="text-xs font-medium">Health<select className="w-full border rounded-lg p-2 mt-1" value={editForm.healthStatus||''} onChange={e=>setEditForm(prev=>({...prev,healthStatus:e.target.value}))}><option value="">--</option><option>Healthy</option><option>Warning</option><option>Sick</option></select></label>
              <label className="text-xs font-medium">Next Visit<input type="date" className="w-full border rounded-lg p-2 mt-1" value={editForm.nextVisit||''} onChange={e=>setEditForm(prev=>({...prev,nextVisit:e.target.value}))} /></label>
              <label className="text-xs font-medium">Vaccination<input type="date" className="w-full border rounded-lg p-2 mt-1" value={editForm.vaccinationDate||''} onChange={e=>setEditForm(prev=>({...prev,vaccinationDate:e.target.value}))} /></label>
              <label className="text-xs font-medium">Feeding<textarea className="w-full border rounded-lg p-2 mt-1 h-20" value={editForm.feeding||''} onChange={e=>setEditForm(prev=>({...prev,feeding:e.target.value}))}></textarea></label>
              <label className="text-xs font-medium">Activity<textarea className="w-full border rounded-lg p-2 mt-1 h-20" value={editForm.activity||''} onChange={e=>setEditForm(prev=>({...prev,activity:e.target.value}))}></textarea></label>
              <label className="text-xs font-medium">Notes<textarea className="w-full border rounded-lg p-2 mt-1 h-24" value={editForm.notes||''} onChange={e=>setEditForm(prev=>({...prev,notes:e.target.value}))}></textarea></label>
              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">Sauvegarder</button>
                <button type="button" onClick={cancelEdit} className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyAnimals;
