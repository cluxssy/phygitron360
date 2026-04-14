import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      // Hit the backend to invalidate the server-side session_token cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Logout request failed', e);
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check', { credentials: 'include' });
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('Auth check failed');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const hasRole = (roles) => {
    if (!user) return false;
    const userRoles = (user.roles || [user.role]).map(r => r ? r.toLowerCase() : '');
    
    if (Array.isArray(roles)) {
      const allowedRoles = roles.map(r => r.toLowerCase());
      return allowedRoles.some(role => userRoles.includes(role));
    }
    return userRoles.includes(roles.toLowerCase());
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
