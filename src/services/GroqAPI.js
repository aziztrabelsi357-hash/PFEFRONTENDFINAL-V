// Simple API service for Groq chat completion
// This handles the Groq API calls from the frontend

export class GroqAPIService {
  constructor() {
    // In a real production app, you should never expose your API key in frontend
    // This should be handled by your backend
    this.apiKey = process.env.VITE_GROQ_API_KEY; // Set this in your .env file
    this.baseURL = 'https://api.groq.com/openai/v1';
  }

  async chatCompletion(message, context = '', history = []) {
    try {
      // Build system prompt based on context
      const systemPrompt = this.buildSystemPrompt(context);
      
      // Build messages array
      const messages = [{ role: "system", content: systemPrompt }];
      
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
      messages.push({ role: "user", content: message });

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama3-8b-8192", // Using a more stable model
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
          top_p: 1,
          stream: false,
          stop: null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

    } catch (error) {
      console.error('Groq API Error:', error);
      // Return fallback response
      return this.generateFallbackResponse(message);
    }
  }

  buildSystemPrompt(context) {
    const basePrompt = `You are an AI Farm Assistant specializing in agricultural technology and farm management. You help farmers with:
    - Plant and animal detection and identification
    - Disease diagnosis and treatment recommendations
    - Farm management best practices
    - Weather and climate advice
    - Crop care and livestock health monitoring
    - Agricultural technology guidance
    
    Provide helpful, accurate, and practical advice. Keep responses concise but informative. If you're unsure about something, recommend consulting with local agricultural experts or veterinarians.`;

    switch (context) {
      case 'plant_detection':
        return `${basePrompt}
        
        Current context: The user is using the Plant Detection system. Focus on plant identification, disease detection, care recommendations, and plant health monitoring.`;
      
      case 'animal_detection':
        return `${basePrompt}
        
        Current context: The user is using the Animal Detection system. Focus on animal identification, health monitoring, behavior analysis, and livestock management.`;
      
      case 'ai_detection_hub':
        return `${basePrompt}
        
        Current context: The user is in the AI Detection Hub. Provide general guidance about AI detection systems, their capabilities, and how to use them effectively for farm management.`;
      
      default:
        return `${basePrompt}
        
        Current context: General farm management and agricultural assistance.`;
    }
  }

  generateFallbackResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('plant') || lowerMessage.includes('crop')) {
      return "I can help you with plant detection and care. Our AI system can identify various plant species, detect diseases, and provide care recommendations. Our plant detection uses YOLOv8 models trained to recognize different plant types and health conditions. Would you like to know more about plant health monitoring?";
    } else if (lowerMessage.includes('animal') || lowerMessage.includes('livestock')) {
      return "I'm here to assist with animal detection and health monitoring. Our system can identify different animal species, track their health status, and alert you to any concerns. The animal detection feature includes general detection, health analysis, and behavior monitoring. What specific information do you need about your livestock?";
    } else if (lowerMessage.includes('disease') || lowerMessage.includes('sick')) {
      return "Disease detection is one of our key features. I can help you identify signs of illness in both plants and animals, suggest treatments, and provide prevention tips. Our AI models are trained to detect various diseases through visual analysis. Please describe what you're observing.";
    } else if (lowerMessage.includes('weather') || lowerMessage.includes('climate')) {
      return "Weather monitoring is crucial for farm management. I can provide insights on how weather conditions affect your crops and animals, and suggest optimal farming practices based on current conditions. Weather data helps optimize watering schedules and animal care routines.";
    } else if (lowerMessage.includes('yolo') || lowerMessage.includes('ai') || lowerMessage.includes('detection')) {
      return "Our AI detection system uses YOLOv8 models trained on Google Colab with specialized datasets for agricultural applications. The system can process images in real-time and provide confidence scores for detections. You can adjust confidence and overlap thresholds for optimal results.";
    } else {
      return "I'm your AI farm assistant, specialized in agricultural technology and farm management. I can help with plant and animal detection, disease identification, care recommendations, and general farming advice. Our AI detection system uses advanced machine learning to help you manage your farm more effectively. How can I assist you today?";
    }
  }
}

// Export singleton instance
export const groqService = new GroqAPIService();
