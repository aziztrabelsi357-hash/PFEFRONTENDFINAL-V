import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  FaPaw, FaCamera, FaUpload, FaSync, FaDownload, FaEye,
  FaInfo, FaCheckCircle, FaExclamationTriangle, FaCopy, FaHeartbeat, FaTimes
} from 'react-icons/fa';
import { Pie, Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import AIChatbot from '../components/AIChatbot';

const PALETTE = ['#22c55e','#ef4444','#3b82f6','#f59e0b','#a855f7','#14b8a6','#0ea5e9','#e11d48'];

function colorFor(label, map) {
  if (map[label]) return map[label];
  const color = PALETTE[Object.keys(map).length % PALETTE.length];
  map[label] = color;
  return color;
}

export default function AIAnimalDetection() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);

  const [confidenceThreshold, setConfidenceThreshold] = useState(25);
  const [displayMode, setDisplayMode] = useState('Draw Confidence'); // Draw Confidence | Draw Labels | Hide Labels
  const [detectionType, setDetectionType] = useState('general');     // UI-only: general | health | behavior

  const [usingCamera, setUsingCamera] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const [highlightId, setHighlightId] = useState(null); // highlight clicked detection

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Drag & Drop
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Please drop an image file.');
    if (f.size > 10 * 1024 * 1024) return toast.error('File must be under 10MB');
    setSelectedFile(f);
    setPreview(URL.createObjectURL(f));
    setDetectionResult(null);
    setUsingCamera(false);
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Please upload an image file.');
    if (f.size > 10 * 1024 * 1024) return toast.error('File must be under 10MB');
    setSelectedFile(f);
    setPreview(URL.createObjectURL(f));
    setDetectionResult(null);
    setUsingCamera(false);
  };

  // Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 960, height: 540 } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setUsingCamera(true);
      setSelectedFile(null);
      setPreview(null);
      setDetectionResult(null);
    } catch {
      toast.error('Could not access camera.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setUsingCamera(false);
      const stream = video.srcObject;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    }, 'image/jpeg', 0.9);
  };

  const clearAll = () => {
    setSelectedFile(null);
    setPreview(null);
    setDetectionResult(null);
    setUsingCamera(false);
    setHighlightId(null);
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
  };

  // Backend call
  const handleDetection = async () => {
    if (!selectedFile) return toast.error('Please select or capture an image.');
    const fd = new FormData();
    fd.append('file', selectedFile);

    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8080/api/detect?model=animal', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = Array.isArray(res.data) ? res.data : [];
      const preds = data.map((d, i) => ({
        id: i,
        class: d.label,
        confidence: d.confidence,
        x1: d.bbox[0], y1: d.bbox[1], x2: d.bbox[2], y2: d.bbox[3],
      }));

      setDetectionResult({ status: 'success', message: 'OK', predictions: preds });
      setHighlightId(null); // reset any previous highlight
      toast.success(`Detected ${preds.length} animal(s)!`);
    } catch (e) {
      console.error(e);
      setDetectionResult({ status: 'error', predictions: [] });
      toast.error('Animal detection failed.');
    } finally {
      setLoading(false);
    }
  };

  // Derived data: filtered predictions for UI (threshold)
  const filteredPreds = useMemo(() => {
    if (!detectionResult?.predictions) return [];
    const t = confidenceThreshold / 100;
    return detectionResult.predictions.filter((p) => (p.confidence ?? 0) >= t);
  }, [detectionResult, confidenceThreshold]);

  // Stats & chart data
  const { colorMap, classCounts, avgConf, maxConf, maxLabel } = useMemo(() => {
    const map = {};
    const counts = {};
    let sum = 0, max = -1, maxL = '';
    filteredPreds.forEach((p) => {
      countLabel(p.class, counts);
      sum += p.confidence || 0;
      if ((p.confidence || 0) > max) { max = p.confidence || 0; maxL = p.class; }
      colorFor(p.class, map);
    });
    return {
      colorMap: map,
      classCounts: counts,
      avgConf: filteredPreds.length ? (sum / filteredPreds.length) : 0,
      maxConf: max > 0 ? max : 0,
      maxLabel: maxL
    };
  }, [filteredPreds]);

  function countLabel(label, counts) {
    counts[label] = (counts[label] || 0) + 1;
  }

  // Chart.js datasets
  const pieData = useMemo(() => {
    const labels = Object.keys(classCounts);
    const values = labels.map((l) => classCounts[l]);
    const colors = labels.map((l) => colorMap[l] || PALETTE[0]);
    return {
      labels,
      datasets: [{ data: values, backgroundColor: colors }]
    };
  }, [classCounts, colorMap]);

  const barData = useMemo(() => {
    const top = [...filteredPreds]
      .sort((a,b)=> (b.confidence||0)-(a.confidence||0))
      .slice(0, 6);
    return {
      labels: top.map((p)=>p.class),
      datasets: [{
        label: 'Confidence (%)',
        data: top.map((p)=> (p.confidence||0)*100),
        backgroundColor: top.map((p)=> colorMap[p.class] || PALETTE[0])
      }]
    };
  }, [filteredPreds, colorMap]);

  const chartOptions = {
    plugins: { legend: { position: 'bottom' } },
    responsive: true,
    maintainAspectRatio: false
  };
  const barOptions = {
    indexAxis: 'y',
    scales: { x: { min: 0, max: 100, ticks: { callback: (v)=> `${v}%` } } },
    plugins: { legend: { display: false } },
    responsive: true,
    maintainAspectRatio: false
  };

  // Base drawing
  const drawBase = useCallback(async () => {
    if (!preview || !containerRef.current || !canvasRef.current) return;
    const containerWidth = containerRef.current.clientWidth || 800;
    const img = new Image();
    img.src = preview;
    await img.decode();

    const scale = containerWidth / img.naturalWidth;
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    const maxH = 560;
    const finalScale = height > maxH ? maxH / img.naturalHeight : scale;
    const w = Math.round(img.naturalWidth * finalScale);
    const h = Math.round(img.naturalHeight * finalScale);

    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    c.width = w;
    c.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
  }, [preview]);

  // Draw detections with highlight
  const drawDetections = useCallback(async () => {
    await drawBase();
    if (!filteredPreds.length || !preview || !canvasRef.current) return;

    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    const img = new Image(); img.src = preview; await img.decode();
    const sx = c.width / img.naturalWidth;
    const sy = c.height / img.naturalHeight;

    // draw non-highlighted first, then highlighted on top
    const toDraw = [...filteredPreds];
    const highlighted = toDraw.find(p=> p.id === highlightId);
    const regular = toDraw.filter(p=> p.id !== highlightId);

    const drawBox = (p, style) => {
      const x = p.x1 * sx, y = p.y1 * sy, w = (p.x2 - p.x1)*sx, h = (p.y2 - p.y1)*sy;
      const color = colorMap[p.class] || '#22c55e';
      ctx.lineWidth = style.lineWidth;
      ctx.strokeStyle = color;
      ctx.strokeRect(x, y, w, h);
      if (displayMode !== 'Hide Labels') {
        const text = displayMode === 'Draw Confidence'
          ? `${p.class} ${(p.confidence*100).toFixed(1)}%`
          : p.class;
        ctx.font = `${style.fontWeight} 14px Inter, system-ui, Arial`;
        const pad = 6, th = 18, tw = ctx.measureText(text).width;
        const ly = y > th + 8 ? y - (th + 8) : y + 8;
        ctx.fillStyle = color + 'E6';
        ctx.fillRect(x, ly, tw + pad*2, th);
        ctx.fillStyle = '#fff';
        ctx.fillText(text, x + pad, ly + th - 6);
      }
    };

    regular.forEach((p)=> drawBox(p, { lineWidth: 3, fontWeight: 600 }));
    if (highlighted) drawBox(highlighted, { lineWidth: 5, fontWeight: 800 });
  }, [drawBase, filteredPreds, displayMode, preview, highlightId, colorMap]);

  // Draw base on preview change
  useEffect(()=>{ drawBase(); }, [drawBase]);
  // Redraw on UI / data change
  useEffect(()=>{ drawDetections(); }, [drawDetections]);
  // Redraw on resize
  useEffect(()=>{
    const onResize = () => drawDetections();
    window.addEventListener('resize', onResize);
    return ()=> window.removeEventListener('resize', onResize);
  }, [drawDetections]);

  const copyResults = () => {
    if (!detectionResult) return;
    navigator.clipboard.writeText(JSON.stringify({ ...detectionResult, predictions: filteredPreds }, null, 2));
    toast.success('Filtered results copied!');
  };
  const downloadResults = () => {
    if (!detectionResult) return;
    const blob = new Blob([JSON.stringify({ ...detectionResult, predictions: filteredPreds }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `animal-detections-${Date.now()}.json`; a.click();
  };

  const badge =
    detectionType === 'health'
      ? { icon: <FaHeartbeat />, klass: 'text-red-600 bg-red-50 border-red-200' }
      : detectionType === 'behavior'
      ? { icon: <FaEye />, klass: 'text-blue-600 bg-blue-50 border-blue-200' }
      : { icon: <FaPaw />, klass: 'text-green-600 bg-green-50 border-green-200' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <motion.div initial={{opacity:0,y:-20}} animate={{opacity:1,y:0}} className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <FaPaw className="text-green-600 text-5xl"/>
            <h1 className="text-4xl font-extrabold text-green-800">AI Animal Detection</h1>
          </div>
          <p className="text-gray-600">Upload or capture an image. We detect animals (best_animal.pt) and visualize stats.</p>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* LEFT: Upload & Controls */}
          <div className="xl:col-span-1 bg-white rounded-2xl shadow-xl p-6 border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FaUpload className="text-green-600"/> Upload or Capture
              </h2>
              {(preview || usingCamera) && (
                <button onClick={clearAll} className="text-gray-500 hover:text-red-600" title="Clear">
                  <FaTimes/>
                </button>
              )}
            </div>

            <div
              onDragOver={onDragOver}
              onDrop={onDrop}
              className={`rounded-xl border-2 transition ${
                preview || usingCamera ? 'border-green-200' : 'border-dashed border-green-300 hover:border-green-500'
              }`}
            >
              {!preview && !usingCamera ? (
                <div className="p-8 text-center cursor-pointer" onClick={()=>fileInputRef.current?.click()}>
                  <FaUpload className="text-green-500 text-4xl mx-auto mb-2"/>
                  <p className="text-gray-700 font-medium">Click to select an image</p>
                  <p className="text-xs text-gray-400">Or drag & drop (JPG/PNG ≤ 10MB)</p>
                </div>
              ) : (
                <img src={preview || ''} alt="selected" className="w-full max-h-52 object-cover rounded-xl"/>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange}/>

            <div className="grid grid-cols-2 gap-2 mt-3">
              {!usingCamera ? (
                <button onClick={startCamera} className="bg-green-100 hover:bg-green-200 text-green-700 py-2 rounded-lg flex items-center justify-center gap-2">
                  <FaCamera/> Use Camera
                </button>
              ) : (
                <button onClick={capturePhoto} className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2">
                  <FaCamera/> Capture
                </button>
              )}
              <button onClick={handleDetection} disabled={loading || !selectedFile} className="bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <FaSync className="animate-spin"/> : <FaEye/>}
                {loading ? 'Analyzing...' : 'Detect Animals'}
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Confidence Threshold: {confidenceThreshold}%</label>
                <input type="range" min={0} max={100} value={confidenceThreshold} onChange={(e)=>setConfidenceThreshold(+e.target.value)} className="w-full accent-green-600"/>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Label Display Mode</label>
                <select value={displayMode} onChange={(e)=>setDisplayMode(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                  <option>Draw Confidence</option>
                  <option>Draw Labels</option>
                  <option>Hide Labels</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Analysis Mode (UI only)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'general', label: 'General', icon: <FaPaw/> },
                    { value: 'health', label: 'Health', icon: <FaHeartbeat/> },
                    { value: 'behavior', label: 'Behavior', icon: <FaEye/> },
                  ].map(m => (
                    <button key={m.value} onClick={()=>setDetectionType(m.value)}
                      className={`px-3 py-2 text-sm rounded-lg border flex items-center justify-center gap-2 ${
                        detectionType === m.value
                          ? `${(detectionType==='health' && 'text-red-600 bg-red-50 border-red-200')
                                || (detectionType==='behavior' && 'text-blue-600 bg-blue-50 border-blue-200')
                                || 'text-green-600 bg-green-50 border-green-200'} border-2`
                          : 'border-gray-200 hover:border-green-300'
                      }`}>
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CENTER: Preview Canvas */}
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-xl p-6 border border-green-100">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <FaCamera className="text-green-600"/> Image Preview
            </h2>
            <div ref={containerRef} className="relative w-full bg-gray-50 rounded-lg min-h-[420px] overflow-hidden flex items-center justify-center">
              {usingCamera ? (
                <div className="relative w-full">
                  <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg"/>
                  <button onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-full shadow">Capture Photo</button>
                </div>
              ) : preview ? (
                <canvas ref={canvasRef} className="w-full h-auto rounded-lg shadow"/>
              ) : (
                <div className="text-gray-400 text-center">
                  <FaPaw className="text-6xl mx-auto mb-2"/>
                  No image selected
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
                  <div className="bg-white rounded-lg px-4 py-3 flex items-center gap-3 shadow">
                    <FaSync className="text-green-600 animate-spin"/>
                    <span className="text-gray-800">Analyzing...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Results & Charts */}
          <div className="xl:col-span-1 bg-white rounded-2xl shadow-xl p-6 border border-green-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FaInfo className="text-green-600"/> Results
              </h2>
              {detectionResult && (
                <div className="flex gap-2">
                  <button onClick={copyResults} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Copy JSON"><FaCopy/></button>
                  <button onClick={downloadResults} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Download JSON"><FaDownload/></button>
                </div>
              )}
            </div>

            {!detectionResult ? (
              <p className="text-gray-400">No results yet</p>
            ) : (
              <AnimatePresence>
                <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
                  {/* Summary */}
                  <div className="rounded-lg p-4 border bg-green-50 border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {filteredPreds.length} animals detected (filtered ≥ {confidenceThreshold}%)
                      </span>
                      {detectionResult.status === 'success' ? <FaCheckCircle className="text-green-600"/> : <FaExclamationTriangle className="text-yellow-600"/>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Unique labels:</span> <b>{Object.keys(classCounts).length}</b></div>
                      <div><span className="text-gray-500">Avg conf:</span> <b>{(avgConf*100).toFixed(1)}%</b></div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Top:</span> <b>{maxLabel || '—'}</b> {maxConf ? `(${(maxConf*100).toFixed(1)}%)` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-lg p-3 border">
                      <h4 className="text-sm font-semibold mb-2">Class distribution</h4>
                      {Object.keys(classCounts).length ? (
                        <div style={{height: 200}}>
                          <Pie data={pieData} options={chartOptions}/>
                        </div>
                      ) : <div className="text-gray-400 text-sm">No classes above threshold.</div>}
                    </div>

                    <div className="rounded-lg p-3 border">
                      <h4 className="text-sm font-semibold mb-2">Top confidences</h4>
                      {filteredPreds.length ? (
                        <div style={{height: 220}}>
                          <Bar data={barData} options={barOptions}/>
                        </div>
                      ) : <div className="text-gray-400 text-sm">No detections to chart.</div>}
                    </div>
                  </div>

                  {/* List */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Detections</h4>
                    {filteredPreds.map((p) => (
                      <button
                        key={p.id}
                        onClick={()=>setHighlightId(p.id)}
                        className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-left transition ${
                          p.id === highlightId ? 'border-green-500 bg-green-50' : 'hover:bg-gray-50'
                        }`}
                        title="Click to highlight"
                      >
                        <span className="font-medium">{p.class}</span>
                        <span className="text-sm text-green-700">{(p.confidence*100).toFixed(1)}%</span>
                      </button>
                    ))}
                    {!filteredPreds.length && <p className="text-gray-400 text-sm">No detections above current threshold.</p>}
                  </div>

                  {/* Raw JSON */}
                  <details className="bg-gray-50 rounded-lg p-4">
                    <summary className="cursor-pointer font-medium">Raw Detection Data</summary>
                    <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto max-h-40">
                      {JSON.stringify(detectionResult, null, 2)}
                    </pre>
                  </details>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Footer card */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="mt-8 bg-white rounded-2xl shadow-xl p-6 border border-green-100">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <FaInfo className="text-green-600"/> Model Info
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-green-50 rounded-lg p-3 border border-green-200"><div className="font-medium text-green-800">Model</div><div className="text-green-700">best_animal.pt</div></div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200"><div className="font-medium text-green-800">Framework</div><div className="text-green-700">Ultralytics YOLOv8</div></div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200"><div className="font-medium text-green-800">Backend</div><div className="text-green-700">Spring Boot + Python</div></div>
            <div className="bg-green-50 rounded-lg p-3 border border-green-200"><div className="font-medium text-green-800">Endpoint</div><div className="text-green-700">POST /api/detect?model=animal</div></div>
          </div>
        </motion.div>
      </div>

      <AIChatbot isOpen={chatbotOpen} onToggle={()=>setChatbotOpen(!chatbotOpen)} context="animal_detection"/>
    </div>
  );
}