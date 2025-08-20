import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowLeft, FaShareAlt, FaHeart, FaRegHeart, FaPaw } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import Skeleton from '../components/Skeleton';
import { useBookmarks } from '../hooks/useBookmarks';

export default function CareTipArticlePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [careTip, setCareTip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('article');
  const { bookmarks, toggleBookmark } = useBookmarks();

  useEffect(() => {
    const fetchCareTip = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`http://localhost:8080/api/care-tips/${id}`);
        setCareTip(response.data);
      } catch (err) {
        setError('Failed to load the care tip. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCareTip();
  }, [id]);

  const handleShare = async () => {
    if (!careTip) return;

    const shareData = {
      title: careTip.title,
      text: `Check out this care tip for farms: ${careTip.description.substring(0, 100)}...`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!', {
          position: "bottom-center",
          autoClose: 2000,
          hideProgressBar: true,
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to share the care tip.', {
          position: "bottom-center",
          autoClose: 2000,
          hideProgressBar: true,
        });
      }
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
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
      </div>
    );
  }

  if (!careTip) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Care tip not found</h3>
          <p className="mt-1 text-gray-500">The care tip you're looking for doesn't exist or may have been removed</p>
          <button
            onClick={() => navigate('/care-tips')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Care Tips
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header with navigation */}
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={() => navigate('/care-tips')}
          className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
        >
          <FaArrowLeft />
          <span>Back to Care Tips</span>
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => toggleBookmark(careTip.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors shadow-sm ${
              bookmarks.includes(careTip.id)
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {bookmarks.includes(careTip.id) ? <FaHeart /> : <FaRegHeart />}
            <span>{bookmarks.includes(careTip.id) ? 'Saved' : 'Save'}</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
          >
            <FaShareAlt />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Care tip header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-lg bg-blue-100 text-blue-800`}>
            <FaPaw size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{careTip.title}</h1>
            <span className="inline-block px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full mt-2">
              {careTip.category || 'General'}
            </span>
          </div>
        </div>
        <p className="text-lg text-gray-700 leading-relaxed">{careTip.description}</p>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('article')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'article'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Article
          </button>
          {careTip.keyPoints && (
            <button
              onClick={() => setActiveTab('keyPoints')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'keyPoints'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Key Points
            </button>
          )}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'article' && (
              <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Article</h2>
                {careTip.article ? (
                  <>
                    <h3 className="text-xl font-medium text-gray-800 mb-4">{careTip.article.title}</h3>
                    <div className="prose max-w-none text-gray-700">
                      {careTip.article.content.split('\n').map((paragraph, i) => (
                        <p key={i} className="mb-4">{paragraph}</p>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No article available for this care tip.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'keyPoints' && careTip.keyPoints && (
              <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Key Points</h2>
                <ul className="space-y-3">
                  {careTip.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start">
                      <span className="flex-shrink-0 h-6 w-6 text-blue-500 mr-3 mt-0.5">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      </span>
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Related tips section */}
      {careTip.relatedTips && careTip.relatedTips.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Care Tips</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {careTip.relatedTips.map(tip => (
              <Link 
                key={tip.id} 
                to={`/care-tips/${tip.id}`}
                className="block bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200"
              >
                <h3 className="text-lg font-medium text-gray-900 mb-1">{tip.title}</h3>
                <p className="text-gray-600 line-clamp-2">{tip.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}