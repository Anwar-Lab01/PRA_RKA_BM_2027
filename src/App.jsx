import { Routes, Route, NavLink } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage.jsx';
import InputAnggaranPage from './pages/InputAnggaranPage.jsx';
import RekapPage from './pages/RekapPage.jsx';

export default function App() {
  return (
    <>
      <header className="app-header">
        <h1>Pra RKA 2027 Dashboard</h1>
        <nav className="app-nav">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/input">
            Input Anggaran
          </NavLink>
          <NavLink to="/rekap">
            Rekap
          </NavLink>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/input" element={<InputAnggaranPage />} />
          <Route path="/rekap" element={<RekapPage />} />
        </Routes>
      </main>
    </>
  );
}
