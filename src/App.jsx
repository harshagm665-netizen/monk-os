import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BootScreen from './pages/BootScreen';
import WelcomeScreen from './pages/WelcomeScreen';
import AuthScreen from './pages/AuthScreen';
import HomeScreen from './pages/HomeScreen';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Navigate to="/boot" replace />} />
          <Route path="/boot" element={<BootScreen />} />
          <Route path="/welcome" element={<WelcomeScreen />} />
          <Route path="/auth" element={<AuthScreen />} />
          <Route path="/home" element={<HomeScreen />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
