import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn } from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Transactions from './pages/Transactions';
import Bets from './pages/Bets';
import Rounds from './pages/Rounds';
import Config from './pages/Config';
import Layout from './components/Layout';

function Guard({ children }: { children: React.ReactNode }) {
    return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={
                    <Guard>
                        <Layout>
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/users" element={<Users />} />
                                <Route path="/transactions" element={<Transactions />} />
                                <Route path="/bets" element={<Bets />} />
                                <Route path="/rounds" element={<Rounds />} />
                                <Route path="/config" element={<Config />} />
                            </Routes>
                        </Layout>
                    </Guard>
                } />
            </Routes>
        </BrowserRouter>
    );
}
