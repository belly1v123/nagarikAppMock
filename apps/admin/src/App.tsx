/**
 * Admin App Main Component
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoginPage, DashboardPage, CitizensPage, ApiKeysPage } from './pages';
import { AdminLayout, ProtectedRoute } from './components';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected routes */}
                <Route
                    element={
                        <ProtectedRoute>
                            <AdminLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/citizens" element={<CitizensPage />} />
                    <Route path="/api-keys" element={<ApiKeysPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
