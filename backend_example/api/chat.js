// Backend API endpoint for Groq chat completion
// This should be implemented in your backend server (Node.js/Express example)

import { Groq } from 'groq-sdk';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY // Make sure to set this in your environment variables
});

export async function POST(req, res) {
  try {
    const { message, context, history } = req.body;
    
    // Build conversation context
    const systemPrompt = {
      role: "system",
      content: `You are an AI Farm Assistant specializing in agricultural technology and farm management. You help farmers with:
      - Plant and animal detection and identification
      - Disease diagnosis and treatment recommendations
      - Farm management best practices
      - Weather and climate advice
      - Crop care and livestock health monitoring
      - Agricultural technology guidance
      
      Current context: ${context}
      
      Provide helpful, accurate, and practical advice. Keep responses concise but informative. If you're unsure about something, recommend consulting with local agricultural experts or veterinarians.`
    };

    // Build messages array
    const messages = [systemPrompt];
    
    // Add conversation history (last 5 messages for context)
    if (history && history.length > 0) {
      history.slice(-5).forEach(msg => {
        messages.push({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }
    
    // Add current user message
    messages.push({
      role: "user",
      content: message
    });

    // Call Groq API
    const completion = await groq.chat.completions.create({
      model: "compound-beta-mini",
      messages: messages,
      temperature: 0.7,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false, // Set to false for simpler handling
      stop: null
    });

    const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

    return res.status(200).json({ 
      response: response,
      success: true 
    });

  } catch (error) {
    console.error('Groq API Error:', error);
    
    // Fallback response
    const fallbackResponse = generateFallbackResponse(req.body.message);
    
    return res.status(200).json({ 
      response: fallbackResponse,
      success: false,
      error: 'Using fallback response'
    });
  }
}

function generateFallbackResponse(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('plant') || lowerMessage.includes('crop')) {
    return "I can help you with plant detection and care. Our AI system can identify various plant species, detect diseases, and provide care recommendations. Would you like to know more about plant health monitoring?";
  } else if (lowerMessage.includes('animal') || lowerMessage.includes('livestock')) {
    return "I'm here to assist with animal detection and health monitoring. Our system can identify different animal species, track their health status, and alert you to any concerns. What specific information do you need about your livestock?";
  } else if (lowerMessage.includes('disease') || lowerMessage.includes('sick')) {
    return "Disease detection is one of our key features. I can help you identify signs of illness in both plants and animals, suggest treatments, and provide prevention tips. Please describe what you're observing.";
  } else if (lowerMessage.includes('weather') || lowerMessage.includes('climate')) {
    return "Weather monitoring is crucial for farm management. I can provide insights on how weather conditions affect your crops and animals, and suggest optimal farming practices based on current conditions.";
  } else {
    return "I'm your AI farm assistant, specialized in agricultural technology and farm management. I can help with plant and animal detection, disease identification, care recommendations, and general farming advice. How can I assist you today?";
  }
}
