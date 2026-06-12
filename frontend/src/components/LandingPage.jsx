import React, { useRef } from 'react';

export default function LandingPage({ onLogin, onSignup }) {
  const aboutRef = useRef(null);

  const scrollToAbout = () => {
    aboutRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo placeholder */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-200">
              <span className="text-white text-base">🚀</span>
            </div>
            <span className="text-xl font-extrabold text-indigo-600 tracking-tight">Velocity</span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-2">
            <button
              onClick={scrollToAbout}
              className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors rounded-lg hover:bg-slate-50"
            >
              About
            </button>
            <button
              onClick={onLogin}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
            >
              Log In
            </button>
            <button
              onClick={onSignup}
              className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-200"
            >
              Sign Up Free
            </button>
          </div>

        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-16">
        <div className="max-w-3xl mx-auto text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-bold px-4 py-1.5 rounded-full border border-indigo-100 mb-8 tracking-wide uppercase">
            <span>✨</span> Smart Task Management
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight mb-6">
            Your tasks,{' '}
            <span className="text-indigo-600">finally</span>{' '}
            under control.
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-slate-500 font-medium leading-relaxed mb-10 max-w-xl mx-auto">
            Velocity keeps your day focused, your goals moving forward, and your mind completely clear.
          </p>

          {/* CTA Button */}
          <button
            onClick={onSignup}
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-200"
          >
            Get Started — It&apos;s Free
            <span className="text-lg">→</span>
          </button>

          <p className="text-xs text-slate-400 font-medium mt-4">No credit card required.</p>

          {/* Animation placeholder */}
          <div className="mt-16 w-full max-w-2xl mx-auto h-72 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center">
            <p className="text-slate-300 text-sm font-semibold tracking-wider uppercase">Animation coming soon</p>
          </div>

        </div>
      </section>

      {/* About Section */}
      <section ref={aboutRef} className="min-h-screen flex items-center justify-center px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold text-slate-800 mb-6 tracking-tight">About Velocity</h2>
          <p className="text-slate-400 text-lg font-medium leading-relaxed">
            {/* Placeholder — user will fill this in */}
            Your description goes here.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6 text-center bg-white">
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          Designed & Developed by Gilad Amir 2026 ©
        </p>
      </footer>

    </div>
  );
}
