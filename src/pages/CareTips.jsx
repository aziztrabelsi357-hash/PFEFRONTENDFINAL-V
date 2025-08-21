import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
// no axios — use built-in care tips only
import { FaSearch, FaPaw, FaHeart, FaRegHeart, FaFilter } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookmarks } from '../hooks/useBookmarks';
import Skeleton from '../components/Skeleton';
import DEFAULT_CARE_TIPS from '../data/careTips';

export default function CareTips() {
  const [careTipItems, setCareTipItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const { bookmarks, toggleBookmark } = useBookmarks();

  // Category options
  const categories = [
    'all',
    'nutrition',
    'grooming',
    'exercise',
    'training',
    'health',
    'behavior'
  ];

  useEffect(() => {
    // Always use built-in scientific care tips (do not fetch from backend)
    setLoading(false);
    setError(null);
  setCareTipItems(DEFAULT_CARE_TIPS);
  setFilteredItems(DEFAULT_CARE_TIPS);
  }, []);

  useEffect(() => {
    let filtered = [...careTipItems];
    
    // Apply search filter
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(item => {
        const title = item.title && typeof item.title === 'string' ? item.title.toLowerCase() : '';
        const desc = item.description && typeof item.description === 'string' ? item.description.toLowerCase() : '';
        return (
          title.includes(searchTerm.toLowerCase()) || 
          desc.includes(searchTerm.toLowerCase())
        );
      });
    }
    
    // Apply category filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(item => item.category === activeFilter);
    }
    
    setFilteredItems(filtered);
  }, [searchTerm, careTipItems, activeFilter]);

  return (
    <div className="p-6 flex-1 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">farmCare Tips</h1>
            <p className="text-gray-600">Essential advice for keeping your farmhappy and healthy</p>
          </div>
          
        </div>

        {/* Search and Filter Section */}
        <div className="mb-8">
          <div className="relative mb-4 max-w-md">
            <input
              type="text"
              placeholder="Search care tips..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-4 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 shadow-sm transition-all"
            />
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
          </div>

          <div className="mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
            >
              <FaFilter />
              <span>Filters</span>
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 mb-6">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setActiveFilter(category)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        activeFilter === category
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <Skeleton key={index} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No care tips found</h3>
            <p className="mt-1 text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredItems.map((careTip) => (
                <motion.div
                  key={careTip.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  <div className="absolute top-4 right-4 z-10">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleBookmark(careTip.id);
                      }}
                      className="p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
                      aria-label={bookmarks.includes(careTip.id) ? "Remove bookmark" : "Add bookmark"}
                    >
                      {bookmarks.includes(careTip.id) ? (
                        <FaHeart className="text-red-500" />
                      ) : (
                        <FaRegHeart className="text-gray-400 hover:text-red-500" />
                      )}
                    </button>
                  </div>
                  
                  <Link
                    to={`/care-tips/${careTip.id}`}
                    className="block h-full"
                  >
                    <motion.div
                      whileHover={{ y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      className="h-full bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200 flex flex-col"
                    >
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-start gap-3">
                          <div className={`p-3 rounded-lg bg-blue-100 text-blue-800`}>
                            <FaPaw />
                          </div>
                          <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">{careTip.title || 'Unnamed Care Tip'}</h2>
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full mb-3">
                              {careTip.category || 'General'}
                            </span>
                            <p className="text-gray-600 line-clamp-3">{careTip.description || 'No description available.'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                        <div className="text-sm text-blue-600 font-medium flex items-center justify-between">
                          <span>Read more</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                          </svg>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}