import { useState } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/Auth/forgot-password', { email });
            alert('Se o email existir, enviámos um link de recuperação (Verifica o Mailtrap/Consola/Email).');
        } catch (error) {
            alert('Erro ao processar pedido.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-lg w-96">
                <h2 className="text-xl font-bold mb-4 text-blue-600">Recuperar Conta</h2>
                <p className="text-sm mb-4 text-gray-600">Insere o teu email para receberes o link de reset.</p>
                <input 
                    type="email" placeholder="O teu email" required
                    className="w-full border p-2 mb-4 rounded"
                    value={email} onChange={e => setEmail(e.target.value)}
                />
                <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition">Enviar Email</button>
                <div className="mt-4 text-center">
                    <Link to="/" className="text-sm text-gray-500 hover:underline">Voltar ao Login</Link>
                </div>
            </form>
        </div>
    );
}