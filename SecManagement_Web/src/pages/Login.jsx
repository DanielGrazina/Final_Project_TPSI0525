import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');

    // Estados de controlo
    const [error, setError] = useState('');
    const [requires2FA, setRequires2FA] = useState(false);

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Envia tudo: email, pass E o código (se já o tiveres digitado)
            const response = await api.post('/Auth/login', {
                email,
                password,
                twoFactorCode: twoFactorCode // Vai vazio na 1ª tentativa
            });

            // Se o Backend responder 202 (Accepted), pede o código 2FA
            if (response.status === 202 && response.data.requiresTwoFactor) {
                setRequires2FA(true); // Muda o ecrã para mostrar input de código
                return;
            }

            // Sucesso (Login normal ou 2FA validado)
            localStorage.setItem('token', response.data.token);
            navigate('/dashboard');

        } catch (err) {
            setError(err.response?.data?.message || 'Erro no login. Verifica as credenciais.');
            // Se falhar o 2FA, limpamos o código para tentar de novo
            if (requires2FA) setTwoFactorCode('');
        }
    };

    const handleSocialLogin = async (provider) => {
        // Numa app real, isto viria do SDK do Google/Facebook
        const mockUser = {
            email: `user_${provider.toLowerCase()}@teste.com`,
            provider: provider,
            providerKey: "123456789_MOCK_ID",
            nome: `Utilizador ${provider}`
        };

        try {
            const response = await api.post('/Auth/social-login', mockUser);
            localStorage.setItem('token', response.data.token);
            alert(`Login com ${provider} efetuado!`);
            navigate('/dashboard');
        } catch (err) {
            alert('Erro no login social');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg w-96">
                <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">ATEC Gestão</h2>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">

                    {/* --- CONDIÇÃO: Se NÃO pede 2FA, mostra Email e Pass --- */}
                    {!requires2FA ? (
                        <>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                                <input
                                    type="email" required
                                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={email} onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                                <input
                                    type="password" required
                                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                />
                                {/* Requisito 1.d: Link de Recuperação */}
                                <div className="text-right mt-1">
                                    <Link to="/forgot-password" className="text-xs text-blue-500 hover:underline">
                                        Esqueci-me da password
                                    </Link>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* --- CONDIÇÃO: Se PEDE 2FA, mostra só o Código --- */
                        <div className="animate-pulse">
                            <label className="block text-gray-700 font-bold mb-2 text-center">
                                Código Google Authenticator
                            </label>
                            <input
                                type="text" autoFocus
                                className="w-full p-3 border-2 border-blue-300 rounded text-center text-2xl tracking-[0.5em] font-mono"
                                placeholder="000000"
                                value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)}
                                maxLength={6}
                            />
                            <p className="text-xs text-gray-500 text-center mt-2">
                                Abre a app no teu telemóvel para ver o código.
                            </p>
                        </div>
                    )}

                    {/* Botão Principal */}
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-200"
                    >
                        {requires2FA ? 'Validar Código' : 'Entrar'}
                    </button>
                </form>

                {/* --- Requisito 1.a: Botões Sociais (Visuais) --- */}
                {!requires2FA && (
                    <div className="mt-6 border-t pt-4">
                        <p className="text-center text-sm text-gray-400 mb-3">Ou entrar com</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => handleSocialLogin('Google')}
                                className="flex-1 bg-red-500 text-white py-2 rounded text-sm hover:bg-red-600 transition"
                            >
                                Google
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSocialLogin('Facebook')}
                                className="flex-1 bg-blue-800 text-white py-2 rounded text-sm hover:bg-blue-900 transition"
                            >
                                Facebook
                            </button>
                        </div>
                    </div>
                )}

                <p className="mt-4 text-center text-sm">
                    Ainda não tens conta? <Link to="/register" className="text-blue-500 hover:underline">Registar</Link>
                </p>
            </div>
        </div>
    );
}