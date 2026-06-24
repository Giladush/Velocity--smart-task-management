import React, { useRef, useEffect, useState } from 'react';
import LavaBackground from './animations/LavaBackground';

function ScrollReveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(48px)',
        transition: `opacity 0.75s cubic-bezier(.2,.85,.25,1) ${delay}ms, transform 0.75s cubic-bezier(.2,.85,.25,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const SECTIONS = [
  {
    icon: '⚡',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-500',
    title: 'Meet Velocity — Your Smart Workspace',
    body: 'Welcome to Velocity, much more than just another to-do list. It is an intelligent system designed to declutter your day and centralize your task management, habit tracking, and project planning in one focused workspace. Our goal is to help you seamlessly master your daily grind with a clean interface that lets you manage everything—from small daily chores to complex, multi-step processes—without ever losing your way.',
    accent: 'bg-indigo-500',
  },
  {
    icon: '🎯',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-500',
    title: 'Flexibility That Fits Your Workflow',
    body: 'The true power of the system lies in its adaptability. You choose exactly how you want to work: whether through a visual Kanban board or a clean, organized list. You can set urgency levels, due dates, and custom tags, as well as create recurring routines that automatically appear on your scheduled days. To keep your motivation high, the system tracks your daily completion streaks, provides visual analytics of your progress, and syncs directly with Google Calendar to ensure nothing falls through the cracks.',
    accent: 'bg-violet-500',
  },
  {
    icon: '✨',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-500',
    title: 'Stride AI — Your Natural-Language Assistant',
    body: 'What truly makes Velocity smart and unique is our built-in AI agent. Instead of navigating menus and entering data manually, you can simply "talk" to the system in natural language. Give it a single sentence, and it knows how to create tasks, build entire multi-step processes, filter your board, or clear out old items. It can even pull your Gmail inbox on demand, surface only the urgent messages, and convert any email into a task with a single click. Beyond that, our smart assistant can review all your open tasks to provide warm, personalized advice and help you prioritize your workload effectively.',
    accent: 'bg-sky-500',
  },
  {
    icon: '☀️',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    title: 'Start Every Day on the Right Foot',
    body: 'Time management shouldn\'t be an exhausting chore. Every time you log into the app, you will be greeted with a personalized daily snapshot featuring a motivational quote, gathering exactly what matters today—your open tasks and active routines. We invite you to start working smarter, not harder, and let Velocity take your productivity to the next level.',
    accent: 'bg-amber-500',
  },
];

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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-200">
              <span className="text-white text-base">🚀</span>
            </div>
            <span className="text-xl font-extrabold text-indigo-600 tracking-tight">Velocity</span>
          </div>
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
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16 overflow-hidden">
        <LavaBackground palette="cool09" blur={32} speed={1.5} />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm text-indigo-600 text-xs font-bold px-4 py-1.5 rounded-full border border-indigo-100 mb-8 tracking-wide uppercase shadow-sm">
            <span>✨</span> Smart Task Management
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight mb-6">
            Your tasks,{' '}
            <span className="text-indigo-600">finally</span>{' '}
            under control.
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 font-medium leading-relaxed mb-10 max-w-xl mx-auto">
            Velocity keeps your day focused, your goals moving forward, and your mind completely clear.
          </p>
          <button
            onClick={onSignup}
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-2xl shadow-lg shadow-indigo-300 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-300"
          >
            Get Started — It&apos;s Free
            <span className="text-lg">→</span>
          </button>
          <p className="text-xs text-slate-500 font-medium mt-4">No credit card required.</p>
        </div>
      </section>

      {/* About Section — scroll-reveal paragraphs */}
      <section ref={aboutRef} className="bg-slate-50 border-t border-slate-100 py-4">

        {/* Section header */}
        <ScrollReveal>
          <div className="max-w-2xl mx-auto text-center pt-20 pb-4 px-6">
            <span className="inline-block text-xs font-bold tracking-widest text-indigo-400 uppercase mb-3">About</span>
            <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Everything you need.<br/>Nothing you don't.</h2>
          </div>
        </ScrollReveal>

        {/* Paragraphs */}
        <div className="max-w-2xl mx-auto px-6 pb-24 flex flex-col gap-0">
          {SECTIONS.map((s, i) => (
            <ScrollReveal key={i} delay={100}>
              <div className="flex gap-6 py-16 border-b border-slate-200 last:border-0">
                {/* Icon */}
                <div className={`shrink-0 w-12 h-12 rounded-2xl ${s.iconBg} flex items-center justify-center text-2xl mt-1 shadow-sm`}>
                  {s.icon}
                </div>
                {/* Text */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-1 h-5 rounded-full ${s.accent}`} />
                    <h3 className="text-lg font-bold text-slate-800">{s.title}</h3>
                  </div>
                  <p className="text-slate-500 text-base leading-relaxed font-medium">{s.body}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Bottom CTA */}
        <ScrollReveal delay={100}>
          <div className="text-center pb-24 px-6">
            <button
              onClick={onSignup}
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-200"
            >
              Start for Free
              <span className="text-lg">→</span>
            </button>
          </div>
        </ScrollReveal>

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
