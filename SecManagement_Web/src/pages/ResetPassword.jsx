import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [pass, setPass] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/Auth/reset-password', { token, newPassword: pass });
            alert('Sucesso! A tua password foi alterada.');
            navigate('/');
        } catch (err) { alert('Token inválido ou expirado.'); }
    };

    if (!token) return <div className="p-10 text-center">Token em falta. Clica no link do email novamente.</div>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-lg w-96">
                <h2 className="text-xl font-bold mb-4 text-green-600">Definir Nova Password</h2>
                <input 
                    type="password" placeholder="Nova Password" required minLength={6}
                    className="w-full border p-2 mb-4 rounded"
                    value={pass} onChange={e => setPass(e.target.value)}
                />
                <button className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 transition">Alterar Password</button>
            </form>
        </div>
    );
}