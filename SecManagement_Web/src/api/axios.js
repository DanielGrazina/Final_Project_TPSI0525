import axios from 'axios';

const api = axios.create({
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