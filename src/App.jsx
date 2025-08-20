import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import WateringPage from './pages/WateringPage';
import FeedingPage from './pages/FeedingPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import AboutUsSection from './components/AboutUsSection';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import ServicesSection from './components/ServicesSection';
import TopSection from './components/TopSection';
import Login from './pages/Login';
import SignOut from './components/SignOut';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import DiseaseArticlePage from './pages/DiseaseArticlePage';
import FarmPage from './pages/FarmPage';
import Products from './pages/Products';
import CareTipArticlePage from './pages/CareTipArticlePage';
import CareTips from './pages/CareTips';
import Diseases from './pages/Diseases';
import Upload from './pages/Upload';
import History from './pages/History';
import MyAnimals from './pages/AnimalPage';
import MyPlantes from './pages/PlantPage';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';
import AdminDashboard from './pages/AdminDashboard';
import ManageDiseases from './pages/ManageDiseases';
import ManageCareTips from './pages/ManageCareTips';
import ManageProducts from './pages/ManageProducts';
import axios from 'axios';
import CreateFarm from './pages/CreateFarm';

function AppLayout({ isLoggedIn, userDetails, isAdmin, setIsLoggedIn, fetchUserDetails }) {
  const location = useLocation();
  const hideSidebarPaths = ['/create-farm', '/register', '/login', '/reset-password'];
  const hideSidebar = hideSidebarPaths.includes(location.pathname);
  return (
    <div className='app-container w-full min-h-svh bg-white flex'>
      {isLoggedIn && !hideSidebar && (
        <Sidebar
          setIsLoggedIn={setIsLoggedIn}
          username={userDetails.username}
          email={userDetails.email}
          isAdmin={isAdmin}
        />
      )}
      <div className='content-container flex-1'>
        {!isLoggedIn && <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />}
        <Routes>
          <Route
            path="/dashboard"
            element={isLoggedIn ? <Dashboard /> : <Login setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />}
          />
          <Route
            path="/my-animals"
            element={isLoggedIn ? <MyAnimals /> : <Login setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />}
          />
          <Route
            path="/my-plantes"
            element={isLoggedIn ? <MyPlantes /> : <Login setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />}
          />
          <Route
            path="/my-plants"
            element={isLoggedIn ? <MyPlantes /> : <Login setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />}
          />
          <Route
            path="/"
            element={
              <>
                <TopSection />
                <AboutUsSection />
                <ServicesSection />
              </>
            }
          />
          <Route path="/services" element={<ServicesSection />} />
          <Route path="/about" element={<AboutUsSection />} />
          <Route path="/login" element={<Login setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/signout" element={<SignOut setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/register" element={<Register setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />} />
          <Route path="/watering" element={<WateringPage />} />
          <Route path="/feeding" element={<FeedingPage />} />
          <Route
            path="/create-farm"
            element={isLoggedIn ? <CreateFarm setIsLoggedIn={setIsLoggedIn} /> : <Login setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />}
          />
          <Route
            path="/farm"
            element={isLoggedIn ? <FarmPage setIsLoggedIn={setIsLoggedIn} /> : <Login setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />}
          />
          <Route
            path="/products"
            element={isLoggedIn ? <Products /> : <Login setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />}
          />
          <Route
            path="/care-tips"
            element={isLoggedIn ? <CareTips /> : <Login setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />}
          />
          <Route
            path="/care-tips/:id"
            element={isLoggedIn ? <CareTipArticlePage /> : <Login setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />}
          />
            <Route
              path="/diseases"
              element={isLoggedIn ? <Diseases /> : <Login setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />}
            />
            <Route
              path="/diseases/:id"
              element={isLoggedIn ? <DiseaseArticlePage /> : <Login setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />}
            />
            <Route
              path="/upload"
              element={isLoggedIn ? <Upload /> : <Login setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />}
            />
            <Route
              path="/history"
              element={isLoggedIn ? <History /> : <Login setIsLoggedIn={setIsLoggedIn} fetchUserDetails={fetchUserDetails} />}
            />
            <Route
              path="/admin"
              element={
                isLoggedIn && isAdmin ? (
                  <AdminDashboard />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/admin/diseases"
              element={
                isLoggedIn && isAdmin ? (
                  <ManageDiseases />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/admin/care-tips"
              element={
                isLoggedIn && isAdmin ? (
                  <ManageCareTips />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/admin/products"
              element={
                isLoggedIn && isAdmin ? (
                  <ManageProducts />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
        </Routes>
        {!isLoggedIn && <Footer />}
      </div>
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userDetails, setUserDetails] = useState({ username: '', email: '', roles: [] });

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log("App.jsx: Token from localStorage on load:", token);
    if (token) {
      setIsLoggedIn(true);
      fetchUserDetails(token);
    }
  }, []);

  const fetchUserDetails = async (token) => {
    try {
      const response = await axios.get('http://localhost:8080/auth/user', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUserDetails({
        username: response.data.username || 'User',
        email: response.data.email || '',
        roles: response.data.roles || [],
      });
    } catch (err) {
      console.error('Failed to fetch user details:', err);
      // Extra debug info to help diagnose 500s from the backend
      try{
        console.error('Backend status:', err?.response?.status);
        console.error('Backend response body:', err?.response?.data);
        console.error('Request sent (headers/config):', err?.config);
      }catch(e){ /* ignore */ }
      // clear auth state on failure
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      setUserDetails({ username: '', email: '', roles: [] });
    }
  };

  const isAdmin = userDetails.roles.includes('ADMIN');

  return (
    <Router>
      <AppLayout
        isLoggedIn={isLoggedIn}
        userDetails={userDetails}
        isAdmin={isAdmin}
        setIsLoggedIn={setIsLoggedIn}
        fetchUserDetails={fetchUserDetails}
      />
      <ToastContainer />
    </Router>
  );
}

export default App;