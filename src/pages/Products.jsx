import React, { useEffect, useState } from 'react';
import farm1jpg from '../assets/images/farm1.jpg';
import farm1png from '../assets/images/farm1.png';
import farm3jpeg from '../assets/images/farm3.jpeg';
import plantejpg from '../assets/images/plante.jpg';
// user-provided images (copy these into src/assets/images/ as instructed earlier)
import cowImg from '../assets/images/cow.jpg';
import foodsheepImg from '../assets/images/foodsheep.jpg';
import foodcowImg from '../assets/images/foodcow.jpg';
import fooddogImg from '../assets/images/fooddog.jpg';
import chickenfoodImg from '../assets/images/chickenfood.jpg';
import dogImg from '../assets/images/dog.jpg';
import sheepImg from '../assets/images/sheep.jpg';
import chickenImg from '../assets/images/chicken.jpg';

// Client-side generator for realistic farm supply products. No external API key required.
// Uses seeded picsum.photos images so each product looks distinct.

const SEED_PRODUCTS = [
  { name: 'Chicken Feed (20kg Bag)', category: 'Feed', min: 18, max: 35 },
  { name: 'Cow Mineral Block', category: 'Supplements', min: 10, max: 25 },
  { name: 'Sheep Hay Bale (50kg)', category: 'Bedding', min: 12, max: 30 },
  { name: 'Calf Starter Pellet (10kg)', category: 'Feed', min: 15, max: 28 },
  { name: 'Poultry Starter Crumble (25kg)', category: 'Feed', min: 20, max: 40 },
  { name: 'Layer Mash (20kg)', category: 'Feed', min: 22, max: 42 },
  { name: 'Beef Cattle Supplement', category: 'Supplements', min: 30, max: 60 },
  { name: 'Goat Mineral Mix (10kg)', category: 'Supplements', min: 12, max: 28 },
  { name: 'Hay Net', category: 'Equipment', min: 8, max: 20 },
  { name: 'Silage Wrap (roll)', category: 'Equipment', min: 25, max: 55 },
  { name: 'Livestock Dewormer (treatment)', category: 'Health', min: 6, max: 25 },
  { name: 'Milk Replacer (20kg)', category: 'Feed', min: 28, max: 60 },
  { name: 'Barn Bedding Straw Bale', category: 'Bedding', min: 6, max: 18 },
  { name: 'Pasture Seeder (kit)', category: 'Equipment', min: 40, max: 120 },
  { name: 'Automatic Waterer (small)', category: 'Equipment', min: 35, max: 150 }
];

function randBetween(min, max){ return Math.round((Math.random()*(max-min) + min)*100)/100; }

// Fallback seeded image resolver — use local assets only (no picsum external URLs).
const seededImage = (seed) => {
  const s = String(seed || '').toLowerCase();
  if(/hay|straw|bale|silage/.test(s)) return farm3jpeg;
  if(/plant|plantain|vegetable|fruit|crop/.test(s)) return plantejpg;
  if(/cow|cattle|beef/.test(s)) return cowImg || farm1jpg;
  if(/chicken|poultry|egg/.test(s)) return chickenImg || farm1png;
  if(/sheep|goat/.test(s)) return sheepImg || farm3jpeg;
  if(/dog|puppy|canine/.test(s)) return dogImg || farm1png;
  return farm1jpg;
};

const formatPrice = (p) => p.toLocaleString(undefined, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });

// Choose contextual images for products using local assets when possible.
function resolveImage({ name='', category='', id='' } = {}){
  const n = (name||'').toLowerCase();
  // species-specific photos (user-provided)
  if(/cow|cattle|beef/.test(n)) return cowImg || farm1jpg;
  if(/chicken|poultry|egg/.test(n)) return chickenImg || farm1png;
  if(/sheep|goat/.test(n)) return sheepImg || farm3jpeg;
  if(/dog|puppy|canine/.test(n)) return dogImg || farm1png;

  // feed / food images by species when name suggests a feed
  if(/feed|food|mash|pellet|starter|crumble|replacer/.test(n)){
    if(/chicken/.test(n)) return chickenfoodImg || farm1png;
    if(/sheep|goat/.test(n)) return foodsheepImg || farm3jpeg;
    if(/cow|cattle|beef/.test(n)) return foodcowImg || farm1jpg;
    if(/dog/.test(n)) return fooddogImg || dogImg || farm1png;
    // generic feed fallback
    return farm1jpg;
  }

  if(/hay|straw|bale|silage/.test(n)) return farm3jpeg;
  if(/plant|plantain|vegetable|fruit|crop/.test(n)) return plantejpg;
  // category hints
  if(/feed|supplement/.test(category?.toLowerCase())) return farm1jpg;
  if(/equipment|tool|seeder/.test(category?.toLowerCase())) return farm3jpeg;
  // fallback to seeded picsum so images are stable-per-item
  return seededImage(id || name || Math.random());
}

