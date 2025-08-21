import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import imageLogin from '../assets/images/farm1.jpg';
import { notifyFarmChange } from '../utils/notify';

const API_BASE = 'http://localhost:8080';

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

// Page for creating a farm right after user registration
const CreateFarm = ({ setIsLoggedIn }) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userId, setUserId] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    setLoadingUser(true);
    axios
      .get('http://localhost:8080/auth/user', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log('CreateFarm /auth/user response full:', res.data); // debug
        const possibleId = res.data.id || res.data.userId || res.data._id; // try common keys
        if (possibleId) {
          setUserId(possibleId);
        } else {
          const decodedId = extractUserIdFromToken(token);
          if (decodedId) {
            console.log('CreateFarm extracted user id from token (sub/email):', decodedId);
            setUserId(decodedId);
          } else {
            setError('Could not determine user id. Ask backend to include id in /auth/user response.');
          }
        }
      })
      .catch((err) => {
        console.error('CreateFarm fetch user error', err);
        const tokenId = extractUserIdFromToken(token);
        if (tokenId) {
          setUserId(tokenId);
        } else {
          setError('Failed to fetch user details.');
        }
      })
      .finally(() => setLoadingUser(false));
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let currentUserId = userId;
    if (!currentUserId) {
      const token = localStorage.getItem('token');
      currentUserId = extractUserIdFromToken(token || '') || '';
      setUserId(currentUserId);
    }
    if (!currentUserId) {
      setError('User ID missing.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/api/farms/user/${encodeURIComponent(currentUserId)}`,
        { name, location, animalIds: [], plantIds: [], userId: currentUserId },
        { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
      );
      // After creation, fetch the farm to capture its id value
      try {
        const farmRes = await axios.get(`${API_BASE}/api/farms/user/${encodeURIComponent(currentUserId)}`, { headers: { Authorization: `Bearer ${token}` }});
        const createdFarm = farmRes.data;
        const newFarmId = createdFarm?.id || createdFarm?.farmId || createdFarm?.FarmId;
        if (newFarmId) localStorage.setItem('farmId', newFarmId);
      } catch(fetchErr){ /* ignore */ }

      setSuccess('Farm created successfully! Redirecting to your farm...');
  try { notifyFarmChange(); } catch(e){}
      setTimeout(() => navigate('/farm'), 1200);
    } catch (err) {
      console.error('Create farm error:', err.response?.data || err.message);
      const data = err.response?.data;
      let msg = 'Failed to create farm';
      if (typeof data === 'string') msg = data;
      else if (data?.message) msg = data.message;
      else if (data?.error) msg = data.error;
      if (err.response?.status === 404) {
        msg += ' (404). Check: 1) Correct path? Should likely be /api/farms/user/{id}. 2) Backend expects internal Mongo _id not email.';
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageLogin})` }}
      >
        <div className="absolute inset-0 bg-black opacity-50" />
      </div>
      <div className="relative flex-grow flex justify-center items-center p-4">
        <div className="bg-white bg-opacity-20 backdrop-blur-lg shadow-lg rounded-xl p-6 sm:p-8 w-full max-w-md">
          <h2 className="text-2xl font-semibold text-white text-center mb-2">Create Your Farm</h2>
          <p className="text-center text-white text-sm mb-6">Finish onboarding by setting up your first farm.</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            {loadingUser && (
              <p className="text-white text-sm">Loading user info...</p>
            )}
            {!loadingUser && userId && userId.includes('@') && (
              <p className="text-yellow-200 text-xs">Using email as user identifier. If creation fails, backend probably needs real user id.</p>
            )}
            <div>
              <input
                type="text"
                placeholder="Farm Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full p-3 bg-transparent border-b border-white text-white outline-none placeholder-white"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full p-3 bg-transparent border-b border-white text-white outline-none placeholder-white"
              />
            </div>
            {error && <p className="text-red-300 text-sm whitespace-pre-wrap">{error}</p>}
            {success && <p className="text-green-300 text-sm">{success}</p>}
            <button
              type="submit"
              disabled={!name || !location || submitting || loadingUser}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Farm'}
            </button>
          </form>
          <p className="text-white text-xs text-center mt-6 opacity-70">
            You can edit farm details later from your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreateFarm;
