import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Download, ExternalLink, Award, Briefcase, GraduationCap, BookOpen,
  Mail, Linkedin, Github, ChevronUp, Sun, Moon
} from 'lucide-react';
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';

/* ---------- Types ---------- */
type Paper = {
  id: number;
  title: string;
  type: string;
  status: string;
  year: string;
  abstract: string;
  methodology: string[];
  keywords: string[];
  software: string[];
  pdfLink?: string;
  status_color: 'amber' | 'blue';
};

type TimelineItem = {
  title: string;
  institution: string;
  period: string;
  details?: string[];
  icon: React.ComponentType<{ className?: string }>;
  color: 'sky' | 'emerald' | 'purple';
};

type TimelineSection = {
  category: string;
  items: TimelineItem[];
};

/* ---------- Static Tailwind class maps (avoid JIT purge) ---------- */
const statusBadge: Record<Paper['status_color'], string> = {
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  blue:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};
const dotColor: Record<TimelineItem['color'], string> = {
  sky:     'bg-sky-500',
  emerald: 'bg-emerald-500',
  purple:  'bg-purple-500',
};
/* ---------- Micro components ---------- */
const BackgroundFX: React.FC = () => (
  <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-pattern"></div>
);

const ScrollProgress: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.2 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed left-0 right-0 top-0 h-1 origin-left z-[60] bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400"
    />
  );
};

const AnimatedSection: React.FC<{ id?: string; className?: string; children: React.ReactNode }> = ({ id, className, children }) => (
  <motion.section
    id={id}
    className={className}
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-100px' }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
  >
    {children}
  </motion.section>
);

