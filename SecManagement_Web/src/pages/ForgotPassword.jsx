import { useState } from 'react';
import api from '../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import useTheme from '../hooks/useTheme';
import ThemeToggle from '../components/ThemeToggle';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    // Step 2: token + new password
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetting, setResetting] = useState(false);
    const [resetDone, setResetDone] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/Auth/forgot-password', { email });
            setSuccess(true);
        } catch (error) {
            alert('Erro ao processar pedido.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            alert('A password deve ter pelo menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('As passwords não coincidem.');
            return;
        }

        setResetting(true);
        try {
            await api.post('/Auth/reset-password', { token: token.trim(), newPassword });
            setResetDone(true);
        } catch (err) {
            alert('Token inválido ou expirado. Verifica o código e tenta novamente.');
        } finally {
            setResetting(false);
        }
    };

    // Step 3: success — password changed
    if (resetDone) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
                <div className="bg-white dark:bg-gray-900 p-10 rounded-2xl shadow-2xl border dark:border-gray-800 text-center max-w-md mx-4">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6 shadow-lg shadow-green-500/30">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold mb-3 text-gray-900 dark:text-gray-100">Password Alterada!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        A tua password foi alterada com sucesso. Já podes fazer login com a nova password.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium
                                   hover:from-green-700 hover:to-emerald-700 transition-all
                                   shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40"
                    >
                        Ir para Login
                    </button>
                </div>
            </div>
        );
    }

    // Step 2: enter token + new password
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />

                <div className="absolute top-4 right-4">
                    <ThemeToggle theme={theme} onToggle={toggleTheme} />
                </div>

                <div className="relative w-full max-w-md px-4">
                    <form onSubmit={handleReset} className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl border dark:border-gray-800">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 mb-4 shadow-lg shadow-blue-500/30">
                                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Redefinir Password</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                Enviámos um código para <strong className="text-gray-800 dark:text-gray-200">{email}</strong>. Insere-o abaixo junto com a nova password.
                            </p>
                        </div>

                        {/* Info banner */}
                        <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-xs text-blue-700 dark:text-blue-300">
                                    Verifica a tua caixa de entrada (e pasta de spam). O código expira em <strong>30 minutos</strong>.
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {/* Token field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Código de Recuperação
                                </label>
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Cola aqui o código recebido por email"
                                        required
                                        className="w-full pl-10 pr-4 py-3 border rounded-lg
                                                   bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                                                   text-gray-900 dark:text-gray-100 font-mono text-sm
                                                   focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow
                                                   disabled:opacity-60"
                                        value={token}
                                        onChange={e => setToken(e.target.value)}
                                        disabled={resetting}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* New password */}
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
                                                   focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow
                                                   disabled:opacity-60"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        disabled={resetting}
                                    />
                                </div>
                            </div>

                            {/* Confirm password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Confirmar Password
                                </label>
                                <div className="relative">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    <input
                                        type="password"
                                        placeholder="Repete a nova password"
                                        required
                                        minLength={6}
                                        className="w-full pl-10 pr-4 py-3 border rounded-lg
                                                   bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                                                   text-gray-900 dark:text-gray-100
                                                   focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow
                                                   disabled:opacity-60"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        disabled={resetting}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={resetting}
                                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-3 px-4 rounded-lg
                                           hover:from-blue-700 hover:to-cyan-700 transition-all
                                           shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
                                           disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
                            >
                                {resetting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        A alterar...
                                    </span>
                                ) : (
                                    "Alterar Password"
                                )}
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={() => { setSuccess(false); setToken(''); setNewPassword(''); setConfirmPassword(''); }}
                                className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            >
                                ← Reenviar código para outro email
                            </button>
                        </div>
                    </form>

                    <div className="text-center mt-6 text-xs text-gray-500 dark:text-gray-400">
                        ATEC Management • Portal de Gestão v1.0
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />

            {/* Theme toggle */}
            <div className="absolute top-4 right-4">
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>

            <div className="relative w-full max-w-md px-4">
                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl border dark:border-gray-800">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 mb-4 shadow-lg shadow-blue-500/30">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Recuperar Conta</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Insere o teu email para receberes o link de reset
                        </p>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <input
                                    type="email"
                                    placeholder="exemplo@atec.pt"
                                    required
                                    className="w-full pl-10 pr-4 py-3 border rounded-lg
                                               bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                                               text-gray-900 dark:text-gray-100
                                               focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow
                                               disabled:opacity-60"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-3 px-4 rounded-lg
                                       hover:from-blue-700 hover:to-cyan-700 transition-all
                                       shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
                                       disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    A enviar...
                                </span>
                            ) : (
                                "Enviar Email de Recuperação"
                            )}
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <Link to="/" className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                            ← Voltar ao Login
                        </Link>
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