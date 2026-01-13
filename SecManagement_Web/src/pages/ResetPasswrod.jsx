import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleReset = async (e) => {
        e.preventDefault();
        try {
            await api.post('/Auth/reset-password', { token, newPassword: password });
            alert('Password alterada! Faz login.');
            navigate('/');
        } catch (error) {
            alert('Erro: ' + error.response?.data);
        }
    };

    if (!token) return <div className="p-10">Token em falta. Inicia o processo de recuperação.</div>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded shadow w-96">
                <h2 className="text-xl font-bold mb-4">Nova Password</h2>
                <form onSubmit={handleReset}>
                    <input 
                        type="password" placeholder="Nova Password" required minLength={6}
                        className="w-full border p-2 mb-4 rounded"
                        value={password} onChange={e => setPassword(e.target.value)}
                    />
                    <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">Alterar</button>
                </form>
            </div>
        </div>
    );
}