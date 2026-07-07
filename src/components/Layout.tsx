/* ============================================================
   Layout.tsx — Empire Claims Group
   Design: Dark Luxury Modernism
   Sticky header with transparent-to-solid scroll behavior,
   gold accent nav links, mobile hamburger menu, footer.
   ============================================================ */

import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Phone, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Claims We Handle", href: "/claims" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.1 0.008 265)" }}>
      {/* STICKY HEADER */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? "oklch(0.1 0.008 265 / 0.97)"
            : "oklch(0.1 0.008 265 / 0.15)",
          backdropFilter: "blur(12px)",
          borderBottom: scrolled ? "1px solid oklch(0.22 0.01 265)" : "1px solid transparent",
        }}
      >
        <div className="container">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/">
              <div className="flex flex-col leading-none">
                <span
                  className="font-heading font-800 tracking-tight"
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: "1.1rem",
                    color: "oklch(0.94 0.005 65)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  EMPIRE CLAIMS GROUP
                </span>
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "0.6rem",
                    fontWeight: 500,
                    letterSpacing: "0.18em",
                    color: "oklch(0.72 0.1 75)",
                    textTransform: "uppercase",
                  }}
                >
                  California Public Adjuster · Lic. 2N60148
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <span
                    className="transition-colors duration-200 relative group"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: "0.78rem",
                      fontWeight: 500,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: location === link.href
                        ? "oklch(0.72 0.1 75)"
                        : "oklch(0.75 0.01 265)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { if (location !== link.href) (e.currentTarget as HTMLElement).style.color = 'oklch(0.94 0.005 65)'; }}
                    onMouseLeave={(e) => { if (location !== link.href) (e.currentTarget as HTMLElement).style.color = 'oklch(0.75 0.01 265)'; }}
                  >
                    {link.label}
                    <span
                      className="absolute -bottom-0.5 left-0 h-px transition-all duration-300"
                      style={{
                        background: "oklch(0.72 0.1 75)",
                        width: location === link.href ? "100%" : "0%",
                      }}
                    />
                  </span>
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Link href="/contact">
                <span className="btn-gold text-xs">
                  Free Claim Review
                  <ChevronRight size={14} />
                </span>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ color: "oklch(0.94 0.005 65)" }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                background: "oklch(0.12 0.01 265)",
                borderTop: "1px solid oklch(0.22 0.01 265)",
                overflow: "hidden",
              }}
            >
              <div className="container py-6 flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <span
                      className="flex items-center justify-between py-2"
                      style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: location === link.href
                          ? "oklch(0.72 0.1 75)"
                          : "oklch(0.94 0.005 65)",
                        borderBottom: "1px solid oklch(0.22 0.01 265)",
                      }}
                    >
                      {link.label}
                      <ChevronRight size={16} style={{ color: "oklch(0.72 0.1 75)" }} />
                    </span>
                  </Link>
                ))}
                <Link href="/contact">
                  <span className="btn-gold w-full justify-center mt-2">
                    Free Claim Review
                  </span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* PAGE CONTENT */}
      <main className="flex-1">
        {children}
      </main>

      {/* FOOTER */}
      <footer
        style={{
          background: "oklch(0.08 0.006 265)",
          borderTop: "1px solid oklch(0.18 0.01 265)",
        }}
      >
        <div className="container py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Brand */}
            <div className="flex flex-col gap-4">
              <div>
                <div
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: "1.1rem",
                    color: "oklch(0.94 0.005 65)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  EMPIRE CLAIMS GROUP
                </div>
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "0.65rem",
                    fontWeight: 500,
                    letterSpacing: "0.18em",
                    color: "oklch(0.72 0.1 75)",
                    textTransform: "uppercase",
                    marginTop: "0.25rem",
                  }}
                >
                  California Public Adjuster
                </div>
              </div>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "0.85rem",
                  color: "oklch(0.55 0.01 265)",
                  lineHeight: 1.7,
                }}
              >
                We represent policyholders — not insurance companies.
              </p>
              <div
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "0.75rem",
                  color: "oklch(0.5 0.01 265)",
                }}
              >
                License No. 2N60148
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <div
                className="section-label mb-5"
                style={{ color: "oklch(0.72 0.1 75)" }}
              >
                Navigation
              </div>
              <div className="flex flex-col gap-3">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <span
                      className="transition-colors duration-200"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "0.85rem",
                        color: "oklch(0.55 0.01 265)",
                      }}
                    >
                      {link.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <div className="section-label mb-5">Contact</div>
              <div className="flex flex-col gap-3">
                <Link href="/contact">
                  <span className="btn-gold text-xs">Request Claim Review</span>
                </Link>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.8rem",
                    color: "oklch(0.5 0.01 265)",
                    lineHeight: 1.7,
                    marginTop: "0.5rem",
                  }}
                >
                  Public adjuster licensing can be verified through the California Department of Insurance.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-4"
            style={{ borderTop: "1px solid oklch(0.18 0.01 265)" }}
          >
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.75rem",
                color: "oklch(0.4 0.01 265)",
              }}
            >
              © {new Date().getFullYear()} Empire Claims Group. All rights reserved. California Public Adjuster License No. 2N60148.
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.75rem",
                color: "oklch(0.4 0.01 265)",
              }}
            >
              This website is for informational purposes only.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Floating CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 lg:hidden z-40 p-4"
        style={{
          background: "linear-gradient(to top, oklch(0.1 0.008 265) 60%, transparent)",
        }}
      >
        <Link href="/contact">
          <span
            className="btn-gold w-full justify-center"
            style={{ display: "flex" }}
          >
            <Phone size={14} />
            Free Claim Review
          </span>
        </Link>
      </div>
    </div>
  );
}
