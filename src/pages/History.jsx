import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('User not authenticated');
        }

        const response = await axios.get('http://localhost:8080/api/history', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setHistory(response.data);
      } catch (err) {
        setError('Failed to load upload history. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Upload History</h1>

      {loading ? (
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : history.length === 0 ? (
        <div className="text-gray-500 text-center">No upload history found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((entry) => {
            // Provide a fallback for detectionResult
            const detectionResult = entry.detectionResult || {
              symptom: 'Unknown',
              confidence: 0,
              message: 'No detection result available',
              status: 'info',
            };

            return (
              <motion.div
                key={entry.id}
                className="bg-white shadow-md rounded-lg p-6 flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <img
                  src={`data:image/jpeg;base64,${entry.imageBase64}`}
                  alt="Uploaded"
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <div className="text-center">
                  <p className="text-lg font-semibold">
                    Detected Symptom: {detectionResult.symptom || 'Unknown'}
                  </p>
                  <p className="text-sm mt-1">
                    Confidence: {(detectionResult.confidence * 100).toFixed(2)}%
                  </p>
                  <p className="text-gray-600 mt-2">{detectionResult.message || 'No message'}</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Uploaded on: {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default History;