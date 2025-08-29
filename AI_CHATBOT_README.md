# AI Farm Assistant Chatbot

This AI-powered chatbot provides intelligent assistance for farm management using the Groq API and advanced language models.

## Features

### 🤖 **Intelligent Conversations**
- Natural language processing using Groq's LLM models
- Context-aware responses based on current page/feature
- Conversation history for better context understanding

### 🎤 **Voice Integration**
- **Speech-to-Text**: Click the microphone to speak your questions
- **Text-to-Speech**: AI responses can be read aloud automatically
- Voice controls with visual feedback

### 📱 **Enhanced User Experience**
- Floating chatbot button for easy access
- Smooth animations and transitions
- Copy messages to clipboard
- Clear chat history
- Responsive design for all screen sizes

### 🌱 **Farm-Specific Intelligence**
The chatbot provides specialized assistance for:
- **Plant Detection**: Species identification, disease diagnosis, care recommendations
- **Animal Health**: Livestock monitoring, health analysis, behavior insights
- **Farm Management**: Best practices, weather advice, resource optimization
- **AI Detection**: YOLOv8 model guidance, threshold optimization, result interpretation

## Setup Instructions

### 1. Get Groq API Key
1. Visit [Groq Console](https://console.groq.com/)
2. Create an account or sign in
3. Generate an API key
4. Copy the API key

### 2. Configure Environment
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Groq API key to `.env`:
   ```
   VITE_GROQ_API_KEY=your_actual_groq_api_key_here
   ```

### 3. Install Dependencies
```bash
npm install groq-sdk
```

### 4. Start Development Server
```bash
npm run dev
```

## Usage

### Basic Chat
1. Click the floating robot button in the bottom-right corner
2. Type your question in the text area
3. Press Enter or click the send button
4. The AI will respond with contextual advice

### Voice Features
1. **Voice Input**: Click the microphone button and speak your question
2. **Voice Output**: Enable voice in settings to hear AI responses
3. **Stop Speaking**: Click the mute button to stop current speech

### Advanced Features
- **Copy Messages**: Hover over any message and click the copy icon
- **Clear Chat**: Click the trash icon in the header to start fresh
- **Context Switching**: The AI adapts its responses based on which page you're on

## Technical Details

### Models Used
- **Primary**: `llama3-8b-8192` (Groq's optimized Llama model)
- **Fallback**: Local response generation for offline scenarios

### API Structure
```javascript
// Service usage example
import { groqService } from '../services/GroqAPI';

const response = await groqService.chatCompletion(
  userMessage, 
  context, 
  conversationHistory
);
```

### Context Types
- `plant_detection`: Optimized for plant care and identification
- `animal_detection`: Focused on livestock and animal health
- `ai_detection_hub`: General AI detection guidance
- `farm`: General farm management assistance

## Troubleshooting

### Common Issues

1. **"Failed to get AI response"**
   - Check your Groq API key in `.env`
   - Verify internet connection
   - Check browser console for detailed errors

2. **Voice features not working**
   - Ensure browser supports Web Speech API
   - Check microphone permissions
   - Try in Chrome/Edge for best compatibility

3. **Chatbot not appearing**
   - Verify component import in parent pages
   - Check for JavaScript console errors
   - Ensure all dependencies are installed

### Browser Compatibility
- **Voice Recognition**: Chrome, Edge, Safari (latest versions)
- **Text-to-Speech**: All modern browsers
- **Chat Interface**: All modern browsers

## Integration Examples

### Adding to New Pages
```jsx
import { useState } from 'react';
import AIChatbot from '../components/AIChatbot';

function MyPage() {
  const [chatbotOpen, setChatbotOpen] = useState(false);

  return (
    <div>
      {/* Your page content */}
      
      <AIChatbot 
        isOpen={chatbotOpen} 
        onToggle={() => setChatbotOpen(!chatbotOpen)}
        context="your_page_context"
      />
    </div>
  );
}
```

### Custom Context
Create specialized responses by adding new context types in `GroqAPI.js`:

```javascript
case 'your_custom_context':
  return `${basePrompt}
  
  Current context: Your specialized instructions here.`;
```

## Security Notes

⚠️ **Important**: Never commit your actual API key to version control!

- Use environment variables for API keys
- Consider implementing backend proxy for production
- Rotate API keys regularly
- Monitor API usage in Groq Console

## Performance Optimization

- Conversation history limited to last 5 messages
- Fallback responses for offline scenarios
- Debounced speech recognition
- Optimized animations for smooth performance

## Future Enhancements

- [ ] Multi-language support
- [ ] Image analysis integration with detection results
- [ ] Conversation export functionality
- [ ] Custom prompt templates
- [ ] Integration with farm data for personalized advice