export default function Products(){
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Agridata endpoints (user-provided list). We'll try these first.
  const AGRI_BASE = 'https://agridata.ec.europa.eu';
  const AGRI_ENDPOINTS = [
    '/api/beef',
    '/api/pigmeat',
    '/api/eggs-and-poultry',
    '/api/sheep-and-goat-meat',
    '/api/milk-and-dairy',
    '/api/fruit-and-vegetables',
    '/api/cereals',
    '/api/rice',
    '/api/oilseeds-and-protein-crops',
    '/api/sugar',
    '/api/olive-oil',
    '/api/wine',
    '/api/fertiliser',
    '/api/cmef-indicators',
    // fruit & veg extras
    '/api/fruitAndVegetable/products',
    '/api/fruitAndVegetable/varieties',
    '/api/fruitAndVegetable/pricesSupplyChain',
    '/api/fruitAndVegetable/pricesSupplyChain/productStages',
    '/api/fruitAndVegetable/pricesSupplyChain/products',
    '/api/fruitAndVegetable/pricesSupplyChain/varieties'
  ];

  const generate = (count=8) => {
    setLoading(true);
    // Shuffle a shallow copy and pick `count` items, randomize prices
    const pool = [...SEED_PRODUCTS].sort(()=>0.5 - Math.random());
    const selected = pool.slice(0, Math.min(count, pool.length)).map(p => {
      const id = (p.name + Math.random()).replace(/\s+/g,'_');
      const primary = resolveImage({ name: p.name, category: p.category, id });
      const imgs = [primary];
      const pn = p.name.toLowerCase();
      if(/cow|cattle|beef/.test(pn) && foodcowImg) imgs.push(foodcowImg);
      if(/chicken/.test(pn) && chickenfoodImg) imgs.push(chickenfoodImg);
      if(/sheep|goat/.test(pn) && foodsheepImg) imgs.push(foodsheepImg);
      if(/dog/.test(pn) && fooddogImg) imgs.push(fooddogImg);
      imgs.push(seededImage(p.name));
      const uniq = Array.from(new Set(imgs));
      return {
        id,
        name: p.name,
        category: p.category,
        price: randBetween(p.min, p.max),
        images: uniq,
        unit: p.name.match(/\((.*?)\)/)?.[1] || '',
        description: `High-quality ${p.category.toLowerCase()} for farm use.`
      };
    });
    // small delay to mimic network
    setTimeout(()=>{ setProducts(selected); setLoading(false); }, 120);
  };

  useEffect(()=>{ generate(8); }, []);

  // Try to load products from a local public JSON file (acts like a simple API)
  useEffect(()=>{
    const tryLoad = async ()=>{
      setLoading(true);
      // Attempt to fetch Agridata endpoints in parallel. Many of these endpoints are public,
      // but the site may block CORS for browser clients. We treat failures gracefully and
      // fall back to the local JSON or generator.
      try{
        const requests = AGRI_ENDPOINTS.map(ep => fetch(AGRI_BASE + ep).then(r=>({ok:r.ok, ep, json: r.ok ? r.json() : null})).catch(err=>({ok:false, ep})));

        const settled = await Promise.all(requests);
        const successes = [];
        for(const res of settled){
          if(res && res.ok && res.json){
            try{
              const data = await res.json;
              // build a lightweight summary item for this sector
              const title = res.ep.replace(/^\/api\//, '').replace(/[-_/]/g, ' ');
              const sample = Array.isArray(data) ? data[0] : (data && typeof data === 'object' ? data : null);
              let desc = '';
              if(sample && typeof sample === 'object'){
                // try to extract a few numeric-ish fields for a concise summary
                const keys = Object.keys(sample).slice(0,4);
                desc = keys.map(k => {
                  const v = sample[k];
                  if(typeof v === 'number') return `${k}: ${v}`;
                  if(typeof v === 'string' && v.length<40) return `${k}: ${v}`;
                  return null;
                }).filter(Boolean).join(' • ');
              } else if(sample){
                desc = String(sample).slice(0,120);
              }
              const primary = resolveImage({ name: title, category: 'Agridata', id: res.ep });
              const succImgs = [primary, seededImage(res.ep)];
              successes.push({
                id: res.ep,
                name: title.charAt(0).toUpperCase() + title.slice(1),
                category: 'Agridata sector',
                price: null,
                images: Array.from(new Set(succImgs)),
                unit: '',
                description: desc || 'Données disponibles — ouvrez pour voir le JSON complet.' ,
                raw: data
              });
            }catch(err){ /* ignore parse errors per-endpoint */ }
          }
        }

        if(successes.length>0){
          setProducts(successes);
          setLoading(false);
          return;
        }
      }catch(e){
        // continue to local fallback
      }

      // If agridata failed or returned nothing useful, try local JSON
      try{
        const r = await fetch('/agri-products.json');
        if(r.ok){
          const list = await r.json();
          if(Array.isArray(list) && list.length>0){
            setProducts(list.map(p=>{
              // Prefer local/contextual images over generic picsum placeholders stored in the JSON file.
              const imgFromJson = typeof p.image === 'string' ? p.image : '';
              const isPicsum = imgFromJson.includes('picsum.photos');
              const primary = (!imgFromJson || isPicsum) ? resolveImage({ name: p.name, category: p.category }) : imgFromJson;
              const imgs = [primary, seededImage(p.name)];
              return ({
                id: p.id,
                name: p.name,
                category: p.category,
                price: p.price,
                images: Array.from(new Set(imgs)),
                unit: p.unit || '',
                description: p.description || ''
              });
            }));
            setLoading(false);
            return;
          }
        }
      }catch(e){ /* ignore */ }

      // fallback: generator
      generate(8);
    };
    tryLoad();
  }, []);

  return (
    <div className="min-h-screen p-6 bg-neutral-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Fournitures agricoles</h1>
          <div className="flex gap-2">
            <button onClick={()=>generate(8)} className="px-3 py-2 rounded bg-blue-600 text-white">Rafraîchir</button>
          </div>
        </div>

        {loading && <div className="text-sm text-gray-500 mb-4">Génération des produits…</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Small product card with image carousel (auto-rotate + dots)
function ProductCard({ p }){
  const [index, setIndex] = useState(0);
  useEffect(()=>{
    if(!p.images || p.images.length<=1) return;
    const t = setInterval(()=> setIndex(i => (i+1) % p.images.length), 4000);
    return ()=> clearInterval(t);
  }, [p.images]);

  const img = p.images && p.images.length? p.images[index] : (p.image || '');

  return (
    <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
      <div className="w-full h-44 bg-gray-100 overflow-hidden relative">
        <img src={img} alt={p.name} className="w-full h-full object-cover" />
        {p.images && p.images.length>1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
            {p.images.map((_,i)=> (
              <button key={i} onClick={()=>setIndex(i)} className={`w-2 h-2 rounded-full ${i===index? 'bg-white': 'bg-gray-400/60'}`}></button>
            ))}
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{p.name}</h3>
          <div className="text-green-700 font-bold">{p.price != null ? formatPrice(p.price) : <span className="text-sm text-gray-500">—</span>}</div>
        </div>
        <div className="text-xs text-gray-500 mt-1">{p.category} {p.unit? `• ${p.unit}`: ''}</div>
        <p className="text-sm text-gray-600 mt-3">{p.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <button className="px-3 py-1 bg-green-600 text-white rounded text-sm">Ajouter au panier</button>
          <button className="text-sm text-gray-500 underline">Détails</button>
        </div>
      </div>
    </div>
  );
}
