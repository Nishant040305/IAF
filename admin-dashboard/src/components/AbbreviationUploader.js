
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_ABBR_BASE_URL;
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

function parseCSV(csv) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const abbrIdx = headers.findIndex(h => h.toLowerCase() === 'abbreviation');
  const fullIdx = headers.findIndex(h => h.toLowerCase() === 'fullform');
  if (abbrIdx === -1 || fullIdx === -1) return [];
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    return {
      abbreviation: (cols[abbrIdx] || '').trim(),
      fullForm: (cols[fullIdx] || '').trim(),
    };
  }).filter(row => row.abbreviation && row.fullForm);
}

export default function AbbreviationUploader() {
  const [abbreviation, setAbbreviation] = useState('');
  const [fullForm, setFullForm] = useState('');
  const [message, setMessage] = useState('');
  const [bulkJson, setBulkJson] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [abbreviations, setAbbreviations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editAbbreviation, setEditAbbreviation] = useState('');
  const [editFullForm, setEditFullForm] = useState('');
  const [loading, setLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const csvInputRef = useRef();

  useEffect(() => {
    fetchAbbreviations();
  }, []);

  const fetchAbbreviations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/api/abbreviations/all`, { timeout: 10000 });
      setAbbreviations(response.data);
      setMessage('');
    } catch (error) {
      setMessage('Failed to load abbreviations.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!abbreviation.trim() || !fullForm.trim()) {
      setMessage('Both fields are required');
      return;
    }
    try {
      setAddLoading(true);
      await axios.post(`${BASE_URL}/api/abbreviations`, { abbreviation: abbreviation.trim(), fullForm: fullForm.trim() }, { timeout: 10000 });
      setMessage('Abbreviation uploaded successfully');
      setAbbreviation('');
      setFullForm('');
      await fetchAbbreviations();
    } catch (error) {
      setMessage('Failed to upload abbreviation.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkJson.trim()) {
      setMessage('Please enter JSON data for bulk upload');
      return;
    }
    try {
      setLoading(true);
      let json = bulkJson.trim().replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ');
      if (!json.startsWith('[')) json = `[${json}]`;
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) throw new Error('Invalid JSON format: expected array');
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        if (!item.abbreviation || !item.fullForm) throw new Error(`Item ${i + 1} missing required fields`);
      }
      await axios.post(`${BASE_URL}/api/abbreviations/bulk`, parsed, { timeout: 30000 });
      setMessage('Bulk upload successful');
      setBulkJson('');
      await fetchAbbreviations();
    } catch (error) {
      setMessage('Bulk upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCSVDownload = () => {
    const sample = 'abbreviation,fullForm\nAI,Artificial Intelligence\nML,Machine Learning';
    const blob = new Blob([sample], { type: 'text/csv' });
    const now = new Date();
    const pad = n => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `abbreviation-bulk-upload-${timestamp}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCSVChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setMessage('');
    try {
      const text = await file.text();
      const data = parseCSV(text);
      if (!data.length) {
        setMessage('CSV is empty or invalid format.');
        setLoading(false);
        return;
      }
      await axios.post(`${BASE_URL}/api/abbreviations/bulk`, data, { timeout: 30000 });
      setMessage('CSV bulk upload successful');
      await fetchAbbreviations();
    } catch (err) {
      setMessage('CSV upload failed.');
    } finally {
      setLoading(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this abbreviation?')) return;
    try {
      setLoading(true);
      await axios.delete(`${BASE_URL}/api/abbreviations/${id}`);
      setMessage('Abbreviation deleted successfully');
      await fetchAbbreviations();
    } catch (error) {
      setMessage('Delete failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (abbr) => {
    setEditingId(abbr._id);
    setEditAbbreviation(abbr.abbreviation);
    setEditFullForm(abbr.fullForm);
  };

  const handleUpdate = async () => {
    if (!editAbbreviation.trim() || !editFullForm.trim()) {
      setMessage('Both fields are required');
      return;
    }
    try {
      setLoading(true);
      await axios.put(`${BASE_URL}/api/abbreviations/${editingId}`, { abbreviation: editAbbreviation.trim(), fullForm: editFullForm.trim() });
      setMessage('Abbreviation updated successfully');
      setEditingId(null);
      await fetchAbbreviations();
    } catch (error) {
      setMessage('Update failed.');
    } finally {
      setLoading(false);
    }
  };

  const filteredAbbreviations = abbreviations.filter(a =>
    a.abbreviation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.fullForm?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredAbbreviations.length / PAGE_SIZE) || 1;
  const paginatedAbbreviations = filteredAbbreviations.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>🔤 Abbreviation Manager</h2>
      {message && <div style={styles.message}>{message}</div>}
      <div style={styles.section}>
        <input
          placeholder="Abbreviation (e.g., AI)"
          value={abbreviation}
          onChange={e => setAbbreviation(e.target.value)}
          style={styles.input}
          disabled={loading || addLoading}
        />
        <input
          placeholder="Full Form (e.g., Artificial Intelligence)"
          value={fullForm}
          onChange={e => setFullForm(e.target.value)}
          style={styles.input}
          disabled={loading || addLoading}
        />
        <button style={styles.button} onClick={handleSubmit} disabled={loading || addLoading}>
          {addLoading ? 'Adding...' : 'Add'}
        </button>
      </div>
      <div style={styles.section}>
        <textarea
          placeholder='[{"abbreviation": "AI", "fullForm": "Artificial Intelligence"}]'
          value={bulkJson}
          onChange={e => setBulkJson(e.target.value)}
          style={styles.textarea}
          rows={3}
          disabled={loading}
        />
        <button style={styles.button} onClick={handleBulkUpload} disabled={loading}>
          {loading ? 'Uploading...' : 'Bulk Upload'}
        </button>
      </div>
      <div style={styles.section}>
        <button style={styles.button} onClick={handleCSVDownload} disabled={loading}>
          Download Sample CSV
        </button>
        <input
          type="file"
          accept=".csv"
          ref={csvInputRef}
          style={{ marginLeft: 12 }}
          onChange={handleCSVChange}
          disabled={loading}
        />
      </div>
      <div style={styles.section}>
        <input
          placeholder="Search abbreviations or full forms..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          style={styles.input}
        />
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Abbreviation</th>
            <th style={styles.th}>Full Form</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && abbreviations.length === 0 ? (
            <tr><td colSpan={3} style={{ textAlign: 'center', color: '#888' }}>Loading abbreviations...</td></tr>
          ) : paginatedAbbreviations.length === 0 ? (
            <tr><td colSpan={3} style={{ textAlign: 'center', color: '#888' }}>No abbreviations found.</td></tr>
          ) : paginatedAbbreviations.map((abbr, idx) => (
            <tr key={abbr._id} style={idx % 2 === 0 ? styles.zebra : {}}>
              <td style={styles.td}>
                {editingId === abbr._id ? (
                  <input
                    value={editAbbreviation}
                    onChange={e => setEditAbbreviation(e.target.value)}
                    style={styles.input}
                    disabled={loading}
                  />
                ) : (
                  abbr.abbreviation
                )}
              </td>
              <td style={styles.td}>
                {editingId === abbr._id ? (
                  <input
                    value={editFullForm}
                    onChange={e => setEditFullForm(e.target.value)}
                    style={styles.input}
                    disabled={loading}
                  />
                ) : (
                  abbr.fullForm
                )}
              </td>
              <td style={styles.td}>
                <div style={styles.actionGroup}>
                  {editingId === abbr._id ? (
                    <>
                      <button style={styles.ghostButtonSave} title="Save" onClick={handleUpdate}><SaveIcon /><span className="btn-label">Save</span></button>
                      <button style={styles.ghostButtonCancel} title="Cancel" onClick={() => setEditingId(null)}><CancelIcon /><span className="btn-label">Cancel</span></button>
                    </>
                  ) : (
                    <>
                      <button style={styles.ghostButtonEdit} title="Edit" onClick={() => handleEdit(abbr)}><EditIcon /><span className="btn-label">Edit</span></button>
                      <button style={styles.ghostButtonDelete} title="Delete" onClick={() => handleDelete(abbr._id)}><DeleteIcon /><span className="btn-label">Delete</span></button>
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
  );
}

const styles = {
  container: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    padding: 32,
    margin: '0 auto',
    maxWidth: 700,
  },
  heading: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: 24,
    color: '#222',
  },
  message: {
    background: '#f1f5f9',
    color: '#2563eb',
    borderRadius: 6,
    padding: '10px 16px',
    marginBottom: 16,
    fontSize: '1rem',
  },
  section: {
    display: 'flex',
    gap: 12,
    marginBottom: 18,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    fontSize: '1rem',
    background: '#f9fafb',
    color: '#222',
  },
  textarea: {
    flex: 2,
    padding: '10px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    fontSize: '1rem',
    background: '#f9fafb',
    color: '#222',
    fontFamily: 'inherit',
  },
  button: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '10px 18px',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    marginLeft: 6,
    transition: 'background 0.2s',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 16,
    marginTop: 18,
  },
  card: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 18,
    marginBottom: 0,
    color: '#222',
    fontSize: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  abbr: {
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: 2,
  },
  full: {
    fontSize: '1rem',
    color: '#444',
    marginBottom: 8,
  },
  actions: {
    display: 'flex',
    gap: 8,
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