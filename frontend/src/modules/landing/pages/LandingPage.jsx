import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Box, Brain, CheckCircle, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const modules = [
  {
    title: 'PHYGITRON Source',
    description: 'AI-driven candidate sourcing, resume intake, and skill graph generation.',
    icon: <Database className="w-8 h-8 text-indigo-400" />,
    color: 'border-indigo-500/30 bg-indigo-500/10'
  },
  {
    title: 'PHYGITRON Forge',
    description: 'Personalized upskilling, LMS, and dynamic learning paths.',
    icon: <Brain className="w-8 h-8 text-fuchsia-400" />,
    color: 'border-fuchsia-500/30 bg-fuchsia-500/10'
  },
  {
    title: 'PHYGITRON Verify',
    description: 'Proof-based skill verification, live proctoring, and blockchain-ready certs.',
    icon: <CheckCircle className="w-8 h-8 text-emerald-400" />,
    color: 'border-emerald-500/30 bg-emerald-500/10'
  },
  {
    title: 'PHYGITRON Deploy',
    description: 'HR Management, compliance, payroll ops, and deployment matching.',
    icon: <Box className="w-8 h-8 text-amber-400" />,
    color: 'border-amber-500/30 bg-amber-500/10'
  }
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-black text-white overflow-hidden relative font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-brand-purple/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[150px] mix-blend-screen animate-pulse delay-700" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full border-2 border-brand-purple flex items-center justify-center bg-black">
            {/* Logo placeholder */}
            <span className="font-bold text-lg text-brand-purple">P3</span>
          </div>
          <span className="font-bold text-xl tracking-tight">PHYGITRON <span className="text-gray-400 font-light">360</span></span>
        </div>
        <div className="flex items-center gap-6">
          <button className="text-sm font-medium text-gray-300 hover:text-white transition">Features</button>
          <button className="text-sm font-medium text-gray-300 hover:text-white transition">Pricing</button>
          <button 
            onClick={() => navigate('/login')}
            className="px-5 py-2 rounded-full border border-gray-700 hover:border-gray-500 hover:bg-white/5 transition text-sm font-medium"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6 pt-32 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand-purple/30 bg-brand-purple/10 text-brand-purple text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-purple animate-ping" />
            The Unified Talent OS
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[1.1]">
            Source. Built. <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-indigo-400">
              Verified. Deployed.
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            An end-to-end AI-driven talent lifecycle platform with complete skill transparency and proof-based validation. Build your custom HR pipeline today.
          </p>

          <div className="flex justify-center gap-4">
            <button 
              onClick={() => navigate('/onboard')}
              className="px-8 py-4 rounded-full bg-brand-purple hover:bg-purple-600 text-white font-bold transition flex items-center gap-2 shadow-[0_0_30px_rgba(124,58,237,0.4)]"
            >
              Build Your Organization
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Modules Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-32 text-left"
        >
          {modules.map((mod, idx) => (
            <div 
              key={idx} 
              className={`p-6 rounded-2xl border backdrop-blur-sm transition-all hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-purple/10 cursor-pointer ${mod.color}`}
            >
              <div className="mb-4">{mod.icon}</div>
              <h3 className="text-xl font-bold mb-2">{mod.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{mod.description}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
