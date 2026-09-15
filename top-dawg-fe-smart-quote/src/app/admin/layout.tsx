import Link from 'next/link';

export const metadata = { title: 'Admin · Top Dawg FE Smart Quote' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/admin" className="wordmark">
            TOP DAWG <span className="accent">ADMIN</span>
          </Link>
          <nav className="nav-links">
            <Link href="/admin">Carriers</Link>
            <Link href="/admin/questions">Questions</Link>
            <Link href="/admin/preview">Preview</Link>
            <Link href="/admin/audit">Audit log</Link>
            <Link href="/quote">Quote tool</Link>
          </nav>
        </div>
      </header>
      <main className="shell">{children}</main>
    </>
  );
}
