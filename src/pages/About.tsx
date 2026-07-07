/* ============================================================
   About.tsx — Empire Claims Group
   Design: Dark Luxury Modernism
   ============================================================ */

import { motion } from "framer-motion";
import { Link } from "wouter";
import { Shield, Award, Users, Building, ChevronRight, CheckCircle } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="section-label mb-4">{children}</div>;
}
function GoldRule() {
  return (
    <div style={{ width: "3rem", height: "2px", background: "oklch(0.72 0.1 75)", marginBottom: "1rem" }} />
  );
}

export default function About() {
  return (
    <div style={{ background: "oklch(0.1 0.008 265)", paddingTop: "5rem" }}>
      {/* Page Header */}
      <section
        className="py-20 lg:py-28 relative overflow-hidden"
        style={{ background: "oklch(0.08 0.006 265)" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663473234294/3Vm3ELXiU44ppu3Ku6KCbm/ecg-inspection-SkdoNe7KDUDNibbMDDNJGH.webp)`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        />
        <div className="absolute inset-0" style={{ background: "oklch(0.08 0.006 265 / 0.8)" }} />
        <div className="container relative z-10">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <SectionLabel>About Empire Claims Group</SectionLabel>
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
              }}
            >
              California-Based Public Adjusting Firm
            </motion.h1>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              <motion.div variants={fadeUp}>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "1.05rem",
                    color: "oklch(0.65 0.01 265)",
                    lineHeight: 1.85,
                    marginBottom: "1.5rem",
                  }}
                >
                  Empire Claims Group is a California public adjusting firm focused on helping policyholders navigate complex property insurance claims. We work exclusively for the insured — not the insurance company — to help document damage, organize claims, and manage the process with professionalism and urgency.
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "1.05rem",
                    color: "oklch(0.65 0.01 265)",
                    lineHeight: 1.85,
                  }}
                >
                  We understand that property damage can disrupt your home, your business, and your financial stability. Our approach is built on clarity, precision, and policyholder advocacy.
                </p>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-10 flex flex-col gap-3">
                {[
                  "We work exclusively for policyholders",
                  "Residential and commercial claim expertise",
                  "Detail-driven documentation and preparation",
                  "Professional, structured claim management",
                  "California licensed public adjuster",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle size={16} style={{ color: "oklch(0.72 0.1 75)", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", color: "oklch(0.75 0.01 265)" }}>
                      {item}
                    </span>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} className="mt-10">
                <Link href="/contact">
                  <span className="btn-gold">
                    Request a Free Claim Review
                    <ChevronRight size={14} />
                  </span>
                </Link>
              </motion.div>
            </motion.div>

            {/* Trust strip + image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="flex flex-col gap-6"
            >
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663473234294/3Vm3ELXiU44ppu3Ku6KCbm/ecg-inspection-SkdoNe7KDUDNibbMDDNJGH.webp"
                alt="Empire Claims Group adjuster at work"
                className="w-full object-cover"
                style={{ height: "360px", borderRadius: "2px" }}
              />

              {/* Trust strip */}
              <div
                className="grid grid-cols-2 gap-3"
              >
                {[
                  { icon: <Shield size={18} />, label: "California Public Adjuster" },
                  { icon: <Award size={18} />, label: "License No. 2N60148" },
                  { icon: <Building size={18} />, label: "Residential & Commercial Claims" },
                  { icon: <Users size={18} />, label: "Policyholder Representation" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-4"
                    style={{
                      background: "oklch(0.13 0.01 265)",
                      border: "1px solid oklch(0.22 0.01 265)",
                      borderRadius: "2px",
                    }}
                  >
                    <span style={{ color: "oklch(0.72 0.1 75)", flexShrink: 0 }}>{item.icon}</span>
                    <span
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "oklch(0.75 0.01 265)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-20"
        style={{ background: "oklch(0.08 0.006 265)", borderTop: "1px solid oklch(0.18 0.01 265)" }}
      >
        <div className="container text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2
              variants={fadeUp}
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                color: "oklch(0.94 0.005 65)",
                marginBottom: "1rem",
              }}
            >
              Ready to Get Started?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "1rem",
                color: "oklch(0.6 0.01 265)",
                marginBottom: "2rem",
                maxWidth: "32rem",
                margin: "0 auto 2rem",
              }}
            >
              Contact us today for a free, no-obligation review of your property insurance claim.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link href="/contact">
                <span className="btn-gold">Request Claim Review <ChevronRight size={14} /></span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
