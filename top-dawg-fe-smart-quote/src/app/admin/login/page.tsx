import { LoginForm } from '@/components/admin/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  return (
    <div style={{ maxWidth: '26rem', margin: '2rem auto' }}>
      <h1 style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>Administrator sign in</h1>
      <p className="muted small" style={{ marginBottom: '1.25rem' }}>
        The carrier, rule and rate configuration behind every quote lives here.
      </p>
      {denied ? (
        <p className="notice notice-danger" style={{ marginBottom: '1rem' }}>
          That account does not have administrator access.
        </p>
      ) : null}
      <LoginForm />
    </div>
  );
}
