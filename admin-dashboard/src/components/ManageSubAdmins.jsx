import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ManageSubAdmins() {
  const [subAdmins, setSubAdmins] = useState([]);
  const [filteredSubAdmins, setFilteredSubAdmins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    contact: ''
  });
  const [message, setMessage] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is super admin
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setIsSuperAdmin(payload.isSuperAdmin || false);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }

    fetchSubAdmins();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSubAdmins(subAdmins);
    } else {
      const filtered = subAdmins.filter(admin =>
        admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.contact.includes(searchQuery)
      );
      setFilteredSubAdmins(filtered);
    }
  }, [searchQuery, subAdmins]);

  const fetchSubAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3012/api/sub-admins', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setSubAdmins(response.data.data);
        setFilteredSubAdmins(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching sub-admins:', error);
      if (error.response?.status === 403) {
        setMessage('Only super admin can manage sub-admins');
      } else if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
      } else {
        setMessage('Failed to fetch sub-admins');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3012/api/sub-admins', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setMessage('Sub-admin created successfully!');
        setFormData({ name: '', contact: '' });
        fetchSubAdmins();
      }
    } catch (error) {
      console.error('Error creating sub-admin:', error);
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage('Failed to create sub-admin');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sub-admin?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`http://localhost:3012/api/sub-admins/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setMessage('Sub-admin deleted successfully!');
        fetchSubAdmins();
      }
    } catch (error) {
      console.error('Error deleting sub-admin:', error);
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage('Failed to delete sub-admin');
      }
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
            <p className="text-gray-600">Only super admin can manage sub-admins.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Manage Sub-Admins</h1>
          <p className="text-gray-600">Create and manage sub-admin accounts</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.includes('successfully') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Sub-Admin</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter sub-admin name"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">Contact</label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="Enter contact number"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              Create Sub-Admin
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800">All Sub-Admins</h3>
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search by name or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-64"
              />
              <span className="text-sm text-gray-600">
                {filteredSubAdmins.length} of {subAdmins.length}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Name</th>
                  <th className="border p-3 text-left">Contact</th>
                  <th className="border p-3 text-left">Created At</th>
                  <th className="border p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubAdmins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-gray-50">
                    <td className="border p-3 font-semibold">{admin.name}</td>
                    <td className="border p-3">{admin.contact}</td>
                    <td className="border p-3">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="border p-3">
                      <button
                        onClick={() => handleDelete(admin._id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredSubAdmins.length === 0 && subAdmins.length > 0 && (
              <p className="text-center text-gray-500 py-8">No sub-admins match your search</p>
            )}
            {subAdmins.length === 0 && (
              <p className="text-center text-gray-500 py-8">No sub-admins found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

