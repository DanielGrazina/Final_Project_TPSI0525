import { useState } from 'react';
import api from '../api/axios';

export default function EditUserModal({ user, onClose, onUpdate }) {
    const [formData, setFormData] = useState({
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        // Mantemos os outros campos para não quebrar o objeto User do backend
        passwordHash: user.passwordHash,
        isActive: user.isActive
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Nota: O backend espera o objeto User completo ou parcial
            await api.put(`/Users/${user.id}`, formData);
            onUpdate(formData); // Atualiza a lista no pai
            onClose(); // Fecha o modal
        } catch (error) {
            alert('Erro ao atualizar: ' + (error.response?.data?.message || error.message));
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                <h2 className="text-xl font-bold mb-4">Editar Utilizador</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700">Nome</label>
                        <input
                            name="nome"
                            value={formData.nome}
                            onChange={handleChange}
                            className="w-full border p-2 rounded"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-bold text-gray-700">Email</label>
                        <input
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full border p-2 rounded bg-gray-100"
                            readOnly // Geralmente não se muda o email (identificador)
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700">Função (Role)</label>
                        <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full border p-2 rounded"
                        >
                            <option value="Formando">Formando</option>
                            <option value="Formador">Formador</option>
                            <option value="Secretaria">Secretaria</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}