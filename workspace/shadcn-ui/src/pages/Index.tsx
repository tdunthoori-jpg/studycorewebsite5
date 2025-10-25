import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, BookOpen, Users, Star, CheckCircle, Mail, Phone, MapPin, Briefcase, ArrowRight, TrendingUp, Award } from "lucide-react";
import emailjs from "@emailjs/browser";
import { toast } from "@/components/ui/sonner";

// Enhanced animation presets
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -50 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const slideInRight = {
  hidden: { opacity: 0, x: 50 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const floatingAnimation = {
  animate: {
    y: [-5, 5, -5],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

const pulseAnimation = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

type SectionKey = "home" | "services" | "results" | "pricing" | "faq" | "contact" | "workwithus";

interface Outcome {
  label: string;
  value: string;
  sub: string;
}

interface FormData {
  name: string;
  email: string;
  grade: string;
  message: string;
}

interface HomeProps {
  go: (section: SectionKey) => void;
  hero: string;
}

interface ServicesProps {
  go: (section: SectionKey) => void;
}

interface ResultsProps {
  outcomes: Outcome[];
}

interface PricingProps {
  go: (section: SectionKey) => void;
  hoveredCard: string | null;
  setHoveredCard: (id: string | null) => void;
}

interface ContactProps {
  form: FormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  calendly: string;
  sending: boolean;
}

/* ---------------------------- Shared constants ---------------------------- */
const PRICING_NAMES = {
  SAT_INTENSIVE: "SAT Intensive",
  SAT_STANDARD: "SAT Standard", 
  SAT_CORE: "SAT Core",
} as const;

function StudyCoreSite() {
  const LOGO_SRC = "/assets/logo.png";
  const HERO_SRC = "/assets/hero.png";
  const CALENDLY = "https://calendly.com/info-studycore/30min?month=2025-09";

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Get initial section from URL path or search parameter
  const getInitialSection = (): SectionKey => {
    const validSections: SectionKey[] = ["home", "services", "results", "pricing", "faq", "contact", "workwithus"];

    // Check URL path first (e.g., /pricing)
    const pathname = location.pathname.replace(/^\//, ''); // Remove leading slash
    const pathMapping: Record<string, SectionKey> = {
      'services': 'services',
      'results': 'results',
      'pricing': 'pricing',
      'faq': 'faq',
      'contact': 'contact',
      'work-with-us': 'workwithus'
    };

    if (pathname in pathMapping) {
      return pathMapping[pathname];
    }

    // Check search parameter (e.g., /?section=pricing)
    const sectionParam = searchParams.get("section");
    if (sectionParam && validSections.includes(sectionParam as SectionKey)) {
      return sectionParam as SectionKey;
    }

    return "home";
  };

  const [section, setSection] = useState<SectionKey>(getInitialSection());
  const [form, setForm] = useState<FormData>({ name: "", email: "", grade: "", message: "" });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [sending, setSending] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const go = (id: `#${SectionKey}` | SectionKey) => {
    const key = (typeof id === "string" && id.startsWith("#")) ? (id.slice(1) as SectionKey) : (id as SectionKey);
    setSection(key);
    // Update URL to reflect current section
    setSearchParams({ section: key });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const serviceId = "service_c9nhawr";
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;

    if (!templateId || !publicKey) {
      toast.error("Email service not configured. Please set VITE_EMAILJS_TEMPLATE_ID and VITE_EMAILJS_PUBLIC_KEY.");
      return;
    }

    try {
      setSending(true);
      await emailjs.send(
        serviceId,
        templateId,
        {
          name: form.name,
          email: form.email,
          grade: form.grade,
          message: form.message,
        },
        { publicKey }
      );

      // Track conversion in Google Ads
      if (typeof window !== 'undefined' && (window as any).gtag_report_conversion) {
        (window as any).gtag_report_conversion();
      }

      toast.success("Message sent! We'll get back to you within one business day.");
      setForm({ name: "", email: "", grade: "", message: "" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to send. Please try again or email us directly.");
    } finally {
      setSending(false);
    }
  };

  const outcomes: Outcome[] = [
    { label: "Avg. SAT Total Gain", value: "+250", sub: "points after 8–10 weeks" },
    { label: "5-Star Reviews", value: "96%", sub: "from parents & students" },
  ];

  // Update section when URL changes (for browser navigation)
  useEffect(() => {
    const newSection = getInitialSection();
    if (newSection !== section) {
      setSection(newSection);
    }
  }, [searchParams, location.pathname]);

  useEffect(() => {
    const allowed: SectionKey[] = ["home", "services", "pricing", "results", "faq", "contact", "workwithus"];
    console.assert(allowed.includes(section), `[TEST] Unknown section: ${section}`);
    console.assert(typeof Home === "function", "[TEST] Home component should be defined");
    console.assert(typeof Services === "function", "[TEST] Services component should be defined");
    console.assert(typeof Results === "function", "[TEST] Results component should be defined");
    console.assert(typeof Pricing === "function", "[TEST] Pricing component should be defined");
    console.assert(typeof FAQ === "function", "[TEST] FAQ component should be defined");
    console.assert(typeof Contact === "function", "[TEST] Contact component should be defined");
    console.assert(typeof WorkWithUs === "function", "[TEST] WorkWithUs component should be defined");
    console.assert(Array.isArray(outcomes) && outcomes.length === 2, "[TEST] outcomes should have 2 entries");
    console.assert(PRICING_NAMES.SAT_INTENSIVE === "SAT Intensive", "[TEST] 1-Month program name must be 'SAT Intensive'");
    console.assert(PRICING_NAMES.SAT_STANDARD === "SAT Standard", "[TEST] 3-Month program name must be 'SAT Standard'");
    console.assert(PRICING_NAMES.SAT_CORE === "SAT Core", "[TEST] 1-Year program name must be 'SAT Core'");
  }, [section]);

  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-sky-950 via-blue-950 to-blue-900 flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-20 left-10 w-32 h-32 bg-sky-500/10 rounded-full blur-xl"
          {...floatingAnimation}
        />
        <motion.div 
          className="absolute top-40 right-20 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl"
          animate={{
            y: [10, -10, 10],
            transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }}
        />
        <motion.div 
          className="absolute bottom-40 left-1/4 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl"
          animate={{
            scale: [1, 1.2, 1],
            transition: { duration: 5, repeat: Infinity, ease: "easeInOut" }
          }}
        />
      </div>

      {/* Navbar with enhanced animations */}
      <motion.header 
        className="sticky top-0 z-50 backdrop-blur-md bg-blue-950/80 border-b border-sky-600/50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <motion.button 
            onClick={() => go('home')} 
            className="flex items-center gap-3 font-semibold text-xl text-sky-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="relative h-10 w-10 inline-flex items-center justify-center">
              <img 
                src={LOGO_SRC} 
                alt="StudyCore logo" 
                className="h-10 w-10 object-contain drop-shadow-lg" 
                onError={(e) => { 
                  console.log('Logo failed to load, hiding element');
                  (e.currentTarget as HTMLImageElement).style.display = 'none'; 
                }} 
              />
            </span>
            <span>StudyCore</span>
          </motion.button>
          
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {['services', 'pricing', 'results', 'faq', 'contact', 'workwithus'].map((item, index) => (
              <motion.button 
                key={item}
                onClick={() => go(item as SectionKey)} 
                className={`relative ${section === item ? "text-sky-300" : "hover:text-sky-300"} transition-colors duration-300`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.5 }}
                whileHover={{ y: -2 }}
              >
                {item === 'services' && 'Services'}
                {item === 'pricing' && 'Pricing'}
                {item === 'results' && 'Results'}
                {item === 'faq' && 'FAQ'}
                {item === 'contact' && 'Contact'}
                {item === 'workwithus' && 'Work With Us'}
                {section === item && (
                  <motion.div
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-sky-300"
                    layoutId="activeTab"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </nav>
          
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mr-2">
              <Button 
                onClick={() => go('contact')} 
                className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                asChild
                variant="outline" 
                className="rounded-2xl border-sky-400 text-sky-300 hover:bg-sky-500/20 transition-all duration-300"
              >
                <a href="/portal">
                  Student Portal
                </a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.header>

      {/* Section switcher with page transitions */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
          >
            {section === 'home' && <Home go={go} hero={HERO_SRC} />}
            {section === 'services' && <Services go={go} />}
            {section === 'results' && <Results outcomes={outcomes} />}
            {section === 'pricing' && <Pricing go={go} hoveredCard={hoveredCard} setHoveredCard={setHoveredCard} />}
            {section === 'faq' && <FAQ />}
            {section === 'contact' && <Contact form={form} handleChange={handleChange} handleSubmit={handleSubmit} calendly={CALENDLY} sending={sending} />}
            {section === 'workwithus' && <WorkWithUs />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Enhanced Footer */}
      <motion.footer 
        className="border-t border-sky-700/60 bg-gradient-to-b from-blue-950 to-blue-900 text-sky-100/80"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <motion.div whileHover={{ scale: 1.02 }}>
              <div className="flex items-center gap-2 font-semibold text-lg text-sky-300">
                <span className="relative h-8 w-8 inline-flex items-center justify-center">
                  <img 
                    src={LOGO_SRC} 
                    alt="StudyCore logo" 
                    className="h-8 w-8 object-contain drop-shadow" 
                    onError={(e) => { 
                      (e.currentTarget as HTMLImageElement).style.display = 'none'; 
                    }} 
                  />
                </span>
                StudyCore
              </div>
              <p className="text-sm mt-2">SAT Prep • 1:1 Tutoring • Executive skills</p>
            </motion.div>
            <motion.div 
              className="grid grid-cols-2 sm:grid-cols-6 gap-4 text-sm"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {['services', 'pricing', 'results', 'faq', 'contact', 'workwithus'].map((item) => (
                <motion.button 
                  key={item}
                  onClick={() => go(item as SectionKey)} 
                  className="hover:text-sky-300 text-left transition-colors duration-300"
                  variants={staggerItem}
                  whileHover={{ x: 5 }}
                >
                  {item === 'services' && 'Services'}
                  {item === 'pricing' && 'Pricing'}
                  {item === 'results' && 'Results'}
                  {item === 'faq' && 'FAQ'}
                  {item === 'contact' && 'Contact'}
                  {item === 'workwithus' && 'Work With Us'}
                </motion.button>
              ))}
            </motion.div>
          </div>
          <motion.div 
            className="mt-8 text-xs"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            © {new Date().getFullYear()} StudyCore. All rights reserved.
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
}

/* ---------------------------- Enhanced Sections ---------------------------- */

function Home({ go, hero }: HomeProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
        <motion.div 
          initial="hidden" 
          whileInView="show" 
          viewport={{ once: true }} 
          variants={staggerContainer}
        >
          <motion.div variants={staggerItem}>
            <Badge className="mb-4 rounded-full px-3 py-1 bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg">
              SAT Prep • 1:1 Tutoring
            </Badge>
          </motion.div>
          
          <motion.h1 
            className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight text-sky-300"
            variants={staggerItem}
          >
            Score Higher. Learn Smarter.
          </motion.h1>
          
          <motion.p 
            className="mt-4 text-lg text-sky-100/80"
            variants={staggerItem}
          >
            StudyCore provides expert SAT preparation and customized one‑to‑one tutoring that meets students where they are and lifts them to where they want to be.
          </motion.p>
          
          <motion.div 
            className="mt-6 flex flex-col sm:flex-row gap-3 justify-center"
            variants={staggerItem}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                size="lg" 
                onClick={() => go('pricing')} 
                className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                View Pricing
                <TrendingUp className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => go('contact')} 
                className="rounded-2xl border-sky-400 text-sky-300 hover:bg-sky-500/20 transition-all duration-300"
              >
                Book a Free Consultation
              </Button>
            </motion.div>
          </motion.div>

          {/* Enhanced hero visual */}
          <motion.div 
            className="mt-8"
            variants={fadeInScale}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <img 
              src={hero} 
              alt="StudyCore students and tutoring" 
              className="mx-auto max-w-4xl rounded-3xl shadow-2xl ring-1 ring-sky-700/40 hover:ring-sky-500/60 transition-all duration-500" 
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} 
            />
          </motion.div>

          {/* Animated info pills */}
          <motion.div 
            className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            variants={staggerContainer}
          >
            {[
              { icon: MapPin, text: "3833 Mandy Way, San Ramon, CA", href: null },
              { icon: Users, text: "Bay Area in-person • Online nationwide", href: null },
              { icon: Mail, text: "info.studycore@gmail.com", href: "mailto:info.studycore@gmail.com" },
              { icon: Phone, text: "(925) 477-8509", href: "tel:+19254778509" },
              { icon: Star, text: "Avg. +250 SAT points", href: null },
              { icon: Award, text: "96% 5-star reviews", href: null },
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={staggerItem}
                whileHover={{ scale: 1.05, y: -5 }}
                className="rounded-2xl border border-sky-700/60 bg-blue-900/40 px-4 py-3 flex items-center gap-2 justify-center hover:bg-blue-900/60 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                onClick={() => item.href && window.open(item.href)}
              >
                <item.icon className="h-4 w-4 text-sky-300" />
                <span className="text-sky-100/80 text-sm">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Enhanced feature cards */}
          <motion.div 
            className="mt-10 grid md:grid-cols-3 gap-6 text-left"
            variants={staggerContainer}
          >
            {[
              {
                title: "SAT Services",
                desc: "Our SAT Prep program",
                content: "Boost your SAT score with small-group classes, full practice exams, and expert strategies in just four weeks.",
                action: () => go('pricing'),
                buttonText: "Learn More"
              },
              {
                title: "1:1 Tutoring",
                desc: "Personalized academic support",
                content: "Flexible one‑to‑one tutoring in math, English, science, and study skills—online or in person, tailored to your needs.",
                action: () => go('contact'),
                buttonText: "Get Tutoring"
              },
              {
                title: "Proven Results",
                desc: "Avg. +250 point increase",
                content: "Our students see measurable score jumps and gain confidence that carries into college and beyond.",
                action: () => go('results'),
                buttonText: "See Outcomes"
              }
            ].map((card, index) => (
              <motion.div
                key={index}
                variants={staggerItem}
                whileHover={{ scale: 1.03, y: -10 }}
                className="group"
              >
                <Card className="rounded-3xl bg-blue-900/60 border border-blue-700/60 hover:border-sky-500/50 transition-all duration-500 hover:shadow-2xl backdrop-blur-sm h-full">
                  <CardHeader>
                    <CardTitle className="text-white group-hover:text-sky-300 transition-colors duration-300">
                      {card.title}
                    </CardTitle>
                    <CardDescription className="text-sky-100/80">{card.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sky-100/80 text-sm flex-grow">
                    {card.content}
                  </CardContent>
                  <CardFooter>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        onClick={card.action} 
                        className={index === 2 ? 
                          "rounded-2xl border-sky-400 text-sky-300 hover:bg-sky-500/20 w-full transition-all duration-300" :
                          "rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 w-full transition-all duration-300"
                        }
                        variant={index === 2 ? "outline" : "default"}
                      >
                        {card.buttonText}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </motion.div>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Services({ go }: ServicesProps) {
  return (
    <section className="py-16 lg:py-24 border-t border-sky-700/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2 
          initial="hidden" 
          whileInView="show" 
          viewport={{ once: true }} 
          variants={fadeUp} 
          className="text-3xl sm:text-4xl font-bold tracking-tight text-sky-300"
        >
          What We Offer
        </motion.h2>
        
        <motion.div 
          className="mt-8 grid md:grid-cols-2 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {[
            {
              icon: BookOpen,
              title: "SAT Prep Program",
              desc: "Comprehensive prep blending strategy, content mastery, and timed drills.",
              features: [
                "Full diagnostic with score report",
                "Customized weekly plan + homework",
                "Strategy playbooks for each section",
                "3 proctored practice tests"
              ],
              footer: "Group & private options",
              action: () => go('pricing'),
              buttonText: "See Pricing"
            },
            {
              icon: Users,
              title: "1:1 Private Tutoring",
              desc: "Targeted help in Math, English, Science, and study skills—on your schedule.",
              features: [
                "Individualized lesson plans",
                "Flexible online or in‑person",
                "Progress reports for families",
                "Executive‑function coaching"
              ],
              footer: "Bundle with SAT prep and save",
              action: () => go('contact'),
              buttonText: "Ask a Question"
            }
          ].map((service, index) => (
            <motion.div
              key={index}
              variants={staggerItem}
              whileHover={{ scale: 1.02, y: -5 }}
              className="group"
            >
              <Card className="rounded-3xl bg-blue-900/60 border border-blue-700/60 hover:border-sky-500/50 transition-all duration-500 hover:shadow-xl backdrop-blur-sm h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white group-hover:text-sky-300 transition-colors duration-300">
                    <service.icon className="h-5 w-5 text-sky-300" />
                    {service.title}
                  </CardTitle>
                  <CardDescription className="text-sky-100/80">{service.desc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-sky-100/80">
                  <ul className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <motion.li 
                        key={featureIndex}
                        className="flex gap-2"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: featureIndex * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <CheckCircle className="h-4 w-4 mt-0.5 text-sky-300" />
                        {feature}
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="text-sm text-sky-100/70">{service.footer}</div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      onClick={service.action} 
                      className={index === 0 ? 
                        "rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 transition-all duration-300" :
                        "rounded-2xl border-sky-400 text-sky-300 hover:bg-sky-500/20 transition-all duration-300"
                      }
                      variant={index === 0 ? "default" : "outline"}
                    >
                      {service.buttonText}
                    </Button>
                  </motion.div>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Results({ outcomes }: ResultsProps) {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2 
          initial="hidden" 
          whileInView="show" 
          viewport={{ once: true }} 
          variants={fadeUp} 
          className="text-3xl sm:text-4xl font-bold tracking-tight text-sky-300 text-center"
        >
          Proven Outcomes
        </motion.h2>
        
        <motion.div 
          className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 justify-items-center"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {outcomes.map((s, i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              whileHover={{ scale: 1.05, y: -10 }}
              {...pulseAnimation}
            >
              <Card className="rounded-3xl bg-blue-900/60 border border-blue-700/60 w-full max-w-sm hover:border-sky-500/50 transition-all duration-500 hover:shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-3xl text-white text-center hover:text-sky-300 transition-colors duration-300">
                    {s.value}
                  </CardTitle>
                  <CardDescription className="text-sky-100/80 text-center">{s.label}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-sky-100/70 text-center">{s.sub}</CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Enhanced Student Testimonials */}
        <motion.h3 
          initial="hidden" 
          whileInView="show" 
          viewport={{ once: true }} 
          variants={fadeUp} 
          className="mt-12 text-2xl font-semibold tracking-tight text-sky-300 text-center"
        >
          Student Testimonials
        </motion.h3>
        
        <motion.div 
          className="mt-6 grid md:grid-cols-2 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {[
            {
              name: "David Sam",
              school: "Cornell University",
              score: "SAT 1530",
              testimonial: "Before I started classes with StudyCore, I was really worried about my upcoming test. After a few sessions though, I learned strategies and hacks that made feel much more confident. After the month long program, I took my SAT test and got a score of 1530! That score helped me get into my dream school, Cornell University!"
            },
            {
              name: "Arjun Saini",
              school: "Washington University in St. Louis",
              score: "SAT 1550",
              testimonial: "Before joining StudyCore, I felt stuck at a plateau in my SAT prep. No matter how much I practiced, my scores stayed the same and I wasn't sure how to break through. With the help of StudyCore's instructors, I learned how to approach tricky questions, manage my timing, and avoid the mistakes I kept repeating. After finishing the program, I went into the test feeling prepared—and I ended up scoring a 1550! That score opened doors for me at some of the most competitive schools, and I couldn't have done it without StudyCore."
            }
          ].map((testimonial, index) => (
            <motion.div
              key={index}
              variants={staggerItem}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <Card className="rounded-3xl bg-blue-900/60 border border-blue-700/60 hover:border-sky-500/50 transition-all duration-500 hover:shadow-xl backdrop-blur-sm h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Star className="h-5 w-5 text-sky-300" />
                    Student Testimonial
                  </CardTitle>
                  <CardDescription className="text-sky-100/80 text-lg font-medium">
                    {testimonial.name} • {testimonial.school} ({testimonial.score})
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sky-100/80 text-sm">
                  "{testimonial.testimonial}"
                  <div className="mt-2 text-sky-100/60">
                    — {testimonial.name}, {testimonial.school.includes('Washington') ? 'WashU St. Louis' : testimonial.school}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------------------- Enhanced Pricing Section ---------------------------- */

function Pricing({ go, hoveredCard, setHoveredCard }: PricingProps) {
  return (
    <section className="py-16 lg:py-24 border-t border-sky-700/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2 
          initial="hidden" 
          whileInView="show" 
          viewport={{ once: true }} 
          variants={fadeUp} 
          className="text-3xl sm:text-4xl font-bold tracking-tight text-sky-300"
        >
          SAT Prep Pricing
        </motion.h2>
        <motion.p 
          className="mt-3 text-sky-100/80"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          Choose the intensive plan that fits your timeline and goals. All include full materials and practice tests.
        </motion.p>

        <motion.div 
          className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {[
            {
              id: "intensive",
              name: PRICING_NAMES.SAT_INTENSIVE,
              desc: "10 hrs/week • 40 hrs/month",
              price: "$2600",
              rate: "$65/hr",
              features: [
                "Intensive SAT prep schedule",
                "Small groups (1-5 students)",
                "Full-length practice tests",
                "All materials included"
              ],
              popular: false
            },
            {
              id: "standard",
              name: PRICING_NAMES.SAT_STANDARD,
              desc: "5 hrs/week • 60 hrs/month",
              price: "$3300",
              rate: "$55/hr",
              features: [
                "Balanced prep schedule",
                "Small groups (1-5 students)",
                "Weekly progress reports",
                "Strategy drills and materials"
              ],
              popular: true
            },
            {
              id: "core",
              name: PRICING_NAMES.SAT_CORE,
              desc: "1 year • 3 hrs/week",
              price: "$7000",
              rate: "$45/hr",
              features: [
                "Long-term structured prep",
                "Small groups (1-5 students)",
                "Gradual improvement curve",
                "Includes full resource access"
              ],
              popular: false
            },
            {
              id: "flex",
              name: "1:1 Flex",
              desc: "Flexible online or in-person",
              price: "$75–$85/hr",
              rate: "",
              features: [
                "Personalized SAT prep plans",
                "Online or in-person sessions",
                "Targeted test strategies"
              ],
              popular: false
            }
          ].map((plan, index) => (
            <motion.div
              key={plan.id}
              variants={staggerItem}
              whileHover={{ scale: 1.03, y: -10 }}
              onHoverStart={() => setHoveredCard(plan.id)}
              onHoverEnd={() => setHoveredCard(null)}
              className="group"
            >
              <Card className={`rounded-3xl bg-blue-900/60 border transition-all duration-500 hover:shadow-2xl backdrop-blur-sm h-full flex flex-col ${
                plan.popular 
                  ? 'border-sky-400/70 ring-2 ring-sky-400/30' 
                  : 'border-blue-700/60 hover:border-sky-500/50'
              }`}>
                <CardHeader className="relative">
                  {plan.popular && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="absolute -top-3 left-1/2 transform -translate-x-1/2"
                    >
                      <Badge className="rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg px-3 py-1">
                        Most Popular
                      </Badge>
                    </motion.div>
                  )}
                  <div>
                    <CardTitle className="text-white group-hover:text-sky-300 transition-colors duration-300">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-sky-100/80">{plan.desc}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <motion.div 
                    className="text-4xl font-bold text-white group-hover:text-sky-300 transition-colors duration-300"
                    animate={hoveredCard === plan.id ? { scale: 1.1 } : { scale: 1 }}
                  >
                    {plan.price}
                  </motion.div>
                  {plan.rate && (
                    <motion.div 
                      className="mt-2 mb-4 p-2 rounded-xl bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-400/30"
                      whileHover={{ scale: 1.05 }}
                      animate={hoveredCard === plan.id ? { 
                        backgroundColor: "rgba(14, 165, 233, 0.3)",
                        borderColor: "rgba(14, 165, 233, 0.6)"
                      } : {}}
                    >
                      <p className="text-xl font-bold text-sky-300 text-center">
                        {plan.rate}
                      </p>
                      <p className="text-xs text-sky-100/70 text-center">per hour</p>
                    </motion.div>
                  )}
                  <ul className="mt-4 space-y-2 text-sm text-sky-100/80">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.li 
                        key={featureIndex}
                        className="flex gap-2"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: featureIndex * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <CheckCircle className="h-4 w-4 mt-0.5 text-sky-300" />
                        {feature}
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="mt-auto">
                  <motion.div 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }}
                    className="w-full"
                  >
                    <Button 
                      onClick={() => go('contact')} 
                      className="rounded-2xl w-full bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      {plan.id === 'flex' ? 'Book 1:1 Flex' : 'Enroll'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Core Subjects Section */}
        <motion.h2 
          initial="hidden" 
          whileInView="show" 
          viewport={{ once: true }} 
          variants={fadeUp} 
          className="text-3xl sm:text-4xl font-bold tracking-tight text-sky-300 mt-16"
        >
          Core Subjects
        </motion.h2>
        <motion.p 
          className="mt-3 text-sky-100/80"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          Personalized tutoring for any subject to help you excel in your academic goals.
        </motion.p>

        <motion.div 
          className="mt-8 flex justify-center"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <motion.div
            variants={staggerItem}
            whileHover={{ scale: 1.03, y: -10 }}
            onHoverStart={() => setHoveredCard('core-tutoring')}
            onHoverEnd={() => setHoveredCard(null)}
            className="group max-w-sm w-full"
          >
            <Card className="rounded-3xl bg-blue-900/60 border border-blue-700/60 hover:border-sky-500/50 transition-all duration-500 hover:shadow-2xl backdrop-blur-sm h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-white group-hover:text-sky-300 transition-colors duration-300">
                  1:1 Tutoring
                </CardTitle>
                <CardDescription className="text-sky-100/80">Any subject, personalized approach</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <motion.div 
                  className="text-4xl font-bold text-white group-hover:text-sky-300 transition-colors duration-300"
                  animate={hoveredCard === 'core-tutoring' ? { scale: 1.1 } : { scale: 1 }}
                >
                  $55–$65/hr
                </motion.div>
                <ul className="mt-6 space-y-2 text-sm text-sky-100/80">
                  {[
                    "Math, English, Science, History",
                    "Customized lesson plans",
                    "Online or in-person sessions",
                    "Progress tracking and reports"
                  ].map((feature, featureIndex) => (
                    <motion.li 
                      key={featureIndex}
                      className="flex gap-2"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: featureIndex * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <CheckCircle className="h-4 w-4 mt-0.5 text-sky-300" />
                      {feature}
                    </motion.li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="mt-auto">
                <motion.div 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }}
                  className="w-full"
                >
                  <Button 
                    onClick={() => go('contact')} 
                    className="rounded-2xl w-full bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Book Tutoring
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function FAQ() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { 
      q: "How do sessions work?", 
      a: "We begin with a diagnostic to map strengths and gaps. Each week blends targeted instruction, strategy practice, and timed drills, with homework calibrated to your goals." 
    },
    { 
      q: "Do you teach online or in‑person?", 
      a: "Both. We meet via Zoom with interactive whiteboards, or in‑person where available." 
    },
    { 
      q: "Can I switch plans later?", 
      a: "Yes, you can upgrade/downgrade anytime. We pro‑rate remaining sessions." 
    },
    { 
      q: "What if I need to reschedule?", 
      a: "No problem—give us 24 hours' notice and we'll find a new time." 
    },
  ];

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2 
          initial="hidden" 
          whileInView="show" 
          viewport={{ once: true }} 
          variants={fadeUp} 
          className="text-3xl sm:text-4xl font-bold tracking-tight text-sky-300"
        >
          FAQ
        </motion.h2>
        
        <motion.div 
          className="mt-8 grid md:grid-cols-2 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {faqs.map((item, i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              whileHover={{ scale: 1.02, y: -5 }}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="cursor-pointer"
            >
              <Card className="rounded-3xl bg-blue-900/60 border border-blue-700/60 hover:border-sky-500/50 transition-all duration-500 hover:shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-white hover:text-sky-300 transition-colors duration-300 flex items-center justify-between">
                    {item.q}
                    <motion.div
                      animate={{ rotate: openFaq === i ? 45 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-sky-300"
                    >
                      +
                    </motion.div>
                  </CardTitle>
                </CardHeader>
                <AnimatePresence>
                  {(openFaq === i || window.innerWidth >= 768) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CardContent className="text-sm text-sky-100/80">{item.a}</CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Contact({ form, handleChange, handleSubmit, calendly, sending }: ContactProps) {
  return (
    <section className="py-16 lg:py-24 border-t border-sky-700/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2 
          className="text-3xl sm:text-4xl font-bold tracking-tight text-sky-300"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          Contact Us
        </motion.h2>
        <motion.p 
          className="mt-3 text-sky-100/80"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          Tell us about your goals. We'll reply within one business day.
        </motion.p>

        <motion.div 
          className="mt-8 grid lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <motion.div variants={staggerItem} className="lg:col-span-2">
            <Card className="rounded-3xl bg-blue-900/60 border border-blue-700/60 hover:border-sky-500/50 transition-all duration-500 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Send a message</CardTitle>
                <CardDescription className="text-sky-100/80">We'll reach out to schedule a free consult.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
                  <motion.div whileFocus={{ scale: 1.02 }}>
                    <Input 
                      name="name" 
                      value={form.name} 
                      onChange={handleChange} 
                      placeholder="Your name" 
                      required 
                      className="bg-blue-950/70 border-sky-600 text-white placeholder:text-sky-100/50 focus:border-sky-400 transition-colors duration-300" 
                    />
                  </motion.div>
                  <motion.div whileFocus={{ scale: 1.02 }}>
                    <Input 
                      name="email" 
                      type="email" 
                      value={form.email} 
                      onChange={handleChange} 
                      placeholder="Email address" 
                      required 
                      className="bg-blue-950/70 border-sky-600 text-white placeholder:text-sky-100/50 focus:border-sky-400 transition-colors duration-300" 
                    />
                  </motion.div>
                  <motion.div whileFocus={{ scale: 1.02 }} className="sm:col-span-2">
                    <Input 
                      name="grade" 
                      value={form.grade} 
                      onChange={handleChange} 
                      placeholder="Student grade (e.g., 11th)" 
                      className="bg-blue-950/70 border-sky-600 text-white placeholder:text-sky-100/50 focus:border-sky-400 transition-colors duration-300" 
                    />
                  </motion.div>
                  <motion.div whileFocus={{ scale: 1.02 }} className="sm:col-span-2">
                    <Textarea 
                      name="message" 
                      value={form.message} 
                      onChange={handleChange} 
                      placeholder="Your message" 
                      className="min-h-[120px] bg-blue-950/70 border-sky-600 text-white placeholder:text-sky-100/50 focus:border-sky-400 transition-colors duration-300" 
                    />
                  </motion.div>
                  <div className="sm:col-span-2 flex gap-3">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        type="submit" 
                        disabled={sending}
                        className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 transition-all duration-300"
                      >
                        {sending ? "Sending..." : "Send"}
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        asChild 
                        className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 transition-all duration-300"
                      >
                        <a href={calendly} target="_blank" rel="noopener noreferrer">Book instantly</a>
                      </Button>
                    </motion.div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card className="rounded-3xl bg-blue-900/60 border border-blue-700/60 hover:border-sky-500/50 transition-all duration-500 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Reach us directly</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-sky-100/80">
                <motion.a 
                  href="mailto:info.studycore@gmail.com" 
                  className="flex items-center gap-2 hover:text-sky-300 transition-colors duration-300"
                  whileHover={{ x: 5 }}
                >
                  <Mail className="h-4 w-4" /> info.studycore@gmail.com
                </motion.a>
                <motion.a 
                  href="tel:+19254778509" 
                  className="flex items-center gap-2 hover:text-sky-300 transition-colors duration-300"
                  whileHover={{ x: 5 }}
                >
                  <Phone className="h-4 w-4" /> (925) 477-8509
                </motion.a>
                <motion.div 
                  className="flex items-center gap-2"
                  whileHover={{ x: 5 }}
                >
                  <MapPin className="h-4 w-4" /> San Ramon, CA • Online anywhere
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function WorkWithUs() {
  const [app, setApp] = useState({
    name: "",
    email: "",
    phone: "",
    subjects: "",
    experience: "",
    availability: "",
    resume: "",
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setApp((a) => ({ ...a, [e.target.name]: e.target.value }));

  const submitTutorApp = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent("Tutor Application – StudyCore");
    const body = encodeURIComponent(
      `Name: ${app.name}\nEmail: ${app.email}\nPhone: ${app.phone}\nSubjects to teach: ${app.subjects}\nExperience (brief): ${app.experience}\nAvailability: ${app.availability}\nResume / Portfolio link: ${app.resume}`
    );
    window.location.href = `mailto:info.studycore@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <section className="py-16 lg:py-24 border-t border-sky-700/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2 
          initial="hidden" 
          whileInView="show" 
          viewport={{ once: true }} 
          variants={fadeUp} 
          className="text-3xl sm:text-4xl font-bold tracking-tight text-sky-300"
        >
          Work With Us
        </motion.h2>
        <motion.p 
          className="mt-3 text-sky-100/80"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          We're hiring motivated tutors who care about student outcomes. Join a collaborative team, teach online or in-person, and help students reach their goals.
        </motion.p>

        <motion.div 
          className="mt-8 grid md:grid-cols-2 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <motion.div variants={staggerItem}>
            <Card className="rounded-3xl bg-blue-900/60 border border-blue-700/60 hover:border-sky-500/50 transition-all duration-500 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Briefcase className="h-5 w-5 text-sky-300" />
                  Open Roles & Perks
                </CardTitle>
                <CardDescription className="text-sky-100/80">Math, English, SAT/ACT, and study skills coaches.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-sky-100/80">
                <ul className="space-y-2">
                  {[
                    "Competitive hourly pay",
                    "Flexible scheduling (evenings/weekends)",
                    "Remote-friendly; local in-person options",
                    "Curriculum support and training"
                  ].map((perk, index) => (
                    <motion.li 
                      key={index}
                      className="flex gap-2"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <CheckCircle className="h-4 w-4 mt-0.5 text-sky-300" />
                      {perk}
                    </motion.li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Card className="rounded-3xl bg-blue-900/60 border border-blue-700/60 hover:border-sky-500/50 transition-all duration-500 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Tutor Application</CardTitle>
                <CardDescription className="text-sky-100/80">Tell us a bit about you. We typically respond within one business day.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitTutorApp} className="grid gap-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <motion.div whileFocus={{ scale: 1.02 }}>
                      <Input 
                        name="name" 
                        value={app.name} 
                        onChange={onChange} 
                        placeholder="Full name" 
                        required 
                        className="bg-blue-950/70 border-sky-600 text-white placeholder:text-sky-100/50 focus:border-sky-400 transition-colors duration-300" 
                      />
                    </motion.div>
                    <motion.div whileFocus={{ scale: 1.02 }}>
                      <Input 
                        name="email" 
                        type="email" 
                        value={app.email} 
                        onChange={onChange} 
                        placeholder="Email" 
                        required 
                        className="bg-blue-950/70 border-sky-600 text-white placeholder:text-sky-100/50 focus:border-sky-400 transition-colors duration-300" 
                      />
                    </motion.div>
                  </div>
                  <motion.div whileFocus={{ scale: 1.02 }}>
                    <Input 
                      name="phone" 
                      value={app.phone} 
                      onChange={onChange} 
                      placeholder="Phone (optional)" 
                      className="bg-blue-950/70 border-sky-600 text-white placeholder:text-sky-100/50 focus:border-sky-400 transition-colors duration-300" 
                    />
                  </motion.div>
                  <motion.div whileFocus={{ scale: 1.02 }}>
                    <Input 
                      name="subjects" 
                      value={app.subjects} 
                      onChange={onChange} 
                      placeholder="Subjects you can tutor (e.g., Algebra II, SAT Reading)" 
                      required 
                      className="bg-blue-950/70 border-sky-600 text-white placeholder:text-sky-100/50 focus:border-sky-400 transition-colors duration-300" 
                    />
                  </motion.div>
                  <motion.div whileFocus={{ scale: 1.02 }}>
                    <Textarea 
                      name="experience" 
                      value={app.experience} 
                      onChange={onChange} 
                      placeholder="Tutoring/teaching experience (2–4 sentences)" 
                      required 
                      className="min-h-[110px] bg-blue-950/70 border-sky-600 text-white placeholder:text-sky-100/50 focus:border-sky-400 transition-colors duration-300" 
                    />
                  </motion.div>
                  <motion.div whileFocus={{ scale: 1.02 }}>
                    <Input 
                      name="availability" 
                      value={app.availability} 
                      onChange={onChange} 
                      placeholder="Availability (e.g., M/W/F evenings, weekends)" 
                      required 
                      className="bg-blue-950/70 border-sky-600 text-white placeholder:text-sky-100/50 focus:border-sky-400 transition-colors duration-300" 
                    />
                  </motion.div>
                  <motion.div whileFocus={{ scale: 1.02 }}>
                    <Input 
                      name="resume" 
                      value={app.resume} 
                      onChange={onChange} 
                      placeholder="Resume or portfolio link (Google Drive, PDF, LinkedIn)" 
                      className="bg-blue-950/70 border-sky-600 text-white placeholder:text-sky-100/50 focus:border-sky-400 transition-colors duration-300" 
                    />
                  </motion.div>

                  <div className="flex gap-3 pt-2">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        type="submit" 
                        className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 transition-all duration-300"
                      >
                        Submit Application
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        asChild 
                        variant="outline" 
                        className="rounded-2xl border-sky-400 text-sky-300 hover:bg-sky-500/20 transition-all duration-300"
                      >
                        <a href="mailto:info.studycore@gmail.com?subject=Tutor%20Application">Email Instead</a>
                      </Button>
                    </motion.div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

export default StudyCoreSite;