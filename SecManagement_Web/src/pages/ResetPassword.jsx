import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useTheme from '../hooks/useTheme';
import ThemeToggle from '../components/ThemeToggle';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [pass, setPass] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/Auth/reset-password', { token, newPassword: pass });
            alert('Sucesso! A tua password foi alterada.');
            navigate('/');
        } catch (err) { 
            alert('Token inválido ou expirado.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
                <div className="bg-white dark:bg-gray-900 p-10 rounded-2xl shadow-2xl border dark:border-gray-800 text-center max-w-md mx-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
                        <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100">Token em Falta</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        O link de recuperação não contém um token válido. Por favor clica no link do email novamente.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium
                                   hover:from-blue-700 hover:to-purple-700 transition-all
                                   shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
                    >
                        Voltar ao Login
                    </button>
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
                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl border dark:border-gray-800">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 mb-4 shadow-lg shadow-green-500/30">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Nova Password</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Define uma nova password para a tua conta
                        </p>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Nova Password
                            </label>
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <input 
                                    type="password" 
                                    placeholder="Mínimo 6 caracteres" 
                                    required 
                                    minLength={6}
                                    className="w-full pl-10 pr-4 py-3 border rounded-lg
                                               bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                                               text-gray-900 dark:text-gray-100
                                               focus:outline-none focus:ring-2 focus:ring-green-500/40 transition-shadow
                                               disabled:opacity-60"
                                    value={pass} 
                                    onChange={e => setPass(e.target.value)}
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                A password deve ter pelo menos 6 caracteres
                            </p>
                        </div>

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 px-4 rounded-lg
                                       hover:from-green-700 hover:to-emerald-700 transition-all
                                       shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40
                                       disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    A alterar...
                                </span>
                            ) : (
                                "Alterar Password"
                            )}
                        </button>
                    </div>

                    {/* Security info */}
                    <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <div className="text-xs text-green-700 dark:text-green-300">
                                <strong>Segurança:</strong> Após alterar a password, serás redirecionado para o login. Recomendamos que uses uma password forte e única.
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="text-center mt-6 text-xs text-gray-500 dark:text-gray-400">
                    ATEC Management • Portal de Gestão v1.0
                </div>
            </div>
        </div>
    );
}