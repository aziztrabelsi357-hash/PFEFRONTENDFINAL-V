const API_URL = 'http://localhost:8080/auth';

export const register = async (username, email, password) => {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || 'Registration failed');
  return text;
};

export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const text = await response.text();
  if (!response.ok || text === 'Invalid credentials!') throw new Error(text);
  localStorage.setItem('token', text);
  return text;
};

export const forgotPassword = async (email) => {
  const response = await fetch(`${API_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || 'Failed to send reset link');
  return text;
};

export const resetPassword = async (token, newPassword) => {
  const response = await fetch(`${API_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || 'Failed to reset password');
  return text;
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getCurrentUser = () => {
  return localStorage.getItem('token');
};