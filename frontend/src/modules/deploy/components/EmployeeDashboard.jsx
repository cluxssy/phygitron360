import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import {
  User,
  CheckCircle,
  Clock,
  Activity,
  Shield,
  AlertCircle,
  Users,
  Briefcase,
  Calendar,
  Layers3
} from 'lucide-react';

export default function EmployeeDashboard({
  mode = 'employee',
  user
}) {

  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);

  const [pendingAssessments, setPendingAssessments] = useState([]);

  const isAdmin = mode === 'admin';

  /* =========================================
     FETCH
  ========================================= */

  useEffect(() => {

    const fetchData = async () => {

      try {

        setLoading(true);

        /* =========================================
           ADMIN DASHBOARD
        ========================================= */

        if (isAdmin) {

          const res = await fetch(
            '/api/dashboard/stats',
            { credentials: 'include' }
          );

          if (!res.ok)
            throw new Error();

          const data = await res.json();

          setProfile(data);

        }

        /* =========================================
           EMPLOYEE DASHBOARD
        ========================================= */

        else {

          const [statsRes, assessRes] =
            await Promise.all([

              fetch(
                '/api/dashboard/employee-stats',
                { credentials: 'include' }
              ),

              fetch(
                `/api/assessments/${user?.employee_code}/${new Date().getFullYear()}`,
                { credentials: 'include' }
              )

            ]);

          if (statsRes.ok) {

            const statsData =
              await statsRes.json();

            setProfile(statsData);

          }

          if (assessRes.ok) {

            const assessData =
              await assessRes.json();

            const pending =
              assessData.filter(
                a =>
                  a.status === 'Not Started' ||
                  a.status === 'Draft'
              );

            setPendingAssessments(pending);

          }

        }

      } catch {

        toast.error(
          'Failed to load dashboard data'
        );

      } finally {

        setLoading(false);

      }

    };

    fetchData();

  }, [mode, user]);

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {

    return (

      <div className="flex items-center justify-center h-72">

        <div
          className="
            w-12
            h-12
            border-[3px]
            border-[#8b5cf6]
            border-t-transparent
            rounded-full
            animate-spin
          "
        />

      </div>

    );

  }

  /* =========================================
     ADMIN DASHBOARD
  ========================================= */

  if (isAdmin) {

    const stats = profile || {};

    const cards = [

      {
        icon: Users,
        label: 'Employees',
        value: stats.total_employees || 0
      },

      {
        icon: Briefcase,
        label: 'Departments',
        value: stats.total_departments || 0
      },

      {
        icon: Calendar,
        label: 'Attendance',
        value: `${stats.attendance_rate || 0}%`
      },

      {
        icon: Layers3,
        label: 'Active Assets',
        value: stats.active_assets || 0
      }

    ];

    return (

      <div className="space-y-8 animate-fade-in-up">

        {/* =========================================
            HERO
        ========================================= */}

        <div
          className="
            bg-gradient-to-r
            from-white
            via-[#faf7ff]
            to-[#f3ecff]
            border
            border-[#ece4ff]
            rounded-[2.5rem]
            p-10
            shadow-[0_10px_40px_rgba(180,140,255,0.08)]
          "
        >

          <p
            className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.3em]
              text-[#7c3aed]
              mb-4
            "
          >
            Organisation Analytics
          </p>

          <h1
            className="
              text-5xl
              font-black
              text-black
              tracking-tight
              leading-none
            "
          >
            Workforce Intelligence
          </h1>

          <p
            className="
              mt-5
              text-[13px]
              text-black/50
              max-w-2xl
              leading-relaxed
            "
          >
            Live operational metrics,
            employee overview,
            onboarding health
            and organisation activity.
          </p>

        </div>

        {/* =========================================
            STATS GRID
        ========================================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">

          {cards.map((card, i) => (

            <div
              key={i}
              className="
                bg-white
                border
                border-[#ebe4ff]
                rounded-[2rem]
                p-8
                shadow-[0_10px_40px_rgba(180,140,255,0.08)]
                hover:translate-y-[-2px]
                transition-all
              "
            >

              <div
                className="
                  w-14
                  h-14
                  rounded-2xl
                  bg-gradient-to-br
                  from-[#c084fc]
                  to-[#7c3aed]
                  flex
                  items-center
                  justify-center
                  mb-6
                "
              >

                <card.icon
                  size={24}
                  className="text-white"
                />

              </div>

              <p
                className="
                  text-[11px]
                  font-black
                  uppercase
                  tracking-[0.2em]
                  text-[#7c3aed]
                  mb-3
                "
              >
                {card.label}
              </p>

              <h2
                className="
                  text-5xl
                  font-black
                  text-black
                  tracking-tight
                "
              >
                {card.value}
              </h2>

            </div>

          ))}

        </div>

      </div>

    );

  }

  /* =========================================
     EMPLOYEE DASHBOARD
  ========================================= */

  const emp = profile?.employee || {};

  const leaves = profile?.leaves || {};

  const kras = profile?.kras || {
    total: 0,
    completed: 0
  };

  const attendance =
    profile?.attendance || {};

  return (

    <div className="space-y-8 max-w-6xl animate-fade-in-up pb-12">

      {/* =========================================
          HEADER
      ========================================= */}

      <div
        className="
          bg-gradient-to-r
          from-white
          via-[#faf7ff]
          to-[#f3ecff]
          border
          border-[#ece4ff]
          rounded-[2.5rem]
          p-10
          shadow-[0_10px_40px_rgba(180,140,255,0.08)]
          flex
          flex-col
          md:flex-row
          items-center
          gap-8
        "
      >

        <div
          className="
            w-28
            h-28
            rounded-[2rem]
            bg-gradient-to-br
            from-[#c084fc]
            to-[#7c3aed]
            flex
            items-center
            justify-center
            text-white
            text-5xl
            font-black
          "
        >
          {
            emp.name?.[0] ||
            user?.name?.[0] ||
            'U'
          }
        </div>

        <div className="flex-1">

          <p
            className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.3em]
              text-[#7c3aed]
              mb-3
            "
          >
            Employee Dashboard
          </p>

          <h1
            className="
              text-5xl
              font-black
              text-black
              tracking-tight
              mb-2
            "
          >
            {emp.name || user?.name}
          </h1>

          <p
            className="
              text-[13px]
              text-black/50
              font-semibold
            "
          >
            {emp.designation}
            {' • '}
            {emp.team}
          </p>

        </div>

      </div>

      {/* =========================================
          STATS
      ========================================= */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

        {[
          {
            icon: Clock,
            label: 'Leave Balance',
            value:
              (leaves.casual_total || 0) -
              (leaves.casual_used || 0)
          },

          {
            icon: CheckCircle,
            label: 'KRAs',
            value:
              `${kras.completed}/${kras.total}`
          },

          {
            icon: Activity,
            label: 'Attendance',
            value:
              attendance.status || 'N/A'
          },

          {
            icon: Shield,
            label: 'Assets',
            value:
              profile?.assets?.total || 0
          }

        ].map((card, i) => (

          <div
            key={i}
            className="
              bg-white
              border
              border-[#ebe4ff]
              rounded-[2rem]
              p-7
              shadow-[0_10px_40px_rgba(180,140,255,0.08)]
            "
          >

            <div
              className="
                w-12
                h-12
                rounded-2xl
                bg-gradient-to-br
                from-[#c084fc]
                to-[#7c3aed]
                flex
                items-center
                justify-center
                mb-5
              "
            >

              <card.icon
                size={20}
                className="text-white"
              />

            </div>

            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.2em]
                text-[#7c3aed]
                mb-2
              "
            >
              {card.label}
            </p>

            <h3
              className="
                text-3xl
                font-black
                text-black
              "
            >
              {card.value}
            </h3>

          </div>

        ))}

      </div>

      {/* =========================================
          ASSESSMENTS
      ========================================= */}

      <div
        className="
          bg-white
          border
          border-[#ebe4ff]
          rounded-[2.5rem]
          p-10
          shadow-[0_10px_40px_rgba(180,140,255,0.08)]
        "
      >

        <div className="flex items-center justify-between mb-8">

          <div>

            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.3em]
                text-[#7c3aed]
                mb-2
              "
            >
              Pending Tasks
            </p>

            <h3
              className="
                text-3xl
                font-black
                text-black
              "
            >
              Assessments
            </h3>

          </div>

        </div>

        {pendingAssessments.length > 0 ? (

          <div className="space-y-5">

            {pendingAssessments.map((a, idx) => (

              <div
                key={idx}
                className="
                  bg-[#faf7ff]
                  border
                  border-[#ebe4ff]
                  rounded-2xl
                  p-6
                  flex
                  items-center
                  justify-between
                "
              >

                <div>

                  <h4
                    className="
                      text-lg
                      font-black
                      text-black
                    "
                  >
                    Self Assessment
                  </h4>

                  <p
                    className="
                      text-[11px]
                      font-bold
                      uppercase
                      tracking-[0.2em]
                      text-[#7c3aed]
                      mt-2
                    "
                  >
                    {a.quarter}
                  </p>

                </div>

                <button
                  onClick={() =>
                    navigate('/verify')
                  }
                  className="
                    px-8
                    py-3
                    rounded-2xl
                    bg-gradient-to-r
                    from-[#a855f7]
                    to-[#7c3aed]
                    text-white
                    text-[11px]
                    font-black
                    uppercase
                    tracking-[0.2em]
                  "
                >
                  Start
                </button>

              </div>

            ))}

          </div>

        ) : (

          <div className="py-16 text-center">

            <AlertCircle
              size={44}
              className="
                mx-auto
                mb-5
                text-[#c4b5fd]
              "
            />

            <p
              className="
                text-[11px]
                font-black
                uppercase
                tracking-[0.25em]
                text-black/40
              "
            >
              No Pending Assessments
            </p>

          </div>

        )}

      </div>

    </div>

  );

}