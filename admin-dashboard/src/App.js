import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
// import SearchEngine from './components/SearchEngine';
// import AddDictionary from './components/AddDictionary';
// import UploadGuide from './components/UploadGuide';
import AddAbbreviations from './components/AddAbbreviations';
import AddDictionaryWords from './components/AddDictionaryWords';
import ManageAbbreviations from './components/ManageAbbreviations';
import ManageDictionaryWords from './components/ManageDictionaryWords';
import ManagePDFs from './components/ManagePDFs';
import ManageSubAdmins from './components/ManageSubAdmins';
import UploadForm from './components/UploadForm';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/search" 
          element={
            <ProtectedRoute>
              <UploadForm />
            </ProtectedRoute>
          } 
        />
        {/* <Route path="/dictionary" element={<AddDictionaryWords />} /> */}
        {/* <Route path="/guide" element={<UploadUserGuide />} /> */}
        <Route 
          path="/manage-abbreviations" 
          element={
            <ProtectedRoute>
              <ManageAbbreviations />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/manage-dictionary-words" 
          element={
            <ProtectedRoute>
              <ManageDictionaryWords />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/manage-pdfs" 
          element={
            <ProtectedRoute>
              <ManagePDFs />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/add-abbreviations" 
          element={
            <ProtectedRoute>
              <AddAbbreviations />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/add-dictionary-words" 
          element={
            <ProtectedRoute>
              <AddDictionaryWords />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/manage-sub-admins" 
          element={
            <ProtectedRoute>
              <ManageSubAdmins />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}
