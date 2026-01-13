import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import EditUserModal from '../components/EditUserModal';
import { QRCodeSVG } from 'qrcode.react';

export default function Dashboard() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleEnable2FA = async () => {
        try {
            const res = await api.post('/Auth/enable-2fa');
            setQrCodeUrl(res.data.qrCodeUrl);
        } catch (err) { alert('Erro ao ativar 2FA'); }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/Users');
            setUsers(response.data);
        } catch (error) {
            if (error.response?.status === 401) {
                navigate('/');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tens a certeza?')) return;
        try {
            await api.delete(`/Users/${id}`);
            setUsers(users.filter(user => user.id !== id));
        } catch (error) {
            alert('Erro ao apagar.');
        }
    };

    // Função chamada quando o Modal guarda com sucesso
    const handleUpdateSuccess = (updatedUser) => {
        setUsers(users.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
    };

    if (loading) return <div className="p-10">A carregar...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow p-4 mb-8 flex justify-between items-center">
                <h1 className="text-xl font-bold text-blue-600">ATEC Management</h1>
                <div className="flex gap-4">
                    <button onClick={() => navigate('/register')} className="bg-green-500 text-white px-4 py-2 rounded">
                        + Novo
                    </button>
                    <button onClick={() => { localStorage.removeItem('token'); navigate('/'); }} className="bg-red-500 text-white px-4 py-2 rounded">
                        Sair
                    </button>
                </div>
            </nav>

            <div className="mb-6 p-4 bg-purple-50 rounded border border-purple-200">
                <h3 className="font-bold text-purple-700">Segurança</h3>
                <button onClick={handleEnable2FA} className="mt-2 bg-purple-600 text-white px-4 py-2 rounded">
                    Ativar Autenticação de 2 Fatores
                </button>

                {qrCodeUrl && (
                    <div className="mt-4 bg-white p-4 inline-block shadow">
                        <p className="text-sm mb-2">Lê este QR Code com o Google Authenticator:</p>
                        <QRCodeSVG value={qrCodeUrl} />
                    </div>
                )}
            </div>
            <div className="container mx-auto px-4">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="text-left py-3 px-4">Nome</th>
                                <th className="text-left py-3 px-4">Email</th>
                                <th className="text-left py-3 px-4">Role</th>
                                <th className="text-left py-3 px-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b hover:bg-gray-50">
                                    <td className="py-3 px-4">{user.nome}</td>
                                    <td className="py-3 px-4">{user.email}</td>
                                    <td className="py-3 px-4">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 flex gap-2">
                                        {/* Botão EDITAR */}
                                        <button
                                            onClick={() => setEditingUser(user)}
                                            className="text-yellow-600 hover:text-yellow-800 font-medium"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="text-red-600 hover:text-red-800 font-medium"
                                        >
                                            Apagar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Renderizar o Modal se houver um user a ser editado */}
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onUpdate={handleUpdateSuccess}
                />
            )}
        </div>
    );
}