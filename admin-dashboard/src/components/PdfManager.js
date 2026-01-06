import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import * as pdfjsLib from 'pdfjs-dist/webpack';

const PAGE_SIZE = 10;

// SVG icons
const EditIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" /></svg>
);
const ViewIcon = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
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

export default function PdfManager() {
  const [pdfs, setPdfs] = useState([]);
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('');
  const [editId, setEditId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const getUniqueCategories = () => {
    const categories = pdfs.map(pdf => pdf.category).filter(cat => cat);
    return [...new Set(categories)].sort();
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === '__new__') {
      setShowNewCategoryInput(true);
      setNewCategory('');
      setCategory('');
    } else {
      setCategory(value);
      setShowNewCategoryInput(false);
      setNewCategory('');
    }
  };

  const handleAddNewCategory = () => {
    if (newCategory.trim()) {
      setCategory(newCategory.trim());
      setShowNewCategoryInput(false);
    }
  };

  useEffect(() => {
    api.get('/api/pdfs/all')
      .then(res => {
        setPdfs(res.data.data || res.data);
      })
      .catch(() => setPdfs([]));
  }, []);

  const handleDeletePdf = async (id) => {
    if (!window.confirm('Are you sure you want to delete this PDF?')) return;
    try {
      await api.delete(`/api/pdfs/${id}`);
      setPdfs(prev => prev.filter(pdf => pdf._id !== id));
    } catch {
      alert('Delete failed');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (e) => {
    setSelectedFilterCategory(e.target.value);
    setCurrentPage(1);
  };

  const handleUpload = async () => {
    const usedCategory = showNewCategoryInput && newCategory.trim() ? newCategory.trim() : category.trim();
    if (!file || !title.trim() || !usedCategory) {
      alert('Please provide PDF file, title, and category');
      return;
    }
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('title', title);
    formData.append('content', content);
    formData.append('category', usedCategory);
    const reader = new FileReader();
    reader.onload = async function () {
      const typedarray = new Uint8Array(this.result);
      const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
      canvas.toBlob(async (blob) => {
        if (blob) formData.append('thumbnail', blob, 'thumbnail.jpg');
        try {
          await api.post('/api/pdfs/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          alert('PDF uploaded');
          setFile(null);
          setThumbnail(null);
          setTitle('');
          setContent('');
          setCategory('');
          setShowNewCategoryInput(false);
          setNewCategory('');
          // Refresh list
          const res = await api.get('/api/pdfs/all');
          setPdfs(res.data.data || res.data);
        } catch (err) {
          alert(err.response?.data?.message || err.response?.data?.msg || 'Upload error');
        }
      }, 'image/jpeg');
    };
    reader.readAsArrayBuffer(file);
  };

  const startEditing = (pdf) => {
    setEditId(pdf._id);
    setEditTitle(pdf.title);
    setEditContent(pdf.content);
    setEditCategory(pdf.category);
    setEditFile(null);
  };

  const handleUpdatePdf = async (id) => {
    if (!editTitle.trim() || !editCategory.trim()) {
      alert('Please provide title and category');
      return;
    }
    const formData = new FormData();
    formData.append('title', editTitle);
    formData.append('content', editContent);
    formData.append('category', editCategory);
    if (editFile) formData.append('pdf', editFile);
    try {
      await api.put(`/api/pdfs/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('PDF updated successfully');
      setEditId(null);
      // Refresh list
      const res = await api.get('/api/pdfs/all');
      setPdfs(res.data.data || res.data);
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.msg || 'Update failed');
    }
  };

  // Filtering and pagination
  const filteredPdfs = pdfs.filter(pdf => {
    const matchesSearch =
      pdf.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pdf.content || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedFilterCategory || pdf.category === selectedFilterCategory;
    return matchesSearch && matchesCategory;
  });
  const totalPages = Math.ceil(filteredPdfs.length / PAGE_SIZE) || 1;
  const paginatedPdfs = filteredPdfs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div style={styles.wrapper}>
      <h2>Upload PDF</h2>
      <input
        type="file"
        accept="application/pdf"
        onChange={e => setFile(e.target.files[0])}
        style={styles.input}
      />
      <input
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={styles.input}
      />
      <input
        placeholder="Content/Description"
        value={content}
        onChange={e => setContent(e.target.value)}
        style={styles.input}
      />
      <select
        value={showNewCategoryInput ? '__new__' : category}
        onChange={handleCategoryChange}
        style={styles.input}
      >
        <option value="">Select Category</option>
        {getUniqueCategories().map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
        <option value="__new__">Create new category...</option>
      </select>
      {showNewCategoryInput && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            placeholder="New category name"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            style={styles.input}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddNewCategory();
            }}
          />
          <button style={styles.button} type="button" onClick={handleAddNewCategory}>
            Add
          </button>
        </div>
      )}
      <button style={styles.button} onClick={handleUpload}>Upload PDF</button>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', margin: '32px 0 16px 0' }}>
        <input
          style={styles.input}
          placeholder="Search by title or content..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <select
          value={selectedFilterCategory}
          onChange={handleCategoryFilter}
          style={styles.select}
        >
          <option value="">All Categories</option>
          {getUniqueCategories().map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Title</th>
            <th style={styles.th}>Category</th>
            <th style={styles.th}>Views</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedPdfs.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888' }}>No PDFs found.</td></tr>
          ) : paginatedPdfs.map((pdf, index) => (
            <tr key={pdf._id} style={index % 2 === 0 ? styles.zebra : {}}>
              <td style={styles.td}>
                {editId === pdf._id ? (
                  <input
                    style={styles.input}
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                  />
                ) : (
                  pdf.title
                )}
              </td>
              <td style={styles.td}>
                {editId === pdf._id ? (
                  <select
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Select Category</option>
                    {getUniqueCategories().map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : (
                  pdf.category
                )}
              </td>
              <td style={styles.td}>{pdf.viewCount}</td>
              <td style={styles.td}>
                <div style={styles.actionGroup}>
                  {editId === pdf._id ? (
                    <>
                      <input
                        style={styles.input}
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        placeholder="Edit Content"
                      />
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={e => setEditFile(e.target.files[0])}
                        style={styles.input}
                      />
                      <button
                        style={styles.ghostButtonSave}
                        title="Save"
                        onClick={() => handleUpdatePdf(pdf._id)}
                      ><SaveIcon /><span className="btn-label">Save</span></button>
                      <button
                        style={styles.ghostButtonCancel}
                        title="Cancel"
                        onClick={() => setEditId(null)}
                      ><CancelIcon /><span className="btn-label">Cancel</span></button>
                    </>
                  ) : (
                    <>
                      <button
                        style={styles.ghostButtonEdit}
                        title="Edit"
                        onClick={() => startEditing(pdf)}
                      ><EditIcon /><span className="btn-label">Edit</span></button>
                      <button
                        style={styles.ghostButtonView}
                        title="View PDF"
                        onClick={() => window.open(`${api.defaults.baseURL}${pdf.pdfUrl}`, '_blank')}
                      ><ViewIcon /><span className="btn-label">View</span></button>
                      <button
                        style={styles.ghostButtonDelete}
                        title="Delete"
                        onClick={() => handleDeletePdf(pdf._id)}
                      ><DeleteIcon /><span className="btn-label">Delete</span></button>
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
  wrapper: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '20px',
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
    background: '#e5e7eb', // darker header for better contrast
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
    background: '#f1f5f9', // slightly darker for more noticeable alternate row
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginRight: '8px',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  select: {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    marginBottom: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s',
    marginRight: '8px',
    marginBottom: '8px',
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
  ghostButtonView: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'none', border: '1px solid #dbeafe', color: '#2563eb',
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
