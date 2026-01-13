import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import EditUserModal from '../components/EditUserModal'; // <--- Importar o Modal

export default function Dashboard() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null); // <--- Estado para o Modal
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

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