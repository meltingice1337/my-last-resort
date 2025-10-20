import { BrowserRouter, Routes, Route, useNavigate, HashRouter } from 'react-router-dom';
import HomePage from './components/HomePage';
import CreatePage from './components/CreatePage';
import RestorePage from './components/RestorePage';

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route
        path="/"
        element={<HomePage onModeChange={(mode) => navigate(mode === 'create' ? '/create' : '/restore')} />}
      />
      <Route
        path="/create"
        element={<CreatePage onBack={() => navigate('/')} />}
      />
      <Route
        path="/restore"
        element={<RestorePage onBack={() => navigate('/')} />}
      />
    </Routes>
  );
}

export default function MyLastResort() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}