import axios from 'axios';

const api = axios.create({
    // Nota: Confirma se a tua API está na porta 5000 ou 5001/8080
    // Vê no Swagger o URL (ex: http://localhost:5000)
    baseURL: 'http://localhost:5000/api' 
});

// Adiciona o Token automaticamente a todos os pedidos, se existir
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;