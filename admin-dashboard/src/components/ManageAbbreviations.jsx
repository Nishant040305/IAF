import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_CONFIG from '../config/api';

export default function ManageAbbreviations() {
  const [abbreviations, setAbbreviations] = useState([]);
  const [filteredAbbreviations, setFilteredAbbreviations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ abbreviation: '', meaning: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAbbreviations();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAbbreviations(abbreviations);
    } else {
      const filtered = abbreviations.filter(abbr =>
        abbr.abbreviation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        abbr.fullForm.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAbbreviations(filtered);
    }
  }, [searchQuery, abbreviations]);

  const fetchAbbreviations = async () => {
    try {
      const res = await axios.get(`${API_CONFIG.abbreviations}/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAbbreviations(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching abbreviations:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      if (editingId) {
        const res = await axios.put(
          `${API_CONFIG.abbreviations}/${editingId}`,
          { abbreviation: formData.abbreviation, fullForm: formData.meaning },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success) {
          setMessage('✅ Abbreviation updated successfully!');
          setEditingId(null);
          setFormData({ abbreviation: '', meaning: '' });
          fetchAbbreviations();
        }
      } else {
        const res = await axios.post(
          API_CONFIG.abbreviations,
          { abbreviation: formData.abbreviation, fullForm: formData.meaning },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success) {
          setMessage('✅ Abbreviation added successfully!');
          setFormData({ abbreviation: '', meaning: '' });
          fetchAbbreviations();
        }
      }
    } catch (error) {
      console.error('Error saving abbreviation:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.msg || error.message || '❌ Error occurred';
      setMessage(`❌ ${errorMsg}`);
      if (error.response?.status === 401) {
        navigate('/');
      }
    }
  };

  const handleEdit = (abbr) => {
    setEditingId(abbr._id);
    setFormData({ abbreviation: abbr.abbreviation, meaning: abbr.fullForm });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this abbreviation?')) return;

    try {
      const res = await axios.delete(
        `${API_CONFIG.abbreviations}/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setMessage('✅ Abbreviation deleted successfully!');
        fetchAbbreviations();
      }
    } catch (error) {
      console.error('Error deleting abbreviation:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.msg || error.message || '❌ Error deleting abbreviation';
      setMessage(`❌ ${errorMsg}`);
      if (error.response?.status === 401) {
        navigate('/');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">
              {editingId ? 'Edit' : 'Add'} Abbreviation
            </h2>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Back to Dashboard
            </button>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Abbreviation</label>
              <input
                type="text"
                value={formData.abbreviation}
                onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                placeholder="e.g., AI"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Meaning</label>
              <textarea
                value={formData.meaning}
                onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                placeholder="e.g., Artificial Intelligence"
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                {editingId ? 'Update' : 'Add'} Abbreviation
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({ abbreviation: '', meaning: '' });
                    setMessage('');
                  }}
                  className="px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800">All Abbreviations</h3>
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search abbreviations or meanings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-64"
              />
              <span className="text-sm text-gray-600">
                {filteredAbbreviations.length} of {abbreviations.length}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Abbreviation</th>
                  <th className="border p-3 text-left">Meaning</th>
                  <th className="border p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAbbreviations.map((abbr) => (
                  <tr key={abbr._id} className="hover:bg-gray-50">
                    <td className="border p-3 font-semibold">{abbr.abbreviation}</td>
                    <td className="border p-3">{abbr.fullForm}</td>
                    <td className="border p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(abbr)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(abbr._id)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAbbreviations.length === 0 && abbreviations.length > 0 && (
              <p className="text-center text-gray-500 py-8">No abbreviations match your search</p>
            )}
            {abbreviations.length === 0 && (
              <p className="text-center text-gray-500 py-8">No abbreviations found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

