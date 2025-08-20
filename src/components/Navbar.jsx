import  { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PetCareLogo from "../assets/images/pet-care-logo.png";
import FarmLogo from "../assets/images/farm-logo.png";
import CustomButton from "./CustomButton";


const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
  <nav className={`w-full sticky top-0 z-50 transition-colors duration-300 ${scrolled ? 'bg-gradient-to-l from-green-600 via-green-400 to-white' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left container */}
          <div
            className="flex-shrink-0 flex items-center cursor-pointer select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img
              className="block lg:hidden h-12 w-auto rounded-md transition-transform duration-200 hover:scale-110"
              src={FarmLogo}
              alt="Farm Logo"
            />
            <img
              className="hidden lg:block h-14 w-auto rounded-md transition-transform duration-200 hover:scale-110"
              src={FarmLogo}
              alt="Farm Logo"
            />
            <span className={`ml-3 text-2xl font-extrabold tracking-wide drop-shadow-lg transition-transform duration-200 hover:scale-105 ${scrolled ? 'text-black' : 'text-green-600'}`}>
              MyFarm
            </span>
          </div>

          {/* Middle container */}
          <div className="hidden lg:flex justify-center flex-grow">
            <div className="flex space-x-4">
              <Link
                to="/"
                className={`${scrolled ? 'text-white hover:bg-green-700 hover:text-green-100' : 'text-gray-800 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200`}
              >
                Home
              </Link>
              <Link
                to="/about"
                className={`${scrolled ? 'text-white hover:bg-green-700 hover:text-green-100' : 'text-gray-800 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200`}
              >
                About Us
              </Link>
              <Link
                to="/services"
                className={`${scrolled ? 'text-white hover:bg-green-700 hover:text-green-100' : 'text-gray-800 hover:bg-gray-700 hover:text-white'} px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200`}
              >
                Services
              </Link>
              
            </div>
          </div>

          {/* Right container */}
          <div className="flex-shrink-0 hidden sm:flex items-center space-x-2">
            <Link to="/register">
              <CustomButton slim={true} text="SIGN UP" color={scrolled ? 'black' : 'green'} />
            </Link>
            <Link to="/login">
              <CustomButton slim={true} text="LOGIN" color={scrolled ? 'black' : 'green'} />
            </Link>
          </div>

          {/* Mobile menu */}
          <div className="lg:hidden flex items-center">
            <button
              type="button"
              className={`${scrolled ? 'text-white hover:text-green-100' : 'text-gray-800 hover:text-gray-700'} focus:outline-none transition-colors duration-200`}
              aria-label="Toggle menu"
              onClick={toggleMenu}
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4 6h16V4H4v2zm0 5h16v-2H4v2zm16 4H4v-2h16v2zm0 4H4v-2h16v2z"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M4 6h16V4H4v2zm0 5h16v-2H4v2zm0 5h16v-2H4v2z"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu content */}
        {isOpen && (
          <div className="lg:hidden">
            <div className="flex flex-col space-y-2">
              <Link
                to="/"
                className="text-gray-800 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              >
                Home
              </Link>
              <Link
                to="/about"
                className="text-gray-800 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              >
                About us
              </Link>
              <Link
                to="/services"
                className="text-gray-800 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              >
                Services
              </Link>
             
              <Link
                to="/login"
                className="text-gray-800 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="text-gray-800 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
