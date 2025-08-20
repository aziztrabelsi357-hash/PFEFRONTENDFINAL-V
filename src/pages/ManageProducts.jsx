import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    diseaseId: '',
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/admin/products', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (editingId) {
        await axios.put(`http://localhost:8080/admin/products/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Product updated successfully');
      } else {
        await axios.post('http://localhost:8080/admin/products', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Product created successfully');
      }
      setFormData({ name: '', description: '', price: '', diseaseId: '' });
      setEditingId(null);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      diseaseId: product.diseaseId,
    });
    setEditingId(product._id);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8080/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Manage Products</h1>

      {/* Form for Creating/Editing Products */}
      <form onSubmit={handleSubmit} className="mb-8 p-6 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
        <div className="mb-4">
          <label className="block text-gray-700">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Price</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-lg"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700">Disease ID</label>
          <input
            type="text"
            name="diseaseId"
            value={formData.diseaseId}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-lg"
            placeholder="Enter the associated disease ID"
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {editingId ? 'Update Product' : 'Add Product'}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setFormData({ name: '', description: '', price: '', diseaseId: '' });
              setEditingId(null);
            }}
            className="ml-4 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
      </form>

      {/* List of Products */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Product List</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div key={product._id} className="p-4 bg-white rounded-lg shadow-md">
              <h3 className="text-lg font-semibold">{product.name}</h3>
              <p className="text-gray-600">{product.description}</p>
              <p className="text-gray-600">Price: ${product.price}</p>
              <p className="text-gray-600">Disease ID: {product.diseaseId}</p>
              <div className="mt-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded-lg mr-2 hover:bg-yellow-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(product._id)}
                  className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManageProducts;