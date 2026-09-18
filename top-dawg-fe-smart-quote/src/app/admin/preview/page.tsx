import { adminGuard } from '@/lib/admin-guard';
import { getDb } from '@/db/client';
import { loadActiveQuestions } from '@/modules/catalog/repository';
import { PreviewTool } from '@/components/admin/PreviewTool';

export const dynamic = 'force-dynamic';

export default async function PreviewPage() {
  await adminGuard();
  const questions = await loadActiveQuestions(getDb());

  return (
    <div className="stack-lg">
      <div>
        <h1 style={{ fontSize: '1.5rem' }}>Preview a configuration change</h1>
        <p className="muted small" style={{ marginTop: '0.3rem' }}>
          Runs the engine against a test client without creating a quote session. Turn on “include
          inactive” to see what a carrier will do <em>before</em> you publish it.
        </p>
      </div>
      <PreviewTool questions={questions} />
    </div>
  );
}
