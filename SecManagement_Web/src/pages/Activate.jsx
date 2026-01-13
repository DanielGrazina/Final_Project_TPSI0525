import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Activate() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('A ativar conta...');

    useEffect(() => {
        const email = searchParams.get('email');
        const token = searchParams.get('token');

        if (email && token) {
            api.post('/Auth/activate', { email, token })
                .then(() => {
                    setStatus('✅ Conta Ativada com Sucesso!');
                    setTimeout(() => navigate('/'), 3000); // Vai para login após 3s
                })
                .catch((err) => {
                    setStatus('❌ Erro: ' + (err.response?.data?.message || 'Token inválido'));
                });
        }
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 text-xl font-bold">
            {status}
        </div>
    );
}