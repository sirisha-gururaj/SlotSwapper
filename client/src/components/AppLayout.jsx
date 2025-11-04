// src/components/AppLayout.jsx
import React from 'react';
import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

// 'Outlet' is a placeholder from react-router-dom
// It will render whatever child route is active (e.g., Dashboard, Marketplace)

function AppLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;