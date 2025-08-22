import { useEffect, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { 
  FaBell, 
  FaBellSlash, 
  FaFilter, 
  FaCheck, 
  FaCheckDouble,
  FaExclamationTriangle,
  FaInfoCircle,
  FaLeaf,
  FaPaw,
  FaCloudSun,
  FaHeartbeat,
  FaSync,
  FaTrash
} from 'react-icons/fa';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Notification type configs with icons and colors
  const notificationTypes = {
    animal: {
      icon: <FaPaw className="text-blue-500" />,
      color: 'bg-blue-50 border-blue-200',
      title: 'Animal',
      bgColor: 'bg-blue-500'
    },
    plant: {
      icon: <FaLeaf className="text-green-500" />,
      color: 'bg-green-50 border-green-200',
      title: 'Plant',
      bgColor: 'bg-green-500'
    },
    weather: {
      icon: <FaCloudSun className="text-yellow-500" />,
      color: 'bg-yellow-50 border-yellow-200',
      title: 'Weather',
      bgColor: 'bg-yellow-500'
    },
    medical: {
      icon: <FaHeartbeat className="text-red-500" />,
      color: 'bg-red-50 border-red-200',
      title: 'Medical',
      bgColor: 'bg-red-500'
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = 'http://localhost:8080/api/notifications';
      
      if (showUnreadOnly && filterType !== 'all') {
        url = `http://localhost:8080/api/notifications/type/${filterType}/unread`;
      } else if (showUnreadOnly) {
        url = 'http://localhost:8080/api/notifications/unread';
      } else if (filterType !== 'all') {
        url = `http://localhost:8080/api/notifications/type/${filterType}`;
      }

      const token = localStorage.getItem('token');
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setNotifications(response.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications. Please try again.');
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const generateDynamicNotifications = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      
      await axios.post('http://localhost:8080/api/notifications/generate-dynamic', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      toast.success('New notifications generated successfully!');
      fetchNotifications();
    } catch (err) {
      console.error('Error generating notifications:', err);
      toast.error('Failed to generate notifications');
    } finally {
      setRefreshing(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put(`http://localhost:8080/api/notifications/${id}/read`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
      
      toast.success('Notification marked as read');
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.put('http://localhost:8080/api/notifications/read-all', {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
  };

  const toggleUnreadFilter = () => {
    setShowUnreadOnly(!showUnreadOnly);
  };

  useEffect(() => {
    fetchNotifications();
  }, [filterType, showUnreadOnly]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getNotificationIcon = (type) => {
    return notificationTypes[type]?.icon || <FaInfoCircle className="text-gray-500" />;
  };

  const getNotificationColor = (type) => {
    return notificationTypes[type]?.color || 'bg-gray-50 border-gray-200';
  };

  const unreadCount = notifications.filter(notif => !notif.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-6 w-64"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-6 border">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <FaExclamationTriangle className="text-red-500 text-4xl mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Notifications</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchNotifications}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <FaBell className="text-green-600 text-3xl" />
              <h1 className="text-3xl font-bold text-gray-800">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-sm font-bold px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={generateDynamicNotifications}
                disabled={refreshing}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FaSync className={`${refreshing ? 'animate-spin' : ''}`} />
                <span>Generate New</span>
              </button>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaCheckDouble />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg p-4 border shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <FaFilter className="text-gray-500" />
                <span className="font-medium text-gray-700">Filter by type:</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleFilterChange('all')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      filterType === 'all'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All
                  </button>
                  {Object.entries(notificationTypes).map(([type, config]) => (
                    <button
                      key={type}
                      onClick={() => handleFilterChange(type)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center space-x-1 ${
                        filterType === type
                          ? `${config.bgColor} text-white`
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {config.icon}
                      <span>{config.title}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={toggleUnreadFilter}
                className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  showUnreadOnly
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {showUnreadOnly ? <FaBellSlash /> : <FaBell />}
                <span>{showUnreadOnly ? 'Show All' : 'Unread Only'}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Notifications List */}
        <div className="space-y-4">
          <AnimatePresence>
            {notifications.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-lg p-8 border text-center"
              >
                <FaBellSlash className="text-gray-400 text-4xl mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No Notifications</h3>
                <p className="text-gray-500">
                  {showUnreadOnly 
                    ? 'You have no unread notifications.'
                    : 'You have no notifications yet. Generate some dynamic notifications to get started!'}
                </p>
              </motion.div>
            ) : (
              notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow ${
                    !notification.read ? 'border-l-4 border-l-green-500' : ''
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                        getNotificationColor(notification.type)
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                              {notification.title}
                            </h3>
                            <p className="text-gray-600 mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center space-x-1">
                                <span className={`w-2 h-2 rounded-full ${
                                  notificationTypes[notification.type]?.bgColor || 'bg-gray-400'
                                }`}></span>
                                <span className="capitalize">{notification.type}</span>
                              </span>
                              <span>{formatDate(notification.createdAt)}</span>
                              {!notification.read && (
                                <span className="text-green-600 font-medium">New</span>
                              )}
                            </div>
                          </div>
                          
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="flex-shrink-0 ml-4 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-green-200 transition-colors flex items-center space-x-1"
                            >
                              <FaCheck className="text-xs" />
                              <span>Mark Read</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
