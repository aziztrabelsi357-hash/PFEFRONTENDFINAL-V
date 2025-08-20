import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/Auth';
import loginImage from '../assets/images/loginImage.jpeg';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); 
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setSuccessMessage('');
      return;
    }

    try {
      const message = await resetPassword(token, newPassword);
      setSuccessMessage(message);
      setError('');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
      setSuccessMessage('');
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
          <h2 className="text-2xl font-semibold text-white text-center mb-4">Reset Password</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                className="w-full p-3 bg-transparent border-b border-white text-white outline-none placeholder-white"
              />
            </div>
            <div className="relative">
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                className="w-full p-3 bg-transparent border-b border-white text-white outline-none placeholder-white"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {successMessage && <p className="text-green-500 text-sm">{successMessage}</p>}
            <button
              type="submit"
              className="w-full bg-white text-black py-3 rounded-lg hover:bg-gray-200 transition duration-200"
              disabled={!newPassword || newPassword !== confirmPassword}
            >
              Reset Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;