import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Activate() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('A ativar conta...');

    useEffect(() => {
        const rawEmail = searchParams.get("email") || "";
        const rawToken = searchParams.get("token") || "";

        // Normalizar (evita problemas de encoding/copiar-colar)
        const email = rawEmail.replace(/\+/g, "%20").trim(); // caso venha com '+'
        const token = rawToken.trim();

        if (!email || !token) {
            setStatus("❌ Link inválido (faltam dados).");
            return;
        }

        api.post("/Auth/activate", { email: decodeURIComponent(email), token })
            .then(() => {
                setStatus("✅ Conta Ativada com Sucesso!");
                setTimeout(() => navigate("/"), 3000);
            })
            .catch((err) => {
                setStatus("❌ Erro: " + (err.response?.data?.message || "Token inválido"));
            });
    }, [searchParams, navigate]);


    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 text-xl font-bold">
            {status}
        </div>
    );
}