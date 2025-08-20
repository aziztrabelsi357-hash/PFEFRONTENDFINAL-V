import { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import image from "../assets/images/Flux_Dev_A_futuristic_and_modern_veterinary_AI_analysis_backgr_2.jpeg";
import { toast } from 'react-toastify';

const Upload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size exceeds 5MB limit.");
        return;
      }

      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select an image.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    setLoading(true);

    try {
      // Step 1: Call FastAPI for detection
      const fastApiResponse = await axios.post("http://localhost:8000/detect-rabies/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      const detectionResult = fastApiResponse.data;
      console.log("FastAPI Detection Result:", detectionResult);

      // Step 2: Send the detection result and image to Spring Boot for storage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('User not authenticated. No token found in localStorage.');
      }

      const springBootFormData = new FormData();
      springBootFormData.append("file", selectedFile);
      const detectionResultString = JSON.stringify(detectionResult);
      console.log("Sending detectionResult to Spring Boot:", detectionResultString);
      springBootFormData.append("detectionResult", detectionResultString);

      const springBootResponse = await axios.post("http://localhost:8080/api/upload", springBootFormData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`,
        },
      });

      console.log("Spring Boot Response:", springBootResponse.data);

      setResult(detectionResult);
      toast.success(detectionResult.message || "Image analyzed and saved successfully!");
      
    } catch (error) {
      console.error("Error during detection or saving:", error);
      if (error.response && error.response.status === 401) {
        toast.error("Session expired. Please log in again.");
        // Optionally redirect to login page
        localStorage.removeItem('token');
        window.location.href = '/login'; // Adjust based on your login route
      } else {
        setResult({
          message: "Error during detection.",
          status: "error",
          confidence: 0.0,
          symptom: "None",
        });
        toast.error("Failed to analyze the image. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${image})` }}
    >
      <div className="bg-white shadow-lg p-8 rounded-2xl w-[400px] text-center backdrop-blur-md bg-opacity-80">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Rabies Detection</h1>

        {/* Upload Box */}
        <div className="relative border-dashed border-2 border-gray-400 rounded-lg p-4 cursor-pointer hover:border-blue-500">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <p className="text-gray-500">Click or Drag & Drop to Upload</p>
        </div>

        {/* Image Preview */}
        {preview && (
          <motion.img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg mt-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          className={`mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-300 w-full ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z"
                ></path>
              </svg>
              Analyzing...
            </span>
          ) : (
            "Analyze Image"
          )}
        </button>

        {/* Result */}
        {result && (
          <motion.div
            className={`mt-4 p-4 rounded-lg ${
              result.status === "warning"
                ? "bg-red-100 text-red-800"
                : result.status === "info"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-lg font-semibold">
              Detected Symptom: {result.symptom}
            </p>
            <p className="text-sm mt-1">
              Confidence: {(result.confidence * 100).toFixed(2)}%
            </p>
            <p className="mt-2">{result.message}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Upload;