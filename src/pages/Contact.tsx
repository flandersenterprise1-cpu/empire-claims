/* ============================================================
   Contact.tsx — Empire Claims Group
   Design: Dark Luxury Modernism
   ============================================================ */

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Award, Users, CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";

// Formspree endpoint (free email-delivery for form submissions). Set
// VITE_FORMSPREE_ENDPOINT in your host's environment variables, e.g.
// https://formspree.io/f/xxxxxxxx
const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT as
  | string
  | undefined;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="section-label mb-4">{children}</div>;
}
function GoldRule() {
  return <div style={{ width: "3rem", height: "2px", background: "oklch(0.72 0.1 75)", marginBottom: "1rem" }} />;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "oklch(0.13 0.01 265)",
  border: "1px solid oklch(0.28 0.01 265)",
  borderRadius: "2px",
  padding: "0.75rem 1rem",
  fontFamily: "'Inter', sans-serif",
  fontSize: "0.9rem",
  color: "oklch(0.94 0.005 65)",
  outline: "none",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: "0.72rem",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: "oklch(0.6 0.01 265)",
  marginBottom: "0.4rem",
  display: "block",
};

const damageTypes = [
  "Fire Damage",
  "Smoke Damage",
  "Water Damage",
  "Storm / Wind Damage",
  "Vandalism / Theft",
  "Commercial Property Loss",
  "Underpaid / Delayed Claim",
  "Other",
];

