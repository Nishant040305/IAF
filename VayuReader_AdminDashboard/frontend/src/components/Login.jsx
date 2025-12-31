import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_CONFIG from '../config/api';

 
export default function Login() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(API_CONFIG.adminAuthLogin, {
        name,
        contact
      });

      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('adminName', res.data.admin.name);
        localStorage.setItem('adminContact', res.data.admin.contact);

        navigate('/dashboard');
      } else {
        alert(res.data.message || 'Invalid credentials ❌');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Invalid credentials ❌';
      alert(errorMessage);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
        <input 
          className="w-full mb-4 p-2 border rounded" 
          placeholder="Officer Name" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          required 
        />
        <input 
          type="text" 
          className="w-full mb-6 p-2 border rounded" 
          placeholder="Contact Number" 
          value={contact} 
          onChange={e => setContact(e.target.value)} 
          required 
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Login</button>
      </form>
    </div>
  );
}
