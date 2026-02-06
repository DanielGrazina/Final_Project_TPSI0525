import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Activate from "./pages/Activate";

import Courses from "./pages/admin/Courses.jsx";
import Rooms from "./pages/admin/Rooms.jsx";
import Modules from "./pages/admin/Modules.jsx";
import Turmas from "./pages/admin/Turmas.jsx";
import Areas from "./pages/admin/Areas.jsx";
import Evaluations from "./pages/admin/Evaluations.jsx";
import Users from "./pages/admin/Users.jsx";
import Sessions from "./pages/admin/Sessions.jsx";
import Recruit from "./pages/admin/Recruit.jsx";
import Profiles from "./pages/Profiles.jsx";
import Availability from "./pages/Availability.jsx";

import RequireRole from "./components/RequireRole";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/activate" element={<Activate />} />

        {/* Protegido (qualquer role com token válido) */}
        <Route
          path="/dashboard"
          element={
            <RequireRole>
              <Dashboard />
            </RequireRole>
          }
        />

        {/* INSCRIÇÕES / CANDIDATURAS
            - POST /Inscricoes/candidatar -> User, Formando
            - GET /Inscricoes/aluno/{formandoId} -> autenticado (mas vamos controlar no frontend)
            - GET /Inscricoes/pendentes + aprovar/rejeitar -> Secretaria, Admin, SuperAdmin
        */}
        <Route
          path="/recruit"
          element={
            <RequireRole allow={["User", "Formando", "Secretaria", "Admin", "SuperAdmin"]}>
              <Recruit />
            </RequireRole>
          }
        />

        {/* USERS
            - GET/PUT: SuperAdmin, Admin, Secretaria
            - DELETE: SuperAdmin, Admin
        */}
        <Route
          path="/admin/users"
          element={
            <RequireRole allow={["Secretaria", "Admin", "SuperAdmin"]}>
              <Users />
            </RequireRole>
          }
        />
        <Route
          path="/profiles"
          element={
            <RequireRole allow={["User", "Formando", "Formador", "Secretaria", "Admin", "SuperAdmin"]}>
              <Profiles />
            </RequireRole>
          }
        />

        {/* PEDAGÓGICO (Admin/SuperAdmin) */}
        <Route
          path="/admin/areas"
          element={
            <RequireRole allow={["Admin", "SuperAdmin"]}>
              <Areas />
            </RequireRole>
          }
        />
        <Route
          path="/admin/courses"
          element={
            <RequireRole allow={["Admin", "SuperAdmin"]}>
              <Courses />
            </RequireRole>
          }
        />
        <Route
          path="/admin/modules"
          element={
            <RequireRole allow={["Admin", "SuperAdmin"]}>
              <Modules />
            </RequireRole>
          }
        />
        <Route
          path="/admin/turmas"
          element={
            <RequireRole allow={["Admin", "SuperAdmin"]}>
              <Turmas />
            </RequireRole>
          }
        />
        <Route
          path="/availability"
          element={
            <RequireRole allow={["Formador", "Admin", "SuperAdmin"]}>
              <Availability />
            </RequireRole>
          }
        />

        {/* SALAS (controller só Admin/SuperAdmin) */}
        <Route
          path="/admin/rooms"
          element={
            <RequireRole allow={["Admin", "SuperAdmin"]}>
              <Rooms />
            </RequireRole>
          }
        />

        {/* AVALIAÇÕES
            - Controller: [Authorize] geral
            - POST lançar nota: Formador, Admin, SuperAdmin
            - Aluno vê as suas: GET /Avaliacoes/aluno/{id} (controlado por claims no backend)
        */}
        <Route
          path="/admin/evaluations"
          element={
            <RequireRole allow={["Formando", "Formador", "Admin", "SuperAdmin"]}>
              <Evaluations />
            </RequireRole>
          }
        />

        {/* SESSÕES
            - POST agendar: Admin, SuperAdmin, Formador
            - GET horários: autenticado
        */}
        <Route
          path="/admin/sessions"
          element={
            <RequireRole allow={["Formador", "Admin", "SuperAdmin"]}>
              <Sessions />
            </RequireRole>
          }
        />

        {/* Fallback simples */}
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
