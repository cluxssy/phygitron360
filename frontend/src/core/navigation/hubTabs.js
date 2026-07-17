import { MODULE_CONFIG } from "../config/modules";

export const canViewDashboardTab = (hasRole) =>
  hasRole?.(["org_admin", "super_admin"]) === true;

export const getHubTabs = ({ hasPermission, hasRole }) => {
  const moduleTabs = Object.entries(MODULE_CONFIG)
    .filter(([key, config]) => {
      // Assessment Central (Verify) is always visible so employees can access Candidate Portal
      if (key === 'verify') return true;
      return hasPermission?.(config.permission);
    })
    .map(([key, config]) => ({
      id: key,
      name: config.label,
      path: config.route,
    }));

  if (!canViewDashboardTab(hasRole)) {
    return moduleTabs;
  }

  return [
    {
      id: "dashboard",
      name: "Dashboard",
      path: "/admin",
    },
    ...moduleTabs,
  ];
};
