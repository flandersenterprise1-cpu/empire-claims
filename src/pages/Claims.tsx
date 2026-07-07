/* ============================================================
   Claims.tsx — Empire Claims Group
   Design: Dark Luxury Modernism
   ============================================================ */

import { motion } from "framer-motion";
import { Link } from "wouter";
import { House, Building, Building2, ShoppingBag, UtensilsCrossed, Warehouse, TrendingUp, Users, ChevronRight } from "lucide-react";

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

const clientTypes = [
  {
    icon: <House size={32} />,
    title: "Homeowners",
    desc: "We assist homeowners navigating residential property insurance claims, from documentation through settlement.",
  },
  {
    icon: <Building2 size={32} />,
    title: "Apartment & Multi-Unit Owners",
    desc: "Multi-unit property claims require comprehensive documentation across multiple units. We handle the complexity.",
  },
  {
    icon: <ShoppingBag size={32} />,
    title: "Retail Businesses",
    desc: "Retail property damage can disrupt operations and revenue. We work to ensure your claim is fully and properly presented.",
  },
  {
    icon: <Building size={32} />,
    title: "Office Buildings",
    desc: "Commercial office property claims involve complex assessments. We provide structured, professional claim support.",
  },
  {
    icon: <UtensilsCrossed size={32} />,
    title: "Restaurants",
    desc: "Restaurant property damage can be devastating. We help document all losses and manage the claim process.",
  },
  {
    icon: <Warehouse size={32} />,
    title: "Warehouses",
    desc: "Industrial and warehouse property claims require specialized knowledge. We bring the expertise needed.",
  },
  {
    icon: <TrendingUp size={32} />,
    title: "Investment Properties",
    desc: "Protect the value of your investment. We advocate for thorough claim evaluation on investment properties.",
  },
  {
    icon: <Users size={32} />,
    title: "Policyholders with Delayed or Underpaid Claims",
    desc: "If your claim has stalled or been underpaid, we can review your situation and help you understand your options.",
  },
];

export default function Claims() {
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
            backgroundImage: `url(https://d2xsxph8kpxj0f.cloudfront.net/310519663473234294/3Vm3ELXiU44ppu3Ku6KCbm/ecg-water-damage-HdUbRckE3UWRK8DWgpCJAq.webp)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0" style={{ background: "oklch(0.08 0.006 265 / 0.85)" }} />
        <div className="container relative z-10">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <SectionLabel>Claims We Handle</SectionLabel>
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
              Who We Work With
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
              Empire Claims Group assists a wide range of policyholders — from individual homeowners to large commercial property owners.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Client Types Grid */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {clientTypes.map((client, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="p-7 flex flex-col gap-4"
                style={{
                  background: "oklch(0.13 0.01 265)",
                  border: "1px solid oklch(0.22 0.01 265)",
                  borderRadius: "2px",
                }}
                whileHover={{ borderColor: "oklch(0.72 0.1 75)", y: -4, transition: { duration: 0.2 } }}
              >
                <div style={{ color: "oklch(0.72 0.1 75)" }}>{client.icon}</div>
                <h3
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "oklch(0.94 0.005 65)",
                  }}
                >
                  {client.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.85rem",
                    color: "oklch(0.55 0.01 265)",
                    lineHeight: 1.7,
                  }}
                >
                  {client.desc}
                </p>
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
              Not Sure If We Can Help?
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
              Contact us for a free review. We'll assess your situation and let you know how we can assist.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link href="/contact">
                <span className="btn-gold">Get a Free Claim Review <ChevronRight size={14} /></span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
