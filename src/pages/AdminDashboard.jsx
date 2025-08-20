import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/admin/diseases" className="p-6 bg-blue-100 rounded-lg hover:bg-blue-200">
          <h2 className="text-xl font-semibold">Manage Diseases</h2>
          <p className="mt-2 text-gray-600">Add, edit, or delete disease entries.</p>
        </Link>
        <Link to="/admin/care-tips" className="p-6 bg-green-100 rounded-lg hover:bg-green-200">
          <h2 className="text-xl font-semibold">Manage Care Tips</h2>
          <p className="mt-2 text-gray-600">Add, edit, or delete care tip articles.</p>
        </Link>
        <Link to="/admin/products" className="p-6 bg-yellow-100 rounded-lg hover:bg-yellow-200">
          <h2 className="text-xl font-semibold">Manage Products</h2>
          <p className="mt-2 text-gray-600">Add, edit, or delete products.</p>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;