/* ---------- Main ---------- */
const EconomicsPortfolio: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    } catch { return false; }
  });
  const [showBackTop, setShowBackTop] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const themeTimer = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isAppReady, setIsAppReady] = useState(false);
  /* Theme class on <html> */
  useEffect(() => {
    const root = document.documentElement;
    try {
      if (isDark) { root.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
      else { root.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
    } catch {}
  }, [isDark]);

  useEffect(() => {
    if (isAppReady) {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('no-transitions');
      });
    }
  }, [isAppReady]);

  /* Hash deep-linking */
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  /* Throttled scroll for back-to-top */
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setShowBackTop(window.scrollY > 300);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleThemeSmooth = () => {
  const root = document.documentElement;

  // cancel any previous timer
  if (themeTimer.current) window.clearTimeout(themeTimer.current);

  // turn on temporary transitions
  root.classList.add('theme-animating');

  // flip theme state (this triggers your existing useEffect that adds/removes .dark and saves to localStorage)
  setIsDark(prev => !prev);

  // remove transition class after it finishes
  themeTimer.current = window.setTimeout(() => {
    root.classList.remove('theme-animating');
    themeTimer.current = null;
  }, 400); // keep this in sync with the .35s CSS above
};
// Smooth app loader: progress until window.onload + fonts ready + min delay
useEffect(() => {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  let interval: number | null = null;
  // If the page has already finished loading when the effect runs, mark it now:
  let onloadFired = document.readyState === 'complete';
  // If Font Loading API unsupported, treat as ready:
  let fontsReady = !('fonts' in document);
  // Respect reduced motion: skip minimum delay
  let minDelayDone = reduceMotion;

  const MIN_DELAY = 600;   // ms - feels intentional
  const HARD_TIMEOUT = 5000; // ms - safety valve in case events never fire

  const clearAll = () => {
    if (interval) window.clearInterval(interval);
    window.removeEventListener('load', onLoad);
    window.clearTimeout(minTimer);
    window.clearTimeout(hardTimer);
  };

  const maybeFinish = () => {
    if (onloadFired && fontsReady && minDelayDone) {
      clearAll();
      setProgress(100);
      // Let bar visually reach 100% before hiding overlay
      window.setTimeout(() => setIsAppReady(true), 200);
    }
  };

  // 1) Progress tick up to ~95%
  interval = window.setInterval(() => {
    setProgress(p => Math.min(95, p + (reduceMotion ? 20 : (Math.random() * 7 + 3))));
  }, reduceMotion ? 120 : 180);

  // 2) Fonts
  try {
    (document as any).fonts?.ready
      ?.then(() => { fontsReady = true; maybeFinish(); })
      ?.catch(() => { fontsReady = true; maybeFinish(); });
  } catch {
    fontsReady = true; maybeFinish();
  }

  // 3) Window load
  const onLoad = () => { onloadFired = true; maybeFinish(); };
  window.addEventListener('load', onLoad);

  // 4) Minimum display time
  const minTimer = window.setTimeout(() => { minDelayDone = true; maybeFinish(); }, MIN_DELAY);

  // 5) Hard fallback so it never blocks
  const hardTimer = window.setTimeout(() => {
    onloadFired = true; fontsReady = true; minDelayDone = true; maybeFinish();
  }, HARD_TIMEOUT);

  return clearAll;
}, []);
useEffect(() => {
  if (isAppReady) {
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('no-transitions');
    });
  }
}, [isAppReady]);
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  /* ---------- Data ---------- */
  const papers: Paper[] = [
    {
      id: 1,
      title: "The Effect of Board of Directors Network on Firm Performance: Evidence from Tehran Stock Exchange",
      type: "Master's Thesis",
      status: "In Progress (Journal Paper)",
      year: "2025",
      abstract:
        "Investigates how board network structure affects firm performance using comprehensive data from Tehran Stock Exchange (2016-2024). Employs network centrality measures and dynamic panel methods to identify causal effects, finding that director connections improve performance primarily in firms with dispersed ownership. Provides new evidence on corporate governance mechanisms in emerging markets.",
      methodology: ["Network Analysis", "Panel Data", "System GMM"],
      keywords: ["Corporate Governance", "Board Networks", "Firm Performance", "Tehran Stock Exchange", "Emerging Markets"],
      software: ["Python", "Stata", "NetworkX"],
      pdfLink: "/assets/board_of_directors_sample_eng.pdf",
      status_color: "amber"
    }
  ];

  const timeline: TimelineSection[] = [
    {
      category: "Education",
      items: [
        {
          title: "M.Sc. in Economics",
          institution: "Sharif University of Technology",
          period: "Sep 2022 – Mar 2025",
          details: [
            "Thesis: The Effect of Board of Directors Network on Firm Performance. - Supervisor: Dr. Farshad Fatemi Ardestani",
            "Selected Coursework: Microeconomic Theory I, Econometrics I, Applied Econometrics, Industrial Organization, Macroeconomic Theory I, Corporate Finance I-II, Environmental Economics"
          ],
          icon: GraduationCap,
          color: "sky"
        },
        {
          title: "B.Sc. in Electrical Engineering(Control)",
          institution: "Isfahan University of Technology",
          period: "Oct 2017 – Sep 2021",
          details: [
            "Final Project: Bitcoin Price Prediction by LSTM Neural Network - Advisor: Dr. Maryam Zekri",
            "Selected Coursework: Calculus I-II, Linear Algebra, Probability & Statistics, Regression Analysis, Partial Differential Equations, Engineering Mathematics"
          ],
          icon: GraduationCap,
          color: "sky"
        }
      ]
    },
    {
      category: "Research Experience",
      items: [
        {
          title: "Research Assistant",
          institution: "Research Center of Islamic Legislative Assembly, Tehran, Iran",
          period: "2023",
          details: [
            "Conducted empirical analysis of Iranian labor market data to inform minimum wage policy recommendations for national legislative body",
            "Analyzed household expenditure surveys and employment statistics using panel data methods to estimate poverty thresholds and cost-of-living adjustments"
          ],
          icon: BookOpen,
          color: "emerald"
        }
      ]
    },
    {
      category: "Teaching Experience",
      items: [
        {
          title: "Teaching Assistant - Introductory Econometrics(Undergraduate)",
          institution: "Sharif University of Technology",
          period: "Spring 2025",
          details: [
            "Assisted in Undergraduate Econometrics",
            "Held weekly tutorial sessions on Stata and regression analysis",
            "Graded assignments and provided feedback to students"
          ],
          icon: Briefcase,
          color: "purple"
        }
      ]
    }
  ];

  /* ---------- Accessible modal with animation ---------- */
