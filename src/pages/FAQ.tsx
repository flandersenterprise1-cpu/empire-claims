/* ============================================================
   FAQ.tsx — Empire Claims Group
   Design: Dark Luxury Modernism
   ============================================================ */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { ChevronDown, ChevronRight } from "lucide-react";

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

const faqs = [
  {
    q: "What does a public adjuster do?",
    a: "A public adjuster represents the policyholder in the insurance claims process by documenting damage, preparing the claim, and communicating with the insurance company. We work on your behalf — not the insurer's — to help ensure your claim is properly evaluated and presented.",
  },
  {
    q: "Do you work for me or the insurance company?",
    a: "We work for you — the policyholder. Empire Claims Group is entirely on your side. We have no relationship with or obligation to your insurance company. Our role is to advocate for your interests throughout the claims process.",
  },
  {
    q: "When should I hire a public adjuster?",
    a: "When your property has experienced significant damage or your claim becomes complex. If you're dealing with a large loss, a disputed claim, a delayed settlement, or you simply want professional representation, a public adjuster can provide structured support.",
  },
  {
    q: "Can you help with underpaid claims?",
    a: "Yes, we assist with reviewing and reopening underpaid claims. If you believe your settlement was insufficient or that damage was overlooked, we can review your claim, document additional losses, and work to have your claim properly re-evaluated.",
  },
  {
    q: "Do you handle commercial claims?",
    a: "Yes, we assist both residential and commercial property claims. This includes office buildings, retail spaces, restaurants, warehouses, multi-unit properties, and investment properties.",
  },
  {
    q: "Are you licensed in California?",
    a: "Yes. Empire Claims Group is a California Licensed Public Adjuster. License No. 2N60148. Our licensing can be verified through the California Department of Insurance.",
  },
  {
    q: "How do I get started?",
    a: "Submit a claim review request through our contact form or reach out to us directly. We'll review your situation and let you know how we can assist — at no obligation.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderBottom: "1px solid oklch(0.22 0.01 265)",
      }}
    >
      <button
        className="w-full flex items-center justify-between py-5 text-left gap-4"
        onClick={() => setOpen(!open)}
      >
        <span
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: "1rem",
            color: open ? "oklch(0.82 0.1 75)" : "oklch(0.94 0.005 65)",
            transition: "color 0.2s",
          }}
        >
          {q}
        </span>
        <ChevronDown
          size={18}
          style={{
            color: "oklch(0.72 0.1 75)",
            flexShrink: 0,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s",
          }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: "hidden" }}
          >
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.95rem",
                color: "oklch(0.65 0.01 265)",
                lineHeight: 1.8,
                paddingBottom: "1.5rem",
                paddingLeft: "0",
              }}
            >
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  return (
    <div style={{ background: "oklch(0.1 0.008 265)", paddingTop: "5rem" }}>
      {/* Page Header */}
      <section
        className="py-20 lg:py-28 relative overflow-hidden"
        style={{ background: "oklch(0.08 0.006 265)" }}
      >
        <div className="container relative z-10">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <SectionLabel>Frequently Asked Questions</SectionLabel>
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
              Common Questions About Public Adjusting
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
              Find answers to the most common questions about our services and how we can help with your property insurance claim.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-20 lg:py-28">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
            >
              {faqs.map((faq, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <FAQItem q={faq.q} a={faq.a} />
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="mt-14 p-8"
              style={{
                background: "oklch(0.13 0.01 265)",
                border: "1px solid oklch(0.22 0.01 265)",
                borderLeft: "3px solid oklch(0.72 0.1 75)",
                borderRadius: "2px",
              }}
            >
              <h3
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "oklch(0.94 0.005 65)",
                  marginBottom: "0.75rem",
                }}
              >
                Have a question we didn't answer?
              </h3>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.9rem",
                  color: "oklch(0.6 0.01 265)",
                  lineHeight: 1.7,
                  marginBottom: "1.5rem",
                }}
              >
                Contact us directly and we'll be happy to answer any questions about your specific situation.
              </p>
              <Link href="/contact">
                <span className="btn-gold">
                  Contact Us
                  <ChevronRight size={14} />
                </span>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
