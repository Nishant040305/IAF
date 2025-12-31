
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_DICT_BASE_URL;
const PAGE_SIZE = 10;

// SVG icons
const EditIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" /></svg>
);
const DeleteIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);
const SaveIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);
const CancelIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);

export default function DictionaryUploader() {
  const [dictionaryJson, setDictionaryJson] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editWord, setEditWord] = useState('');
  const [editMeaning, setEditMeaning] = useState('');
  const [editSynonyms, setEditSynonyms] = useState('');
  const [editAntonyms, setEditAntonyms] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSubmit = () => {
    try {
      const json = JSON.parse(dictionaryJson);
      axios.post(`${BASE_URL}/api/dictionary/upload`, json)
        .then(() => {
          setMessage('✅ Uploaded successfully!');
          setDictionaryJson('');
        })
        .catch(err => setMessage(`❌ ${err.response?.data?.error || 'Error'}`));
    } catch {
      setMessage('❌ Invalid JSON');
    }
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    axios.get(`${BASE_URL}/api/dictionary/search/${searchTerm}`)
      .then(res => setSearchResults(res.data.words))
      .catch(() => setSearchResults([]));
    setCurrentPage(1);
  };

  // Inline edit handlers (simulate, as API is not shown)
  const handleEdit = (wordData) => {
    setEditingId(wordData._id);
    setEditWord(wordData.word);
    setEditMeaning(wordData.meanings[0]?.definition || '');
    setEditSynonyms((wordData.synonyms || []).join(', '));
    setEditAntonyms((wordData.antonyms || []).join(', '));
  };
  const handleUpdate = () => {
    // Simulate update (API not shown)
    setEditingId(null);
    setMessage('Updated (simulation)');
  };
  const handleDelete = (id) => {
    // Simulate delete (API not shown)
    setSearchResults(prev => prev.filter(w => w._id !== id));
    setMessage('Deleted (simulation)');
  };

  // Pagination
  const totalPages = Math.ceil(searchResults.length / PAGE_SIZE) || 1;
  const paginatedResults = searchResults.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div style={styles.wrapper}>
      <h2>Upload Dictionary JSON</h2>
      <textarea
        placeholder="Paste JSON here"
        value={dictionaryJson}
        onChange={e => setDictionaryJson(e.target.value)}
        rows={10}
        style={styles.textarea}
      />
      <button style={styles.button} onClick={handleSubmit}>Submit</button>
      {message && <div style={styles.message}>{message}</div>}

      <h2 style={{ marginTop: 30 }}>Search Dictionary</h2>
      <input
        type="text"
        placeholder="Enter word..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        style={styles.input}
      />
      <button style={styles.button} onClick={handleSearch}>Search</button>

      <div style={{ marginTop: 20 }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Word</th>
              <th style={styles.th}>Meaning</th>
              <th style={styles.th}>Synonyms</th>
              <th style={styles.th}>Antonyms</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedResults.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>No results found.</td></tr>
            ) : paginatedResults.map((wordData, idx) => (
              <tr key={wordData._id} style={idx % 2 === 0 ? styles.zebra : {}}>
                <td style={styles.td}>
                  {editingId === wordData._id ? (
                    <input
                      value={editWord}
                      onChange={e => setEditWord(e.target.value)}
                      style={styles.input}
                    />
                  ) : (
                    wordData.word
                  )}
                </td>
                <td style={styles.td}>
                  {editingId === wordData._id ? (
                    <input
                      value={editMeaning}
                      onChange={e => setEditMeaning(e.target.value)}
                      style={styles.input}
                    />
                  ) : (
                    wordData.meanings[0]?.definition || ''
                  )}
                </td>
                <td style={styles.td}>
                  {editingId === wordData._id ? (
                    <input
                      value={editSynonyms}
                      onChange={e => setEditSynonyms(e.target.value)}
                      style={styles.input}
                    />
                  ) : (
                    (wordData.synonyms || []).join(', ')
                  )}
                </td>
                <td style={styles.td}>
                  {editingId === wordData._id ? (
                    <input
                      value={editAntonyms}
                      onChange={e => setEditAntonyms(e.target.value)}
                      style={styles.input}
                    />
                  ) : (
                    (wordData.antonyms || []).join(', ')
                  )}
                </td>
                <td style={styles.td}>
                  <div style={styles.actionGroup}>
                    {editingId === wordData._id ? (
                      <>
                        <button style={styles.ghostButtonSave} title="Save" onClick={handleUpdate}><SaveIcon /><span className="btn-label">Save</span></button>
                        <button style={styles.ghostButtonCancel} title="Cancel" onClick={() => setEditingId(null)}><CancelIcon /><span className="btn-label">Cancel</span></button>
                      </>
                    ) : (
                      <>
                        <button style={styles.ghostButtonEdit} title="Edit" onClick={() => handleEdit(wordData)}><EditIcon /><span className="btn-label">Edit</span></button>
                        <button style={styles.ghostButtonDelete} title="Delete" onClick={() => handleDelete(wordData._id)}><DeleteIcon /><span className="btn-label">Delete</span></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 12 }}>
          <button
            style={{ ...styles.button, opacity: currentPage === 1 ? 0.5 : 1 }}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            style={{ ...styles.button, opacity: currentPage === totalPages ? 0.5 : 1 }}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
    background: '#fff',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '8px',
    marginBottom: '12px',
    resize: 'vertical',
  },
  input: {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s',
    marginRight: '10px',
    marginBottom: '10px'
  },
  message: {
    marginTop: '12px',
    fontWeight: 'bold',
    color: '#333',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#fff',
    marginTop: 16,
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  th: {
    background: '#e5e7eb',
    color: '#222',
    fontWeight: 600,
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'left',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
  },
  zebra: {
    background: '#f1f5f9',
  },
  actionGroup: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  ghostButtonEdit: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: '1px solid #d1d5db', color: '#6b7280',
    fontSize: '1rem', cursor: 'pointer', padding: '4px 10px', borderRadius: 20,
    transition: 'background 0.2s, border 0.2s',
    fontWeight: 400,
  },
  ghostButtonDelete: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: '1px solid #fee2e2', color: '#dc3545',
    fontSize: '1rem', cursor: 'pointer', padding: '4px 10px', borderRadius: 20,
    transition: 'background 0.2s, border 0.2s',
    fontWeight: 400,
  },
  ghostButtonSave: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: '1px solid #bbf7d0', color: '#22c55e',
    fontSize: '1rem', cursor: 'pointer', padding: '4px 10px', borderRadius: 20,
    transition: 'background 0.2s, border 0.2s',
    fontWeight: 400,
  },
  ghostButtonCancel: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: '1px solid #fca5a5', color: '#ef4444',
    fontSize: '1rem', cursor: 'pointer', padding: '4px 10px', borderRadius: 20,
    transition: 'background 0.2s, border 0.2s',
    fontWeight: 400,
  },
};
