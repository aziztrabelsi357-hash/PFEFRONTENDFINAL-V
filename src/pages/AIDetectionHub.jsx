import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FaLeaf,
  FaPaw,
  FaRocket,
  FaCheckCircle,
  FaExclamationTriangle,
  FaServer,
  FaCode,
  FaSync,
  FaKeyboard,
  FaCircle
} from 'react-icons/fa';
import AIChatbot from '../components/AIChatbot';

const StatusBadge = ({ status, label }) => {
  const map = {
    up: { icon: <FaCheckCircle />, class: 'text-green-700 bg-green-50 border-green-200' },
    down: { icon: <FaExclamationTriangle />, class: 'text-red-700 bg-red-50 border-red-200' },
    warn: { icon: <FaExclamationTriangle />, class: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
    unknown: { icon: <FaRocket />, class: 'text-gray-700 bg-gray-50 border-gray-200' }
  };
  const cfg = map[status] || map.unknown;
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs border ${cfg.class}`}>
      {cfg.icon} {label}
    </span>
  );
};

const AIDetectionHub = () => {
  const navigate = useNavigate();
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const [backendStatus, setBackendStatus] = useState('unknown'); // up|down|unknown
  const [plantModelStatus, setPlantModelStatus] = useState('unknown');
  const [animalModelStatus, setAnimalModelStatus] = useState('unknown');
  const [checking, setChecking] = useState(false);

  // Smol helper to ping endpoints safely
  const ping = async (url, opts = {}, timeout = 3500) => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(id);
      return { ok: res.ok, status: res.status };
    } catch (e) {
      clearTimeout(id);
      return { ok: false, error: e?.name || 'ERR' };
    }
  };

  const checkAll = async () => {
    setChecking(true);
    // Backend (Spring Boot Actuator)
    const b = await ping('http://localhost:8080/actuator/health', { method: 'GET' }, 3000);
    setBackendStatus(b.ok ? 'up' : 'down');

    // Models (we just test reachability of the detect endpoint via OPTIONS; if CORS blocks,
    // we consider status "warn" if backend is UP but OPTIONS fails)
    let plant = 'unknown';
    let animal = 'unknown';

    if (b.ok) {
      const p = await ping('http://localhost:8080/api/detect?model=plant', { method: 'OPTIONS' }, 3000);
      const a = await ping('http://localhost:8080/api/detect?model=animal', { method: 'OPTIONS' }, 3000);
      plant = p.ok ? 'up' : 'warn';
      animal = a.ok ? 'up' : 'warn';
    } else {
      plant = 'down';
      animal = 'down';
    }

    setPlantModelStatus(plant);
    setAnimalModelStatus(animal);
    setChecking(false);
  };

  useEffect(() => {
    checkAll();
    // Keyboard shortcuts
    const onKey = (e) => {
      if (e.key.toLowerCase() === 'p') navigate('/ai-plant-detection');
      if (e.key.toLowerCase() === 'a') navigate('/ai-animal-detection');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const quickHint = useMemo(
    () =>
      backendStatus === 'up'
        ? 'Backend: Ready • Press P for Plant or A for Animal.'
        : 'Start your Spring Boot backend (localhost:8080) then click “Check Status”.',
    [backendStatus]
  );

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 overflow-hidden">
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-[36rem] h-[36rem] rounded-full bg-green-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-[36rem] h-[36rem] rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="relative z-10 max-w-6xl mx-auto p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold text-green-800 tracking-tight mb-2">
            🤖 AI Detection Hub
          </h1>
          <p className="text-gray-600 text-base md:text-lg">{quickHint}</p>
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
            <FaKeyboard />
            <span>Shortcuts: P = Plant • A = Animal</span>
          </div>
        </motion.div>

        {/* Detection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Plant */}
          <motion.button
            whileHover={{ y: -6, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/ai-plant-detection')}
            className="group relative bg-white rounded-2xl shadow-xl border border-green-100 p-6 text-left transition overflow-hidden"
          >
            <div className="absolute -top-24 -right-16 w-56 h-56 bg-green-200/40 rounded-full blur-2xl transition group-hover:bg-green-300/50" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 w-14 h-14 rounded-2xl flex items-center justify-center">
                    <FaLeaf className="text-green-600 text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Plant Detection</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={plantModelStatus} label="Plant Model" />
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <FaCircle className="text-green-500" /> YOLOv8
                </div>
              </div>

              <p className="text-gray-600 mt-4">
                Identify diseases or classify leaves with your embedded models (best.pt, best_leaf.pt).
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">Disease detection</span>
                <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">Leaf classification</span>
                <span className="px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">Charts & Stats</span>
              </div>

              <div className="mt-6">
                <span className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700">
                  Start Plant Detection
                </span>
              </div>
            </div>
          </motion.button>

          {/* Animal */}
          <motion.button
            whileHover={{ y: -6, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/ai-animal-detection')}
            className="group relative bg-white rounded-2xl shadow-xl border border-blue-100 p-6 text-left transition overflow-hidden"
          >
            <div className="absolute -top-24 -right-16 w-56 h-56 bg-sky-200/40 rounded-full blur-2xl transition group-hover:bg-sky-300/50" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center">
                    <FaPaw className="text-blue-600 text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Animal Detection</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={animalModelStatus} label="Animal Model" />
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <FaCircle className="text-blue-500" /> YOLOv8
                </div>
              </div>

              <p className="text-gray-600 mt-4">
                Detect animals with best_animal.pt and visualize confidences, distributions, and more.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Recognition</span>
                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Health/behavior (UI modes)</span>
                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Charts & Stats</span>
              </div>

              <div className="mt-6">
                <span className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700">
                  Start Animal Detection
                </span>
              </div>
            </div>
          </motion.button>
        </div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6 border border-green-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FaServer className="text-green-600" />
              System Status
            </h3>
            <button
              onClick={checkAll}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
              title="Re-check connectivity"
            >
              {checking ? <FaSync className="animate-spin" /> : <FaRocket />}
              {checking ? 'Checking…' : 'Check Status'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-lg border bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {backendStatus === 'up' ? (
                  <FaCheckCircle className="text-green-600" />
                ) : (
                  <FaExclamationTriangle className="text-red-600" />
                )}
                <div>
                  <div className="font-medium">Backend Server</div>
                  <div className="text-sm text-gray-500">localhost:8080</div>
                </div>
              </div>
              <StatusBadge status={backendStatus} label={backendStatus.toUpperCase()} />
            </div>

            <div className="p-4 rounded-lg border bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaLeaf className="text-green-600" />
                <div>
                  <div className="font-medium">Plant Models</div>
                  <div className="text-sm text-gray-500">/api/detect?model=plant</div>
                </div>
              </div>
              <StatusBadge status={plantModelStatus} label={plantModelStatus.toUpperCase()} />
            </div>

            <div className="p-4 rounded-lg border bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaPaw className="text-blue-600" />
                <div>
                  <div className="font-medium">Animal Model</div>
                  <div className="text-sm text-gray-500">/api/detect?model=animal</div>
                </div>
              </div>
              <StatusBadge status={animalModelStatus} label={animalModelStatus.toUpperCase()} />
            </div>
          </div>
        </motion.div>

        {/* Quick Setup Guide */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-white rounded-2xl shadow-xl p-6 border border-green-100"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaCode className="text-green-600" />
            Quick Setup Guide
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 rounded-lg border bg-gray-50">
              <div className="font-medium mb-1">✅ Frontend (You are here)</div>
              <div className="text-gray-600">Vite + React running in development.</div>
            </div>

            <div className="p-4 rounded-lg border bg-gray-50">
              <div className="font-medium mb-1">🔧 Start Backend</div>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>mvn spring-boot:run</li>
                <li>Actuator: /actuator/health</li>
                <li>Detection: /api/detect?model=plant|leaf|animal</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg border bg-gray-50">
              <div className="font-medium mb-1">🤖 Models</div>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>best.pt → plant diseases</li>
                <li>best_leaf.pt → leaf</li>
                <li>best_animal.pt → animals</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* CTA row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 flex items-center justify-center gap-4"
        >
          <button
            onClick={() => navigate('/ai-plant-detection')}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg shadow"
          >
            Go to Plant Detection
          </button>
          <button
            onClick={() => navigate('/ai-animal-detection')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow"
          >
            Go to Animal Detection
          </button>
        </motion.div>

        {/* Chatbot */}
        <div className="mt-6">
          <AIChatbot
            isOpen={chatbotOpen}
            onToggle={() => setChatbotOpen(!chatbotOpen)}
            context="ai_detection_hub"
          />
        </div>
      </div>
    </div>
  );
};

export default AIDetectionHub;