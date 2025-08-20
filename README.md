# 🐶 VetAI - Intelligent Rabies Detection for farms

**VetAI** is a web-based application designed to assist farmowners and veterinarians in detecting signs of **rabies** in farms using **image analysis powered by Machine Learning**. The application provides additional features such as detailed disease information, care tips, and product recommendations to promote farmhealth and awareness.

---

## 🚀 Features

- 🧠 **AI-Powered Detection**  
  Upload an image of a farmand let the system detect potential signs of rabies using a fine-tuned deep learning model (CNN).

- 📚 **Disease Knowledge Base**  
  Access a categorized list of common farmdiseases with symptoms, treatments, and prevention tips.

- 🛒 **Product Suggestions**  
  Browse recommended care products related to specific diseases.

- 💡 **Care Tips Section**  
  Get regular advice and tips to keep your farmhealthy and protected.

- 🛠️ **Admin Dashboard**  
  Manage disease entries, articles, and products (CRUD functionality).

---

## 🛠️ Tech Stack

### Frontend
- React.js (with TailwindCSS)
- React Router
- Axios

### Backend
- Spring Boot (Java 21)
- MongoDB (v8)
- Spring Data + REST API

### Machine Learning
- YOLOv8 / CNN (trained on Google Colab)
- Python (training phase)


---

## 🧪 AI Model

The rabies detection model is trained using annotated images of farms with and without rabies symptoms. The model is then exported and served through an API for real-time inference.

- Frameworks: PyTorch / TensorFlow
- Hosted on: Azure Container Instances (or Flask API)
- Model type: CNN / YOLOv8 (for object-based classification)

---

## 📂 Project Structure

