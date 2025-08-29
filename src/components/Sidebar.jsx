import { useState } from 'react';
import { MdMenuOpen, MdOutlinePets, MdOutlineLocalFlorist, MdOutlineWaterDrop, MdOutlineNotificationsActive } from "react-icons/md";
import { GoUpload } from "react-icons/go";
import { FaProductHunt, FaUserCircle, FaHistory, FaDog, FaDisease, FaBell, FaRobot, FaDrumstickBite } from "react-icons/fa";
import { IoLogOut } from "react-icons/io5";
import { MdOutlineTipsAndUpdates } from "react-icons/md";
import { FaShieldAlt } from "react-icons/fa"; 
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const menuItems = [
  { icon: <MdOutlinePets size={30} />, label: 'Dashboard', path: '/dashboard' },
  {
    icon: <MdOutlinePets size={30} />, label: 'MyFarm',
    submenu: [
      { icon: <FaDog size={24} />, label: 'My Animals', path: '/my-animals' },
      { icon: <MdOutlineLocalFlorist size={24} />, label: 'My Plants', path: '/my-plants' },
      { icon: <MdOutlineWaterDrop size={24} />, label: 'Watering', path: '/watering' },
      { icon: <FaDrumstickBite size={24} className="text-green-600" />, label: 'Feeding', path: '/feeding' }
    ]
  },
  { icon: <FaProductHunt size={30} />, label: 'Products', path: '/products' },
  { icon: <MdOutlineTipsAndUpdates size={30} />, label: 'Care Tips', path: '/care-tips' },
  { icon: <MdOutlineNotificationsActive size={30} />, label: 'Notifications', path: '/notifications' },
  { icon: <FaRobot size={30} />, label: 'AI farms Detection', path: '/ai-farms' },
];

export default function Sidebar({ setIsLoggedIn, username, email, isAdmin }) {
  const [open, setOpen] = useState(true);
  const [farmOpen, setFarmOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    toast.success('Signed out successfully!');
    navigate('/');
  };

  return (
    <div className="flex">
      <nav className={`fixed top-0 left-0 h-screen p-2 bg-white text-black shadow-md duration-500 ${open ? 'w-60' : 'w-16'}`}>
        <div className="px-3 py-2 h-20 flex justify-between items-center">
          <MdMenuOpen 
            size={34} 
            className={`text-green-600 cursor-pointer duration-500 ${!open && 'rotate-180'}`} 
            onClick={() => setOpen(!open)} 
          />
        </div>
        <ul className="flex-1">
          {menuItems.map((item, index) => (
            item.submenu ? (
              <li key={index} className="px-0.5 py-1 my-1ounded-md duration-300 cursor-pointer flex flex-col gap-2 items-start relative group">
                <div className="flex gap-2 items-center w-full hover:bg-gray-400 hover:text-black rounded-md px-2 py-2" onClick={() => setFarmOpen(farmOpen => !farmOpen)} style={{ cursor: 'pointer' }}>
                  <div className="text-green-600">{item.icon}</div>
                  <p className={`font-bold ${!open && 'w-0 translate-x-24'} duration-500 overflow-hidden`}>{item.label}</p>
                  <span className={`ml-auto transition-transform duration-300 ${farmOpen ? 'rotate-90' : ''}`}>{open && <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>}</span>
                </div>
                  {farmOpen && (
                    <ul className="ml-3 mt-1 ">
                      {item.submenu.map((sub, subIdx) => (
                        <li key={subIdx} className="flex gap-2 items-center py-1 hover:bg-gray-300 hover:text-black rounded-md duration-200 cursor-pointer">
                          <Link to={sub.path || '#'} className="flex gap-2 items-center w-full">
                            <div className="text-green-600">{sub.icon}</div>
                            {open && <span className="font-medium w-40">{sub.label}</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
              </li>
            ) : (
              <li key={index} className="px-3 py-2 my-2 hover:bg-gray-400 hover:text-black rounded-md duration-300 cursor-pointer flex gap-2 items-center relative group">
                <Link to={item.path || '#'} className="flex gap-2 items-center justify-center">
                  <div className="text-green-600 flex-shrink-0">{item.icon}</div>
                  {open && (
                    <p className="font-bold duration-500 overflow-hidden">{item.label}</p>
                  )}
                </Link>
                {/* Floating label for collapsed sidebar on hover */}
                {!open && (
                  <span className="absolute left-16 bg-white text-black text-xs font-medium rounded shadow px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    {item.label}
                  </span>
                )}
              </li>
            )
          ))}
          {isAdmin && (
            <li className="px-3 py-2 my-2 hover:bg-gray-200 hover:text-black rounded-md duration-300 cursor-pointer flex gap-2 items-center relative group">
              <Link to="/admin" className="flex gap-2 items-center">
                <div className="text-green-600"><FaShieldAlt size={30} /></div>
                <p className={`font-bold ${!open && 'w-0 translate-x-24'} duration-500 overflow-hidden`}>Admin Dashboard</p>
              </Link>
              <p className={`font-bold ${open && 'hidden'} absolute left-32 shadow-md rounded-md w-0 p-0 text-black bg-white duration-100 overflow-hidden group-hover:w-fit group-hover:p-2 group-hover:left-16 group-hover:bg-gray-200 group-hover:text-black`}>
                Admin Dashboard
              </p>
            </li>
          )}
          <li className="px-3 py-2 my-2 hover:bg-black hover:text-white rounded-md duration-300 cursor-pointer flex gap-2 items-center relative group">
            <div onClick={handleSignOut} className="flex gap-2 items-center justify-center">
              <div className="text-green-600 flex-shrink-0"><IoLogOut size={30} /></div>
              {open && (
                <p className="font-bold duration-500 overflow-hidden">Disconnect</p>
              )}
            </div>
            {/* Floating label for collapsed sidebar on hover */}
            {!open && (
              <span className="absolute left-16 bg-white text-black text-xs font-medium rounded shadow px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Disconnect
              </span>
            )}
          </li>
          {/* Account icon and info as a menu item */}
          <li className="px-3 py-2 my-2 mt-30 bg-white rounded-md duration-300 flex gap-2 items-center group">
            <div className="flex gap-2 items-center">
              <FaUserCircle size={30} className="text-green-600 bg-gray-100 rounded-full p-1 shadow" />
              {open && (
                <div className="leading-5">
                  <p className="font-bold text-base text-gray-800">{username || 'User'}</p>
                  <span className="text-xs text-green-700 font-medium bg-green-50 block break-all">{email || 'email@example.com'}</span>
                </div>
              )}
            </div>
          </li>
        </ul>
  {/* Account info now in menu above */}
      </nav>
      <div className={`flex-1 min-h-screen p- bg-gray-100 transition-all duration-500 ${open ? 'ml-60' : 'ml-16'}`}></div>
    </div>
  );
}