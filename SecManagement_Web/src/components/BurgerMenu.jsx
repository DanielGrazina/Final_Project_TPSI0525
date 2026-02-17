import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, getUserRoleFromToken } from "../utils/auth";

export default function BurgerMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const token = getToken();
    const role = useMemo(() => getUserRoleFromToken(token), [token]);

    const perms = useMemo(() => {
        const isSuperAdmin = role === "SuperAdmin";
        const isAdmin = role === "Admin";
        const isSecretaria = role === "Secretaria";
        const isFormador = role === "Formador";
        const isFormando = role === "Formando";
        const isUser = role === "User";

        return {
            role,
            canUsers: isSuperAdmin || isAdmin || isSecretaria,
            canAreas: isSuperAdmin || isAdmin,
            canCourses: isSuperAdmin || isAdmin,
            canModules: isSuperAdmin || isAdmin,
            canTurmas: isSuperAdmin || isAdmin,
            canRooms: isSuperAdmin || isAdmin,
            canStats: isSuperAdmin || isAdmin,
            canAutoSchedule: isSuperAdmin || isAdmin || isFormador,
            canSessoes: isSuperAdmin || isAdmin || isFormador,
            canEvaluations: isSuperAdmin || isAdmin || isFormador || isFormando,
            canInscricoes: isUser || isFormando || isSecretaria || isSuperAdmin || isAdmin,
            canProfiles: true,
            canAvailability: isFormador || isSuperAdmin || isAdmin,
            canHorarios: isFormador || isFormando,
        };
    }, [role]);

    const menuItems = [
        {
            key: "users",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            label: "Utilizadores",
            desc: "Gestão de utilizadores",
            path: "/admin/users",
            show: perms.canUsers,
        },
        {
            key: "areas",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
                </svg>
            ),
            label: "Áreas",
            desc: "Gestão de áreas",
            path: "/admin/areas",
            show: perms.canAreas,
        },
        {
            key: "courses",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            ),
            label: "Cursos",
            desc: "Gestão de cursos",
            path: "/admin/courses",
            show: perms.canCourses,
        },
        {
            key: "modules",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            label: "Módulos",
            desc: "Catálogo de módulos",
            path: "/admin/modules",
            show: perms.canModules,
        },
        {
            key: "turmas",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
            label: "Turmas",
            desc: "Gestão de turmas",
            path: "/admin/turmas",
            show: perms.canTurmas,
        },
        {
            key: "rooms",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
            label: "Salas",
            desc: "Gestão de salas",
            path: "/admin/rooms",
            show: perms.canRooms,
        },
        {
            key: "stats",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            label: "Estatísticas",
            desc: "Indicadores do sistema",
            path: "/admin/stats",
            show: perms.canStats,
        },
        {
            key: "sessions",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            label: "Sessões",
            desc: "Agendar/consultar",
            path: "/admin/sessions",
            show: perms.canSessoes,
        },
        {
            key: "auto-schedule",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            label: "Geração Horários",
            desc: "Geração automática",
            path: "/admin/auto-schedule",
            show: perms.canAutoSchedule, // Admin + SuperAdmin + Formador (coordenador)
        },
        {
            key: "evaluations",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            ),
            label: "Avaliações",
            desc: "Registo/consulta",
            path: "/admin/evaluations",
            show: perms.canEvaluations,
        },
        {
            key: "inscricoes",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            label: "Inscrições",
            desc: "Candidaturas/aprovações",
            path: "/recruit",
            show: perms.canInscricoes,
        },
        {
            key: "profiles",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            ),
            label: "Profiles",
            desc: "Dados e ficheiros",
            path: "/profiles",
            show: perms.canProfiles,
        },
        {
            key: "availability",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            ),
            label: "Disponibilidades",
            desc: "Disponibilidade",
            path: "/availability",
            show: perms.canAvailability,
        },
    ];

    const visibleItems = menuItems.filter((item) => item.show);

    const handleNavigate = (path) => {
        setIsOpen(false);
        navigate(path);
    };

    const handleDashboard = () => {
        setIsOpen(false);
        navigate("/dashboard");
    };

    return (
        <>
            {/* Burger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 
                   hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Menu"
            >
                <svg className="w-8 h-8 text-gray-700 dark:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Drawer Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                >
                    {/* Drawer */}
                    <div
                        className="fixed top-0 left-0 h-screen w-80 bg-[#1a1f2e] shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-700">
                            <div>
                                <h2 className="text-lg font-bold text-white">MENU</h2>
                                <p className="text-xs text-gray-400">Perfil {perms.role}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Menu Items */}
                        <div className="p-4 space-y-1">
                            {visibleItems.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => handleNavigate(item.path)}
                                    className="w-full flex items-center gap-4 p-3 rounded-lg text-left
                             hover:bg-gray-800/50 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-gray-800/50 flex items-center justify-center
                                  text-gray-400 group-hover:text-white transition-colors">
                                        {item.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold text-white">{item.label}</div>
                                        <div className="text-xs text-gray-400">{item.desc}</div>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            ))}
                        </div>

                        {/* Dashboard Button */}
                        <div className="p-4 border-t border-gray-700">
                            <button
                                type="button"
                                onClick={handleDashboard}
                                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700
                           hover:from-blue-700 hover:to-blue-800 text-white font-semibold
                           transition-all shadow-lg"
                            >
                                Ir para Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
