import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="wordmark">
            TOP DAWG <span className="accent">FE SMART QUOTE</span>
          </Link>
          <nav className="nav-links">
            <Link href="/quote">New quote</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </div>
      </header>

      <main className="shell stack-lg">
        <section className="card">
          <p className="badge badge-gold">For licensed agents</p>
          <h1 style={{ fontSize: '1.9rem', marginTop: '0.75rem' }}>
            Three steps to a Super Quote.
          </h1>
          <p className="muted" style={{ marginTop: '0.6rem', maxWidth: '44rem' }}>
            Enter the client basics, run a short health interview that only asks what it needs to,
            and get a ranked comparison across every carrier you are appointed with — with the
            likely benefit classification, the monthly premium, the reason for the ranking and a
            backup carrier.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
            <Link href="/quote" className="btn btn-gold">
              Start a quote
            </Link>
            <Link href="/admin" className="btn btn-ghost">
              Carrier admin
            </Link>
          </div>
        </section>

        <section
          style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))' }}
        >
          {[
            {
              title: 'Every decision is traceable',
              body: 'Rankings come from stored, verified carrier rules — carrier, product, state, condition, lookback, source document and page. No language model decides eligibility.',
            },
            {
              title: 'Real premiums only',
              body: 'A premium is shown only when it comes from an exact published rate-table row. Otherwise the result reads “Rate unavailable”.',
            },
            {
              title: 'Nothing is guaranteed',
              body: 'Results are a pre-qualification guide. The carrier makes the final underwriting decision on every case.',
            },
            {
              title: 'Minimal client data',
              body: 'No names, no SSNs, no banking or beneficiary details. Quotes run on an anonymous session ID and expire on their own.',
            },
          ].map((item) => (
            <div key={item.title} className="card">
              <h2 style={{ fontSize: '1.05rem' }}>{item.title}</h2>
              <p className="muted small" style={{ marginTop: '0.5rem' }}>
                {item.body}
              </p>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
