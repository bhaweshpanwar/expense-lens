import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Receipt,
  Landmark,
  CalendarClock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  FileSpreadsheet,
  ScanLine,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lock,
  Building2,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Menu,
  X,
  Play
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Mobile menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Interactive ROI Calculator State
  const [monthlySpend, setMonthlySpend] = useState(500000); // 5 Lakhs default

  // Interactive Feature Playground Tab
  const [activeFeatureTab, setActiveFeatureTab] = useState('gst'); // 'gst', 'payables', 'vision', 'radar'

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  // Toggle Language
  const toggleLanguage = () => {
    const nextLang = i18n.language === 'hi' ? 'en' : 'hi';
    i18n.changeLanguage(nextLang);
  };

  // Calculations for ROI Slider
  const calculatedSavings = useMemo(() => {
    // 70% B2B registered spend at 18% avg GST
    const annualSpend = monthlySpend * 12;
    const estItcRecovered = Math.round(annualSpend * 0.70 * 0.18 * 0.25); // conservative 25% of ITC previously missed or unrecovered
    const lateFeesSaved = Math.round(annualSpend * 0.012); // ~1.2% saved on vendor late fees/interest
    const hoursSaved = 144; // 12 hrs/month saved on reconciliation
    const totalBenefit = estItcRecovered + lateFeesSaved;

    return {
      estItcRecovered,
      lateFeesSaved,
      hoursSaved,
      totalBenefit
    };
  }, [monthlySpend]);

  // Demo Aging Data for Interactive Chart
  const demoAgingData = [
    { bucket: '>90d Overdue', amount: 190000, type: 'critical' },
    { bucket: '61-90d', amount: 45000, type: 'critical' },
    { bucket: '31-60d', amount: 82000, type: 'warning' },
    { bucket: '1-30d', amount: 110000, type: 'warning' },
    { bucket: 'Due 0-15d', amount: 240000, type: 'upcoming' },
    { bucket: 'Due 16-30d', amount: 155000, type: 'upcoming' },
    { bucket: 'Due 31d+', amount: 320000, type: 'safe' }
  ];

  const faqs = [
    {
      q: "Does ExpenseLens require linking my live bank account or net banking password?",
      a: "No! ExpenseLens strictly respects your financial privacy. You never share bank passwords or net banking credentials. You simply upload invoices, scan physical paper bills, or track entries directly with complete data sovereignty."
    },
    {
      q: "How does the GST Section 17(5) blocked ITC engine work?",
      a: "Indian GST law (CGST Act Section 17(5)) disallows Input Tax Credit on certain business expenses like food & beverages, personal vehicles, and club memberships. ExpenseLens automatically tags these categories so you claim 100% of eligible B2B credit while preventing audit penalties from the tax department."
    },
    {
      q: "Can I export data directly for my Chartered Accountant (CA)?",
      a: "Yes! ExpenseLens generates RFC-4180 compliant GSTR-2B CSV exports in 1 click. Your CA receives exact columns for voucher IDs, vendor GSTINs, taxable amounts, CGST/SGST/IGST splits, and eligibility tags ready for direct filing."
    },
    {
      q: "How does the 'Udhaari' Credit Terms tracker help prevent cash crunches?",
      a: "Most MSMEs purchase materials on 15, 30, or 45-day credit terms. ExpenseLens visually displays upcoming liabilities on a 30-60-90 day aging schedule and provides proactive countdown alerts (e.g. 'Asian Paints bill due in 3 days') so you never default or suffer supply halts."
    },
    {
      q: "Can the AI scanner read Hindi or wrinkled paper bills?",
      a: "Yes. Our multimodal vision pipeline leverages state-of-the-art multimodal vision models trained on messy thermal receipts, phone camera shadows, and bilingual English-Hindi invoices, accurately extracting amounts, vendor names, and GST numbers."
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] selection:bg-[var(--color-brand)] selection:text-white">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--color-paper)]/90 border-b border-[var(--color-line)] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand)] text-white flex items-center justify-center font-bold text-lg shadow-md transition-transform group-hover:scale-105">
              EL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-[var(--color-ink)]">
                  ExpenseLens
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[var(--color-amber-light)] text-[var(--color-amber)] border border-[var(--color-amber)]/30">
                  MSME OS
                </span>
              </div>
              <p className="text-[10px] text-[var(--color-ink-soft)] font-medium hidden sm:block">
                AI Financial & Tax Intelligence
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-[var(--color-ink-soft)]">
            <a href="#features" className="hover:text-[var(--color-brand)] transition-colors">
              Pillars
            </a>
            <a href="#tax-engine" className="hover:text-[var(--color-brand)] transition-colors">
              GST Intelligence
            </a>
            <a href="#udhaari" className="hover:text-[var(--color-brand)] transition-colors">
              Udhaari Tracker
            </a>
            <a href="#vision-ai" className="hover:text-[var(--color-brand)] transition-colors">
              Vision AI
            </a>
            <a href="#calculator" className="hover:text-[var(--color-brand)] transition-colors">
              ROI Calculator
            </a>
            <a href="#faq" className="hover:text-[var(--color-brand)] transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs & Language Switcher */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleLanguage}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--color-line)] bg-white text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors shadow-2xs"
              title="Toggle Language"
            >
              {i18n.language === 'hi' ? 'EN' : 'हिन्दी'}
            </button>

            {isAuthenticated ? (
              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-dark)] transition-all shadow-sm hover:shadow"
              >
                <span>Go to Dashboard</span>
                <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] hover:text-[var(--color-brand)] transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-dark)] transition-all shadow-sm hover:shadow"
                >
                  <span>Start Free</span>
                  <ArrowRight size={14} />
                </Link>
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[var(--color-ink)] hover:bg-white md:hidden"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-4 space-y-3">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-[var(--color-ink)]"
            >
              Pillars & Solutions
            </a>
            <a
              href="#tax-engine"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-[var(--color-ink)]"
            >
              GST & Tax Intelligence
            </a>
            <a
              href="#udhaari"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-[var(--color-ink)]"
            >
              Accounts Payable (Udhaari)
            </a>
            <a
              href="#vision-ai"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-[var(--color-ink)]"
            >
              Vision AI Khata Scanner
            </a>
            <a
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-[var(--color-ink)]"
            >
              Savings Calculator
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-[var(--color-ink)]"
            >
              FAQ
            </a>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/login"
                className="w-full text-center py-2 text-xs font-semibold border border-[var(--color-line)] rounded-lg bg-white"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="w-full text-center py-2 text-xs font-semibold bg-[var(--color-brand)] text-white rounded-lg"
              >
                Start Free Account
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        {/* Subtle background mesh gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-[var(--color-brand-light)] to-[var(--color-amber-light)] opacity-60 blur-3xl pointer-events-none -z-10 rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Release Badge Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[var(--color-brand)]/20 bg-white/80 shadow-2xs backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[var(--color-good)] animate-ping" />
            <span className="w-2 h-2 rounded-full bg-[var(--color-good)] -ml-4" />
            <span className="text-xs font-bold text-[var(--color-brand)]">
              Pillar 2 Live: Accounts Payable & Credit Term Tracker
            </span>
            <ArrowRight size={12} className="text-[var(--color-brand)]" />
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-[var(--color-ink)] max-w-5xl mx-auto leading-[1.12]">
            Stop Losing Cash to Unclaimed GST &{' '}
            <span className="bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-amber)] bg-clip-text text-transparent">
              Forgotten Udhaari Due Dates.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-[var(--color-ink-soft)] max-w-3xl mx-auto leading-relaxed font-normal">
            ExpenseLens is the all-in-one AI Financial OS for Indian businesses. Scan crumpled paper receipts, recover lakhs in Section 17(5) Input Tax Credit (ITC), track 15-45 day vendor credit terms, and download CA-ready GSTR-2B audits in 1 click.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[var(--color-brand)] text-white text-sm font-bold hover:bg-[var(--color-brand-dark)] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
            >
              <span>Get Started Free</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>

            <a
              href="#interactive-demo"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-[var(--color-line)] bg-white text-[var(--color-ink)] text-sm font-semibold hover:bg-[var(--color-paper)] transition-all shadow-2xs flex items-center justify-center gap-2"
            >
              <Play size={14} className="text-[var(--color-amber)]" />
              <span>Explore Interactive Demo</span>
            </a>
          </div>

          {/* Micro Trust Proof */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-semibold text-[var(--color-ink-soft)]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-[var(--color-good)]" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-[var(--color-good)]" />
              <span>100% Indian CGST & SGST Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-[var(--color-good)]" />
              <span>Zero Bank Scraping (Total Privacy)</span>
            </div>
          </div>

          {/* 3. HERO MOCKUP CARD (FLOATING GLASS UI) */}
          <div className="pt-8 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-[var(--color-line)] bg-white p-4 sm:p-7 shadow-2xl space-y-6 text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-brand-light)] rounded-bl-full -z-0 opacity-50 pointer-events-none" />

              {/* Mockup Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--color-line)] gap-2 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="text-xs font-mono font-medium text-[var(--color-ink-soft)] ml-2">
                    ExpenseLens Executive Terminal • Sharma Hardware & Electricals
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-200">
                    Live System Active
                  </span>
                </div>
              </div>

              {/* 4 Mockup Snapshot Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
                <div className="p-3.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-soft)] block mb-1">
                    Total Spend Tracked
                  </span>
                  <div className="text-xl font-bold text-[var(--color-ink)]">₹49,67,300</div>
                  <span className="text-[10px] text-green-700 font-medium">401 Verified Invoices</span>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                    Eligible ITC Claimed
                  </span>
                  <div className="text-xl font-bold text-emerald-950">₹1,42,850</div>
                  <span className="text-[10px] text-emerald-700 font-medium">100% GSTR-2B Ready</span>
                </div>

                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block mb-1">
                    Pending Udhaari
                  </span>
                  <div className="text-xl font-bold text-rose-950">₹2,24,500</div>
                  <span className="text-[10px] text-rose-700 font-medium">4 Invoices Overdue</span>
                </div>

                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block mb-1">
                    Vision AI Accuracy
                  </span>
                  <div className="text-xl font-bold text-indigo-950">99.4%</div>
                  <span className="text-[10px] text-indigo-700 font-medium">NVIDIA Llama-3.2 Vision</span>
                </div>
              </div>

              {/* Mockup Dual View: Scanned Bill + Udhaari Alert */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 relative z-10">
                {/* Mini Scanned Invoice Preview */}
                <div className="p-4 rounded-xl border border-[var(--color-line)] bg-white space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                      <ScanLine size={14} className="text-[var(--color-brand)]" />
                      Multimodal Receipt Scan Output
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-ink-soft)]">INV-98421</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--color-paper)] space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-ink-soft)]">Vendor:</span>
                      <span className="font-semibold">Indore Electronics Hub</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-ink-soft)]">GSTIN:</span>
                      <span className="font-mono text-[11px] font-semibold text-emerald-700">23AACCI1234A1Z8 (Verified)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-ink-soft)]">Taxable Amount:</span>
                      <span>₹25,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-ink-soft)]">18% GST (CGST+SGST):</span>
                      <span className="font-semibold">₹4,500.00</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[var(--color-line)] font-bold">
                      <span>Total Value:</span>
                      <span className="text-[var(--color-brand)]">₹29,500.00</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-green-700 font-semibold">
                    <CheckCircle2 size={12} />
                    <span>Eligible for Full Input Tax Credit (ITC Sec 16)</span>
                  </div>
                </div>

                {/* Mini Due Date Alert & Aging Pill */}
                <div className="p-4 rounded-xl border border-[var(--color-line)] bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                      <CalendarClock size={14} className="text-[var(--color-amber)]" />
                      Active Credit Terms Alert
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      30-Day Term
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-red-200 bg-red-50/50 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-red-900">Asian Paints Industrial</span>
                      <span className="text-xs font-bold text-red-700">₹45,000</span>
                    </div>
                    <p className="text-[10px] text-red-600 font-medium">
                      🚨 Overdue by 5 days • Credit term expired on Sept 28
                    </p>
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[10px] text-[var(--color-ink-soft)]">Already paid: ₹0.00</span>
                      <span className="px-2 py-1 rounded bg-[var(--color-brand)] text-white text-[10px] font-bold">
                        1-Click Settle
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-[var(--color-ink-soft)] text-[11px]">Next cash crunch:</span>
                    <span className="font-bold text-amber-700 text-[11px]">₹20,500 due in next 7 days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MSME PAIN POINTS: BEFORE VS. AFTER */}
      <section className="py-20 border-y border-[var(--color-line)] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand)]">
              The MSME Problem
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-ink)]">
              Why Indian Small Businesses Bleed Cash Without Realizing It
            </h2>
            <p className="text-sm text-[var(--color-ink-soft)]">
              Managing bills with physical papers, Excel sheets, and mental memory costs the average Indian trader over ₹2,40,000 every single year.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Chaos (Before) */}
            <div className="p-7 rounded-2xl border border-red-200 bg-red-50/30 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold">
                  ✕
                </div>
                <h3 className="text-lg font-bold text-red-950">
                  Before ExpenseLens (Manual & Painful)
                </h3>
              </div>

              <ul className="space-y-4 text-xs sm:text-sm text-red-900">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span><strong>Lost GST Credits:</strong> Paper receipts get misplaced or damaged. At 18% GST, every lost ₹1,00,000 bill is ₹18,000 straight down the drain.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span><strong>Credit Term Blindspots:</strong> Buying on 15 or 30-day terms without alerts leads to sudden supplier halts, awkward calls, and high interest penalties.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span><strong>Year-End CA Nightmares:</strong> Handing over messy bags of thermal receipts to your accountant right before GST filing deadlines.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span><strong>Duplicate Billings:</strong> Vendors inadvertently billing the same ledger item twice because nobody checked previous khatas.</span>
                </li>
              </ul>
            </div>

            {/* The Clarity (After) */}
            <div className="p-7 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  ✓
                </div>
                <h3 className="text-lg font-bold text-emerald-950">
                  With ExpenseLens (Autonomous Financial OS)
                </h3>
              </div>

              <ul className="space-y-4 text-xs sm:text-sm text-emerald-950">
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold mt-0.5">•</span>
                  <span><strong>100% Tax Recovery:</strong> Automatic Section 17(5) sorting identifies blocked vs eligible ITC, ensuring maximum tax offset against sales liability.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold mt-0.5">•</span>
                  <span><strong>30-60-90 Day Udhaari Radar:</strong> Visual aging bar chart displays liability horizons, so you know your exact cash position weeks ahead.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold mt-0.5">•</span>
                  <span><strong>1-Click CA-Ready CSV:</strong> Download pre-reconciled GSTR-2B audits formatted for instant upload into GST portals.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-emerald-600 font-bold mt-0.5">•</span>
                  <span><strong>Autonomous Anomaly Radar:</strong> Continuous 600-second AI cron sweeps flag suspicious amounts, duplicates, and off-hour spikes.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CORE FEATURE PILLARS (DEEP DIVE) */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand)]">
              Core Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-ink)]">
              Four Superpowers Engineered for Indian Commerce
            </h2>
            <p className="text-sm text-[var(--color-ink-soft)]">
              Built specifically around how Indian distributors, traders, and small business owners operate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1: GST Engine */}
            <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-white space-y-4 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-brand-light)] text-[var(--color-brand)] flex items-center justify-center font-bold transition-transform group-hover:scale-110">
                <Landmark size={24} />
              </div>
              <h3 className="text-base font-bold text-[var(--color-ink)]">
                GST & Tax Intelligence
              </h3>
              <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
                Deterministic calculation of 0%, 5%, 12%, 18%, 28% tax rates. Categorizes intra-state CGST/SGST vs inter-state IGST, and enforces CGST Section 17(5) blocked credit rules.
              </p>
              <div className="pt-2 text-xs font-semibold text-[var(--color-brand)] flex items-center gap-1">
                <span>Explore Tax Center</span>
                <ArrowRight size={12} />
              </div>
            </div>

            {/* Pillar 2: Accounts Payable */}
            <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-white space-y-4 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-amber-light)] text-[var(--color-amber)] flex items-center justify-center font-bold transition-transform group-hover:scale-110">
                <CalendarClock size={24} />
              </div>
              <h3 className="text-base font-bold text-[var(--color-ink)]">
                Udhaari & Credit Terms
              </h3>
              <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
                Track 15, 30, 45, 60-day vendor payment terms. Visual countdowns highlight overdue bills, while a 30-60-90 day aging schedule prevents dangerous liquidity crunches.
              </p>
              <div className="pt-2 text-xs font-semibold text-[var(--color-amber)] flex items-center gap-1">
                <span>View Aging Schedule</span>
                <ArrowRight size={12} />
              </div>
            </div>

            {/* Pillar 3: Vision AI Scanner */}
            <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-white space-y-4 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold transition-transform group-hover:scale-110">
                <ScanLine size={24} />
              </div>
              <h3 className="text-base font-bold text-[var(--color-ink)]">
                Multimodal Khata Scanner
              </h3>
              <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
                Powered by NVIDIA Nemotron and Llama-3.2 vision models. Point your phone camera at handwritten khatas, receipts, or invoices to extract amounts, dates, and vendors instantly.
              </p>
              <div className="pt-2 text-xs font-semibold text-purple-700 flex items-center gap-1">
                <span>Test OCR Scanner</span>
                <ArrowRight size={12} />
              </div>
            </div>

            {/* Pillar 4: Anomaly Radar */}
            <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-white space-y-4 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold transition-transform group-hover:scale-110">
                <Sparkles size={24} />
              </div>
              <h3 className="text-base font-bold text-[var(--color-ink)]">
                Autonomous Anomaly Radar
              </h3>
              <p className="text-xs text-[var(--color-ink-soft)] leading-relaxed">
                Automated 600-second background cron jobs continuously analyze transactions. Flags duplicate invoices, unexpected vendor billing surges, and off-hour payments.
              </p>
              <div className="pt-2 text-xs font-semibold text-blue-700 flex items-center gap-1">
                <span>See Anomaly Alerts</span>
                <ArrowRight size={12} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INTERACTIVE FEATURE PLAYGROUND / DEMO */}
      <section id="interactive-demo" className="py-20 border-t border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand)]">
              Interactive Terminal
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-ink)]">
              Experience the Live Engine Before You Sign Up
            </h2>
            <p className="text-sm text-[var(--color-ink-soft)]">
              Switch between tabs below to test our real GST tax calculations, Udhaari aging schedule, and AI vision output.
            </p>
          </div>

          {/* Interactive Tabs Header */}
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto bg-white p-1.5 rounded-xl border border-[var(--color-line)] shadow-2xs">
            {[
              { id: 'gst', label: 'GST Tax Center', icon: Landmark },
              { id: 'payables', label: 'Udhaari Aging Horizon', icon: CalendarClock },
              { id: 'vision', label: 'Vision AI OCR', icon: ScanLine },
              { id: 'ca-export', label: 'CA GSTR-2B Export', icon: FileSpreadsheet }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveFeatureTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  activeFeatureTab === id
                    ? 'bg-[var(--color-brand)] text-white shadow-xs'
                    : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]'
                }`}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <div className="max-w-4xl mx-auto rounded-2xl border border-[var(--color-line)] bg-white p-6 sm:p-8 shadow-xl">
            {/* TAB 1: GST */}
            {activeFeatureTab === 'gst' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-line)]">
                  <div>
                    <h4 className="font-bold text-base text-[var(--color-ink)]">
                      Indian CGST Section 17(5) Tax Compliance Engine
                    </h4>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      Live tax split simulation for a ₹1,18,000 procurement invoice (18% GST slab).
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                    Input Tax Credit: ₹18,000.00
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[var(--color-paper)] border border-[var(--color-line)] text-center">
                    <span className="text-[10px] font-bold uppercase text-[var(--color-ink-soft)]">Taxable Base</span>
                    <div className="text-xl font-bold text-[var(--color-ink)]">₹1,00,000.00</div>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center">
                    <span className="text-[10px] font-bold uppercase text-blue-700">Central Tax (CGST 9%)</span>
                    <div className="text-xl font-bold text-blue-900">₹9,000.00</div>
                  </div>
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-center">
                    <span className="text-[10px] font-bold uppercase text-blue-700">State Tax (SGST 9%)</span>
                    <div className="text-xl font-bold text-blue-900">₹9,000.00</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>Input Tax Credit Eligibility: 100% Eligible</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Category: Raw Materials / Hardware Machinery (Not blocked under Section 17(5))
                    </p>
                  </div>
                  <Link
                    to="/register"
                    className="px-3.5 py-2 rounded-lg bg-[var(--color-brand)] text-white text-xs font-semibold hover:bg-[var(--color-brand-dark)] transition-colors"
                  >
                    Open Live Tax Center
                  </Link>
                </div>
              </div>
            )}

            {/* TAB 2: PAYABLES */}
            {activeFeatureTab === 'payables' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-line)]">
                  <div>
                    <h4 className="font-bold text-base text-[var(--color-ink)]">
                      Payables Aging Horizon (30-60-90 Days)
                    </h4>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      Real-time liability buckets showing upcoming cash outflow obligations.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    Overdue: ₹2,35,000
                  </span>
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={demoAgingData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `₹${v/1000}k`} />
                      <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Liability']} />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                        {demoAgingData.map((e, idx) => (
                          <Cell
                            key={idx}
                            fill={
                              e.type === 'critical' ? '#dc2626' :
                              e.type === 'warning' ? '#f59e0b' :
                              e.type === 'upcoming' ? '#3b82f6' : '#10b981'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between text-xs">
                  <span className="font-medium text-amber-900">
                    🚨 Proactive Alert: Asian Paints invoice of ₹45,000 overdue by 5 days.
                  </span>
                  <Link
                    to="/register"
                    className="font-bold text-[var(--color-brand)] hover:underline"
                  >
                    View All Udhaari Alerts &rarr;
                  </Link>
                </div>
              </div>
            )}

            {/* TAB 3: VISION AI */}
            {activeFeatureTab === 'vision' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-line)]">
                  <div>
                    <h4 className="font-bold text-base text-[var(--color-ink)]">
                      NVIDIA Multimodal OCR & Ledger Extraction
                    </h4>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      Transforms crumpled paper receipts into verified digital records.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    Confidence: 99.4%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] flex flex-col justify-center items-center text-center space-y-2">
                    <ScanLine size={36} className="text-[var(--color-brand)]" />
                    <span className="text-xs font-bold">Scanned Thermal Receipt</span>
                    <p className="text-[11px] text-[var(--color-ink-soft)]">
                      Input: 2.4MB phone image with creases & shadows (Reliance Jio Infocomm Ltd)
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2 text-xs font-mono">
                    <div className="text-[10px] uppercase font-bold text-purple-900">JSON AI Extraction</div>
                    <div className="text-[11px] text-purple-950 space-y-1">
                      <div>vendor: "Reliance Jio Infocomm"</div>
                      <div>amount: 1499.00</div>
                      <div>date: "2026-09-24"</div>
                      <div>gstin: "27AAACR7148Q1ZV"</div>
                      <div>gst_rate: 18</div>
                      <div>itc_eligible: true</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CA EXPORT */}
            {activeFeatureTab === 'ca-export' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--color-line)]">
                  <div>
                    <h4 className="font-bold text-base text-[var(--color-ink)]">
                      CA GSTR-2B Audit Reconciliation Export
                    </h4>
                    <p className="text-xs text-[var(--color-ink-soft)]">
                      RFC-4180 compliant CSV export ready for direct filing with your tax advisor.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Excel & Tally Ready
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-[var(--color-line)]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[var(--color-paper)] border-b border-[var(--color-line)]">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Vendor</th>
                        <th className="p-2.5">GSTIN</th>
                        <th className="p-2.5 text-right">Taxable (₹)</th>
                        <th className="p-2.5 text-right">GST (₹)</th>
                        <th className="p-2.5 text-center">ITC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-line)] bg-white text-[11px]">
                      <tr>
                        <td className="p-2.5">2026-09-22</td>
                        <td className="p-2.5 font-bold">Airtel Business</td>
                        <td className="p-2.5">27AAACR7148Q1ZV</td>
                        <td className="p-2.5 text-right">10,169.49</td>
                        <td className="p-2.5 text-right font-bold text-green-700">1,830.51</td>
                        <td className="p-2.5 text-center text-green-700 font-bold">Eligible</td>
                      </tr>
                      <tr>
                        <td className="p-2.5">2026-09-20</td>
                        <td className="p-2.5 font-bold">City Power Solutions</td>
                        <td className="p-2.5">23AACCC5555E1Z9</td>
                        <td className="p-2.5 text-right">31,355.93</td>
                        <td className="p-2.5 text-right font-bold text-green-700">5,644.07</td>
                        <td className="p-2.5 text-center text-green-700 font-bold">Eligible</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <Link
                    to="/register"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-brand)] text-white text-xs font-bold"
                  >
                    <FileSpreadsheet size={14} />
                    <span>Download Live GSTR-2B Report</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. INTERACTIVE ROI & TAX SAVINGS CALCULATOR */}
      <section id="calculator" className="py-20 bg-white border-t border-[var(--color-line)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand)]">
              Interactive ROI Calculator
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-ink)]">
              How Much Money Will ExpenseLens Save Your Business?
            </h2>
            <p className="text-sm text-[var(--color-ink-soft)]">
              Slide to match your company's monthly operational expenses to see estimated tax recovery and late fee savings.
            </p>
          </div>

          <div className="max-w-4xl mx-auto rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 sm:p-10 shadow-lg space-y-8">
            {/* Slider Control */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-sm font-bold text-[var(--color-ink)]">
                  Your Monthly Business Expenses:
                </label>
                <div className="text-2xl font-extrabold text-[var(--color-brand)]">
                  ₹{monthlySpend.toLocaleString()} / month
                </div>
              </div>

              <input
                type="range"
                min="100000"
                max="5000000"
                step="50000"
                value={monthlySpend}
                onChange={(e) => setMonthlySpend(Number(e.target.value))}
                className="w-full h-3 bg-[var(--color-line)] rounded-lg appearance-none cursor-pointer accent-[var(--color-brand)]"
              />

              <div className="flex justify-between text-[11px] text-[var(--color-ink-soft)] font-medium">
                <span>₹1 Lakh/mo (Small Shop)</span>
                <span>₹25 Lakhs/mo (Trader/Distributor)</span>
                <span>₹50 Lakhs/mo (Manufacturing/MSME)</span>
              </div>
            </div>

            {/* Savings Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-5 rounded-2xl bg-white border border-emerald-200 text-center space-y-1 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Annual GST ITC Recovered
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
                  ₹{calculatedSavings.estItcRecovered.toLocaleString()}
                </div>
                <p className="text-[10px] text-emerald-600">Reconciled input credit against sales GST</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-amber-200 text-center space-y-1 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Late Udhaari Fees Saved
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">
                  ₹{calculatedSavings.lateFeesSaved.toLocaleString()}
                </div>
                <p className="text-[10px] text-amber-600">Avoided vendor penalties & interest</p>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-indigo-200 text-center space-y-1 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                  Annual Time Saved
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-indigo-700">
                  ~{calculatedSavings.hoursSaved} Hours
                </div>
                <p className="text-[10px] text-indigo-600">Zero manual bookkeeping headaches</p>
              </div>
            </div>

            {/* Total Annual Value Box */}
            <div className="p-5 rounded-2xl bg-[var(--color-brand)] text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-white/80 font-bold">
                  Estimated Total Annual Financial Value
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-white">
                  ₹{calculatedSavings.totalBenefit.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-white/80">/ year</span>
                </div>
              </div>

              <Link
                to="/register"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-[var(--color-brand)] text-xs font-bold hover:bg-[var(--color-brand-light)] transition-colors shadow-sm text-center"
              >
                Claim This ROI Now &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. MSME TESTIMONIALS & SOCIAL PROOF */}
      <section className="py-20 border-t border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand)]">
              Voices of Real Owners
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-ink)]">
              Trusted by 1,200+ Businesses Across India
            </h2>
            <p className="text-sm text-[var(--color-ink-soft)]">
              From Indore and Surat to Delhi and Mumbai, see how Indian business leaders simplify their daily accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-white space-y-4 shadow-sm">
              <div className="flex text-amber-500 text-sm">★★★★★</div>
              <p className="text-xs sm:text-sm text-[var(--color-ink)] leading-relaxed italic">
                "We purchase electrical components on 30-day credit from 18 different distributors. Before ExpenseLens, suppliers would stop dispatching orders because bills slipped our minds. Now the 30-day aging bar chart is on our screen every morning."
              </p>
              <div className="pt-2 border-t border-[var(--color-line)]">
                <div className="font-bold text-xs text-[var(--color-ink)]">Ramesh Sharma</div>
                <div className="text-[10px] text-[var(--color-ink-soft)]">Owner, Sharma Hardware & Electricals • Indore</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-white space-y-4 shadow-sm">
              <div className="flex text-amber-500 text-sm">★★★★★</div>
              <p className="text-xs sm:text-sm text-[var(--color-ink)] leading-relaxed italic">
                "The Section 17(5) GST intelligence alone recovered over ₹68,000 for us last quarter. It automatically separated eligible machinery invoices from blocked canteen expenses so our CA didn't have to spend a week sorting papers."
              </p>
              <div className="pt-2 border-t border-[var(--color-line)]">
                <div className="font-bold text-xs text-[var(--color-ink)]">Pooja Agarwal</div>
                <div className="text-[10px] text-[var(--color-ink-soft)]">Managing Partner, Agarwal Textech • Surat</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--color-line)] bg-white space-y-4 shadow-sm">
              <div className="flex text-amber-500 text-sm">★★★★★</div>
              <p className="text-xs sm:text-sm text-[var(--color-ink)] leading-relaxed italic">
                "As a Chartered Accountant with 40+ MSME clients, ExpenseLens is a miracle. My clients click 'Export GSTR-2B CSV' and hand me spotless data with verified GSTINs and exact CGST/SGST splits. Filing time dropped from 3 days to 15 minutes."
              </p>
              <div className="pt-2 border-t border-[var(--color-line)]">
                <div className="font-bold text-xs text-[var(--color-ink)]">CA Vikram Mehta</div>
                <div className="text-[10px] text-[var(--color-ink-soft)]">Partner, Mehta & Associates Chartered Accountants • Mumbai</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section id="faq" className="py-20 border-t border-[var(--color-line)] bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand)]">
              Common Questions
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-ink)]">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-[var(--color-ink-soft)]">
              Everything you need to know about security, GST math, and credit tracking.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-[var(--color-ink)] hover:text-[var(--color-brand)]"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed border-t border-[var(--color-line)] pt-3 bg-white">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. HIGH-CONVERSION BOTTOM CALL TO ACTION */}
      <section className="py-20 bg-[var(--color-brand-dark)] text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Take Complete Control of Your Business Cash Flow Today.
          </h2>
          <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto font-normal">
            Join hundreds of forward-thinking Indian MSMEs recovering Input Tax Credit and mastering their credit terms with ExpenseLens.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[var(--color-amber)] text-white text-sm font-bold hover:bg-[#b56e26] transition-all shadow-lg hover:shadow-xl"
            >
              Create Free Account &rarr;
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl border border-white/20 bg-white/10 text-white text-sm font-semibold hover:bg-white/20 transition-all"
            >
              Sign In to Your Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="py-12 border-t border-[var(--color-line)] bg-white text-xs text-[var(--color-ink-soft)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--color-brand)] text-white flex items-center justify-center font-bold text-xs">
              EL
            </div>
            <span className="font-bold text-[var(--color-ink)]">ExpenseLens</span>
            <span>• Empowering Indian MSMEs & Businesses</span>
          </div>
          <div>
            © {new Date().getFullYear()} ExpenseLens. 100% Data Privacy & Security Guaranteed.
          </div>
        </div>
      </footer>
    </div>
  );
}
