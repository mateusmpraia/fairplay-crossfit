import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import CadastroAtleta from './pages/CadastroAtleta';
import RedefinirSenha from './pages/RedefinirSenha';
import DashboardAtleta from './pages/DashboardAtleta';
import DashboardOrganizador from './pages/DashboardOrganizador';
import AdminUsuarios from './pages/AdminUsuarios';

/** Só renderiza a página se o usuário logado tiver o perfil exigido; senão, volta para o login. */
function RotaProtegida({ perfil, children }) {
  const logado = localStorage.getItem('token') && localStorage.getItem('usuarioPerfil') === perfil;
  return logado ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<CadastroAtleta />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route
          path="/atleta/home"
          element={<RotaProtegida perfil="ATLETA"><DashboardAtleta /></RotaProtegida>}
        />
        <Route
          path="/organizador/eventos"
          element={<RotaProtegida perfil="ORGANIZADOR"><DashboardOrganizador /></RotaProtegida>}
        />
        <Route
          path="/admin/usuarios"
          element={<RotaProtegida perfil="MASTER_ADMIN"><AdminUsuarios /></RotaProtegida>}
        />
      </Routes>
    </BrowserRouter>
  );
}
