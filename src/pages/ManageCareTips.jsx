import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const ManageCareTips = () => {
  const [careTips, setCareTips] = useState([]);
  const [newCareTip, setNewCareTip] = useState({
    title: '',
    description: '',
    article: { title: '', content: '' },
  });
  const [editingCareTip, setEditingCareTip] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCareTips();
  }, []);

  const fetchCareTips = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:8080/admin/care-tips', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setCareTips(response.data);
    } catch (err) {
      console.error('Failed to fetch care tips:', err);
      toast.error('Failed to fetch care tips');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('article.')) {
      const articleField = name.split('.')[1];
      if (editingCareTip) {
        setEditingCareTip({
          ...editingCareTip,
          article: { ...editingCareTip.article, [articleField]: value },
        });
      } else {
        setNewCareTip({
          ...newCareTip,
          article: { ...newCareTip.article, [articleField]: value },
        });
      }
    } else {
      if (editingCareTip) {
        setEditingCareTip({ ...editingCareTip, [name]: value });
      } else {
        setNewCareTip({ ...newCareTip, [name]: value });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCareTip) {
        const response = await axios.put(
          `http://localhost:8080/admin/care-tips/${editingCareTip.id}`,
          {
            ...editingCareTip,
            article: editingCareTip.article.title || editingCareTip.article.content ? editingCareTip.article : null,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );
        setCareTips(careTips.map((careTip) => (careTip.id === editingCareTip.id ? response.data : careTip)));
        setEditingCareTip(null);
        toast.success('Care tip updated successfully!');
      } else {
        const response = await axios.post(
          'http://localhost:8080/admin/care-tips',
          {
            ...newCareTip,
            article: newCareTip.article.title || newCareTip.article.content ? newCareTip.article : null,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );
        setCareTips([...careTips, response.data]);
        setNewCareTip({ title: '', description: '', article: { title: '', content: '' } });
        toast.success('Care tip added successfully!');
      }
    } catch (err) {
      console.error('Failed to save care tip:', err);
      if (err.response && err.response.data && err.response.data.errors) {
        const errorMessages = err.response.data.errors.map((error) => error.message).join(', ');
        toast.error(`Failed to save care tip: ${errorMessages}`);
      } else {
        toast.error('Failed to save care tip: ' + (err.response?.data?.message || 'Unknown error'));
      }
    }
  };

  const handleEdit = (careTip) => {
    setEditingCareTip({
      ...careTip,
      article: careTip.article || { title: '', content: '' },
    });
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8080/admin/care-tips/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setCareTips(careTips.filter((careTip) => careTip.id !== id));
      toast.success('Care tip deleted successfully!');
    } catch (err) {
      console.error('Failed to delete care tip:', err);
      toast.error('Failed to delete care tip');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Care Tips Management</h1>
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
            {editingCareTip ? 'Edit Care Tip' : 'Add New Care Tip'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Title*</label>
              <input
                type="text"
                name="title"
                value={editingCareTip ? editingCareTip.title : newCareTip.title}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Enter care tip title"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description*</label>
              <textarea
                name="description"
                value={editingCareTip ? editingCareTip.description : newCareTip.description}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                rows="3"
                placeholder="Detailed description of the care tip"
                required
              />
            </div>

            {/* Article Title */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Article Title</label>
              <input
                type="text"
                name="article.title"
                value={editingCareTip ? editingCareTip.article?.title || '' : newCareTip.article.title}
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
                value={editingCareTip ? editingCareTip.article?.content || '' : newCareTip.article.content}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                rows="4"
                placeholder="Detailed content for the article"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            {editingCareTip && (
              <button
                type="button"
                onClick={() => setEditingCareTip(null)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {editingCareTip ? 'Update Care Tip' : 'Add Care Tip'}
            </button>
          </div>
        </form>
      </div>

      {/* Care Tips List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Care Tips Catalog</h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : careTips.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-lg">No care tips found in the database</p>
            <p className="mt-1">Add a new care tip using the form above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
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
                {careTips.map((careTip) => (
                  <tr key={careTip.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{careTip.title || 'No Title'}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-gray-500">
                        {careTip.description ? (
                          <>
                            {careTip.description.substring(0, 60)}
                            {careTip.description.length > 60 && '...'}
                          </>
                        ) : 'No Description'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-500">
                        {careTip.article ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {careTip.article.title}
                          </span>
                        ) : (
                          <span className="text-gray-400">No article</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(careTip)}
                          className="text-yellow-600 hover:text-yellow-900 transition-colors"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(careTip.id)}
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

export default ManageCareTips;