import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Register() {
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]: e.target.value});
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        // Validação básica de password
        if (formData.password !== formData.confirmPassword) {
            setError("As passwords não coincidem!");
            return;
        }

        try {
            // Chamada à API
            await api.post('/Auth/register', {
                nome: formData.nome,
                email: formData.email,
                password: formData.password
            });

            setSuccess(true);
            
            // Redirecionar após 3 segundos
            setTimeout(() => {
                navigate('/');
            }, 3000);

        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao registar utilizador.');
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="bg-white p-8 rounded shadow text-center max-w-md">
                    <div className="text-green-500 text-5xl mb-4">✉️</div>
                    <h2 className="text-2xl font-bold mb-2">Registo Efetuado!</h2>
                    <p className="text-gray-600">
                        A tua conta foi criada. Por favor verifica a consola do backend (ou a base de dados) para simular a ativação do email.
                    </p>
                    <p className="text-sm text-gray-400 mt-4">A redirecionar para o login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg w-96">
                <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">Criar Conta</h2>
                
                {error && (
                    <div className="bg-red-100 border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1">Nome</label>
                        <input 
                            name="nome" type="text" required
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1">Email</label>
                        <input 
                            name="email" type="email" required
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1">Password</label>
                        <input 
                            name="password" type="password" required minLength={6}
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1">Confirmar Password</label>
                        <input 
                            name="confirmPassword" type="password" required
                            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onChange={handleChange}
                        />
                    </div>
                    
                    <button 
                        type="submit"
                        className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 transition"
                    >
                        Registar
                    </button>
                </form>
                
                <div className="mt-4 text-center">
                    <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-800">
                        Voltar ao Login
                    </button>
                </div>
            </div>
        </div>
    );
}