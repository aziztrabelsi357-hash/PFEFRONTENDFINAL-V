import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const ManageDiseases = () => {
  const [diseases, setDiseases] = useState([]);
  const [newDisease, setNewDisease] = useState({
    name: '',
    description: '',
    symptoms: '',
    treatments: '',
    article: { title: '', content: '' },
  });
  const [editingDisease, setEditingDisease] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchDiseases();
  }, []);

  const fetchDiseases = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:8080/admin/diseases', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setDiseases(response.data);
    } catch (err) {
      console.error('Failed to fetch diseases:', err);
      toast.error('Failed to fetch diseases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('article.')) {
      const articleField = name.split('.')[1];
      if (editingDisease) {
        setEditingDisease({
          ...editingDisease,
          article: { ...editingDisease.article, [articleField]: value },
        });
      } else {
        setNewDisease({
          ...newDisease,
          article: { ...newDisease.article, [articleField]: value },
        });
      }
    } else {
      if (editingDisease) {
        setEditingDisease({ ...editingDisease, [name]: value });
      } else {
        setNewDisease({ ...newDisease, [name]: value });
      }
    }
  };

  // Make sure handleSubmit is properly defined
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDisease) {
        const response = await axios.put(
          `http://localhost:8080/admin/diseases/${editingDisease.id}`,
          {
            ...editingDisease,
            symptoms: editingDisease.symptoms ? editingDisease.symptoms.split(',').map(s => s.trim()) : [],
            treatments: editingDisease.treatments ? editingDisease.treatments.split(',').map(t => t.trim()) : [],
            article: editingDisease.article.title || editingDisease.article.content ? editingDisease.article : null,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );
        setDiseases(diseases.map((disease) => (disease.id === editingDisease.id ? response.data : disease)));
        setEditingDisease(null);
        toast.success('Disease updated successfully!');
      } else {
        const response = await axios.post(
          'http://localhost:8080/admin/diseases',
          {
            ...newDisease,
            symptoms: newDisease.symptoms ? newDisease.symptoms.split(',').map(s => s.trim()) : [],
            treatments: newDisease.treatments ? newDisease.treatments.split(',').map(t => t.trim()) : [],
            article: newDisease.article.title || newDisease.article.content ? newDisease.article : null,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );
        setDiseases([...diseases, response.data]);
        setNewDisease({ name: '', description: '', symptoms: '', treatments: '', article: { title: '', content: '' } });
        toast.success('Disease added successfully!');
      }
    } catch (err) {
      console.error('Failed to save disease:', err);
      if (err.response && err.response.data && err.response.data.errors) {
        const errorMessages = err.response.data.errors.map((error) => error.message).join(', ');
        toast.error(`Failed to save disease: ${errorMessages}`);
      } else {
        toast.error('Failed to save disease: ' + (err.response?.data?.message || 'Unknown error'));
      }
    }
  };

  const handleEdit = (disease) => {
    setEditingDisease({
      ...disease,
      symptoms: disease.symptoms ? disease.symptoms.join(', ') : '',
      treatments: disease.treatments ? disease.treatments.join(', ') : '',
      article: disease.article || { title: '', content: '' },
    });
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8080/admin/diseases/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setDiseases(diseases.filter((disease) => disease.id !== id));
      toast.success('Disease deleted successfully!');
    } catch (err) {
      console.error('Failed to delete disease:', err);
      toast.error('Failed to delete disease');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Disease Management</h1>
        <Link 
          to="/admin" 
          className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {editingDisease ? 'Edit Disease' : 'Add New Disease'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Disease Name*</label>
              <input
                type="text"
                name="name"
                value={editingDisease ? editingDisease.name : newDisease.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Enter disease name"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                name="description"
                value={editingDisease ? editingDisease.description : newDisease.description}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                rows="3"
                placeholder="Brief description of the disease"
              />
            </div>

            {/* Symptoms */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Symptoms*</label>
              <textarea
                name="symptoms"
                value={editingDisease ? editingDisease.symptoms : newDisease.symptoms}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                rows="3"
                placeholder="Comma-separated symptoms (e.g., Fever, Cough, Headache)"
                required
              />
              <p className="text-xs text-gray-500">Separate multiple symptoms with commas</p>
            </div>

            {/* Treatments */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Treatments*</label>
              <textarea
                name="treatments"
                value={editingDisease ? editingDisease.treatments : newDisease.treatments}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                rows="3"
                placeholder="Comma-separated treatments (e.g., Rest, Hydration, Medication)"
                required
              />
              <p className="text-xs text-gray-500">Separate multiple treatments with commas</p>
            </div>

            {/* Article Title */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Article Title</label>
              <input
                type="text"
                name="article.title"
                value={editingDisease ? editingDisease.article?.title || '' : newDisease.article.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Title for related article"
              />
            </div>

            {/* Article Content */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Article Content</label>
              <textarea
                name="article.content"
                value={editingDisease ? editingDisease.article?.content || '' : newDisease.article.content}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                rows="4"
                placeholder="Detailed content for the article"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            {editingDisease && (
              <button
                type="button"
                onClick={() => setEditingDisease(null)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {editingDisease ? 'Update Disease' : 'Add Disease'}
            </button>
          </div>
        </form>
      </div>

      {/* Disease List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Disease Catalog</h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : diseases.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-lg">No diseases found in the database</p>
            <p className="mt-1">Add a new disease using the form above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symptoms
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Treatments
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Article
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {diseases.map((disease) => (
                  <tr key={disease.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{disease.name}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-gray-500 truncate">{disease.description || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-500">
                        {disease.symptoms ? (
                          <div className="flex flex-wrap gap-1">
                            {disease.symptoms.map((symptom, index) => (
                              <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {symptom}
                              </span>
                            ))}
                          </div>
                        ) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-500">
                        {disease.treatments ? (
                          <div className="flex flex-wrap gap-1">
                            {disease.treatments.map((treatment, index) => (
                              <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {treatment}
                              </span>
                            ))}
                          </div>
                        ) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-500">
                        {disease.article ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {disease.article.title}
                          </span>
                        ) : (
                          <span className="text-gray-400">No article</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(disease)}
                          className="text-yellow-600 hover:text-yellow-900 transition-colors"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(disease.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageDiseases;