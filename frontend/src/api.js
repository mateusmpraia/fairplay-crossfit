import axios from 'axios';

/** Rotas que respondem 401 por credencial errada (não por sessão expirada). */
const ROTAS_DE_LOGIN = ['/atletas/login', '/admin/usuarios/login'];

/**
 * Cliente HTTP do backend. Todas as páginas usam caminhos relativos a /api.
 * O endereço vem da variável VITE_API_URL (arquivo .env); sem ela, usa o backend local.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
});

// Envia o token da sessão em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sessão expirada ou inválida: limpa os dados locais e volta para o login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !ROTAS_DE_LOGIN.includes(error.config?.url)) {
      localStorage.clear();
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

/** Mensagem de erro enviada pelo backend ou, se não houver, a mensagem padrão informada. */
export function mensagemDeErro(err, padrao) {
  const data = err.response?.data;
  if (typeof data === 'string') return data;
  return data?.message || padrao;
}

/** Guarda os dados da sessão depois de um login bem-sucedido. */
export function iniciarSessao({ token, id, nome, perfil }) {
  localStorage.setItem('token', token);
  localStorage.setItem('usuarioPerfil', perfil);
  if (id != null) localStorage.setItem('atletaId', id);
  if (nome) localStorage.setItem('usuarioNome', nome);
}

/** Encerra a sessão no servidor (sem esperar a resposta) e limpa os dados locais. */
export function encerrarSessao() {
  // O token é lido antes de limpar o armazenamento, pois o interceptor só roda depois
  const token = localStorage.getItem('token');
  if (token) {
    api.post('/sessao/logout', null, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }
  localStorage.clear();
}

export default api;
