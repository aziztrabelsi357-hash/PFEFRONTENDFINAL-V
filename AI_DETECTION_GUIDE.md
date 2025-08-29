# AI Plant and Animal Detection Integration Guide

## Overview
This guide explains how to integrate your YOLOv8 models trained on Google Colab with the frontend detection pages.

## Frontend Pages Created
1. **AIPlantDetection.jsx** - `/ai-plant-detection`
2. **AIAnimalDetection.jsx** - `/ai-animal-detection`

## Expected API Endpoints

### Plant Detection
- **URL**: `http://localhost:8000/detect-plants/`
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Body**:
  - `file`: Image file
  - `confidence`: Float (0.0-1.0)
  - `overlap`: Float (0.0-1.0)

### Animal Detection
- **URL**: `http://localhost:8000/detect-animals/`
- **URL**: `http://localhost:8000/detect-animal-health/`
- **URL**: `http://localhost:8000/detect-animal-behavior/`
- **Method**: POST
- **Content-Type**: multipart/form-data
- **Body**:
  - `file`: Image file
  - `confidence`: Float (0.0-1.0)
  - `overlap`: Float (0.0-1.0)
  - `detection_type`: String ('general', 'health', 'behavior')

## Expected Response Format

```json
{
  "status": "success",
  "message": "Detection completed successfully",
  "predictions": [
    {
      "class": "cow",
      "confidence": 0.95,
      "x": 100,
      "y": 150,
      "width": 200,
      "height": 180,
      "detection_id": "7254427",
      // For health detection
      "health_status": "healthy",
      // For behavior detection  
      "behavior": "grazing"
    }
  ],
  // Optional for health analysis
  "health_summary": {
    "healthy_animals": 2,
    "sick_animals": 0,
    "total_detected": 2
  }
}
```

## Google Colab Integration Steps

### 1. Install Dependencies in Colab
```python
!pip install ultralytics fastapi uvicorn python-multipart pillow
```

### 2. Load Your Trained Model
```python
from ultralytics import YOLO
import cv2
import numpy as np
from PIL import Image

# Load your trained model
model = YOLO('path/to/your/best.pt')
```

### 3. Create FastAPI Server
```python
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import json

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/detect-plants/")
async def detect_plants(
    file: UploadFile = File(...),
    confidence: float = Form(0.5),
    overlap: float = Form(0.5)
):
    try:
        # Read image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Run inference
        results = model(image, conf=confidence, iou=overlap)
        
        # Parse results
        predictions = []
        for r in results:
            boxes = r.boxes
            if boxes is not None:
                for box in boxes:
                    predictions.append({
                        "class": model.names[int(box.cls)],
                        "confidence": float(box.conf),
                        "x": float(box.xyxy[0][0]),
                        "y": float(box.xyxy[0][1]),
                        "width": float(box.xyxy[0][2] - box.xyxy[0][0]),
                        "height": float(box.xyxy[0][3] - box.xyxy[0][1]),
                        "detection_id": str(hash(str(box.xyxy[0])))[:7]
                    })
        
        return {
            "status": "success",
            "message": f"Detected {len(predictions)} plants",
            "predictions": predictions
        }
        
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "predictions": []
        }

@app.post("/detect-animals/")
async def detect_animals(
    file: UploadFile = File(...),
    confidence: float = Form(0.5),
    overlap: float = Form(0.5),
    detection_type: str = Form("general")
):
    # Similar implementation for animals
    # Add health/behavior analysis based on detection_type
    pass

# Run with: uvicorn main:app --host 0.0.0.0 --port 8000
```

### 4. Expose Colab Server (Using ngrok)
```python
# Install ngrok
!pip install pyngrok

from pyngrok import ngrok

# Start FastAPI server in background
import subprocess
import threading

def run_server():
    subprocess.run(["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"])

server_thread = threading.Thread(target=run_server)
server_thread.daemon = True
server_thread.start()

# Create ngrok tunnel
public_url = ngrok.connect(8000)
print(f"Public URL: {public_url}")
```

## Frontend Usage

### Access the Detection Pages
- Plant Detection: `http://localhost:3000/ai-plant-detection`
- Animal Detection: `http://localhost:3000/ai-animal-detection`

### Features Available
1. **File Upload**: Drag & drop or click to select images
2. **Camera Capture**: Use device camera for real-time detection
3. **Threshold Controls**: Adjust confidence and overlap thresholds
4. **Multiple Detection Types**: General, health analysis, behavior analysis (for animals)
5. **Results Export**: Download JSON results or copy to clipboard
6. **Real-time Preview**: See uploaded/captured images before detection

### Customization Options
- White and green color scheme as requested
- Model information display showing YOLOv8, Ultralytics, Google Colab training
- Responsive design with mobile support
- Integration with your existing authentication system

## Backend Integration (Optional)
The detection results can also be saved to your Spring Boot backend at:
- `POST http://localhost:8080/api/detection/save`

This allows you to store detection history and analytics in your database.

## Testing
1. Start your frontend: `npm run dev`
2. Start your YOLOv8 API server (Colab + ngrok or local)
3. Navigate to the detection pages
4. Upload test images and verify the detection results

## Troubleshooting
- Ensure CORS is properly configured in your API
- Check that image formats are supported (PNG, JPG)
- Verify the API endpoints match the URLs in the frontend
- Monitor browser console for any JavaScript errors
- Test with simple images first to verify the pipeline