const contactTimes = [
  "Morning (8am – 12pm)",
  "Afternoon (12pm – 5pm)",
  "Evening (5pm – 8pm)",
  "Anytime",
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    damageType: "",
    dateOfLoss: "",
    insuranceCompany: "",
    description: "",
    bestTime: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!FORMSPREE_ENDPOINT) {
      toast.error(
        "The contact form isn't set up yet. Please call or email us directly.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          _subject: `New Claim Review Request — ${form.name}`,
          Name: form.name,
          Phone: form.phone,
          Email: form.email,
          "Property Address": form.address,
          "Type of Damage": form.damageType,
          "Date of Loss": form.dateOfLoss,
          "Insurance Company": form.insuranceCompany,
          "Description of Claim": form.description,
          "Best Time to Contact": form.bestTime,
          "Service Requested": "Free Claim Review",
        }),
      });

      if (!res.ok) throw new Error("Request failed");

      setSubmitted(true);
      toast.success("Your claim review request has been received!");
    } catch {
      toast.error(
        "Something went wrong. Please try again, or call us directly.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: "oklch(0.1 0.008 265)", paddingTop: "5rem" }}>
      {/* Page Header */}
      <section
        className="py-20 lg:py-24 relative overflow-hidden"
        style={{ background: "oklch(0.08 0.006 265)" }}
      >
        <div className="container relative z-10">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <SectionLabel>Get Started</SectionLabel>
              <GoldRule />
            </motion.div>
            <motion.h1
              variants={fadeUp}
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 800,
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                color: "oklch(0.94 0.005 65)",
                lineHeight: 1.1,
                maxWidth: "40rem",
                marginBottom: "1rem",
              }}
            >
              Request Your Free Claim Review
            </motion.h1>
            <motion.p
              variants={fadeUp}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "1rem",
                color: "oklch(0.6 0.01 265)",
                maxWidth: "36rem",
                lineHeight: 1.8,
              }}
            >
              Complete the form below and a member of our team will be in touch to discuss your property insurance claim.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Form + Sidebar */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-10 text-center"
                  style={{
                    background: "oklch(0.13 0.01 265)",
                    border: "1px solid oklch(0.72 0.1 75 / 0.4)",
                    borderRadius: "2px",
                  }}
                >
                  <CheckCircle size={48} style={{ color: "oklch(0.72 0.1 75)", margin: "0 auto 1.5rem" }} />
                  <h2
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 800,
                      fontSize: "1.5rem",
                      color: "oklch(0.94 0.005 65)",
                      marginBottom: "0.75rem",
                    }}
                  >
                    Request Received
                  </h2>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.95rem",
                      color: "oklch(0.65 0.01 265)",
                      lineHeight: 1.7,
                    }}
                  >
                    Thank you for reaching out to Empire Claims Group. A member of our team will review your information and contact you shortly.
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  initial="hidden"
                  animate="visible"
                  variants={stagger}
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-5"
                >
                  {/* Row: Name + Phone */}
                  <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label style={labelStyle}>Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={form.name}
                        onChange={handleChange}
                        placeholder="John Smith"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="(555) 000-0000"
                        style={inputStyle}
                      />
                    </div>
                  </motion.div>

                  {/* Email */}
                  <motion.div variants={fadeUp}>
                    <label style={labelStyle}>Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      style={inputStyle}
                    />
                  </motion.div>

                  {/* Property Address */}
                  <motion.div variants={fadeUp}>
                    <label style={labelStyle}>Property Address *</label>
                    <input
                      type="text"
                      name="address"
                      required
                      value={form.address}
                      onChange={handleChange}
                      placeholder="123 Main St, Los Angeles, CA 90001"
                      style={inputStyle}
                    />
                  </motion.div>

                  {/* Row: Damage Type + Date of Loss */}
                  <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label style={labelStyle}>Type of Damage *</label>
                      <select
                        name="damageType"
                        required
                        value={form.damageType}
                        onChange={handleChange}
                        style={{ ...inputStyle, cursor: "pointer" }}
                      >
                        <option value="" disabled>Select damage type</option>
                        {damageTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Date of Loss</label>
                      <input
                        type="date"
                        name="dateOfLoss"
                        value={form.dateOfLoss}
                        onChange={handleChange}
                        style={{ ...inputStyle, colorScheme: "dark" }}
                      />
                    </div>
                  </motion.div>

                  {/* Insurance Company */}
                  <motion.div variants={fadeUp}>
                    <label style={labelStyle}>Insurance Company</label>
                    <input
                      type="text"
                      name="insuranceCompany"
                      value={form.insuranceCompany}
                      onChange={handleChange}
                      placeholder="e.g. State Farm, Allstate, Farmers..."
                      style={inputStyle}
                    />
                  </motion.div>

                  {/* Description */}
                  <motion.div variants={fadeUp}>
                    <label style={labelStyle}>Description of Claim *</label>
                    <textarea
                      name="description"
                      required
                      value={form.description}
                      onChange={handleChange}
                      placeholder="Please describe the damage and your current situation..."
                      rows={5}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                  </motion.div>

                  {/* Best Time */}
                  <motion.div variants={fadeUp}>
                    <label style={labelStyle}>Best Time to Contact</label>
                    <select
                      name="bestTime"
                      value={form.bestTime}
                      onChange={handleChange}
                      style={{ ...inputStyle, cursor: "pointer" }}
                    >
                      <option value="">Select preferred time</option>
                      {contactTimes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-gold"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        opacity: submitting ? 0.7 : 1,
                        cursor: submitting ? "not-allowed" : "pointer",
                      }}
                    >
                      <Send size={14} />
                      {submitting ? "Submitting…" : "Submit Claim Review Request"}
                    </button>
                  </motion.div>

                  <motion.div variants={fadeUp}>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.78rem",
                        color: "oklch(0.45 0.01 265)",
                        lineHeight: 1.6,
                      }}
                    >
                      By submitting this form, you agree to be contacted by Empire Claims Group regarding your property insurance claim. This is a free, no-obligation review.
                    </p>
                  </motion.div>
                </motion.form>
              )}
            </div>

            {/* Sidebar */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="flex flex-col gap-5"
            >
              {/* Trust block */}
              <motion.div
                variants={fadeUp}
                className="p-7"
                style={{
                  background: "oklch(0.13 0.01 265)",
                  border: "1px solid oklch(0.22 0.01 265)",
                  borderRadius: "2px",
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "oklch(0.94 0.005 65)",
                    marginBottom: "1.25rem",
                  }}
                >
                  Why Contact Us?
                </h3>
                <div className="flex flex-col gap-4">
                  {[
                    { icon: <Shield size={16} />, text: "Policyholder-focused representation" },
                    { icon: <Award size={16} />, text: "California-based, License No. 2N60148" },
                    { icon: <Users size={16} />, text: "Free, no-obligation claim review" },
                    { icon: <CheckCircle size={16} />, text: "Residential & commercial claims" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span style={{ color: "oklch(0.72 0.1 75)", flexShrink: 0, marginTop: "1px" }}>{item.icon}</span>
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "0.85rem",
                          color: "oklch(0.7 0.01 265)",
                          lineHeight: 1.5,
                        }}
                      >
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* License block */}
              <motion.div
                variants={fadeUp}
                className="p-6"
                style={{
                  background: "oklch(0.72 0.1 75 / 0.08)",
                  border: "1px solid oklch(0.72 0.1 75 / 0.3)",
                  borderRadius: "2px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "oklch(0.72 0.1 75)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Licensed & Verified
                </div>
                <div
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "oklch(0.94 0.005 65)",
                    marginBottom: "0.5rem",
                  }}
                >
                  California Public Adjuster
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.8rem",
                    color: "oklch(0.65 0.01 265)",
                    lineHeight: 1.6,
                  }}
                >
                  License No. 2N60148. Verifiable through the California Department of Insurance.
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
