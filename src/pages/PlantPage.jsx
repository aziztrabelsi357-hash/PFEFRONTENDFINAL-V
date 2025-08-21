import { useEffect, useState, useMemo } from 'react';
import { notifyFarmChange } from '../utils/notify';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Leaf, Plus, X, Edit2, Trash2, Search, CalendarClock, Flower2, Beaker, Eye, Activity, Droplets, HeartPulse, Image as ImageIcon, Syringe } from 'lucide-react';

const MyPlantes = () => {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [farmId, setFarmId] = useState(null);
  const [farmLoading, setFarmLoading] = useState(true);

  // Formulaire ajout (all backend fields)
  const [newName, setNewName] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newType, setNewType] = useState('');
  const [newPlantingDate, setNewPlantingDate] = useState('');
  const [newExpectedHarvestDate, setNewExpectedHarvestDate] = useState('');
  const [newQuantityOrArea, setNewQuantityOrArea] = useState('');
  const [newHealthStatus, setNewHealthStatus] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newNextTreatment, setNewNextTreatment] = useState('');
  const [newFertilizer, setNewFertilizer] = useState('');
  const [newIrrigation, setNewIrrigation] = useState('');
  const [newDiseaseHistory, setNewDiseaseHistory] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

  // Edition
  const [editingPlant, setEditingPlant] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [selectedPlant, setSelectedPlant] = useState(null); // for details pane
  const [showAddModal, setShowAddModal] = useState(false);

  // Recherche
  const [searchQuery, setSearchQuery] = useState('');

  // Removed previous local meta (now using backend fields directly)

  const baseUrlLegacy = 'http://localhost:8080/api/plants'; // legacy (all plants)
  const farmApiBase = 'http://localhost:8080/api/farms';

  const resolvePlantUrl = (id) => {
    if (farmId) return `${farmApiBase}/${farmId}/plants/${id}`;
    return `${baseUrlLegacy}/${id}`;
  };

  const resolveUserAndFarm = async () => {
    const token = localStorage.getItem('token');
    const storedFarmId = localStorage.getItem('farmId');
    if (storedFarmId) { setFarmId(storedFarmId); setFarmLoading(false); return; }
    if(!token){ setError('Not authenticated'); setFarmLoading(false); return; }
    try {
      const userRes = await axios.get('http://localhost:8080/auth/user', { headers: { Authorization: `Bearer ${token}` } });
      const userId = userRes.data.id || userRes.data.userId || userRes.data._id || userRes.data.sub || null;
      if(!userId){ setError('Could not resolve user id'); setFarmLoading(false); return; }
      try {
        const farmRes = await axios.get(`${farmApiBase}/user/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${token}` }});
        const fId = farmRes.data?.id || farmRes.data?.farmId || farmRes.data?.FarmId;
        if(fId) { setFarmId(fId); localStorage.setItem('farmId', fId); } else setError('No farm found for this user');
      } catch(fErr){
        if(fErr.response?.status === 404) setError('You have no farm yet. Create one first.'); else setError('Failed to load farm');
      }
    } catch(uErr){ setError('Failed to load user'); }
    finally { setFarmLoading(false); }
  };

  const fetchPlants = async (activeFarmId) => {
    if(!activeFarmId) { setLoading(false); return; }
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('token');
      const endpoints = [
        `${farmApiBase}/${activeFarmId}/plants`, // preferred
        `${baseUrlLegacy}/farm/${activeFarmId}` // optional fallback if such endpoint exists
      ];
      let data = [];
      for(const ep of endpoints){
        try {
          const res = await axios.get(ep, { headers: { Authorization: `Bearer ${token}` }});
          data = res.data || [];
          if(Array.isArray(data)) break;
          if(data.plants && Array.isArray(data.plants)) { data = data.plants; break; }
        } catch(e){ continue; }
      }
      if(!Array.isArray(data)) data = [];
      setPlants(data);
    } catch(e) { setError('Erreur de chargement des plantes du farm'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ resolveUserAndFarm(); }, []);
  useEffect(()=>{ if(farmId) fetchPlants(farmId); }, [farmId]);

  const handleAddPlant = async (e) => {
    e.preventDefault();
    if(!farmId){ setAddError('No farm id'); return; }
    setAddLoading(true); setAddError(null);
    const token = localStorage.getItem('token');
    const payload = {
        name: newName.trim(),
        imageUrl: newImageUrl.trim() || null,
        type: newType.trim() || null,
        plantingDate: newPlantingDate || null,
        expectedHarvestDate: newExpectedHarvestDate || null,
        quantityOrArea: newQuantityOrArea.trim() || null,
        healthStatus: newHealthStatus.trim() || null,
        notes: newNotes.trim() || null,
        nextTreatment: newNextTreatment.trim() || null,
        fertilizer: newFertilizer.trim() || null,
        irrigation: newIrrigation.trim() || null,
        diseaseHistory: newDiseaseHistory.trim() || null,
        farmId
      };
    try {
  await axios.post(`${farmApiBase}/${farmId}/plants`, payload, { headers: { Authorization: `Bearer ${token}` }});
      setNewName(''); setNewImageUrl(''); setNewType(''); setNewPlantingDate(''); setNewExpectedHarvestDate(''); setNewQuantityOrArea(''); setNewHealthStatus(''); setNewNotes(''); setNewNextTreatment(''); setNewFertilizer(''); setNewIrrigation(''); setNewDiseaseHistory('');
      fetchPlants(farmId);
      setShowAddModal(false);
  try { notifyFarmChange(); } catch(e){}
    } catch(e){
      setAddError('Ajout échoué (endpoint farm indisponible)');
    }
    setAddLoading(false);
  };

  const handleDeletePlant = async (objOrId) => {
    // Accept either the plant object or an id string
    const plantObj = typeof objOrId === 'object' ? objOrId : null;
    const idCandidates = [];
    if (plantObj) {
      if (plantObj.id) idCandidates.push(plantObj.id);
      if (plantObj._id && plantObj._id !== plantObj.id) idCandidates.push(plantObj._id);
    } else if (objOrId) {
      idCandidates.push(objOrId);
    }
    // ensure unique
    const uniqCandidates = Array.from(new Set(idCandidates));
    if (uniqCandidates.length === 0) {
      alert('Impossible de supprimer: id invalide');
      return;
    }
    if(!window.confirm('Supprimer cette plante ?')) return;
    const token = localStorage.getItem('token');
    // Try each candidate id with legacy first then farm-scoped
    for (const candidate of uniqCandidates) {
      try {
  await axios.delete(`${baseUrlLegacy}/${candidate}`, { headers: { Authorization: `Bearer ${token}` } });
  fetchPlants(farmId);
  try { notifyFarmChange(); } catch(e){}
        return;
      } catch (legacyErr) {
        console.warn('Plant delete legacy endpoint failed', candidate, legacyErr?.response?.status);
        try {
          await axios.delete(resolvePlantUrl(candidate), { headers: { Authorization: `Bearer ${token}` } });
          fetchPlants(farmId);
          try { notifyFarmChange(); } catch(e){}
          return;
        } catch (err) {
          console.warn('Plant delete farm-scoped failed', candidate, err?.response?.status);
          if (err?.response?.status && ![400,404].includes(err.response.status)) {
            alert('Suppression échouée: ' + (err?.response?.data?.message || err?.message || 'Server error'));
            return;
          }
        }
      }
    }
    alert('Suppression échouée pour tous les identifiants testés. Vérifiez le journal (console) pour plus de détails.');
  };

  const startEdit = (plant) => { setEditingPlant(plant); setEditForm({ ...plant }); };
  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      // Try legacy endpoint first
      try {
  await axios.put(`${baseUrlLegacy}/${editingPlant.id}`, editForm, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  setEditingPlant(null);
  fetchPlants(farmId);
  try { notifyFarmChange(); } catch(e){}
        return;
      } catch (legacyErr) {
        console.warn('Plant update legacy failed', legacyErr?.response?.status);
        // try farm-scoped
  await axios.put(resolvePlantUrl(editingPlant.id), editForm, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  setEditingPlant(null);
  fetchPlants(farmId);
  try { notifyFarmChange(); } catch(e){}
        return;
      }
    } catch (err) {
      console.error('Update plant failed', err);
      alert('Mise à jour échouée');
    }
  };
  const cancelEdit = () => { setEditingPlant(null); setEditForm({}); };

  const daysBetween = (start, end) => {
    if(!start || !end) return '';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if(isNaN(s)||isNaN(e)) return '';
    return Math.round((e-s)/86400000);
  };

  const filteredPlants = plants.filter(p=>{
    if(!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (p.name||'').toLowerCase().includes(q) || (p.type||'').toLowerCase().includes(q);
  });

  // Derived stats matching screenshot
  const stats = useMemo(()=>{
    const total = plants.length;
    const flowering = plants.filter(p => (p.type||'').toLowerCase().includes('flower')).length; // heuristic
    const upcomingHarvests = plants.filter(p => p.expectedHarvestDate && (new Date(p.expectedHarvestDate).getTime() - Date.now()) < 30*86400000 && new Date(p.expectedHarvestDate) > new Date()).length;
    const withNextTreatment = plants.filter(p => p.nextTreatment && p.nextTreatment.trim() !== '').length;
    return { total, flowering, withNextTreatment, upcomingHarvests };
  }, [plants]);

  const growthProgress = (p) => {
    if(!p?.plantingDate || !p?.expectedHarvestDate) return 0;
    const start = new Date(p.plantingDate).getTime();
    const end = new Date(p.expectedHarvestDate).getTime();
    const now = Date.now();
    if(now <= start) return 0;
    if(now >= end) return 100;
    return Math.min(100, Math.max(0, ((now-start)/(end-start))*100));
  };

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
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex-1">Plant Management</h1>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search..." className="pl-8 pr-8 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-56"/>
              {searchQuery && <button onClick={()=>setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>}
            </div>
            <button onClick={()=>setShowAddModal(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700"><Plus size={16}/> Add Plant</button>
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border rounded-lg p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600"><Leaf size={16}/> Total Plants</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
            <div className="bg-white border rounded-lg p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600"><Flower2 size={16}/> Flowering Plants</div>
              <div className="text-2xl font-bold text-gray-900">{stats.flowering}</div>
            </div>
            <div className="bg-white border rounded-lg p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600"><Beaker size={16}/> With Next Treatment</div>
              <div className="text-2xl font-bold text-gray-900">{stats.withNextTreatment}</div>
              <p className="text-[11px] text-gray-400">have nextTreatment</p>
            </div>
            <div className="bg-white border rounded-lg p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600"><CalendarClock size={16}/> Upcoming Harvests</div>
              <div className="text-2xl font-bold text-gray-900">{stats.upcomingHarvests}</div>
              <p className="text-[11px] text-gray-400">next 30 days</p>
            </div>
        </div>
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Plant List */}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Plant List</h2>
            {loading ? (
              <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-t-4 border-green-500"></div></div>
            ) : error ? (
              <p className="text-red-500 text-sm">{error}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPlants.map((p, idx) => {
                  return (
                    <motion.div key={p.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay: idx*0.05}} className={`bg-white border rounded-xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition cursor-pointer ${selectedPlant?.id===p.id?'ring-2 ring-green-500':''}`} onClick={()=>setSelectedPlant(p)}>
                      <div className="h-28 bg-gradient-to-br from-green-600 to-green-400 flex items-center justify-center text-white text-xl font-bold">
                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover"/> : (p.name||'?').charAt(0)}
                      </div>
                      <div className="p-4 flex flex-col gap-3 flex-1">
                        <div>
                          <p className="font-semibold text-gray-900 leading-tight">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.type||'-'}</p>
                        </div>
                        <div className="text-[11px] text-gray-500 space-y-1">
                          {p.healthStatus && <p className={healthColor(p.healthStatus)}>{p.healthStatus}</p>}
                          {p.nextTreatment && <p className="flex items-center gap-1"><Syringe size={10}/> {p.nextTreatment}</p>}
                          {p.expectedHarvestDate && <p>Harvest: <span className="font-medium">{p.expectedHarvestDate}</span></p>}
                        </div>
                        <div className="mt-auto flex gap-2 pt-1 text-xs">
                          <button className="flex-1 border rounded-md py-1 flex items-center justify-center gap-1 hover:bg-gray-50" onClick={(e)=>{e.stopPropagation();setSelectedPlant(p);}}><Eye size={14}/> View</button>
                          <button className="flex-1 border rounded-md py-1 flex items-center justify-center gap-1 hover:bg-gray-50" onClick={(e)=>{e.stopPropagation();startEdit(p);}}><Edit2 size={14}/> Edit</button>
                        </div>
                        <button className="mt-2 w-full border rounded-md py-1 text-xs flex items-center justify-center gap-1 text-red-600 hover:bg-red-50" onClick={(e)=>{e.stopPropagation();handleDeletePlant(p);}}><Trash2 size={14}/> Delete</button>
                      </div>
                    </motion.div>
                  );
                })}
                {filteredPlants.length===0 && <p className="text-sm text-gray-500">No plants found.</p>}
              </div>
            )}
          </div>
          {/* Details Pane */}
          <div className="w-full xl:w-80 2xl:w-96">
            <div className="bg-white border rounded-xl p-5 h-fit sticky top-4">
              {selectedPlant ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-green-600 to-green-400 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                      {selectedPlant.imageUrl ? <img src={selectedPlant.imageUrl} alt={selectedPlant.name} className="h-full w-full object-cover"/> : (selectedPlant.name||'?').charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedPlant.name}</p>
                      <p className="text-xs text-gray-500">{selectedPlant.type||'-'}</p>
                      {selectedPlant.healthStatus && <p className={'text-[11px] '+healthColor(selectedPlant.healthStatus)}>{selectedPlant.healthStatus}</p>}
                    </div>
                  </div>
                  {/* Growth */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Growth History</p>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{width: growthProgress(selectedPlant)+"%"}}></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>Seedling</span><span>Vegetative</span><span>Flowering</span><span>Harvest</span>
                    </div>
                  </div>
                  {/* Backend Stored Fields */}
                  <div className="space-y-3 text-xs text-gray-600">
                    {selectedPlant.quantityOrArea && <p><span className="font-medium">Quantity/Area:</span> {selectedPlant.quantityOrArea}</p>}
                    {selectedPlant.plantingDate && <p><span className="font-medium">Planting:</span> {selectedPlant.plantingDate}</p>}
                    {selectedPlant.expectedHarvestDate && <p><span className="font-medium">Harvest:</span> {selectedPlant.expectedHarvestDate}</p>}
                    {selectedPlant.nextTreatment && <p className="flex items-center gap-1"><Syringe size={12}/> Next Treatment: {selectedPlant.nextTreatment}</p>}
                    {selectedPlant.fertilizer && <p><span className="font-medium">Fertilizer:</span> {selectedPlant.fertilizer}</p>}
                    {selectedPlant.irrigation && <p><span className="font-medium">Irrigation:</span> {selectedPlant.irrigation}</p>}
                    {selectedPlant.diseaseHistory && <p className="whitespace-pre-wrap"><span className="font-medium">Disease History:</span> {selectedPlant.diseaseHistory}</p>}
                    {selectedPlant.notes && <p className="whitespace-pre-wrap"><span className="font-medium">Notes:</span> {selectedPlant.notes}</p>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Select a plant to see details.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Plant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={()=>setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Add Plant</h3>
              <button onClick={()=>setShowAddModal(false)}><X/></button>
            </div>
            <form className="grid md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2" onSubmit={handleAddPlant}>
              <label className="text-sm">Name<input type="text" required className="w-full border rounded-md p-2 mt-1" value={newName} onChange={e=>setNewName(e.target.value)}/></label>
              <label className="text-sm flex flex-col">Image URL<input type="url" placeholder="https://..." className="w-full border rounded-md p-2 mt-1" value={newImageUrl} onChange={e=>setNewImageUrl(e.target.value)}/></label>
              <label className="text-sm">Type<input type="text" className="w-full border rounded-md p-2 mt-1" value={newType} onChange={e=>setNewType(e.target.value)}/></label>
              <label className="text-sm">Quantity/Area<input type="text" className="w-full border rounded-md p-2 mt-1" value={newQuantityOrArea} onChange={e=>setNewQuantityOrArea(e.target.value)}/></label>
              <label className="text-sm">Planting Date<input type="date" className="w-full border rounded-md p-2 mt-1" value={newPlantingDate} onChange={e=>setNewPlantingDate(e.target.value)}/></label>
              <label className="text-sm">Expected Harvest<input type="date" className="w-full border rounded-md p-2 mt-1" value={newExpectedHarvestDate} onChange={e=>setNewExpectedHarvestDate(e.target.value)}/></label>
              <label className="text-sm">Health Status<select className="w-full border rounded-md p-2 mt-1" value={newHealthStatus} onChange={e=>setNewHealthStatus(e.target.value)}><option value="">--</option><option>Healthy</option><option>Warning</option><option>Sick</option></select></label>
              <label className="text-sm">Next Treatment<input type="text" className="w-full border rounded-md p-2 mt-1" placeholder="e.g. 2025-09-01 Fungicide" value={newNextTreatment} onChange={e=>setNewNextTreatment(e.target.value)}/></label>
              <label className="text-sm">Fertilizer<input type="text" className="w-full border rounded-md p-2 mt-1" value={newFertilizer} onChange={e=>setNewFertilizer(e.target.value)}/></label>
              <label className="text-sm">Irrigation<input type="text" className="w-full border rounded-md p-2 mt-1" value={newIrrigation} onChange={e=>setNewIrrigation(e.target.value)}/></label>
              <label className="text-sm md:col-span-2">Disease History<textarea className="w-full border rounded-md p-2 mt-1 h-20" value={newDiseaseHistory} onChange={e=>setNewDiseaseHistory(e.target.value)} placeholder="Past diseases, dates..."></textarea></label>
              <label className="text-sm md:col-span-2">Notes<textarea className="w-full border rounded-md p-2 mt-1 h-24" value={newNotes} onChange={e=>setNewNotes(e.target.value)} placeholder="General notes"></textarea></label>
              <div className="md:col-span-2 flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
                <button disabled={addLoading} className="bg-green-600 text-white px-5 py-2 rounded-md text-sm hover:bg-green-700 flex items-center gap-2"><Plus size={16}/>{addLoading?'Adding...':'Add'}</button>
                <button type="button" onClick={()=>setShowAddModal(false)} className="bg-gray-200 text-gray-700 px-5 py-2 rounded-md text-sm hover:bg-gray-300">Cancel</button>
                {addError && <span className="text-red-500 text-xs self-center">{addError}</span>}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPlant && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={cancelEdit}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Modifier {editingPlant.name}</h3>
              <button onClick={cancelEdit}><X/></button>
            </div>
            <form className="space-y-3 max-h-[70vh] overflow-y-auto pr-1" onSubmit={saveEdit}>
              <label className="text-xs font-medium">Name<input className="w-full border rounded-lg p-2 mt-1" value={editForm.name||''} onChange={e=>setEditForm(prev=>({...prev,name:e.target.value}))} /></label>
              <label className="text-xs font-medium">Image URL<input className="w-full border rounded-lg p-2 mt-1" value={editForm.imageUrl||''} onChange={e=>setEditForm(prev=>({...prev,imageUrl:e.target.value}))} /></label>
              <label className="text-xs font-medium">Type<input className="w-full border rounded-lg p-2 mt-1" value={editForm.type||''} onChange={e=>setEditForm(prev=>({...prev,type:e.target.value}))} /></label>
              <label className="text-xs font-medium">Quantity/Area<input className="w-full border rounded-lg p-2 mt-1" value={editForm.quantityOrArea||''} onChange={e=>setEditForm(prev=>({...prev,quantityOrArea:e.target.value}))} /></label>
              <label className="text-xs font-medium">Planting<input type="date" className="w-full border rounded-lg p-2 mt-1" value={editForm.plantingDate||''} onChange={e=>setEditForm(prev=>({...prev,plantingDate:e.target.value}))} /></label>
              <label className="text-xs font-medium">Expected Harvest<input type="date" className="w-full border rounded-lg p-2 mt-1" value={editForm.expectedHarvestDate||''} onChange={e=>setEditForm(prev=>({...prev,expectedHarvestDate:e.target.value}))} /></label>
              <label className="text-xs font-medium">Health Status<select className="w-full border rounded-lg p-2 mt-1" value={editForm.healthStatus||''} onChange={e=>setEditForm(prev=>({...prev,healthStatus:e.target.value}))}><option value="">--</option><option>Healthy</option><option>Warning</option><option>Sick</option></select></label>
              <label className="text-xs font-medium">Next Treatment<input className="w-full border rounded-lg p-2 mt-1" value={editForm.nextTreatment||''} onChange={e=>setEditForm(prev=>({...prev,nextTreatment:e.target.value}))} /></label>
              <label className="text-xs font-medium">Fertilizer<input className="w-full border rounded-lg p-2 mt-1" value={editForm.fertilizer||''} onChange={e=>setEditForm(prev=>({...prev,fertilizer:e.target.value}))} /></label>
              <label className="text-xs font-medium">Irrigation<input className="w-full border rounded-lg p-2 mt-1" value={editForm.irrigation||''} onChange={e=>setEditForm(prev=>({...prev,irrigation:e.target.value}))} /></label>
              <label className="text-xs font-medium">Disease History<textarea className="w-full border rounded-lg p-2 mt-1 h-20" value={editForm.diseaseHistory||''} onChange={e=>setEditForm(prev=>({...prev,diseaseHistory:e.target.value}))}></textarea></label>
              <label className="text-xs font-medium">Notes<textarea className="w-full border rounded-lg p-2 mt-1 h-24" value={editForm.notes||''} onChange={e=>setEditForm(prev=>({...prev,notes:e.target.value}))}></textarea></label>
              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">Sauvegarder</button>
                <button type="button" onClick={cancelEdit} className="flex-1 bg-gray-400 text-white py-2 rounded-lg hover:bg-gray-500">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPlantes;
