import { Monitor, UserPlus, Users, Home, BookOpen, Star, HelpCircle, LogOut } from 'lucide-react';

export interface MenuItem {
    label: string;
    ariaLabel: string;
    link: string;
    icon?: any; // Optional icon class or component name if needed
}

const ALL_MENU_ITEMS = [
    { label: 'Home', ariaLabel: 'Dashboard', link: '/deploy/dashboard', required_perm: 'can_view_dashboard', viewRoles: ['Admin', 'HR', 'Management', 'Employee'] },
    { label: 'Directory', ariaLabel: 'Employee Directory', link: '/deploy/employee-directory', required_perm: 'can_manage_employees', viewRoles: ['Admin', 'HR', 'Management'] },
    { label: 'Attendance', ariaLabel: 'Attendance & Leaves', link: '/deploy/attendance' },
    { label: 'Add Employee', ariaLabel: 'Add New Employee', link: '/deploy/add-employee', required_perm: 'can_add_employee', viewRoles: ['Admin', 'HR'] },
    { label: 'Allocations', ariaLabel: 'Manage Allocations', link: '/deploy/manage-assets', required_perm: 'can_manage_assets', viewRoles: ['Admin', 'HR'] },
    { label: 'Performance', ariaLabel: 'Performance Management', link: '/deploy/performance' },
    { label: 'Training', ariaLabel: 'Training Management', link: '/deploy/training', required_perm: 'can_manage_training', viewRoles: ['Admin', 'HR'] },
    { label: 'Admin Panel', ariaLabel: 'System Administration', link: '/deploy/admin', required_perm: 'can_manage_users', viewRoles: ['Admin'] },
    { label: 'About Us', ariaLabel: 'About & Guide', link: '/deploy/about' },
    { label: 'Logout', ariaLabel: 'Sign Out', link: '/logout' }
];

export function getMenuItems(role?: string, permissions?: string[]): MenuItem[] {
    if (!role) return [];

    return ALL_MENU_ITEMS.filter(item => {
        // Enforce View Role First (if they switched to Employee view, hide Admin stuff even if they have permission)
        if (item.viewRoles && !item.viewRoles.includes(role)) {
            return false;
        }

        // Available to everyone if no permission required
        if (!item.required_perm) return true;

        // Check explicit granular permissions
        if (permissions) {
            return permissions.includes(item.required_perm);
        }

        // Fallback for legacy clients without permissions array
        const legacyMap: Record<string, string[]> = {
            'Admin': ['can_view_dashboard', 'can_manage_employees', 'can_add_employee', 'can_manage_assets', 'can_manage_training', 'can_manage_users'],
            'HR': ['can_view_dashboard', 'can_manage_employees', 'can_add_employee', 'can_manage_assets', 'can_manage_training'],
            'Management': ['can_view_dashboard', 'can_manage_employees']
        };
        return (legacyMap[role] || []).includes(item.required_perm);
    }).map(({ required_perm, viewRoles, ...item }) => item); // Remove internal property
}