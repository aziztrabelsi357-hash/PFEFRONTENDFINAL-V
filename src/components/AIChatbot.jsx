import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageCircle, FiX, FiSend, FiMic, FiMicOff, FiVolume2 } from 'react-icons/fi';
import axios from 'axios';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: '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',
  dangerouslyAllowBrowser: true
});

const AIChatbot = ({ pageData = {}, onClose, isOpen = false }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your comprehensive farm AI assistant. I have COMPLETE ACCESS to ALL your farm data including: animals, plants, water tanks, feed tanks, schedules, alerts, weather, products, diseases, care tips, notifications, and much more! I can speak in English and you can stop my voice anytime. Ask me anything about your farm!",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [farmData, setFarmData] = useState({});
  const [lastDataFetch, setLastDataFetch] = useState(null);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechSynthesis = window.speechSynthesis;

  // Scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Comprehensive farm data fetching function - SECURE USER-SPECIFIC DATA ONLY
  const fetchComprehensiveFarmData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ No authentication token found');
        return {};
      }

      const headers = { Authorization: `Bearer ${token}` };
      console.log('🔍 Fetching user-specific farm data...');

      // Step 1: Get current user info securely
      let userId = null;
      let farmId = null;
      
      try {
        const userRes = await axios.get('http://localhost:8080/auth/user', { headers });
        userId = userRes.data.id || userRes.data.userId || userRes.data._id;
        console.log('👤 Current user ID:', userId);
        
        if (!userId) {
          console.log('❌ Could not determine user ID');
          return {};
        }

        // Step 2: Get user's specific farm
        const farmRes = await axios.get(`http://localhost:8080/api/farms/user/${userId}`, { headers });
        farmId = farmRes.data.id || farmRes.data._id || farmRes.data.farmId;
        console.log('🚜 User\'s farm ID:', farmId);
        
        if (!farmId) {
          console.log('❌ User has no farm assigned');
          return { message: 'No farm found for your account. Please create a farm first.' };
        }

      } catch (error) {
        console.error('❌ Failed to get user/farm info:', error.response?.status, error.message);
        return { error: 'Unable to authenticate or find your farm data' };
      }

      console.log(`🎯 Fetching data ONLY for user ${userId}'s farm ${farmId}`);

      // Step 3: Fetch ONLY user's farm-specific data (NO global data that could leak other users' info)
      const userDataEndpoints = [
        { 
          key: 'animals', 
          url: `http://localhost:8080/api/farms/${farmId}/animals`,
          description: 'Your animals only'
        },
        { 
          key: 'plants', 
          url: `http://localhost:8080/api/farms/${farmId}/plants`,
          description: 'Your plants only'
        },
        { 
          key: 'notifications', 
          url: `http://localhost:8080/api/farms/${farmId}/notifications`,
          description: 'Your notifications only'
        },
        { 
          key: 'farmDetails', 
          url: `http://localhost:8080/api/farms/${farmId}`,
          description: 'Your farm details'
        },
        { 
          key: 'tankLevel', 
          url: `http://localhost:8080/api/farms/${farmId}/tank-level`,
          description: 'Your water tank'
        },
        { 
          key: 'cowTankLevel', 
          url: `http://localhost:8080/api/farms/${farmId}/cow-tank-level`,
          description: 'Your cow food tank'
        },
        { 
          key: 'dogTankLevel', 
          url: `http://localhost:8080/api/farms/${farmId}/dog-tank-level`,
          description: 'Your dog food tank'
        },
        { 
          key: 'chickenTankLevel', 
          url: `http://localhost:8080/api/farms/${farmId}/chicken-tank-level`,
          description: 'Your chicken food tank'
        },
        { 
          key: 'sheepTankLevel', 
          url: `http://localhost:8080/api/farms/${farmId}/sheep-tank-level`,
          description: 'Your sheep food tank'
        },
        { 
          key: 'tasks', 
          url: `http://localhost:8080/api/farms/${farmId}/tasks`,
          description: 'Your farm tasks'
        },
        { 
          key: 'feedingSchedules', 
          url: `http://localhost:8080/api/farms/${farmId}/feeding-schedules`,
          description: 'Your feeding schedules'
        },
        { 
          key: 'wateringSchedules', 
          url: `http://localhost:8080/api/farms/${farmId}/watering-schedules`,
          description: 'Your watering schedules'
        },
        { 
          key: 'weather', 
          url: `http://localhost:8080/api/farms/${farmId}/weather`,
          description: 'Weather for your farm location'
        }
      ];

      // Fetch user-specific data in parallel with proper error handling
      const dataPromises = userDataEndpoints.map(endpoint => 
        axios.get(endpoint.url, { headers })
          .then(response => {
            console.log(`✅ ${endpoint.key} (${endpoint.description}):`, response.data?.length || 'loaded');
            return { [endpoint.key]: response.data || [] };
          })
          .catch(error => {
            console.warn(`⚠️ ${endpoint.key} not available:`, error.response?.status);
            return { [endpoint.key]: [] };
          })
      );

      const results = await Promise.all(dataPromises);
      const userFarmData = results.reduce((acc, result) => ({ ...acc, ...result }), {});
      
      // Add metadata for security and tracking
      userFarmData.userId = userId;
      userFarmData.farmId = farmId;
      userFarmData.dataScope = 'user-specific-only';
      userFarmData.fetchTime = new Date().toISOString();
      userFarmData.currentPage = window.location.pathname;
      
      // Calculate safe summaries from user's data only
      const animalCount = userFarmData.animals?.length || 0;
      const plantCount = userFarmData.plants?.length || 0;
      const notificationCount = userFarmData.notifications?.length || 0;
      
      // Calculate food levels from user's tanks only
      let totalFoodLevel = 0;
      const foodTanks = {};
      
      if (userFarmData.cowTankLevel?.level) {
        foodTanks.cow = Number(userFarmData.cowTankLevel.level);
        totalFoodLevel += foodTanks.cow;
      }
      if (userFarmData.dogTankLevel?.level) {
        foodTanks.dog = Number(userFarmData.dogTankLevel.level);
        totalFoodLevel += foodTanks.dog;
      }
      if (userFarmData.chickenTankLevel?.level) {
        foodTanks.chicken = Number(userFarmData.chickenTankLevel.level);
        totalFoodLevel += foodTanks.chicken;
      }
      if (userFarmData.sheepTankLevel?.level) {
        foodTanks.sheep = Number(userFarmData.sheepTankLevel.level);
        totalFoodLevel += foodTanks.sheep;
      }
      
      const waterLevel = Number(userFarmData.tankLevel?.level || 0);
      
      userFarmData.summary = {
        userId,
        farmId,
        animalCount,
        plantCount,
        notificationCount,
        totalFoodLevel,
        foodTanks,
        waterLevel,
        scope: 'user-data-only'
      };
      
      console.log('📊 USER-SPECIFIC Farm Summary:');
      console.log(`   👤 User: ${userId}`);
      console.log(`   🚜 Farm: ${farmId}`);
      console.log(`   � Animals: ${animalCount}`);
      console.log(`   🌱 Plants: ${plantCount}`);
      console.log(`   🚨 Notifications: ${notificationCount}`);
      console.log(`   🍽️ Total Food: ${totalFoodLevel}kg`);
      console.log(`   💧 Water: ${waterLevel}L`);
      console.log('   🔒 Data Scope: User-specific only');
      
      setFarmData(userFarmData);
      setLastDataFetch(new Date());
      
      return userFarmData;
    } catch (error) {
      console.error('❌ Error fetching user farm data:', error);
      return { 
        error: 'Failed to fetch your farm data',
        message: 'Please check your connection and try again.'
      };
    }
  };

  // Fetch data when chatbot opens or every 5 minutes
  useEffect(() => {
    if (isOpen && (!lastDataFetch || Date.now() - lastDataFetch > 300000)) {
      fetchComprehensiveFarmData();
    }
  }, [isOpen]);

  // Process farm data queries directly - ONLY USER'S DATA
  const processFarmDataQuery = (query) => {
    const lowerQuery = query.toLowerCase();
    
    console.log('🔍 Processing user query:', query);
    console.log('� Using ONLY user-specific data for:', farmData.userId, 'farm:', farmData.farmId);
    
    // Ensure we only work with user's own data
    if (!farmData.userId || !farmData.farmId) {
      return "⚠️ Please wait while I fetch your personal farm data...";
    }

    if (farmData.error) {
      return `❌ ${farmData.error}. ${farmData.message || ''}`;
    }
    
    // YOUR ANIMALS ONLY
    if (lowerQuery.includes('animal') || lowerQuery.includes('pet') || lowerQuery.includes('livestock') || lowerQuery.includes('how many')) {
      const animalCount = farmData.animals?.length || 0;
      const animalData = farmData.animals || [];
      
      console.log(`🐾 User ${farmData.userId}'s animals:`, animalData);
      
      if (animalCount === 0) {
        return `You currently have no animals in your farm (Farm ID: ${farmData.farmId}). Consider adding some animals to get started!`;
      }
      
      let response = `🐄 Your Farm Animals (${animalCount} total):\n`;
      
      // Group by species for better overview
      const speciesCount = {};
      animalData.forEach(animal => {
        const species = animal.species || 'Unknown';
        speciesCount[species] = (speciesCount[species] || 0) + 1;
      });
      
      if (Object.keys(speciesCount).length > 0) {
        response += '\n📊 By Species:\n';
        Object.entries(speciesCount).forEach(([species, count]) => {
          response += `• ${species}: ${count} animals\n`;
        });
      }
      
      response += '\n🐾 Individual Animals:\n';
      animalData.slice(0, 10).forEach((animal, index) => {
        const name = animal.name || `Animal ${index + 1}`;
        const species = animal.species || 'Unknown species';
        const health = animal.healthStatus || 'Status unknown';
        const age = animal.age || 'Age unknown';
        const weight = animal.weight ? ` (${animal.weight}kg)` : '';
        response += `${index + 1}. ${name} - ${species}${weight}, ${age}, Health: ${health}\n`;
      });
      
      if (animalCount > 10) {
        response += `... and ${animalCount - 10} more animals\n`;
      }
      
      return response;
    }
    
    // YOUR PLANTS ONLY
    if (lowerQuery.includes('plant') || lowerQuery.includes('crop') || lowerQuery.includes('garden')) {
      const plantCount = farmData.plants?.length || 0;
      const plantData = farmData.plants || [];
      
      console.log(`🌱 User ${farmData.userId}'s plants:`, plantData);
      
      if (plantCount === 0) {
        return `You currently have no plants in your farm (Farm ID: ${farmData.farmId}). Start your garden today!`;
      }
      
      let response = `🌱 Your Farm Plants (${plantCount} total):\n`;
      
      // Group by type for better overview
      const typeCount = {};
      plantData.forEach(plant => {
        const type = plant.type || plant.species || 'Unknown';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      
      if (Object.keys(typeCount).length > 0) {
        response += '\n� By Type:\n';
        Object.entries(typeCount).forEach(([type, count]) => {
          response += `• ${type}: ${count} plants\n`;
        });
      }
      
      response += '\n🌿 Individual Plants:\n';
      plantData.slice(0, 10).forEach((plant, index) => {
        const name = plant.name || `Plant ${index + 1}`;
        const type = plant.type || plant.species || 'Unknown type';
        const health = plant.healthStatus || 'Status unknown';
        const stage = plant.growthStage || 'Growth stage unknown';
        const area = plant.quantityOrArea ? ` (${plant.quantityOrArea})` : '';
        response += `${index + 1}. ${name} - ${type}${area}, ${stage}, Health: ${health}\n`;
      });
      
      if (plantCount > 10) {
        response += `... and ${plantCount - 10} more plants\n`;
      }
      
      return response;
    }
    
    // YOUR WATER & FOOD RESOURCES ONLY
    if (lowerQuery.includes('water') || lowerQuery.includes('tank') || lowerQuery.includes('feed') || lowerQuery.includes('food')) {
      const summary = farmData.summary || {};
      const waterLevel = summary.waterLevel || 0;
      const totalFood = summary.totalFoodLevel || 0;
      const foodTanks = summary.foodTanks || {};
      
      console.log(`�🍽️ User ${farmData.userId}'s resources:`, { waterLevel, totalFood, foodTanks });
      
      let response = `�🍽️ Your Farm Resources (Farm ID: ${farmData.farmId}):\n\n`;
      
      response += `💧 Water Tank: ${waterLevel}L\n\n`;
      response += `🍽️ Total Food Available: ${totalFood}kg\n`;
      
      if (Object.keys(foodTanks).length > 0) {
        response += '\n🥕 Food Tank Details:\n';
        Object.entries(foodTanks).forEach(([animal, amount]) => {
          response += `• ${animal.charAt(0).toUpperCase() + animal.slice(1)} Food: ${amount}kg\n`;
        });
      }
      
      // Add recommendations based on levels
      if (waterLevel < 100) {
        response += '\n⚠️ Water level is low - consider refilling soon';
      }
      if (totalFood < 50) {
        response += '\n⚠️ Food levels are low - time to restock';
      }
      
      return response;
    }
    
    // YOUR NOTIFICATIONS ONLY
    if (lowerQuery.includes('alert') || lowerQuery.includes('notification') || lowerQuery.includes('urgent')) {
      const notifications = farmData.notifications || [];
      
      console.log(`� User ${farmData.userId}'s notifications:`, notifications);
      
      if (notifications.length === 0) {
        return `✅ No active notifications for your farm (Farm ID: ${farmData.farmId}). Everything looks good!`;
      }
      
      let response = `� Your Farm Notifications (${notifications.length} total):\n\n`;
      
      notifications.slice(0, 8).forEach((notification, index) => {
        const title = notification.title || 'Notification';
        const message = notification.message || 'No details available';
        const date = notification.createdAt ? new Date(notification.createdAt).toLocaleDateString() : 'Recent';
        const type = notification.type || 'info';
        response += `${index + 1}. [${date}] ${title}\n   ${message}\n   Type: ${type}\n\n`;
      });
      
      if (notifications.length > 8) {
        response += `... and ${notifications.length - 8} more notifications\n`;
      }
      
      return response;
    }
    
    // YOUR FARM OVERVIEW
    if (lowerQuery.includes('overview') || lowerQuery.includes('summary') || lowerQuery.includes('status') || lowerQuery.includes('farm')) {
      const summary = farmData.summary || {};
      
      let response = `🌟 Your Farm Overview:\n`;
      response += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      response += `👤 User ID: ${farmData.userId}\n`;
      response += `🚜 Farm ID: ${farmData.farmId}\n`;
      response += `📅 Last Updated: ${farmData.fetchTime ? new Date(farmData.fetchTime).toLocaleString() : 'Unknown'}\n\n`;
      
      response += `📊 STATISTICS:\n`;
      response += `🐄 Animals: ${summary.animalCount || 0}\n`;
      response += `🌱 Plants: ${summary.plantCount || 0}\n`;
      response += `🚨 Notifications: ${summary.notificationCount || 0}\n`;
      response += `💧 Water: ${summary.waterLevel || 0}L\n`;
      response += `🍽️ Food: ${summary.totalFoodLevel || 0}kg\n\n`;
      
      response += `🔒 Data Scope: ${farmData.dataScope || 'user-specific'}\n`;
      response += `📍 Current Page: ${farmData.currentPage || 'Unknown'}\n`;
      
      return response;
    }
    
    // HELP & GUIDANCE
    if (lowerQuery.includes('help') || lowerQuery.includes('what can you') || lowerQuery.includes('commands')) {
      return `🤖 I'm your personal farm AI assistant! I can help you with:\n\n` +
             `🐄 "How many animals do I have?" - View your livestock\n` +
             `🌱 "Show my plants" - See your crops and garden\n` +
             `💧 "Water levels" - Check your tank status\n` +
             `🍽️ "Food levels" - Monitor feed supplies\n` +
             `🚨 "Show alerts" - View notifications\n` +
             `📊 "Farm overview" - Complete status summary\n\n` +
             `I only access YOUR farm data (Farm ID: ${farmData.farmId || 'pending'}) - your information is secure! 🔒`;
    }
    
    return null; // Let AI handle if no direct match
  };

  // Build context for AI
  const buildFarmContext = () => {
    const context = {
      totalAnimals: farmData.animals?.length || 0,
      totalPlants: farmData.plants?.length || 0,
      waterTanks: farmData.waterTanks?.length || 0,
      feedTanks: farmData.feedTanks?.length || 0,
      activeAlerts: farmData.alerts?.length || 0,
      currentPage: farmData.currentPage || 'Unknown',
      weather: farmData.weather || {},
      recentData: {
        animals: farmData.animals?.slice(0, 3) || [],
        plants: farmData.plants?.slice(0, 3) || [],
        alerts: farmData.alerts?.slice(0, 3) || []
      }
    };
    
    return `Farm Context: You are assisting with a smart farm management system. Current status: ${context.totalAnimals} animals, ${context.totalPlants} plants, ${context.waterTanks} water tanks, ${context.feedTanks} feed tanks, ${context.activeAlerts} active alerts. Current page: ${context.currentPage}. Weather: ${context.weather.temperature || 'N/A'}°C. Please provide helpful, specific advice for farm management.`;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // First try direct data processing
      const directResponse = processFarmDataQuery(inputMessage);
      
      if (directResponse) {
        const botMessage = {
          id: Date.now() + 1,
          text: directResponse,
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        // Use AI for complex queries
        const farmContext = buildFarmContext();
        
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: `You are a helpful farm management AI assistant. ${farmContext} Always provide practical, actionable advice for farm management. Keep responses concise but informative.`
            },
            {
              role: "user",
              content: inputMessage
            }
          ],
          model: "llama3-8b-8192",
          temperature: 0.7,
          max_tokens: 512
        });

        const botMessage = {
          id: Date.now() + 1,
          text: completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request. Please try again.",
          isBot: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm experiencing technical difficulties. Please try again later.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speakMessage = (text) => {
    if (speechSynthesis) {
      // Stop any current speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = 'en-US'; // Force English language
      
      // Find English voice if available
      const voices = speechSynthesis.getVoices();
      const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en') || voice.name.toLowerCase().includes('english')
      );
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      setIsSpeaking(true);
      speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (speechSynthesis) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl z-50 flex flex-col"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Farm AI Assistant</h3>
                <p className="text-blue-100 text-sm">
                  {lastDataFetch ? `Data updated: ${formatTimestamp(lastDataFetch)}` : 'Connecting...'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="hover:bg-blue-700 p-1 rounded"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.isBot
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className={`text-xs ${
                        message.isBot ? 'text-gray-500' : 'text-blue-100'
                      }`}>
                        {formatTimestamp(message.timestamp)}
                      </span>
                      {message.isBot && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => speakMessage(message.text)}
                            disabled={isSpeaking}
                            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                          >
                            <FiVolume2 size={12} />
                          </button>
                          {isSpeaking && (
                            <button
                              onClick={stopSpeaking}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FiX size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your farm data..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  disabled={isLoading}
                />
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`p-2 rounded-lg ${
                    isListening 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                  }`}
                >
                  {isListening ? <FiMicOff size={20} /> : <FiMic size={20} />}
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-2 rounded-lg"
                >
                  <FiSend size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatbot;
