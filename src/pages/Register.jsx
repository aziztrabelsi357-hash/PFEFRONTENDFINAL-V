import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/Auth'; 
import imageLogin from '../assets/images/loginImage.jpeg';

const Register = ({ setIsLoggedIn, fetchUserDetails }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState(''); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [registrationMessage, setRegistrationMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setRegistrationMessage('');
      return;
    }

    try {
      await register(username, email, password);
      setRegistrationMessage(`Nice work ${username || email}! You're registered successfully.`);
      setError('');
      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      setError('Registration failed: ' + err.message);
      setRegistrationMessage('');
    }
  };

  return (
    
    <div className="relative min-h-screen flex flex-col">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageLogin})` }}
      >
        <div className="absolute inset-0 bg-black opacity-40"></div>
      </div>
      <div className="relative flex-grow flex justify-center items-center">
        <div className="bg-white bg-opacity-20 backdrop-blur-lg shadow-lg rounded-xl p-6 sm:p-8 md:p-10 w-full max-w-sm sm:max-w-md md:max-w-lg">
          <h2 className="text-2xl font-semibold text-white text-center mb-4">Register</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Your Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                className="w-full p-3 bg-transparent border-b border-white text-white outline-none placeholder-white"
              />
            </div>
            <div className="relative">
              <input
                type="email"
                placeholder="Your Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full p-3 bg-transparent border-b border-white text-white outline-none placeholder-white"
              />
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="Your Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full p-3 bg-transparent border-b border-white text-white outline-none placeholder-white"
              />
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                className="w-full p-3 bg-transparent border-b border-white text-white outline-none placeholder-white"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {registrationMessage && <p className="text-green-500 text-sm">{registrationMessage}</p>}
            <button
              type="submit"
              className="w-full bg-white text-black py-3 rounded-lg hover:bg-gray-200 transition duration-200"
              disabled={!username || !email || !password || password !== confirmPassword}
            >
              Register
            </button>
          </form>
          <p className="text-white text-sm text-center mt-4">
            Already have an account? <span className="text-black cursor-pointer hover:underline" onClick={() => navigate('/login')}>Login</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;