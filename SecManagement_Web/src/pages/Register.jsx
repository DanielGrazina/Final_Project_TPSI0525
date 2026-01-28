import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useTheme from '../hooks/useTheme';
import ThemeToggle from '../components/ThemeToggle';

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
    const { theme, toggleTheme } = useTheme();

    const handleChange = (e) => {
        setFormData({...formData, [e.target.name]: e.target.value});
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) {
            setError("As passwords não coincidem!");
            return;
        }

        try {
            await api.post('/Auth/register', {
                nome: formData.nome,
                email: formData.email,
                password: formData.password
            });

            setSuccess(true);
            
            setTimeout(() => {
                navigate('/');
            }, 3000);

        } catch (err) {
            setError(err.response?.data?.message || 'Erro ao registar utilizador.');
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
                <div className="bg-white dark:bg-gray-900 p-10 rounded-2xl shadow-2xl border dark:border-gray-800 text-center max-w-md mx-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6 shadow-lg shadow-green-500/30 animate-bounce">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold mb-3 text-gray-900 dark:text-gray-100">Registo Efetuado!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        A tua conta foi criada com sucesso. Por favor verifica a consola do backend (ou a base de dados) para simular a ativação do email.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        A redirecionar para o login...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
            
            {/* Theme toggle */}
            <div className="absolute top-4 right-4">
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>

            <div className="relative w-full max-w-md px-4">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl border dark:border-gray-800">
                    {/* Logo/Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 mb-4 shadow-lg shadow-green-500/30">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Criar Conta</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Junta-te ao ATEC Management
                        </p>
                    </div>
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</div>
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Nome Completo
                            </label>
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <input 
                                    name="nome" 
                                    type="text" 
                                    required
                                    className="w-full pl-10 pr-4 py-3 border rounded-lg
                                               bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                                               text-gray-900 dark:text-gray-100
                                               focus:outline-none focus:ring-2 focus:ring-green-500/40 transition-shadow"
                                    onChange={handleChange}
                                    placeholder="João Silva"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <input 
                                    name="email" 
                                    type="email" 
                                    required
                                    className="w-full pl-10 pr-4 py-3 border rounded-lg
                                               bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                                               text-gray-900 dark:text-gray-100
                                               focus:outline-none focus:ring-2 focus:ring-green-500/40 transition-shadow"
                                    onChange={handleChange}
                                    placeholder="exemplo@atec.pt"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <input 
                                    name="password" 
                                    type="password" 
                                    required 
                                    minLength={6}
                                    className="w-full pl-10 pr-4 py-3 border rounded-lg
                                               bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                                               text-gray-900 dark:text-gray-100
                                               focus:outline-none focus:ring-2 focus:ring-green-500/40 transition-shadow"
                                    onChange={handleChange}
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Confirmar Password
                            </label>
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <input 
                                    name="confirmPassword" 
                                    type="password" 
                                    required
                                    className="w-full pl-10 pr-4 py-3 border rounded-lg
                                               bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                                               text-gray-900 dark:text-gray-100
                                               focus:outline-none focus:ring-2 focus:ring-green-500/40 transition-shadow"
                                    onChange={handleChange}
                                    placeholder="Repetir password"
                                />
                            </div>
                        </div>
                        
                        <button 
                            type="submit"
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 px-4 rounded-lg
                                       hover:from-green-700 hover:to-emerald-700 transition-all
                                       shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40
                                       active:scale-95"
                        >
                            Criar Conta
                        </button>
                    </form>
                    
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Já tens conta?{" "}
                            <button 
                                onClick={() => navigate('/')} 
                                className="font-semibold text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                            >
                                Fazer login
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6 text-xs text-gray-500 dark:text-gray-400">
                    ATEC Management • Portal de Gestão v1.0
                </div>
            </div>
        </div>
    );
}