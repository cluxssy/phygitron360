import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

import "../styles/admin.css";

import logo from "../../../assets/phy360.png";
import bellIcon from "../../../assets/bell.png";
import logoutIcon from "../../../assets/exit.png";

import { useAuth } from "../../../core/auth/AuthContext";
import { MODULE_CONFIG } from "../../../core/config/modules";

import AdminPanel from "../components/AdminPanel";

axios.defaults.withCredentials = true;

const hubNameMap = {
  source: "Talent Hub",
  forge: "Learning Hub",
  verify: "Assessment Hub",
  deploy: "Employee Hub",
};

export default function OrgDashboard() {

  const navigate = useNavigate();
  const location = useLocation();

  const { logout, user, hasPermission, hasRole } = useAuth();

  const [activeSideTab, setActiveSideTab] = useState("overview");

  const [stats, setStats] = useState({});
  const [funnel, setFunnel] = useState([]);
  const [activity, setActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [team, setTeam] = useState([]);

  const modules = Object.entries(MODULE_CONFIG)
    .filter(([_, config]) =>
      hasPermission?.(config.permission)
    )
    .map(([key, config]) => ({
      id: key,
      name: config.label,
      path: config.route,
    }));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {

      const [
        statsRes,
        funnelRes,
        activityRes,
        alertsRes,
        journeysRes,
        teamRes,
      ] = await Promise.all([
        axios.get("/api/org/dashboard-stats"),
        axios.get("/api/org/pipeline-funnel"),
        axios.get("/api/org/recent-activity"),
        axios.get("/api/org/alerts"),
        axios.get("/api/org/journey-overview"),
        axios.get("/api/org/team-overview"),
      ]);

      setStats(statsRes.data || {});

      setFunnel(
        funnelRes.data?.length
          ? funnelRes.data
          : [
              { stage: "Sourced", count: 0 },
              { stage: "Screening", count: 0 },
              { stage: "Training", count: 0 },
              { stage: "Verified", count: 0 },
              { stage: "Deployed", count: 0 },
            ]
      );

      setActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
      setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      setJourneys(Array.isArray(journeysRes.data) ? journeysRes.data : []);
      setTeam(Array.isArray(teamRes.data) ? teamRes.data : []);

    } catch (err) {
      console.error("Dashboard error:", err);
    }
  };

  const displayName =
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "User";

  // Dynamic role display based on actual user roles
  const getRoleDisplay = () => {
    if (hasRole?.('super_admin')) return 'Super Admin';
    if (hasRole?.('org_admin')) return 'Organisation Admin';
    if (hasRole?.('manager')) return 'Manager';
    return 'Organisation Admin';
  };

  return (

    <div className="dashboard-page">

      {/* TOPBAR */}

      <div className="topbar">

        <div className="top-left">
          <img src={logo} className="logo" alt="logo" />
        </div>

        <div className="top-center">

          <div className="hub-tabs">

            <button
              className={`hub-tab ${
                location.pathname === "/admin"
                  ? "active"
                  : ""
              }`}
              onClick={() => navigate("/admin")}
            >
              Dashboard
            </button>

            {modules.map((m) => (

              <button
                key={m.id}
                className={`hub-tab ${
                  location.pathname.startsWith(m.path)
                    ? "active"
                    : ""
                }`}
                onClick={() => navigate(m.path)}
              >
                {hubNameMap[m.id] || m.name}
              </button>

            ))}

          </div>

        </div>

        <div className="top-right">

          <img
            src={bellIcon}
            className="icon"
            alt="bell"
          />

          <img
            src={logoutIcon}
            className="icon logout-icon"
            alt="logout"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          />

          <div className="profile-wrap">

            <div className="avatar">
              {displayName?.charAt(0)?.toUpperCase()}
            </div>

            <div className="profile-text">
              <h4>{displayName}</h4>
              <p>{getRoleDisplay()}</p>
            </div>

          </div>

        </div>

      </div>

      {/* BODY */}

      <div className="dashboard-body">

        {/* SIDEBAR */}

        <div className="sidebar">

          <button
            className={activeSideTab === "overview" ? "active" : ""}
            onClick={() => setActiveSideTab("overview")}
          >
            Overview
          </button>

          <button
            className={activeSideTab === "users" ? "active" : ""}
            onClick={() => setActiveSideTab("users")}
          >
            Users
          </button>

          {/* <button
            className={activeSideTab === "analytics" ? "active" : ""}
            onClick={() => setActiveSideTab("analytics")}
          >
            Analytics
          </button> */}

        </div>

        {/* CONTENT */}

        <div className="content">

          {/* OVERVIEW */}

          {activeSideTab === "overview" && (

            <>

              <h2>
                Welcome, {displayName}
              </h2>

              <div className="highlight-strip">

                <div className="cards">

                  <div className="card highlight">
                    <p>Candidates</p>
                    <h1>{stats.total_candidates || 0}</h1>
                  </div>

                  <div className="card highlight">
                    <p>Training</p>
                    <h1>{stats.currently_training || 0}</h1>
                  </div>

                  <div className="card highlight">
                    <p>Verified</p>
                    <h1>{stats.verified_ready || 0}</h1>
                  </div>

                  <div className="card highlight">
                    <p>Employees</p>
                    <h1>{stats.active_employees || 0}</h1>
                  </div>

                  <div className="card highlight">
                    <p>Alerts</p>
                    <h1>{stats.skill_decay_alerts || 0}</h1>
                  </div>

                </div>

              </div>

              {/* FUNNEL */}

              <div className="section boxed">

                <h3>Talent Intelligence Funnel</h3>

                <div className="cards">

                  {(funnel.length ? funnel : []).map((f, i) => (

                    <div key={i} className="card small">
                      <p>{f.stage}</p>
                      <h1>{f.count}</h1>
                    </div>

                  ))}

                </div>

              </div>

              {/* ACTIVITY */}

              <div className="section boxed">

                <h3>Recent Activity</h3>

                <div className="cards">

                  <div className="card small">
                    <p>Source</p>
                    <h4>{activity.length} New Candidates</h4>
                  </div>

                  <div className="card small">
                    <p>Alerts</p>
                    <h4>{alerts.length}</h4>
                  </div>

                  <div className="card wide">
                    <p>Latest Activity</p>

                    <h4>
                      {activity.length === 0
                        ? "-"
                        : activity[0]?.details ||
                          activity[0]?.message ||
                          "No data"}
                    </h4>

                  </div>

                </div>

              </div>

              {/* JOURNEYS */}

              <div className="section boxed">

                <h3>Active Talent Journeys</h3>

                <div className="journeys">

                  {(journeys.length
                    ? journeys
                    : [
                        {
                          name: "New Hire Journey",
                          steps: [
                            { step: 1, count: 0 },
                            { step: 2, count: 0 },
                            { step: 3, count: 0 },
                          ],
                        },
                      ]).map((j, i) => (

                    <div key={i} className="journey-box">

                      <h4>{j.name}</h4>

                      {j.steps?.map((s, idx) => (

                        <div key={idx} className="row">
                          <span>{s.count}</span>
                          <span>Step {s.step}</span>
                        </div>

                      ))}

                    </div>

                  ))}

                </div>

              </div>

              {/* TEAM */}

              <div className="section boxed">

                <h3>Core Team Overview</h3>

                <table>

                  <thead>

                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Last Active</th>
                    </tr>

                  </thead>

                  <tbody>

                    {team.map((u, i) => (

                      <tr key={i}>

                        <td>
                          {u.username || u.name || u.email}
                        </td>

                        

                        <td>
                          {u.role}
                        </td>

                        <td>
                          {u.last_active
                            ? new Date(
                                u.last_active
                              ).toLocaleDateString()
                            : "-"}
                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </>

          )}

          {/* USERS */}

          {activeSideTab === "users" && (
            <AdminPanel />
          )}

          {/* ANALYTICS */}

          {activeSideTab === "analytics" && (

            <div className="section boxed">

              <h2>Analytics</h2>

              <p>
                Workforce analytics dashboard coming next.
              </p>

            </div>

          )}

        </div>

      </div>

    </div>

  );
}
