import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage, RegistrationPage } from './pages';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/register" element={<RegistrationPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
