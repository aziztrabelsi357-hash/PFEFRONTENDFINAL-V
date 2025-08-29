import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMessageCircle, 
  FiX, 
  FiSend, 
  FiMic, 
  FiMicOff, 
  FiVolume2, 
  FiVolumeX,
  FiRefreshCw,
  FiMinimize2,
  FiMaximize2,
  FiSettings,
  FiUser,
  FiCpu
} from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: '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',
  dangerouslyAllowBrowser: true
});

const GlobalChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "🌟 Hello! I'm your AI Farm Assistant with REAL-TIME access to ALL your farm data. I can tell you exactly how many animals and plants you have, their health status, food levels, alerts, and much more! Try asking: 'How many animals do I have?' or 'What's my farm status?'",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [farmData, setFarmData] = useState({});
  const [lastDataFetch, setLastDataFetch] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechSynthesis = window.speechSynthesis;
  const location = useLocation();

  // Scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load voices for speech synthesis
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      console.log('🔊 Available voices:', voices.map(v => `${v.name} (${v.lang})`));
    };
    
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices(); // Initial load
  }, []);

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

  // Fetch comprehensive farm data based on current page
  const fetchFarmData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ No token found');
      return { summary: { totalAnimals: 0, totalPlants: 0, note: 'not-authenticated' } };
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      console.log('🔍 Starting data fetch (user-scoped only)...');

      // Resolve farmId: prefer localStorage, then user->farm endpoint
      let farmId = localStorage.getItem('farmId');
      if (!farmId) {
        try {
          const userRes = await axios.get('http://localhost:8080/auth/user', { headers });
          const userId = userRes.data.id || userRes.data.userId || userRes.data._id || userRes.data.sub;
          console.log('👤 User ID:', userId);
          const farmRes = await axios.get(`http://localhost:8080/api/farms/user/${encodeURIComponent(userId)}`, { headers });
          farmId = farmRes.data?.id || farmRes.data?._id || farmRes.data?.farmId || farmRes.data?.FarmId;
          if (farmId) {
            localStorage.setItem('farmId', farmId);
          }
        } catch (e) {
          console.log('⚠️ Could not resolve farm ID for user');
        }
      }

      if (!farmId) {
        console.log('❌ No farm ID - aborting to avoid cross-user data');
        return { summary: { totalAnimals: 0, totalPlants: 0, note: 'no-farm' } };
      }

      console.log('🎯 Using farm-specific endpoints for farm:', farmId);

      // Farm-specific data fetching ONLY (no global fallbacks)
      const farmPromises = [
        // Animals with farm-scoped fallback pattern if backend supports it
        (async () => {
          try {
            const res = await axios.get(`http://localhost:8080/api/farms/${farmId}/animals`, { headers });
            return { animals: Array.isArray(res.data) ? res.data : (res.data?.animals || []) };
          } catch (e) {
            try {
              const res2 = await axios.get(`http://localhost:8080/api/animals/farm/${farmId}`, { headers });
              return { animals: Array.isArray(res2.data) ? res2.data : (res2.data?.animals || []) };
            } catch (e2) {
              console.log('Animals endpoints failed');
              return { animals: [] };
            }
          }
        })(),

        // Plants with farm-scoped fallback
        (async () => {
          try {
            const res = await axios.get(`http://localhost:8080/api/farms/${farmId}/plants`, { headers });
            return { plants: Array.isArray(res.data) ? res.data : (res.data?.plants || []) };
          } catch (e) {
            try {
              const res2 = await axios.get(`http://localhost:8080/api/plants/farm/${farmId}`, { headers });
              return { plants: Array.isArray(res2.data) ? res2.data : (res2.data?.plants || []) };
            } catch (e2) {
              console.log('Plants endpoints failed');
              return { plants: [] };
            }
          }
        })(),

        axios.get(`http://localhost:8080/api/farms/${farmId}/notifications`, { headers })
          .then(res => ({ notifications: res.data || [] }))
          .catch(() => ({ notifications: [] })),

        axios.get(`http://localhost:8080/api/farms/${farmId}/tank-level`, { headers })
          .then(res => ({ waterTank: res.data }))
          .catch(() => ({ waterTank: null })),

        axios.get(`http://localhost:8080/api/farms/${farmId}/cow-tank-level`, { headers })
          .then(res => ({ cowTank: res.data }))
          .catch(() => ({ cowTank: null })),

        axios.get(`http://localhost:8080/api/farms/${farmId}/dog-tank-level`, { headers })
          .then(res => ({ dogTank: res.data }))
          .catch(() => ({ dogTank: null })),

        axios.get(`http://localhost:8080/api/farms/${farmId}/chicken-tank-level`, { headers })
          .then(res => ({ chickenTank: res.data }))
          .catch(() => ({ chickenTank: null })),

        axios.get(`http://localhost:8080/api/farms/${farmId}/sheep-tank-level`, { headers })
          .then(res => ({ sheepTank: res.data }))
          .catch(() => ({ sheepTank: null }))
      ];

      const farmResults = await Promise.all(farmPromises);
      const comprehensiveData = farmResults.reduce((acc, result) => ({ ...acc, ...result }), {});

      // Calculate comprehensive totals
      const totalAnimals = comprehensiveData.animals?.length || 0;
      const totalPlants = comprehensiveData.plants?.length || 0;
      const totalAlerts = comprehensiveData.notifications?.length || 0;
      const totalProducts = comprehensiveData.products?.length || 0;
      const totalDiseases = comprehensiveData.diseases?.length || 0;
      const totalCareTips = comprehensiveData.careTips?.length || 0;
      
      // Calculate food levels from various sources
      let totalFood = 0;
      const foodSources = {};
      
      if (comprehensiveData.cowTank?.level) {
        foodSources.cowFood = Number(comprehensiveData.cowTank.level);
        totalFood += foodSources.cowFood;
      }
      if (comprehensiveData.dogTank?.level) {
        foodSources.dogFood = Number(comprehensiveData.dogTank.level);
        totalFood += foodSources.dogFood;
      }
      if (comprehensiveData.chickenTank?.level) {
        foodSources.chickenFood = Number(comprehensiveData.chickenTank.level);
        totalFood += foodSources.chickenFood;
      }
      if (comprehensiveData.sheepTank?.level) {
        foodSources.sheepFood = Number(comprehensiveData.sheepTank.level);
        totalFood += foodSources.sheepFood;
      }
      
      // Water level
      const waterLevel = Number(comprehensiveData.waterTank?.level || 0);
      
      // Animal breakdown by species
      const animalBreakdown = {};
      if (comprehensiveData.animals) {
        comprehensiveData.animals.forEach(animal => {
          const species = animal.species || 'Unknown';
          animalBreakdown[species] = (animalBreakdown[species] || 0) + 1;
        });
      }
      
      // Plant breakdown by type
      const plantBreakdown = {};
      if (comprehensiveData.plants) {
        comprehensiveData.plants.forEach(plant => {
          const type = plant.type || plant.species || 'Unknown';
          plantBreakdown[type] = (plantBreakdown[type] || 0) + 1;
        });
      }

      // Comprehensive summary
      comprehensiveData.summary = {
        totalAnimals,
        totalPlants,
        totalAlerts,
        totalProducts,
        totalDiseases,
        totalCareTips,
        totalFood,
        waterLevel,
        animalBreakdown,
        plantBreakdown,
        foodSources,
        farmId,
        currentPage: location.pathname,
        timestamp: new Date().toISOString(),
        dataSource: farmId ? 'farm-specific' : 'global-fallback'
      };
      
      console.log('📊 COMPLETE Farm Data Summary:');
      console.log('   🐄 Animals:', totalAnimals, animalBreakdown);
      console.log('   🌱 Plants:', totalPlants, plantBreakdown);
      console.log('   � Alerts:', totalAlerts);
      console.log('   🍽️ Food:', totalFood, 'kg', foodSources);
      console.log('   💧 Water:', waterLevel, 'L');
      console.log('   📦 Products:', totalProducts);
      console.log('   🏥 Diseases:', totalDiseases);
      console.log('   💡 Care Tips:', totalCareTips);
      console.log('   📍 Source:', comprehensiveData.summary.dataSource);
      
      setLastDataFetch(new Date());
      return comprehensiveData;
    } catch (error) {
      console.error('❌ Error fetching farm data:', error);
      return {
        summary: {
          totalAnimals: 0,
          totalPlants: 0,
          totalAlerts: 0,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  };

  // Auto-fetch data when chatbot opens or page changes
  useEffect(() => {
    if (isOpen) {
      fetchFarmData().then(setFarmData);
    }
  }, [isOpen, location.pathname]);

  // Generate contextual response based on page and data
  const generateContextualResponse = (question) => {
    const currentPage = location.pathname;
    const pageContext = {
      '/dashboard': 'Dashboard Analytics',
      '/my-animals': 'Animal Management',
      '/my-plants': 'Plant Management', 
      '/products': 'Product Inventory',
      '/diseases': 'Disease Information',
      '/care-tips': 'Care Tips',
      '/feeding': 'Animal Feeding',
      '/watering': 'Plant Watering',
      '/notifications': 'Notifications',
      '/ai-detection': 'AI Detection Hub'
    };

    const context = pageContext[currentPage] || 'General Farm Management';
    const summary = farmData.summary || {};
    
    // Create detailed farm status with proper formatting
    let farmStatus = `🌟 REAL-TIME FARM STATUS (${summary.dataSource || 'live data'}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 MAIN STATISTICS:
• Total Animals: ${summary.totalAnimals || 0}
• Total Plants: ${summary.totalPlants || 0}
• Active Alerts: ${summary.totalAlerts || 0}
• Available Products: ${summary.totalProducts || 0}
• Disease Information: ${summary.totalDiseases || 0}
• Care Tips Available: ${summary.totalCareTips || 0}

🍽️ FOOD RESOURCES:
• Total Food Available: ${summary.totalFood || 0} kg`;

    // Add detailed food breakdown
    if (summary.foodSources && Object.keys(summary.foodSources).length > 0) {
      Object.entries(summary.foodSources).forEach(([source, amount]) => {
        const sourceLabel = source.replace('Food', '').charAt(0).toUpperCase() + source.replace('Food', '').slice(1);
        farmStatus += `\n  - ${sourceLabel} Food: ${amount} kg`;
      });
    }

    farmStatus += `\n\n💧 WATER RESOURCES:
• Water Level: ${summary.waterLevel || 0} L`;

    // Add animal breakdown with details
    if (farmData.animals && farmData.animals.length > 0) {
      farmStatus += `\n\n🐄 DETAILED ANIMAL INVENTORY (${farmData.animals.length} total):`;
      
      if (summary.animalBreakdown && Object.keys(summary.animalBreakdown).length > 0) {
        Object.entries(summary.animalBreakdown).forEach(([species, count]) => {
          farmStatus += `\n• ${species}: ${count} animals`;
        });
      }
      
      farmStatus += `\n\nINDIVIDUAL ANIMALS:`;
      farmData.animals.slice(0, 8).forEach((animal, index) => {
        const name = animal.name || `Animal ${index + 1}`;
        const species = animal.species || 'Unknown species';
        const health = animal.healthStatus || 'Status unknown';
        const weight = animal.weight ? ` (${animal.weight}kg)` : '';
        farmStatus += `\n${index + 1}. ${name} - ${species}${weight} - Health: ${health}`;
      });
      
      if (farmData.animals.length > 8) {
        farmStatus += `\n... and ${farmData.animals.length - 8} more animals`;
      }
    } else {
      farmStatus += `\n\n🐄 ANIMALS: No animals found in your farm`;
    }

    // Add plant breakdown with details
    if (farmData.plants && farmData.plants.length > 0) {
      farmStatus += `\n\n🌱 DETAILED PLANT INVENTORY (${farmData.plants.length} total):`;
      
      if (summary.plantBreakdown && Object.keys(summary.plantBreakdown).length > 0) {
        Object.entries(summary.plantBreakdown).forEach(([type, count]) => {
          farmStatus += `\n• ${type}: ${count} plants`;
        });
      }
      
      farmStatus += `\n\nINDIVIDUAL PLANTS:`;
      farmData.plants.slice(0, 8).forEach((plant, index) => {
        const name = plant.name || `Plant ${index + 1}`;
        const type = plant.type || plant.species || 'Unknown type';
        const health = plant.healthStatus || 'Status unknown';
        const area = plant.quantityOrArea ? ` (${plant.quantityOrArea})` : '';
        farmStatus += `\n${index + 1}. ${name} - ${type}${area} - Health: ${health}`;
      });
      
      if (farmData.plants.length > 8) {
        farmStatus += `\n... and ${farmData.plants.length - 8} more plants`;
      }
    } else {
      farmStatus += `\n\n🌱 PLANTS: No plants found in your farm`;
    }

    // Add alerts/notifications
    if (farmData.notifications && farmData.notifications.length > 0) {
      farmStatus += `\n\n🚨 RECENT ALERTS & NOTIFICATIONS:`;
      farmData.notifications.slice(0, 5).forEach((alert, index) => {
        const title = alert.title || 'Alert';
        const message = alert.message || alert.type || 'Unknown alert';
        const date = alert.createdAt ? new Date(alert.createdAt).toLocaleDateString() : 'Recent';
        farmStatus += `\n${index + 1}. [${date}] ${title}: ${message}`;
      });
      
      if (farmData.notifications.length > 5) {
        farmStatus += `\n... and ${farmData.notifications.length - 5} more alerts`;
      }
    }

    farmStatus += `\n\n📍 Current Page: ${context}
⏰ Data Last Updated: ${summary.timestamp ? new Date(summary.timestamp).toLocaleString() : 'Unknown'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    return `You are an expert farm management AI assistant with access to REAL, LIVE farm data. Here is the complete current status of the user's farm:

${farmStatus}

User's Question: "${question}"

IMPORTANT INSTRUCTIONS:
1. Use the EXACT numbers from the real data above - don't make up any numbers
2. If the user asks "How many animals/plants do I have?" use the exact counts shown
3. Be specific and reference actual animal/plant names when available
4. If there's no data for something, clearly state "No data available" rather than guessing
5. Provide helpful, accurate responses based only on this real farm data
6. Be conversational and friendly while being precise with the data

Please provide a helpful response based on this REAL farm data.`;
  };

  // Send message to AI
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

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
      // Update farm data before processing
      const latestData = await fetchFarmData();
      setFarmData(latestData);

      // Deterministic answers for common count questions (avoid any hallucination)
      const q = inputMessage.trim().toLowerCase();
      const animalsCount = Array.isArray(latestData?.animals) ? latestData.animals.length : 0;
      const plantsCount = Array.isArray(latestData?.plants) ? latestData.plants.length : 0;
      const farmId = latestData?.summary?.farmId || latestData?.farmId || localStorage.getItem('farmId') || 'unknown';

      const countQuestion = (q.includes('how many') && (q.includes('animal') || q.includes('animals') || q.includes('pet')))
        || q === 'animals' || q === 'animal count' || q === 'count animals';
      const plantCountQuestion = (q.includes('how many') && (q.includes('plant') || q.includes('plants') || q.includes('crop')))
        || q === 'plants' || q === 'plant count' || q === 'count plants';
      const bothCountQuestion = q.includes('how many') && q.includes('animals') && q.includes('plants');

      if (bothCountQuestion || (q.includes('how many') && q.includes('have') && (q.includes('animal') || q.includes('plant')))) {
        const text = `According to your farm data (Farm ID: ${farmId}), you currently have ${animalsCount} animals and ${plantsCount} plants.`;
        const aiResponse = { id: Date.now() + 1, text, isBot: true, timestamp: new Date() };
        setMessages(prev => [...prev, aiResponse]);
        // Also speak if enabled
        if (voiceEnabled && 'speechSynthesis' in window) {
          const utter = new SpeechSynthesisUtterance(text);
          speechSynthesis.speak(utter);
        }
        if (isMinimized) setUnreadCount(prev => prev + 1);
        return; // Skip LLM
      }

      if (countQuestion) {
        const text = `You have ${animalsCount} animals in your farm (Farm ID: ${farmId}).`;
        const aiResponse = { id: Date.now() + 1, text, isBot: true, timestamp: new Date() };
        setMessages(prev => [...prev, aiResponse]);
        if (voiceEnabled && 'speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance(text));
        if (isMinimized) setUnreadCount(prev => prev + 1);
        return; // Skip LLM
      }

      if (plantCountQuestion) {
        const text = `You have ${plantsCount} plants in your farm (Farm ID: ${farmId}).`;
        const aiResponse = { id: Date.now() + 1, text, isBot: true, timestamp: new Date() };
        setMessages(prev => [...prev, aiResponse]);
        if (voiceEnabled && 'speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance(text));
        if (isMinimized) setUnreadCount(prev => prev + 1);
        return; // Skip LLM
      }

      const contextualPrompt = generateContextualResponse(inputMessage);

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a comprehensive farm management AI assistant. You have access to complete farm data and should provide helpful, accurate responses about farm management, animal care, plant care, and agricultural best practices. Be conversational and helpful.`
          },
          { role: "user", content: contextualPrompt }
        ],
        model: "llama3-8b-8192",
        temperature: 0.7,
        max_tokens: 500
      });

      const aiResponse = {
        id: Date.now() + 1,
        text: completion.choices[0]?.message?.content || "I'm having trouble processing that request. Could you try asking in a different way?",
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);

      // Speak the response if voice is enabled
      if (voiceEnabled && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(aiResponse.text);
        
        // Set female English voice
        const voices = speechSynthesis.getVoices();
        const femaleEnglishVoice = voices.find(voice => 
          (voice.name.toLowerCase().includes('female') || 
           voice.name.toLowerCase().includes('woman') || 
           voice.name.toLowerCase().includes('zira') ||
           voice.name.toLowerCase().includes('hazel') ||
           voice.name.toLowerCase().includes('susan') ||
           voice.name.toLowerCase().includes('samantha')) && 
          voice.lang.startsWith('en')
        ) || voices.find(voice => 
          voice.lang.startsWith('en') && voice.name.toLowerCase().includes('uk')
        ) || voices.find(voice => voice.lang.startsWith('en'));
        
        if (femaleEnglishVoice) {
          utterance.voice = femaleEnglishVoice;
          console.log('🎤 Using voice:', femaleEnglishVoice.name);
        }
        
        utterance.rate = 0.9;
        utterance.pitch = 1.1; // Slightly higher pitch for female voice
        utterance.volume = 0.8;
        
        speechSynthesis.speak(utterance);
        setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
      }

      // Increment unread count if chat is minimized
      if (isMinimized) {
        setUnreadCount(prev => prev + 1);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I'm experiencing technical difficulties. Please try again later.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Voice recognition controls
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

  // Stop speech synthesis
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Clear conversation
  const clearConversation = () => {
    setMessages([{
      id: 1,
      text: "🔄 Chat cleared! I'm ready to help with fresh farm data. Ask me anything about your animals, plants, or farm status!",
      isBot: true,
      timestamp: new Date()
    }]);
    setUnreadCount(0);
    // Refresh farm data when clearing
    fetchFarmData().then(setFarmData);
  };

  // Open chat and clear unread count
  const openChat = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setUnreadCount(0);
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Don't show on login/register pages
  const hiddenPages = ['/login', '/register', '/reset-password'];
  if (hiddenPages.includes(location.pathname)) {
    return null;
  }

  return (
    <>
      {/* Enhanced Floating Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <motion.button
          className="relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-4 rounded-full shadow-xl"
          onClick={openChat}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          animate={isOpen ? { scale: 0 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <FiMessageCircle size={24} />
          
          {/* Unread count badge */}
          {unreadCount > 0 && (
            <motion.div
              className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.div>
          )}
          
          {/* Pulse animation */}
          <motion.div
            className="absolute inset-0 rounded-full bg-blue-400"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 0, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.button>
      </motion.div>

      {/* Enhanced Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-200"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ 
              scale: isMinimized ? 0.3 : 1, 
              opacity: 1, 
              y: 0,
              height: isMinimized ? 60 : 600 
            }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <FiCpu size={20} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Farm AI Assistant</h3>
                  <p className="text-blue-100 text-sm">
                    {lastDataFetch ? `Updated: ${formatTimestamp(lastDataFetch)}` : 'Connecting...'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Voice toggle */}
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title={voiceEnabled ? "Disable voice" : "Enable voice"}
                >
                  {voiceEnabled ? <FiVolume2 size={18} /> : <FiVolumeX size={18} />}
                </button>
                
                {/* Refresh data */}
                <button
                  onClick={() => fetchFarmData().then(setFarmData)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  title="Refresh farm data"
                >
                  <FiRefreshCw size={18} />
                </button>
                
                {/* Minimize/Maximize */}
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {isMinimized ? <FiMaximize2 size={18} /> : <FiMinimize2 size={18} />}
                </button>
                
                {/* Close */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Chat content - hidden when minimized */}
            {!isMinimized && (
              <>
                {/* Page Context Indicator */}
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-gray-600">
                      Current page: {location.pathname.replace('/', '') || 'Home'}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className={`flex items-start space-x-2 max-w-[80%] ${message.isBot ? 'flex-row' : 'flex-row-reverse space-x-reverse'}`}>
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.isBot 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                            : 'bg-gray-300 text-gray-700'
                        }`}>
                          {message.isBot ? <FiCpu size={16} /> : <FiUser size={16} />}
                        </div>
                        
                        {/* Message bubble */}
                        <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                          message.isBot
                            ? 'bg-white text-gray-800 border border-gray-200'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                          <p className={`text-xs mt-2 ${
                            message.isBot ? 'text-gray-500' : 'text-blue-100'
                          }`}>
                            {formatTimestamp(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* Loading indicator */}
                  {isLoading && (
                    <motion.div
                      className="flex justify-start"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="flex items-center space-x-2 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                        </div>
                        <span className="text-sm text-gray-500">AI is thinking...</span>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Enhanced Input Area */}
                <div className="p-4 border-t bg-white">
                  {/* Quick actions */}
                  <div className="flex space-x-2 mb-3">
                    <button
                      onClick={() => setInputMessage("How many animals and plants do I have?")}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      Count My Farm
                    </button>
                    <button
                      onClick={() => setInputMessage("Show me my alerts and notifications")}
                      className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                    >
                      Show Alerts
                    </button>
                    <button
                      onClick={() => setInputMessage("What are my food and water levels?")}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                    >
                      Check Resources
                    </button>
                    <button
                      onClick={clearConversation}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  
                  {/* Input controls */}
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask about your farm..."
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isLoading}
                      />
                      {isListening && (
                        <motion.div
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        </motion.div>
                      )}
                    </div>
                    
                    {/* Voice button */}
                    <button
                      onClick={isListening ? stopListening : startListening}
                      className={`p-3 rounded-xl transition-colors ${
                        isListening 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                      }`}
                      title={isListening ? "Stop listening" : "Start voice input"}
                    >
                      {isListening ? <FiMicOff size={20} /> : <FiMic size={20} />}
                    </button>
                    
                    {/* Stop speaking button */}
                    {isSpeaking && (
                      <button
                        onClick={stopSpeaking}
                        className="p-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors"
                        title="Stop speaking"
                      >
                        <FiVolumeX size={20} />
                      </button>
                    )}
                    
                    {/* Send button */}
                    <button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 text-white p-3 rounded-xl transition-all duration-200"
                    >
                      <FiSend size={20} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalChatbot;