const Modal: React.FC<{ paper: Paper | null; onClose: () => void }> = ({ paper, onClose }) => {
  // Keep scroll locking
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!paper) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}                 // <— fade out on close
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}               // <— backdrop fades out
        transition={{ duration: 0.2, ease: 'easeOut' }}
      />

      {/* Dialog panel */}
      <motion.div
        className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}  // <— symmetric close
        transition={{ duration: 0.2, ease: 'easeOut' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paper-title"
      >
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-700 p-6 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 id="paper-title" className="text-2xl font-bold text-slate-900 dark:text-white">{paper.title}</h3>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{paper.type}</span>
                <span className={`px-2 py-1 rounded-full ${statusBadge[paper.status_color]}`}>{paper.status}</span>
                <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{paper.year}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Abstract</h4>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{paper.abstract}</p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Methodology</h4>
            <div className="flex flex-wrap gap-2">
              {paper.methodology.map((m, i) => (
                <span key={i} className="text-sm px-3 py-1 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300">
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Keywords</h4>
            <div className="flex flex-wrap gap-2">
              {paper.keywords.map((k, i) => (
                <span key={i} className="text-sm px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {k}
                </span>
              ))}
            </div>
          </div>

          {paper.pdfLink && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <a href={paper.pdfLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                Download Paper
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
const LoaderOverlay: React.FC<{ progress: number }> = ({ progress }) => (
  <motion.div
    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-50 dark:bg-slate-900"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    {/* Optional gradient/noise layer if you have .bg-pattern */}
    <div aria-hidden className="absolute inset-0 bg-pattern opacity-60 pointer-events-none" />

    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative flex flex-col items-center gap-6 px-6"
    >
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-800" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent">
          <div className="absolute inset-0 rounded-full border-4 border-sky-500 border-t-transparent animate-spin-slow" />
        </div>
      </div>

      <h1 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white">
        Loading Website…
      </h1>

      <div className="w-64 max-w-[80vw] h-2 rounded-full bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400"
          initial={{ width: '0%' }}
          animate={{ width: `${Math.round(progress)}%` }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      </div>

      <div className="text-xs text-slate-500">{Math.round(progress)}%</div>
    </motion.div>
  </motion.div>
);

  return (
    <div className="min-h-screen">
      {/* FX layers */}
      <BackgroundFX />
      <ScrollProgress />
      {/* Loader overlay on top */}
      <AnimatePresence initial={false} mode="wait">
        {!isAppReady && <LoaderOverlay progress={progress} />}
      </AnimatePresence>
      <div className="bg-slate-50/90 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100">
        {/* Navigation */}
        <nav className="sticky top-0 z-40 backdrop-blur bg-white/70 dark:bg-slate-900/80 border-b border-slate-200/70 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="#home" onClick={(e) => scrollToSection(e, 'home')} className="text-sm font-semibold tracking-wide uppercase">Mohammad Mehdi Pakravan</a>
            <div className="flex items-center gap-6">
              <a href="#research" onClick={(e) => scrollToSection(e, 'research')} className="text-sm hover:text-sky-600 hidden md:block">Research</a>
              <a href="#about" onClick={(e) => scrollToSection(e, 'about')} className="text-sm hover:text-sky-600 hidden md:block">About</a>
              <a href="#cv" onClick={(e) => scrollToSection(e, 'cv')} className="text-sm hover:text-sky-600 hidden md:block">CV</a>
              <a href="#contact" onClick={(e) => scrollToSection(e, 'contact')} className="text-sm hover:text-sky-600 hidden md:block">Contact</a>
              <button
                onClick={toggleThemeSmooth}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                <span className="inline-block">{isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <AnimatedSection id="home" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7">
              <p className="text-xs uppercase tracking-widest text-slate-500">Interested in Economics</p>
              <h1 className="mt-3 text-4xl md:text-6xl font-extrabold leading-tight">Mohammad Mehdi Pakravan</h1>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl">
                M.Sc. in Economics from Sharif University of Technology, specializing in Industrial Organizations, Corporate Governance, Network Analysis, and Applied Econometrics. Currently working on board of directors networks and firm performance in emerging markets.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#research" className="inline-flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white px-4 py-2">
                  <FileText className="w-4 h-4" />
                  View Research
                </a>
                <a href="mailto:pakravanmohammad.eco@gmail.com" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Mail className="w-4 h-4" />
                  Email Me
                </a>
                <a href="#" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Download className="w-4 h-4" />
                  Download CV
                </a>
              </div>
            </div>

            <div className="md:col-span-5">
              <div className="relative">
                <div className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-2xl">
                  <img
                    src="/assets/images/my-pic-no.png"
                    alt="Mohammad Mehdi Pakravan"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Research */}
        <AnimatedSection id="research" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Research & Publications</h2>
          </div>

          <div className="grid gap-6">
            {papers.map((paper) => (
              <motion.article
                key={paper.id}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, mass: 0.6 }}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-6 shadow-sm hover:shadow-lg cursor-pointer"
                onClick={() => setSelectedPaper(paper)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-sky-500 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white group-hover:text-sky-600">
                          {paper.title}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {paper.type}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${statusBadge[paper.status_color]}`}>
                            {paper.status}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {paper.year}
                          </span>
                        </div>
                        <p className="mt-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                          {paper.abstract.substring(0, 280)}…
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {paper.methodology.slice(0, 3).map((m, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-sky-500 flex-shrink-0" aria-hidden="true" />
                </div>
              </motion.article>
            ))}
          </div>

          <div className="mt-8 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              💡 Click on any paper to view full abstract, methodology, and download options
            </p>
          </div>
        </AnimatedSection>

        {/* About */}
        <AnimatedSection id="about" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold">About</h2>
          <div className="mt-6 grid md:grid-cols-12 gap-8">
            <div className="md:col-span-7 space-y-4 text-slate-700 dark:text-slate-300">
              <p>
                I recently completed my Master's degree in Economics at Sharif University of Technology, where I specialized in corporate governance and network analysis. My thesis examines how board of directors' network structures influence firm performance in the Tehran Stock Exchange.
              </p>
              <p>
                My research interests lie at the intersection of corporate finance, network economics, and applied econometrics. I am particularly interested in understanding how social networks and relationships between corporate decision-makers affect economic outcomes in emerging markets.
              </p>
              <p>
                I am currently preparing my thesis for journal publication and exploring opportunities for PhD studies in Economics, Finance, or related fields.
              </p>
              <p className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <strong>Technical Skills:</strong> Python, Stata, EViews, R<br />
                <strong>Languages:</strong> Persian (native), English (fluent)
              </p>
            </div>
            <aside className="md:col-span-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 bg-white/90 dark:bg-slate-900/80">
                <h3 className="font-semibold flex items-center gap-2">
                  <Award className="w-5 h-5 text-sky-500" />
                  Research Interests
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li>• Corporate Governance</li>
                  <li>• Industrial Organizations</li>
                  <li>• Social Network Analysis</li>
                  <li>• Applied Econometrics</li>
                </ul>
              </div>
            </aside>
          </div>
        </AnimatedSection>

        {/* Skills */}
        <AnimatedSection id="skills" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold">Technical Skills</h2>
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            {Object.entries({
              "Econometric Software": ["Stata (Advanced)", "Python (Pandas, NumPy, Statsmodels)", "R (Basic)", "EViews"],
              "Data Analysis & Visualization": ["Network Analysis (NetworkX, igraph)", "Data Cleaning & Wrangling", "Statistical Modeling", "Visualization (Matplotlib, Seaborn)"],
              "Research Methods": ["Panel Data Analysis", "Time Series Analysis", "Social Network Analysis", "Causal Inference (DID, IV)"]
            }).map(([category, items]) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 bg-white/90 dark:bg-slate-900/80"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white">{category}</h3>
                <ul className="mt-3 space-y-2 text-slate-700 dark:text-slate-300">
                  {(items as string[]).map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-sky-500 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>

        {/* CV */}
        <AnimatedSection id="cv" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold">Curriculum Vitae</h2>
          <div className="mt-8 grid md:grid-cols-12 gap-8">
            <div className="md:col-span-8">
              {[
                ...timeline
              ].map((section, idx) => (
                <div key={idx} className="mb-8">
                  <div className="sticky top-20 z-10 mb-4 py-2 px-4 -ml-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-full inline-block">
                    <h3 className="text-sm font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
                      {section.category}
                    </h3>
                  </div>
                  <div className="space-y-6 border-l-2 border-slate-200 dark:border-slate-700 pl-6 ml-2">
                    {section.items.map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          className="relative"
                        >
                          <div className={`absolute -left-[1.875rem] w-9 h-9 rounded-full ${dotColor[item.color]} flex items-center justify-center`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 p-4">
                            <h4 className="font-semibold text-slate-900 dark:text-white">{item.title}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{item.institution}</p>
                            <p className="text-xs text-slate-500 mt-1">{item.period}</p>
                            {item.details && (
                              <ul className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                                {item.details.map((detail, j) => (
                                  <li key={j} className="flex items-start gap-2">
                                    <span className="text-sky-500 mt-1">•</span>
                                    <span>{detail}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <aside className="md:col-span-4">
          {/* Make THIS wrapper sticky, not the individual cards */}
          <div className="md:sticky md:top-20 md:z-10 space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 bg-white/90 dark:bg-slate-900/80">
              <h3 className="font-semibold flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Awards & Honors
              </h3>
              <ul className="mt-3 text-sm space-y-2 text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500" aria-hidden="true">•</span>
                  <span>Merit-Based Full Tuition Scholarship, Sharif University of Technology Sep 2022–Mar 2025</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500" aria-hidden="true">•</span>
                  <span>Ranked 22<sup>nd</sup> out of 5,000 (Top 0.4%), Iranian National Graduate Entrance Exam May – 2022</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 bg-white/90 dark:bg-slate-900/80">
              <h3 className="font-semibold mb-3">Download CV</h3>
              <a
                href="/assets/cv-1.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:opacity-90"
              >
                <Download className="w-4 h-4" />
                CV (PDF)
              </a>
            </div>
          </div>
        </aside>
          </div>
        </AnimatedSection>

        {/* Contact */}
        <AnimatedSection id="contact" className="scroll-mt-24 max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold">Contact</h2>
          <div className="mt-6 grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-3 text-slate-700 dark:text-slate-300">
              <p>
                I am actively seeking PhD opportunities in Economics, Finance, or related fields. Feel free to reach out for research collaboration or academic discussions.
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-500" aria-hidden="true" />
                <a href="mailto:pakravanmohammad.eco@gmail.com" className="underline">pakravanmohammad.eco@gmail.com</a>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-4 h-4 text-sky-500" aria-hidden="true">📍</span>
                Isfahan, Iran · Open to relocation
              </p>
            </div>
            <div className="md:col-span-5">
              <div className="flex flex-wrap gap-3">
                <a href="https://www.linkedin.com/in/mohammad-pak" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </a>
                <a href="https://github.com/pakravanmohammadmehdi" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Footer */}
        <footer className="max-w-6xl mx-auto px-4 py-10 text-sm text-slate-500 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} Made with ❤️ by Mohammad Mehdi Pakravan. All rights reserved.</p>
            <p><a href="mailto:pakravanmohammad.eco@gmail.com" className="underline">pakravanmohammad.eco@gmail.com</a></p>
          </div>
        </footer>

        {/* Back to Top */}
        {showBackTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 p-3 rounded-full bg-sky-500 text-white shadow-lg hover:bg-sky-600 z-50"
            aria-label="Back to top"
            title="Back to top"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
        )}

        {/* Modal */}
        <AnimatePresence>
        {selectedPaper && (
          <Modal
            key={selectedPaper.id}
            paper={selectedPaper}
            onClose={() => setSelectedPaper(null)}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default EconomicsPortfolio;
