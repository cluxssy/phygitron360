import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [viewingAsRole, setViewingAsRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/auth/check', { credentials: 'include' });
            const data = await res.json();

            if (data.authenticated && data.user) {
                setUser(data.user);
                const savedView = localStorage.getItem('viewingAsRole');
                if (savedView && ['Admin', 'HR', 'Management', 'Employee'].includes(savedView)) {
                    setViewingAsRole(savedView);
                } else {
                    setViewingAsRole(data.user.role);
                }
            } else {
                setUser(null);
                setViewingAsRole(null);
                Cookies.remove('auth_token');
                sessionStorage.removeItem('user');
                localStorage.removeItem('viewingAsRole');
            }
        } catch (err) {
            console.error("Auth check failed:", err);
            setUser(null);
            setViewingAsRole(null);
            Cookies.remove('auth_token');
            sessionStorage.removeItem('user');
            localStorage.removeItem('viewingAsRole');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = (userData) => {
        setUser(userData);
        setViewingAsRole(userData.role);
        sessionStorage.setItem('user', JSON.stringify(userData));
        localStorage.removeItem('viewingAsRole');
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (e) {
            console.error("Logout error", e);
        }
        Cookies.remove('auth_token');
        setUser(null);
        setViewingAsRole(null);
        sessionStorage.removeItem('user');
        localStorage.removeItem('viewingAsRole');
        window.location.href = '/'; 
    };

    const handleSetViewingAsRole = (role) => {
        setViewingAsRole(role);
        if (role) {
            localStorage.setItem('viewingAsRole', role);
        } else {
            localStorage.removeItem('viewingAsRole');
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, viewingAsRole, setViewingAsRole: handleSetViewingAsRole, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
