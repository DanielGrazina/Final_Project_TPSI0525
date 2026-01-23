import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/login';
import Dashboard from './pages/Dashboard';
import Register from './pages/register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Activate from './pages/Activate';
import Courses from './pages/admin/Courses.jsx';
import Rooms from './pages/admin/Rooms.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/activate" element={<Activate />} />
        <Route path="/admin/Courses" element={<Courses />} />
        <Route path="/admin/Rooms" element={<Rooms />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;