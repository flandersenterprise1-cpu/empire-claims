/* ============================================================
   Services.tsx — Empire Claims Group
   Design: Dark Luxury Modernism
   ============================================================ */

import { motion } from "framer-motion";
import { Link } from "wouter";
import { House, Building, Flame, Droplets, Wind, RefreshCw, AlertTriangle, ChevronRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="section-label mb-4">{children}</div>;
}
function GoldRule() {
  return <div style={{ width: "3rem", height: "2px", background: "oklch(0.72 0.1 75)", marginBottom: "1rem" }} />;
}

const services = [
  {
    icon: <House size={28} />,
    title: "Residential Claims",
    desc: "We assist homeowners in documenting damage and managing the insurance claim process from start to finish, ensuring your interests are protected at every step.",
  },
  {
    icon: <Building size={28} />,
    title: "Commercial Claims",
    desc: "We support business owners and property investors with complex claims and loss recovery. Commercial property claims require specialized expertise — we provide it.",
  },
  {
    icon: <Flame size={28} />,
    title: "Fire & Smoke Damage",
    desc: "Detailed documentation and claim preparation for fire-related losses. Fire damage claims are among the most complex — we handle every aspect with precision.",
  },
  {
    icon: <Droplets size={28} />,
    title: "Water Damage",
    desc: "Support for leaks, flooding, and water-related property damage. We document the full scope of water damage and prepare a comprehensive claim on your behalf.",
  },
  {
    icon: <Wind size={28} />,
    title: "Storm & Wind Damage",
    desc: "Claim handling for weather-related property losses including wind, hail, and storm damage. We ensure all damage is properly documented and presented.",
  },
  {
    icon: <RefreshCw size={28} />,
    title: "Supplemental Claims",
    desc: "We help revisit claims that may have been underpaid or incomplete. If additional damage was discovered or overlooked, we can file a supplemental claim.",
  },
  {
    icon: <AlertTriangle size={28} />,
    title: "Underpaid / Delayed Claims",
    desc: "We step in when claims are not progressing or have been improperly evaluated. If you believe your settlement was insufficient, we can review and challenge it.",
  },
];

export default function Services() {
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
            backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663473234294/3Vm3ELXiU44ppu3Ku6KCbm/ecg-fire-damage-dGcHrgiiLasyMGGJFAfJX3.webp)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0" style={{ background: "oklch(0.08 0.006 265 / 0.85)" }} />
        <div className="container relative z-10">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <SectionLabel>What We Offer</SectionLabel>
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
              Public Adjusting Services for California Property Claims
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
              Empire Claims Group assists policyholders with the preparation, presentation, and negotiation of property insurance claims.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {services.map((service, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="p-8 flex gap-6"
                style={{
                  background: "oklch(0.13 0.01 265)",
                  border: "1px solid oklch(0.22 0.01 265)",
                  borderRadius: "2px",
                  transition: "border-color 0.2s",
                }}
                whileHover={{ borderColor: "oklch(0.72 0.1 75)", y: -4, transition: { duration: 0.2 } }}
              >
                <div
                  className="flex-shrink-0 p-3 self-start"
                  style={{
                    background: "oklch(0.72 0.1 75 / 0.1)",
                    color: "oklch(0.72 0.1 75)",
                    borderRadius: "2px",
                  }}
                >
                  {service.icon}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      color: "oklch(0.94 0.005 65)",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {service.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "0.9rem",
                      color: "oklch(0.6 0.01 265)",
                      lineHeight: 1.75,
                    }}
                  >
                    {service.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
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
              Ready to Discuss Your Claim?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "1rem",
                color: "oklch(0.6 0.01 265)",
                maxWidth: "32rem",
                margin: "0 auto 2rem",
                lineHeight: 1.8,
              }}
            >
              Contact us for a free, no-obligation review of your property insurance claim situation.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link href="/contact">
                <span className="btn-gold">Request Free Claim Review <ChevronRight size={14} /></span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
