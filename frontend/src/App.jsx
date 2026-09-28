import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CadastroAtleta from './pages/CadastroAtleta';
import Login from './pages/Login';
import DashboardAtleta from './pages/DashboardAtleta';
import AdminUsuarios from './pages/AdminUsuarios';
import DashboardOrganizador from './pages/DashboardOrganizador';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<CadastroAtleta />} />
        <Route path="/atleta/home" element={<DashboardAtleta />} />
        <Route path="/admin/usuarios" element={<AdminUsuarios />} />
        <Route path="/organizador/eventos" element={<DashboardOrganizador />} />
      </Routes>
    </BrowserRouter>
  );
}