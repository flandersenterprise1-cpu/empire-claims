import Link from 'next/link';
import { QuoteWizard } from '@/components/quote/QuoteWizard';

export const metadata = { title: 'New quote · Top Dawg FE Smart Quote' };

export default function QuotePage() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="wordmark">
            TOP DAWG <span className="accent">FE SMART QUOTE</span>
          </Link>
          <nav className="nav-links">
            <Link href="/admin">Admin</Link>
          </nav>
        </div>
      </header>
      <main className="shell">
        <QuoteWizard />
      </main>
    </>
  );
}
