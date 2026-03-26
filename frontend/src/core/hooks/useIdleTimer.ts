import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export const useIdleTimer = (timeout: number = 900000) => { // Default to 15 minutes (900000 ms)
    const navigate = useNavigate();
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const logout = () => {
        // Clear Auth Token and Session
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        sessionStorage.removeItem('user');
        navigate('/');
    };

    const resetTimer = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(logout, timeout);
    };

    useEffect(() => {
        // Events that trigger a timer reset
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        // Initial set
        resetTimer();

        // Bind events
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Cleanup
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, []); // Run once on mount
};
