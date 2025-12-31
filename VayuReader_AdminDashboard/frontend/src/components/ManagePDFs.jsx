import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_CONFIG from '../config/api';

export default function ManagePDFs() {
  const [pdfs, setPdfs] = useState([]);
  const [filteredPdfs, setFilteredPdfs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    pdfFile: null,
    thumbnailFile: null
  });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchPDFs();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPdfs(pdfs);
    } else {
      const filtered = pdfs.filter(pdf =>
        pdf.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pdf.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pdf.content && pdf.content.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredPdfs(filtered);
    }
  }, [searchQuery, pdfs]);

  const fetchPDFs = async () => {
    try {
      const res = await axios.get(`${API_CONFIG.pdfs}/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPdfs(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!formData.title || !formData.content || !formData.category) {
      setMessage('❌ Please fill in all required fields');
      return;
    }

    if (!editingId && !formData.pdfFile) {
      setMessage('❌ PDF file is required for new uploads');
      return;
    }

    const payload = new FormData();
    payload.append('title', formData.title);
    payload.append('content', formData.content);
    payload.append('category', formData.category);
    if (formData.pdfFile) payload.append('pdf', formData.pdfFile);
    if (formData.thumbnailFile) payload.append('thumbnail', formData.thumbnailFile);

    try {
      if (editingId) {
        const res = await axios.put(
          `${API_CONFIG.pdfs}/${editingId}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        if (res.data.success) {
          setMessage('✅ PDF updated successfully!');
          resetForm();
          fetchPDFs();
        }
      } else {
        const res = await axios.post(
          `${API_CONFIG.pdfs}/upload`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        if (res.data.success || res.data.message) {
          setMessage('✅ PDF uploaded successfully!');
          resetForm();
          fetchPDFs();
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage(error.response?.data?.msg || error.message || '❌ Error occurred');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      category: '',
      pdfFile: null,
      thumbnailFile: null
    });
  };

  const handleEdit = (pdf) => {
    setEditingId(pdf._id);
    setFormData({
      title: pdf.title,
      content: pdf.content,
      category: pdf.category,
      pdfFile: null,
      thumbnailFile: null
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this PDF?')) return;

    try {
      const res = await axios.delete(
        `${API_CONFIG.pdfs}/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setMessage('✅ PDF deleted successfully!');
        fetchPDFs();
      }
    } catch (error) {
      setMessage(error.response?.data?.error || '❌ Error deleting PDF');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">
              {editingId ? 'Edit' : 'Upload'} PDF
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
              <label className="block text-gray-700 font-medium mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Content *</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Category *</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                PDF File {!editingId && '*'}
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFormData({ ...formData, pdfFile: e.target.files[0] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                required={!editingId}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Thumbnail (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, thumbnailFile: e.target.files[0] })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                {editingId ? 'Update' : 'Upload'} PDF
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
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
            <h3 className="text-2xl font-bold text-gray-800">All PDFs</h3>
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search by title, category, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-64"
              />
              <span className="text-sm text-gray-600">
                {filteredPdfs.length} of {pdfs.length}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Title</th>
                  <th className="border p-3 text-left">Category</th>
                  <th className="border p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPdfs.map((pdf) => (
                  <tr key={pdf._id} className="hover:bg-gray-50">
                    <td className="border p-3 font-semibold">{pdf.title}</td>
                    <td className="border p-3">{pdf.category}</td>
                    <td className="border p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(pdf)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(pdf._id)}
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
            {filteredPdfs.length === 0 && pdfs.length > 0 && (
              <p className="text-center text-gray-500 py-8">No PDFs match your search</p>
            )}
            {pdfs.length === 0 && (
              <p className="text-center text-gray-500 py-8">No PDFs found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

