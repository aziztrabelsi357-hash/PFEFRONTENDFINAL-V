import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; 
import { toast } from 'react-toastify'; // Import toast for notifications
import axios from 'axios'; 
import loginImage from '../assets/images/loginImage.jpeg';

const Login = ({ setIsLoggedIn, fetchUserDetails }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  const [showPassword, setShowPassword] = useState(false); 
  
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    const isLikelyJwt = (str) => typeof str === 'string' && str.split('.').length === 3 && str.length > 20;

    try {
      const response = await axios.post('http://localhost:8080/auth/login', { email, password });
      const token = response.data;

      // Handle backend returning success 200 with plain error message
      if (token === 'Invalid credentials!' || !isLikelyJwt(token)) {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setError('Invalid email or password 😒 (try again)');
        toast.error('Login failed');
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('userEmail', email);
      setIsLoggedIn(true);
      await fetchUserDetails(token);

      // Fetch user to obtain real userId
      let userId = null;
      try {
        const uRes = await axios.get('http://localhost:8080/auth/user', { headers: { Authorization: `Bearer ${token}` } });
        userId = uRes.data.id || uRes.data.userId || uRes.data._id || uRes.data.sub || null;
        if (userId) localStorage.setItem('userId', userId);
      } catch {/* ignore */
      }
      if (!userId) {
        // decode token as fallback
        const parts = token.split('.');
        if (parts.length === 3) {
          try { const decoded = JSON.parse(atob(parts[1])); userId = decoded.id || decoded.userId || decoded.sub; if (userId) localStorage.setItem('userId', userId); } catch {/* ignore */}
        }
      }

      // Fetch farm for this user and store farmId if exists
      let farmId = null;
      if (userId) {
        try {
          const farmRes = await axios.get(`http://localhost:8080/api/farms/user/${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${token}` } });
          const farmData = farmRes.data;
          farmId = farmData?.id || farmData?.farmId || farmData?.FarmId || null;
          if (farmId) localStorage.setItem('farmId', farmId);
        } catch (farmErr) {
          if (farmErr.response?.status !== 404) {
            console.warn('Farm lookup error:', farmErr.response?.data || farmErr.message);
          } else {
            localStorage.removeItem('farmId');
          }
        }
      }

      toast.success('Login successful!');
      navigate(farmId ? '/dashboard' : '/create-farm');
    } catch (err) {
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      if (err.response?.data === 'Invalid credentials!' || err.response?.status === 401) {
        setError('Invalid email or password 😒 (try again)');
        toast.error('Login failed');
      } else {
        setError('An error occurred during login. Please try again later.');
        toast.error('Login error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setError('');
    setForgotMessage('');
    setIsLoading(true); 

    
    if (!validateEmail(forgotEmail)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:8080/auth/forgot-password', { email: forgotEmail });
      setForgotMessage(response.data); 
      toast.success('Reset link sent! Check your email.');
    } catch (err) {
      setError(err.response?.data || 'An error occurred while sending the reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${loginImage})` }}
      >
        <div className="absolute inset-0 bg-black opacity-40"></div>
      </div>
      <div className="relative flex-grow flex justify-center items-center">
        <div className="bg-white bg-opacity-20 backdrop-blur-lg shadow-lg rounded-xl p-6 sm:p-8 md:p-10 w-full max-w-sm sm:max-w-md md:max-w-lg">
          <h2 className="text-2xl font-semibold text-white text-center mb-4">
            {showForgot ? 'Forgot Password' : 'Login'}
          </h2>

          {!showForgot ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Your Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isLoading} 
                  className="w-full p-3 bg-transparent border-b border-white text-white outline-none placeholder-white"
                />
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="Your Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={isLoading} 
                  className="w-full p-3 bg-transparent border-b border-white text-white outline-none placeholder-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-white"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="flex justify-between items-center text-white text-sm">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" disabled={isLoading} /> Remember Me
                </label>
                <span
                  className="hover:underline cursor-pointer"
                  onClick={() => setShowForgot(true)}
                >
                  Forgot Password?
                </span>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                className={`w-full bg-white text-black py-3 rounded-lg hover:bg-green-400 transition duration-200 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isLoading} 
              >
                {isLoading ? 'Logging in...' : 'Login'} 
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  placeholder="Your Email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  required
                  disabled={isLoading} 
                  className="w-full p-3 bg-transparent border-b border-white text-white outline-none placeholder-white"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              {forgotMessage && <p className="text-green-500 text-sm">{forgotMessage}</p>}
              <button
                type="submit"
                className={`w-full bg-white text-black py-3 rounded-lg hover:bg-gray-200 transition duration-200 ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isLoading} 
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'} 
              </button>
              <p
                className="text-white text-sm text-center mt-4 cursor-pointer hover:underline"
                onClick={() => setShowForgot(false)}
              >
                Back to Login
              </p>
            </form>
          )}

          {!showForgot && (
            <>
              <p className="text-white text-sm font-bold text-center mt-4">
                New Here?
              </p>
              <div className="text-white text-sm font-bold text-center mt-4">
                <span className="text-black cursor-pointer hover:underline" onClick={() => navigate('/register')}>Create an account</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

Login.propTypes = {
  setIsLoggedIn: PropTypes.func.isRequired,
  fetchUserDetails: PropTypes.func.isRequired,
};

export default Login;