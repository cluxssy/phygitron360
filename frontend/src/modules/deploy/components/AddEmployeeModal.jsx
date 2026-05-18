import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

const ROLES = ['org_admin', 'manager', 'employee', 'candidate'];

export default function AddEmployeeModal({ onClose, onSuccess }) {

  const [step, setStep] = useState(1);

  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    code: '',
    name: '',
    email: '',
    dob: '',
    phone: '',
    emergency: '',
    doj: '',
    team: '',
    role: 'employee',
    type: 'Full-time',
    manager: '',
    location: '',
    designation: '',
    current_address: '',
    permanent_address: '',
    pf: 'No',
    mediclaim: 'No',
    notes: '',
    primary_skillset: '',
    secondary_skillset: '',
    experience_years: '',
  });

  const set = (k, v) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const submit = async () => {

    setSubmitting(true);

    try {

      const fd = new FormData();

      Object.entries(form).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });

      const res = await fetch('/api/employee', {
        method: 'POST',
        credentials: 'include',
        body: fd
      });

      const data = await res.json();

      if (!res.ok)
        throw new Error(data.detail || 'Failed');

      toast.success(data.message || 'Employee added');

      if (data.login_credentials) {

        const {
          username,
          temporary_password
        } = data.login_credentials;

        toast.success(
          `Login: ${username} / ${temporary_password}`,
          { duration: 10000 }
        );
      }

      onSuccess();

    } catch (e) {

      toast.error(
        e.message || 'Something went wrong'
      );

    } finally {

      setSubmitting(false);

    }
  };

  const Field = ({
    label,
    k,
    type = 'text',
    options
  }) => (

    <div>

      <label
        className="
          text-[10px]
          font-black
          uppercase
          tracking-[0.22em]
          text-[#8b5cf6]
          block
          mb-3
        "
      >
        {label}
      </label>

      {options ? (

        <select
          value={form[k]}
          onChange={e => set(k, e.target.value)}
          className="
            w-full
            rounded-2xl
            border
            border-[#e8defc]
            bg-[#f8f5ff]
            text-black
            text-[13px]
            font-semibold
            px-5
            py-4
            focus:outline-none
            focus:border-[#b78cff]
            transition-all
          "
        >

          {options.map(o => (

            <option
              key={o}
              value={o}
            >
              {o}
            </option>

          ))}

        </select>

      ) : (

        <input
          type={type}
          value={form[k]}
          onChange={e => set(k, e.target.value)}
          className="
            w-full
            rounded-2xl
            border
            border-[#e8defc]
            bg-white
            text-black
            text-[13px]
            px-5
            py-4
            focus:outline-none
            focus:border-[#b78cff]
            transition-all
            placeholder:text-[#b0a8c5]
          "
        />

      )}

    </div>
  );

  return (

    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/40
        backdrop-blur-md
        p-5
      "
      onClick={onClose}
    >

      <div
        className="
          relative
          w-full
          max-w-3xl
          max-h-[92vh]
          overflow-y-auto
          rounded-[2.8rem]
          border
          border-[#ece3ff]
          bg-[#fcfbff]
          shadow-[0_30px_100px_rgba(180,140,255,0.18)]
          p-12
          custom-scrollbar
          animate-fade-in-up
        "
        onClick={e => e.stopPropagation()}
      >

        {/* CLOSE */}

        <button
          onClick={onClose}
          className="
            absolute
            top-7
            right-7
            w-11
            h-11
            rounded-2xl
            bg-[#f5f1ff]
            border
            border-[#e7ddff]
            flex
            items-center
            justify-center
            hover:bg-[#ede6ff]
            transition-all
          "
        >
          <X
            size={18}
            className="text-black"
          />
        </button>

        {/* HEADER */}

        <div className="mb-10">

          <p
            className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.32em]
              text-[#8b5cf6]
              mb-3
            "
          >
            Employee Hub • Add Team Member
          </p>

          <h2
            className="
              text-5xl
              font-black
              tracking-tight
              text-black
              leading-none
            "
          >
            {
              step === 1
                ? 'Personal Details'
                : step === 2
                ? 'Work Assignment'
                : 'Skills & Benefits'
            }
          </h2>

          {/* STEP BAR */}

          <div className="flex gap-3 mt-8">

            {[1, 2, 3].map(s => (

              <div
                key={s}
                className={`
                  flex-1
                  h-2
                  rounded-full
                  transition-all
                  duration-300
                  ${
                    s <= step
                      ? 'bg-gradient-to-r from-[#c084fc] to-[#8b5cf6]'
                      : 'bg-[#ece7fa]'
                  }
                `}
              />

            ))}

          </div>

        </div>

        {/* CONTENT */}

        <div className="space-y-6">

          {step === 1 && (

            <div className="grid grid-cols-2 gap-6">

              <Field
                label="Employee ID *"
                k="code"
              />

              <Field
                label="Full Name *"
                k="name"
              />

              <Field
                label="Email Address *"
                k="email"
                type="email"
              />

              <Field
                label="Phone Number *"
                k="phone"
              />

              <Field
                label="Date of Birth *"
                k="dob"
                type="date"
              />

              <Field
                label="Emergency Contact"
                k="emergency"
              />

            </div>

          )}

          {step === 2 && (

            <div className="grid grid-cols-2 gap-6">

              <Field
                label="Joining Date *"
                k="doj"
                type="date"
              />

              <Field
                label="Department *"
                k="team"
              />

              <Field
                label="Job Title *"
                k="designation"
              />

              <Field
                label="Reporting Manager"
                k="manager"
              />

              <Field
                label="Work Location *"
                k="location"
              />

              <Field
                label="Employment Type"
                k="type"
                options={[
                  'Full-time',
                  'Part-time',
                  'Contract',
                  'Intern'
                ]}
              />

              <Field
                label="System Access Role"
                k="role"
                options={ROLES}
              />

            </div>

          )}

          {step === 3 && (

            <div className="grid grid-cols-2 gap-6">

              <Field
                label="Primary Skills"
                k="primary_skillset"
              />

              <Field
                label="Secondary Skills"
                k="secondary_skillset"
              />

              <Field
                label="Experience (Years)"
                k="experience_years"
                type="number"
              />

              <Field
                label="PF Enabled"
                k="pf"
                options={['No', 'Yes']}
              />

              <Field
                label="Mediclaim Enabled"
                k="mediclaim"
                options={['No', 'Yes']}
              />

              <div className="col-span-2">

                <label
                  className="
                    text-[10px]
                    font-black
                    uppercase
                    tracking-[0.22em]
                    text-[#8b5cf6]
                    block
                    mb-3
                  "
                >
                  Additional Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={e =>
                    set('notes', e.target.value)
                  }
                  rows={4}
                  className="
                    w-full
                    rounded-2xl
                    border
                    border-[#e8defc]
                    bg-white
                    text-black
                    text-[13px]
                    px-5
                    py-4
                    focus:outline-none
                    focus:border-[#b78cff]
                    resize-none
                  "
                />

              </div>

            </div>

          )}

        </div>

        {/* FOOTER BUTTONS */}

        <div className="flex gap-5 mt-10">

          {step > 1 && (

            <button
              onClick={() =>
                setStep(s => s - 1)
              }
              className="
                flex-1
                py-4
                rounded-2xl
                border
                border-[#e8defc]
                bg-white
                text-black
                text-[11px]
                font-black
                uppercase
                tracking-[0.25em]
                hover:bg-[#f5f1ff]
                transition-all
              "
            >
              Back
            </button>

          )}

          {step < 3 ? (

            <button
              onClick={() =>
                setStep(s => s + 1)
              }
              className="
                flex-1
                py-4
                rounded-2xl
                bg-gradient-to-r
                from-[#c084fc]
                to-[#8b5cf6]
                text-white
                text-[11px]
                font-black
                uppercase
                tracking-[0.25em]
                shadow-[0_12px_30px_rgba(180,140,255,0.28)]
                hover:scale-[1.01]
                transition-all
              "
            >
              Continue
            </button>

          ) : (

            <button
              onClick={submit}
              disabled={submitting}
              className="
                flex-1
                py-4
                rounded-2xl
                bg-gradient-to-r
                from-[#c084fc]
                to-[#8b5cf6]
                text-white
                text-[11px]
                font-black
                uppercase
                tracking-[0.25em]
                shadow-[0_12px_30px_rgba(180,140,255,0.28)]
                hover:scale-[1.01]
                transition-all
                disabled:opacity-50
              "
            >
              {
                submitting
                  ? 'Adding Employee...'
                  : 'Add Employee'
              }
            </button>

          )}

        </div>

      </div>

    </div>
  );
}