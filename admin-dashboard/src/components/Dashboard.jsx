import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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
  }, []);

  const cards = [
    { title: 'Manage PDFs', route: '/manage-pdfs' },
    { title: 'Manage Dictionary Words', route: '/manage-dictionary-words' },
    { title: 'Manage Abbreviations', route: '/manage-abbreviations' },
  ];

  // Add sub-admin management card only for super admin
  if (isSuperAdmin) {
    cards.push({ title: 'Manage Sub-Admins', route: '/manage-sub-admins' });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-sky-800 flex flex-col items-center justify-center p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        {cards.map((card, index) => (
          <div
            key={index}
            onClick={() => navigate(card.route)}
            className="bg-white text-slate-800 rounded-2xl shadow-xl hover:shadow-2xl transition duration-300 ease-in-out p-10 text-center text-2xl font-semibold cursor-pointer hover:bg-blue-100 hover:scale-105"
          >
            {card.title}
          </div>
        ))}
      </div>
    </div>
  );
}
