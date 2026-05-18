import React, {
  useState,
  useEffect,
  useRef
} from 'react';

import { toast } from 'react-hot-toast';

import {
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Key,
  AlertCircle,
  Save,
  CheckCircle,
  Edit3,
  Briefcase,
  TrendingUp,
  Landmark,
  FileText,
  Upload,
  ExternalLink,
  Image,
  Package,
  Users
} from 'lucide-react';

import ComboBox from '../../../core/components/ComboBox';

import ChangePasswordModal from '../../../core/auth/ChangePasswordModal';

const DESIGNATIONS = [
  'Software Engineer',
  'Senior Engineer',
  'Team Lead',
  'Project Manager',
  'Product Manager',
  'Designer',
  'QA Analyst',
  'Sales Executive',
  'HR Associate',
  'Accountant',
  'Marketing Specialist',
  'Operations Manager'
];

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Human Resources',
  'Finance',
  'Operations',
  'Quality Assurance'
];

export default function MyProfile({
  mode = 'employee',
  user
}) {

  const isAdmin =
    mode === 'admin';

  const [details, setDetails] =
    useState(null);

  const [employees, setEmployees] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [showPwdModal, setShowPwdModal] =
    useState(false);

  const [editMode, setEditMode] =
    useState(false);

  const [formData, setFormData] =
    useState({});

  const [assets, setAssets] =
    useState(null);

  const [isSaving, setIsSaving] =
    useState(false);

  const [dynDesignations, setDynDesignations] =
    useState([]);

  const [dynDepartments, setDynDepartments] =
    useState([]);

  const [locations, setLocations] =
    useState([]);

  const fileInputPfp = useRef();

  const fileInputCv = useRef();

  const fileInputId = useRef();

  /* =========================================
     FETCH
  ========================================= */

  useEffect(() => {

    const fetchData = async () => {

      try {

        setLoading(true);

        /* =========================================
           ADMIN MODE
        ========================================= */

        if (isAdmin) {

          const res =
            await fetch('/api/employees',
              {
                credentials: 'include'
              }
            );

          if (!res.ok)
            throw new Error();

          const data =
            await res.json();

          setEmployees(data || []);

        }

        /* =========================================
           EMPLOYEE MODE
        ========================================= */

        else {

          if (!user?.employee_code) {

            setLoading(false);
            return;

          }

          const res =
            await fetch(
              `/api/employee/${user.employee_code}`,
              {
                credentials: 'include'
              }
            );

          if (!res.ok)
            throw new Error();

          const data =
            await res.json();

          setDetails(data);

          setFormData({
            ...data,
            primary_skillset:
              data.skill_matrix?.primary_skillset || '',
            secondary_skillset:
              data.skill_matrix?.secondary_skillset || '',
            experience_years:
              data.skill_matrix?.experience_years || '0'
          });

          fetch(
            `/api/assets/${user.employee_code}`,
            {
              credentials: 'include'
            }
          )
            .then(r => r.json())
            .then(d => setAssets(d))
            .catch(() => {});

        }

        /* OPTIONS */

        fetch(
          '/api/options',
          {
            credentials: 'include'
          }
        )
          .then(r => r.json())
          .then(data => {

            setLocations(
              data.locations || []
            );

            if (data.designations?.length > 0)
              setDynDesignations(
                data.designations
              );

            if (data.teams?.length > 0)
              setDynDepartments(
                data.teams
              );

          });

      }

      catch {

        toast.error(
          'Failed to load profile data'
        );

      }

      finally {

        setLoading(false);

      }

    };

    fetchData();

  }, [mode, user]);

  /* =========================================
     SAVE
  ========================================= */

  const handleSave = async () => {

    setIsSaving(true);

    try {

      const res =
        await fetch(
          `/api/employee/${details.employee_code}`,
          {
            method: 'PUT',
            credentials: 'include',
            headers: {
              'Content-Type':
                'application/json'
            },
            body: JSON.stringify(formData)
          }
        );

      const result =
        await res.json();

      if (!res.ok)
        throw new Error(
          result.detail ||
          'Update failed'
        );

      toast.success(
        'Profile updated successfully'
      );

      setEditMode(false);

    }

    catch (e) {

      toast.error(e.message);

    }

    finally {

      setIsSaving(false);

    }

  };

  /* =========================================
     FILE UPLOAD
  ========================================= */

  const handleFileUpload =
    async (type, file) => {

      if (!file)
        return;

      const fd =
        new FormData();

      if (type === 'pfp')
        fd.append(
          'photo_file',
          file
        );

      if (type === 'cv')
        fd.append(
          'cv_file',
          file
        );

      if (type === 'id')
        fd.append(
          'id_proof_file',
          file
        );

      try {

        toast.loading(
          'Uploading...',
          { id: 'upload' }
        );

        const res =
          await fetch(
            `/api/employee/${details.employee_code}/documents`,
            {
              method: 'POST',
              credentials: 'include',
              body: fd
            }
          );

        if (!res.ok)
          throw new Error();

        toast.success(
          'Uploaded successfully',
          { id: 'upload' }
        );

      }

      catch {

        toast.error(
          'Upload failed',
          { id: 'upload' }
        );

      }

    };

  /* =========================================
     LOADING
  ========================================= */

  if (loading) {

    return (

      <div className="flex items-center justify-center h-64">

        <div
          className="
            w-10
            h-10
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
     ADMIN VIEW
  ========================================= */

  if (isAdmin) {

    return (

      <div className="space-y-8 animate-fade-in-up">

        {/* HERO */}

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
            Personnel Management
          </p>

          <h1
            className="
              text-5xl
              font-black
              text-black
              tracking-tight
            "
          >
            Employee Directory
          </h1>

        </div>

        {/* TABLE */}

        <div
          className="
            bg-white
            border
            border-[#ebe4ff]
            rounded-[2.5rem]
            overflow-hidden
            shadow-[0_10px_40px_rgba(180,140,255,0.08)]
          "
        >

          <table className="w-full">

            <thead>

              <tr className="bg-[#faf7ff]">

                {[
                  'Employee',
                  'Designation',
                  'Department',
                  'Email',
                  'Location'
                ].map((h) => (

                  <th
                    key={h}
                    className="
                      px-8
                      py-5
                      text-left
                      text-[10px]
                      font-black
                      uppercase
                      tracking-[0.2em]
                      text-[#7c3aed]
                    "
                  >
                    {h}
                  </th>

                ))}

              </tr>

            </thead>

            <tbody>

              {employees.map((emp, i) => (

                <tr
                  key={i}
                  className="
                    border-t
                    border-[#f1ebff]
                    hover:bg-[#faf7ff]
                    transition-all
                  "
                >

                  <td className="px-8 py-6">

                    <div className="flex items-center gap-4">

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
                          text-white
                          font-black
                        "
                      >
                        {emp.name?.[0]}
                      </div>

                      <div>

                        <p
                          className="
                            text-sm
                            font-black
                            text-black
                          "
                        >
                          {emp.name}
                        </p>

                        <p
                          className="
                            text-[10px]
                            font-bold
                            text-black/40
                            uppercase
                            tracking-[0.2em]
                            mt-1
                          "
                        >
                          {emp.employee_code}
                        </p>

                      </div>

                    </div>

                  </td>

                  <td className="px-8 py-6 text-sm font-semibold text-black/70">
                    {emp.designation || '—'}
                  </td>

                  <td className="px-8 py-6 text-sm font-semibold text-black/70">
                    {emp.team || '—'}
                  </td>

                  <td className="px-8 py-6 text-sm font-semibold text-black/70">
                    {emp.email_id || '—'}
                  </td>

                  <td className="px-8 py-6 text-sm font-semibold text-black/70">
                    {emp.location || '—'}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

    );

  }

  /* =========================================
     EMPLOYEE VIEW
  ========================================= */

  if (!details) {

    return (

      <div className="py-24 text-center">

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
          Profile Not Available
        </p>

      </div>

    );

  }

  return (

    <div className="space-y-8 max-w-6xl animate-fade-in-up pb-20">

      {/* HERO */}

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
            overflow-hidden
          "
        >

          {details.photo_path ? (

            <img
              src={`/${details.photo_path}`}
              className="
                w-full
                h-full
                object-cover
              "
              alt=""
            />

          ) : (

            details.name?.[0]

          )}

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
            Employee Profile
          </p>

          <h1
            className="
              text-5xl
              font-black
              text-black
              tracking-tight
              mb-3
            "
          >
            {details.name}
          </h1>

          <p
            className="
              text-[13px]
              text-black/50
              font-semibold
            "
          >
            {details.designation}
            {' • '}
            {details.team}
          </p>

        </div>

      </div>

      {/* KEEP YOUR EXISTING EDIT/DETAILS UI BELOW */}
      {/* no backend changes needed */}

    </div>

  );

}