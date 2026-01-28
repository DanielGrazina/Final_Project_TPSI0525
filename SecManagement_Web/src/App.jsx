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

        {/* ADMIN only */}
        <Route
          path="/admin/Users"
          element={
            <RequireRole allow={["Admin"]}>
              <Users />
            </RequireRole>
          }
        />
        <Route
          path="/admin/Areas"
          element={
            <RequireRole allow={["Admin"]}>
              <Areas />
            </RequireRole>
          }
        />
        <Route
          path="/admin/Courses"
          element={
            <RequireRole allow={["Admin"]}>
              <Courses />
            </RequireRole>
          }
        />
        <Route
          path="/admin/Modules"
          element={
            <RequireRole allow={["Admin"]}>
              <Modules />
            </RequireRole>
          }
        />
        <Route
          path="/admin/Turmas"
          element={
            <RequireRole allow={["Admin"]}>
              <Turmas />
            </RequireRole>
          }
        />

        {/* Admin + Formador */}
        <Route
          path="/admin/Rooms"
          element={
            <RequireRole allow={["Admin", "Formador"]}>
              <Rooms />
            </RequireRole>
          }
        />

        {/* Admin + Formador + Formando */}
        <Route
          path="/admin/Evaluations"
          element={
            <RequireRole allow={["Admin", "Formador", "Formando"]}>
              <Evaluations />
            </RequireRole>
          }
        />

        {/* Sessões: Admin + Formador (como disseste) */}
        <Route
          path="/admin/Sessions"
          element={
            <RequireRole allow={["Admin", "Formador"]}>
              <Sessions />
            </RequireRole>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
