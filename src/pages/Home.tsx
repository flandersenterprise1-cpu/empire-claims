/* ============================================================
   Home.tsx — Empire Claims Group
   Design: Dark Luxury Modernism
   All sections: Hero, Trust Strip, Why ECG, What We Do,
   Types of Claims, Why Hire PA, Our Process, Who We Help,
   Authority, Testimonials, Final CTA
   ============================================================ */

import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ChevronRight, Shield, FileText, Search,
  RefreshCw, AlertTriangle, Flame, Droplets, Wind,
  Building, Building2, Users, Star, CheckCircle, Phone,
  ArrowRight, ClipboardList, Scale, Award, House
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="section-label mb-4">{children}</div>
  );
}

function GoldRule() {
  return (
    <div
      style={{
        width: "3rem",
        height: "2px",
        background: "oklch(0.72 0.1 75)",
        marginBottom: "1rem",
      }}
    />
  );
}

export default function Home() {
  return (
    <div style={{ background: "oklch(0.1 0.008 265)" }}>
      {/* ===== HERO SECTION ===== */}
      <section
        className="relative min-h-screen flex items-center overflow-hidden"
        style={{ paddingTop: "5rem" }}
      >
        {/* Background image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663473234294/3Vm3ELXiU44ppu3Ku6KCbm/ecg-hero-bg-UXquU37rsvUdyNpDbdd5K6.webp)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Dark overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(105deg, oklch(0.08 0.008 265 / 0.95) 45%, oklch(0.1 0.008 265 / 0.6) 100%)",
          }}
        />

        <div className="container relative z-10">
          <div className="max-w-3xl">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              transition={{ delayChildren: 0.2 }}
            >
              <motion.div variants={fadeUp}>
                <SectionLabel>California Public Adjusting Firm · Lic. 2N60148</SectionLabel>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "clamp(2.8rem, 6vw, 5rem)",
                  lineHeight: 1.05,
                  color: "oklch(0.94 0.005 65)",
                  letterSpacing: "-0.02em",
                  marginBottom: "1.5rem",
                }}
              >
                California Public Adjusters for{" "}
                <em style={{ color: "oklch(0.82 0.1 75)", fontStyle: "italic" }}>
                  Serious
                </em>{" "}
                Property Claims
              </motion.h1>

              <motion.p
                variants={fadeUp}
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "1.1rem",
                  color: "oklch(0.72 0.01 265)",
                  lineHeight: 1.75,
                  maxWidth: "36rem",
                  marginBottom: "2.5rem",
                }}
              >
                Empire Claims Group represents homeowners, property owners, and businesses in insurance claims. We document the damage, handle the process, and fight for a fair settlement under your policy.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
                <Link href="/contact">
                  <span className="btn-gold">
                    Get a Free Claim Review
                    <ChevronRight size={16} />
                  </span>
                </Link>
                <Link href="/contact">
                  <span className="btn-outline-gold">
                    Speak With a Public Adjuster
                  </span>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32"
          style={{
            background: "linear-gradient(to top, oklch(0.1 0.008 265), transparent)",
          }}
        />
      </section>

      {/* ===== TRUST STRIP ===== */}
      <section
        style={{
          background: "oklch(0.13 0.01 265)",
          borderTop: "1px solid oklch(0.22 0.01 265)",
          borderBottom: "1px solid oklch(0.22 0.01 265)",
        }}
      >
        <div className="container py-5">
          <div className="flex flex-wrap items-center justify-center md:justify-between gap-6">
            {[
              { icon: <Shield size={14} />, text: "California Public Adjuster" },
              { icon: <Users size={14} />, text: "Policyholder Representation" },
              { icon: <Building size={14} />, text: "Residential & Commercial Claims" },
              { icon: <Award size={14} />, text: "License No. 2N60148" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "oklch(0.72 0.1 75)",
                }}
              >
                {item.icon}
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== WHY EMPIRE CLAIMS GROUP ===== */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative order-2 lg:order-1"
            >
              <div
                className="relative overflow-hidden"
                style={{ borderRadius: "2px" }}
              >
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663473234294/3Vm3ELXiU44ppu3Ku6KCbm/ecg-inspection-SkdoNe7KDUDNibbMDDNJGH.webp"
                  alt="Public adjuster inspecting property damage"
                  className="w-full object-cover"
                  style={{ height: "480px" }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(to bottom right, oklch(0.1 0.008 265 / 0.3), transparent)",
                  }}
                />
              </div>
              {/* Gold accent card */}
              <div
                className="absolute -bottom-6 -right-6 p-5"
                style={{
                  background: "oklch(0.13 0.01 265)",
                  border: "1px solid oklch(0.22 0.01 265)",
                  borderLeft: "3px solid oklch(0.72 0.1 75)",
                  maxWidth: "220px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "2.5rem",
                    fontWeight: 700,
                    color: "oklch(0.72 0.1 75)",
                    lineHeight: 1,
                  }}
                >
                  100%
                </div>
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "oklch(0.6 0.01 265)",
                    marginTop: "0.25rem",
                  }}
                >
                  Policyholder Focused
                </div>
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="order-1 lg:order-2"
            >
              <motion.div variants={fadeUp}>
                <SectionLabel>Why Empire Claims Group</SectionLabel>
                <GoldRule />
                <h2
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                    color: "oklch(0.94 0.005 65)",
                    lineHeight: 1.1,
                    marginBottom: "1.5rem",
                  }}
                >
                  We Represent You —{" "}
                  <span style={{ color: "oklch(0.72 0.1 75)" }}>Not the Insurance Company</span>
                </h2>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "1rem",
                    color: "oklch(0.65 0.01 265)",
                    lineHeight: 1.8,
                    marginBottom: "2rem",
                  }}
                >
                  When property damage occurs, the insurance process can become overwhelming, technical, and time-sensitive. Empire Claims Group steps in to help organize, document, and manage your claim with precision and professionalism. Our role is to advocate for you — the policyholder — and help ensure your claim is properly evaluated and handled.
                </p>
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-col gap-3">
                {[
                  "Detail-driven claim preparation",
                  "Strategic negotiation approach",
                  "Policyholder-first representation",
                  "Professional claim management",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle size={16} style={{ color: "oklch(0.72 0.1 75)", flexShrink: 0 }} />
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.9rem",
                        color: "oklch(0.75 0.01 265)",
                      }}
                    >
                      {item}
                    </span>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} className="mt-8">
                <Link href="/about">
                  <span className="btn-outline-gold">
                    Learn About Us
                    <ArrowRight size={14} />
                  </span>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== WHAT WE DO ===== */}
      <section
        style={{
          background: "oklch(0.13 0.01 265)",
          borderTop: "1px solid oklch(0.18 0.01 265)",
        }}
        className="py-24 lg:py-32"
      >
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp}>
              <SectionLabel>Our Services</SectionLabel>
              <GoldRule />
              <h2
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                  color: "oklch(0.94 0.005 65)",
                  lineHeight: 1.1,
                }}
              >
                What We Do
              </h2>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              { icon: <FileText size={20} />, title: "Policy Review", desc: "Thorough analysis of your insurance policy to identify coverage and entitlements." },
              { icon: <Search size={20} />, title: "Damage Documentation", desc: "Comprehensive photographic and written documentation of all property damage." },
              { icon: <ClipboardList size={20} />, title: "Claim Preparation", desc: "Professional preparation of your claim with supporting evidence and documentation." },
              { icon: <Scale size={20} />, title: "Insurance Negotiation", desc: "Strategic negotiation with your insurance company on your behalf." },
              { icon: <RefreshCw size={20} />, title: "Supplemental Claims", desc: "Identifying and filing supplemental claims for additional damage or overlooked items." },
              { icon: <AlertTriangle size={20} />, title: "Underpaid Claim Support", desc: "Reviewing and challenging claims that were improperly evaluated or underpaid." },
            ].map((service, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="group p-6 transition-all duration-300"
                style={{
                  background: "oklch(0.1 0.008 265)",
                  border: "1px solid oklch(0.22 0.01 265)",
                  borderRadius: "2px",
                  cursor: "default",
                }}
                whileHover={{
                  borderColor: "oklch(0.72 0.1 75)",
                  y: -4,
                  transition: { duration: 0.2 },
                }}
              >
                <div
                  className="mb-4 p-2 inline-flex"
                  style={{
                    background: "oklch(0.72 0.1 75 / 0.1)",
                    color: "oklch(0.72 0.1 75)",
                    borderRadius: "2px",
                  }}
                >
                  {service.icon}
                </div>
                <h3
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "oklch(0.94 0.005 65)",
                    marginBottom: "0.5rem",
                  }}
                >
                  {service.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.85rem",
                    color: "oklch(0.55 0.01 265)",
                    lineHeight: 1.7,
                  }}
                >
                  {service.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center mt-10">
            <Link href="/services">
              <span className="btn-gold">
                View All Services
                <ChevronRight size={14} />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== TYPES OF CLAIMS ===== */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.div variants={fadeUp}>
                <SectionLabel>Claims We Handle</SectionLabel>
                <GoldRule />
                <h2
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                    color: "oklch(0.94 0.005 65)",
                    lineHeight: 1.1,
                    marginBottom: "2rem",
                  }}
                >
                  Types of Claims
                </h2>
              </motion.div>

              <motion.div variants={stagger} className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Flame size={16} />, label: "Fire Damage" },
                  { icon: <Wind size={16} />, label: "Smoke Damage" },
                  { icon: <Droplets size={16} />, label: "Water Damage" },
                  { icon: <Wind size={16} />, label: "Storm & Wind Damage" },
                  { icon: <AlertTriangle size={16} />, label: "Vandalism & Theft" },
                  { icon: <Building size={16} />, label: "Commercial Property Loss" },
                  { icon: <House size={16} />, label: "Residential Property Claims" },
                  { icon: <RefreshCw size={16} />, label: "Reopened & Underpaid Claims" },
                ].map((claim, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    className="flex items-center gap-3 py-3 px-4"
                    style={{
                      background: "oklch(0.13 0.01 265)",
                      border: "1px solid oklch(0.22 0.01 265)",
                      borderRadius: "2px",
                    }}
                  >
                    <span style={{ color: "oklch(0.72 0.1 75)" }}>{claim.icon}</span>
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        color: "oklch(0.8 0.01 265)",
                      }}
                    >
                      {claim.label}
                    </span>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} className="mt-8">
                <Link href="/claims">
                  <span className="btn-outline-gold">
                    See Who We Help
                    <ArrowRight size={14} />
                  </span>
                </Link>
              </motion.div>
            </motion.div>

            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663473234294/3Vm3ELXiU44ppu3Ku6KCbm/ecg-fire-damage-dGcHrgiiLasyMGGJFAfJX3.webp"
                alt="Fire damage to property"
                className="w-full object-cover"
                style={{ height: "500px", borderRadius: "2px" }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(to bottom, transparent 50%, oklch(0.1 0.008 265 / 0.6))",
                  borderRadius: "2px",
                }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== WHY HIRE A PUBLIC ADJUSTER ===== */}
      <section
        style={{
          background: "oklch(0.13 0.01 265)",
          borderTop: "1px solid oklch(0.18 0.01 265)",
        }}
        className="py-24 lg:py-32"
      >
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663473234294/3Vm3ELXiU44ppu3Ku6KCbm/ecg-water-damage-HdUbRckE3UWRK8DWgpCJAq.webp"
                alt="Water damage in property"
                className="w-full object-cover"
                style={{ height: "460px", borderRadius: "2px" }}
              />
            </motion.div>

            {/* Content */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.div variants={fadeUp}>
                <SectionLabel>Why Hire a Public Adjuster</SectionLabel>
                <GoldRule />
                <h2
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                    color: "oklch(0.94 0.005 65)",
                    lineHeight: 1.1,
                    marginBottom: "1.5rem",
                  }}
                >
                  Your Insurance Company Has Experts —{" "}
                  <span style={{ color: "oklch(0.72 0.1 75)" }}>You Should Too</span>
                </h2>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "1rem",
                    color: "oklch(0.65 0.01 265)",
                    lineHeight: 1.8,
                  }}
                >
                  A public adjuster works for the policyholder, not the insurance company. We help evaluate damage, prepare your claim, and advocate on your behalf so you're not navigating a complex process alone. Empire Claims Group provides structured, detail-driven claim support designed to protect your interests.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== OUR PROCESS ===== */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp}>
              <SectionLabel>How It Works</SectionLabel>
              <GoldRule />
              <h2
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                  color: "oklch(0.94 0.005 65)",
                  lineHeight: 1.1,
                }}
              >
                Our Process
              </h2>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="relative"
          >
            {/* Connecting line */}
            <div
              className="hidden lg:block absolute top-10 left-0 right-0 h-px"
              style={{ background: "oklch(0.22 0.01 265)", zIndex: 0 }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 relative z-10">
              {[
                { step: "01", title: "Free Claim Review", desc: "We begin with a no-obligation review of your situation." },
                { step: "02", title: "Property & Policy Evaluation", desc: "We assess your property and analyze your insurance policy." },
                { step: "03", title: "Damage Documentation", desc: "Comprehensive documentation of all damage with supporting evidence." },
                { step: "04", title: "Claim Preparation & Strategy", desc: "We prepare and present your claim with a strategic approach." },
                { step: "05", title: "Negotiation & Resolution", desc: "We negotiate with your insurer to reach a fair resolution." },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="flex flex-col items-center text-center"
                >
                  <div
                    className="w-20 h-20 flex items-center justify-center mb-5"
                    style={{
                      background: "oklch(0.13 0.01 265)",
                      border: "2px solid oklch(0.72 0.1 75)",
                      borderRadius: "50%",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        color: "oklch(0.72 0.1 75)",
                      }}
                    >
                      {step.step}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      color: "oklch(0.94 0.005 65)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.8rem",
                      color: "oklch(0.55 0.01 265)",
                      lineHeight: 1.6,
                    }}
                  >
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== WHO WE HELP ===== */}
      <section
        style={{
          background: "oklch(0.13 0.01 265)",
          borderTop: "1px solid oklch(0.18 0.01 265)",
        }}
        className="py-24 lg:py-32"
      >
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-12">
              <SectionLabel>Who We Serve</SectionLabel>
              <GoldRule />
              <h2
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                  color: "oklch(0.94 0.005 65)",
                  lineHeight: 1.1,
                }}
              >
                Who We Help
              </h2>
            </motion.div>

            <motion.div
              variants={stagger}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
            >
              {[
                { icon: <House size={24} />, label: "Homeowners" },
                { icon: <Building2 size={24} />, label: "Business Owners" },
                { icon: <Building size={24} />, label: "Commercial Property Owners" },
                { icon: <Users size={24} />, label: "Multi-Family Property Owners" },
                { icon: <Shield size={24} />, label: "Landlords" },
                { icon: <AlertTriangle size={24} />, label: "Delayed or Underpaid Claims" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="flex flex-col items-center text-center p-5 gap-3"
                  style={{
                    background: "oklch(0.1 0.008 265)",
                    border: "1px solid oklch(0.22 0.01 265)",
                    borderRadius: "2px",
                  }}
                >
                  <div style={{ color: "oklch(0.72 0.1 75)" }}>{item.icon}</div>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      color: "oklch(0.75 0.01 265)",
                      lineHeight: 1.4,
                    }}
                  >
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== AUTHORITY POSITIONING ===== */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.div variants={fadeUp}>
                <SectionLabel>Our Approach</SectionLabel>
                <GoldRule />
                <h2
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                    color: "oklch(0.94 0.005 65)",
                    lineHeight: 1.1,
                    marginBottom: "2rem",
                  }}
                >
                  Built for{" "}
                  <span style={{ color: "oklch(0.72 0.1 75)" }}>High-Stakes Claims</span>
                </h2>
              </motion.div>

              <motion.div variants={stagger} className="flex flex-col gap-4">
                {[
                  { icon: <FileText size={18} />, title: "Detail-Driven Claim Preparation", desc: "Every claim we handle is documented with precision and thoroughness." },
                  { icon: <Scale size={18} />, title: "Strategic Negotiation Approach", desc: "We approach every negotiation with a clear strategy and your interests first." },
                  { icon: <Shield size={18} />, title: "Policyholder-First Representation", desc: "Our loyalty is entirely to you — never to the insurance company." },
                  { icon: <Award size={18} />, title: "Professional Claim Management", desc: "From start to finish, we manage your claim with professionalism and urgency." },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    className="flex gap-4 p-5"
                    style={{
                      background: "oklch(0.13 0.01 265)",
                      border: "1px solid oklch(0.22 0.01 265)",
                      borderLeft: "3px solid oklch(0.72 0.1 75)",
                      borderRadius: "2px",
                    }}
                  >
                    <div
                      style={{
                        color: "oklch(0.72 0.1 75)",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontFamily: "'Syne', sans-serif",
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          color: "oklch(0.94 0.005 65)",
                          marginBottom: "0.25rem",
                        }}
                      >
                        {item.title}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "0.82rem",
                          color: "oklch(0.55 0.01 265)",
                          lineHeight: 1.6,
                        }}
                      >
                        {item.desc}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Stats block */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { value: "CA", label: "Licensed in California", sub: "Public Adjuster" },
                { value: "100%", label: "Policyholder", sub: "Representation" },
                { value: "Res.", label: "Residential", sub: "& Commercial" },
                { value: "Free", label: "Initial Claim", sub: "Review" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="p-6 flex flex-col justify-center"
                  style={{
                    background: "oklch(0.13 0.01 265)",
                    border: "1px solid oklch(0.22 0.01 265)",
                    borderRadius: "2px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "2.8rem",
                      fontWeight: 700,
                      color: "oklch(0.72 0.1 75)",
                      lineHeight: 1,
                      marginBottom: "0.5rem",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "oklch(0.94 0.005 65)",
                    }}
                  >
                    {stat.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: "0.7rem",
                      color: "oklch(0.55 0.01 265)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {stat.sub}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section
        style={{
          background: "oklch(0.13 0.01 265)",
          borderTop: "1px solid oklch(0.18 0.01 265)",
        }}
        className="py-24 lg:py-32"
      >
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center mb-14">
              <SectionLabel>Client Testimonials</SectionLabel>
              <GoldRule />
              <h2
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 800,
                  fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
                  color: "oklch(0.94 0.005 65)",
                  lineHeight: 1.1,
                }}
              >
                What Our Clients Say
              </h2>
            </motion.div>

            <motion.div
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {[
                {
                  quote: "Empire Claims Group stepped in when my insurance company was giving me the runaround after a major fire. They documented everything and handled the entire process professionally. I couldn't have navigated this alone.",
                  name: "Michael T.",
                  role: "Homeowner, Los Angeles County",
                },
                {
                  quote: "After a severe water damage event at my commercial property, I was overwhelmed. Empire Claims Group took over the claim process and handled everything with precision. Their attention to detail made a real difference.",
                  name: "Sandra R.",
                  role: "Commercial Property Owner",
                },
                {
                  quote: "I had an underpaid claim that had been sitting for months. Empire Claims Group reviewed my policy, documented additional damage, and helped me reopen the claim. I'm glad I reached out when I did.",
                  name: "James L.",
                  role: "Multi-Family Property Owner",
                },
              ].map((testimonial, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="p-7 flex flex-col gap-5"
                  style={{
                    background: "oklch(0.1 0.008 265)",
                    border: "1px solid oklch(0.22 0.01 265)",
                    borderRadius: "2px",
                  }}
                >
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, j) => (
                      <Star
                        key={j}
                        size={14}
                        fill="oklch(0.72 0.1 75)"
                        style={{ color: "oklch(0.72 0.1 75)" }}
                      />
                    ))}
                  </div>
                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "1.05rem",
                      fontStyle: "italic",
                      color: "oklch(0.78 0.01 265)",
                      lineHeight: 1.7,
                    }}
                  >
                    "{testimonial.quote}"
                  </p>
                  <div className="mt-auto pt-4" style={{ borderTop: "1px solid oklch(0.22 0.01 265)" }}>
                    <div
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        color: "oklch(0.94 0.005 65)",
                      }}
                    >
                      {testimonial.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: "0.72rem",
                        color: "oklch(0.72 0.1 75)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {testimonial.role}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section
        className="relative py-28 lg:py-36 overflow-hidden"
        style={{ background: "oklch(0.08 0.006 265)" }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663473234294/3Vm3ELXiU44ppu3Ku6KCbm/ecg-hero-bg-UXquU37rsvUdyNpDbdd5K6.webp)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "oklch(0.08 0.006 265 / 0.85)" }}
        />

        <div className="container relative z-10 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp}>
              <SectionLabel>Get Started Today</SectionLabel>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "clamp(2rem, 5vw, 3.8rem)",
                color: "oklch(0.94 0.005 65)",
                lineHeight: 1.1,
                marginBottom: "1.5rem",
              }}
            >
              Don't Navigate a Major Insurance Claim Alone
            </motion.h2>
            <motion.p
              variants={fadeUp}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "1.05rem",
                color: "oklch(0.65 0.01 265)",
                lineHeight: 1.8,
                maxWidth: "36rem",
                margin: "0 auto 2.5rem",
              }}
            >
              If your property has experienced serious damage, we're ready to review your situation and help you understand your options.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap gap-4 justify-center"
            >
              <Link href="/contact">
                <span className="btn-gold">
                  Request Claim Review
                  <ChevronRight size={16} />
                </span>
              </Link>
              <Link href="/contact">
                <span className="btn-outline-gold">
                  <Phone size={14} />
                  Call Now
                </span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
