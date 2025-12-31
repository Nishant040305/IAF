import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_CONFIG from '../config/api';

export default function ManageDictionaryWords() {
  const [words, setWords] = useState([]);
  const [filteredWords, setFilteredWords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    word: '',
    meaning: '',
    partOfSpeech: '',
    synonyms: '',
    antonyms: '',
    examples: ''
  });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchWords();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredWords(words);
    } else {
      const filtered = words.filter(word =>
        word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (word.meanings[0]?.definition && word.meanings[0].definition.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (word.synonyms && word.synonyms.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (word.antonyms && word.antonyms.some(a => a.toLowerCase().includes(searchQuery.toLowerCase())))
      );
      setFilteredWords(filtered);
    }
  }, [searchQuery, words]);

  const fetchWords = async () => {
    try {
      const res = await axios.get(`${API_CONFIG.dictionary}/words/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setWords(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching words:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const payload = {
      word: formData.word.trim(),
      meanings: [
        {
          partOfSpeech: formData.partOfSpeech.trim() || null,
          definition: formData.meaning.trim(),
          synonyms: formData.synonyms ? formData.synonyms.split(',').map(s => s.trim()).filter(s => s) : null,
          examples: formData.examples ? formData.examples.split(',').map(e => e.trim()).filter(e => e) : null
        }
      ],
      synonyms: formData.synonyms ? formData.synonyms.split(',').map(s => s.trim()).filter(s => s) : null,
      antonyms: formData.antonyms ? formData.antonyms.split(',').map(a => a.trim()).filter(a => a) : null
    };

    try {
      if (editingId) {
        const res = await axios.put(
          `${API_CONFIG.dictionary}/${editingId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success) {
          setMessage('✅ Word updated successfully!');
          resetForm();
          fetchWords();
        }
      } else {
        const res = await axios.post(
          API_CONFIG.dictionary,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success) {
          setMessage('✅ Word added successfully!');
          resetForm();
          fetchWords();
        }
      }
    } catch (error) {
      setMessage(error.response?.data?.msg || '❌ Error occurred');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      word: '',
      meaning: '',
      partOfSpeech: '',
      synonyms: '',
      antonyms: '',
      examples: ''
    });
  };

  const handleEdit = (word) => {
    setEditingId(word._id);
    const firstMeaning = word.meanings[0] || {};
    setFormData({
      word: word.word,
      meaning: firstMeaning.definition || '',
      partOfSpeech: firstMeaning.partOfSpeech || '',
      synonyms: word.synonyms?.join(', ') || '',
      antonyms: word.antonyms?.join(', ') || '',
      examples: firstMeaning.examples?.join(', ') || ''
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this word?')) return;

    try {
      const res = await axios.delete(
        `${API_CONFIG.dictionary}/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setMessage('✅ Word deleted successfully!');
        fetchWords();
      }
    } catch (error) {
      setMessage(error.response?.data?.error || '❌ Error deleting word');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">
              {editingId ? 'Edit' : 'Add'} Dictionary Word
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Word *</label>
                <input
                  type="text"
                  value={formData.word}
                  onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Part of Speech</label>
                <input
                  type="text"
                  value={formData.partOfSpeech}
                  onChange={(e) => setFormData({ ...formData, partOfSpeech: e.target.value })}
                  placeholder="e.g., noun, verb"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Definition *</label>
              <textarea
                value={formData.meaning}
                onChange={(e) => setFormData({ ...formData, meaning: e.target.value })}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Synonyms (comma separated)</label>
                <input
                  type="text"
                  value={formData.synonyms}
                  onChange={(e) => setFormData({ ...formData, synonyms: e.target.value })}
                  placeholder="e.g., happy, joyful"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Antonyms (comma separated)</label>
                <input
                  type="text"
                  value={formData.antonyms}
                  onChange={(e) => setFormData({ ...formData, antonyms: e.target.value })}
                  placeholder="e.g., sad, unhappy"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Examples (comma separated)</label>
              <input
                type="text"
                value={formData.examples}
                onChange={(e) => setFormData({ ...formData, examples: e.target.value })}
                placeholder="e.g., Example sentence 1, Example sentence 2"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                {editingId ? 'Update' : 'Add'} Word
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
            <h3 className="text-2xl font-bold text-gray-800">All Dictionary Words</h3>
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search by word, definition, synonyms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-64"
              />
              <span className="text-sm text-gray-600">
                {filteredWords.length} of {words.length}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left">Word</th>
                  <th className="border p-3 text-left">Definition</th>
                  <th className="border p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWords.map((word) => (
                  <tr key={word._id} className="hover:bg-gray-50">
                    <td className="border p-3 font-semibold">{word.word}</td>
                    <td className="border p-3">{word.meanings[0]?.definition || 'N/A'}</td>
                    <td className="border p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(word)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(word._id)}
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
            {filteredWords.length === 0 && words.length > 0 && (
              <p className="text-center text-gray-500 py-8">No words match your search</p>
            )}
            {words.length === 0 && (
              <p className="text-center text-gray-500 py-8">No words found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

