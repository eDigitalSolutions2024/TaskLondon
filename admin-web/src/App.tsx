import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import Login from './pages/Login';
import RoutinesList from './pages/RoutinesList';
import SectionsList from './pages/SectionsList';
import RoutineEditor from './pages/RoutineEditor';
import HistoryList from './pages/HistoryList';
import UsersList from './pages/UsersList';
import { getStoredToken } from './auth';

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = getStoredToken();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/routines"
          element={
            <RequireAuth>
              <RoutinesList />
            </RequireAuth>
          }
        />
        <Route
          path="/sections"
          element={
            <RequireAuth>
              <SectionsList />
            </RequireAuth>
          }
        />
        <Route
          path="/users"
          element={
            <RequireAuth>
              <UsersList />
            </RequireAuth>
          }
        />
        <Route
          path="/history"
          element={
            <RequireAuth>
              <HistoryList />
            </RequireAuth>
          }
        />
        <Route
          path="/routines/:routineId"
          element={
            <RequireAuth>
              <RoutineEditor />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to={getStoredToken() ? '/routines' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
