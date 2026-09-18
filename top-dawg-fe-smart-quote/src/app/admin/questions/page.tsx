import { asc } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { healthQuestions } from '@/db/schema';
import { adminGuard } from '@/lib/admin-guard';
import { HEALTH_CATEGORY_LABELS } from '@/lib/constants';
import { RecordForm } from '@/components/admin/RecordForm';
import { ActionButton } from '@/components/admin/ActionButton';
import { CRITERIA_HELP } from '@/components/admin/field-options';

export const dynamic = 'force-dynamic';

const ANSWER_TYPE_OPTIONS = [
  { value: 'boolean', label: 'Yes / No' },
  { value: 'single_select', label: 'Single select' },
  { value: 'multi_select', label: 'Multi select' },
  { value: 'integer', label: 'Whole number' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'months_ago', label: 'Months ago' },
  { value: 'text', label: 'Free text' },
  { value: 'height_weight', label: 'Height & weight' },
  { value: 'medication_list', label: 'Medication list' },
];

export default async function QuestionsPage() {
  await adminGuard();
  const db = getDb();
  const questions = await db
    .select()
    .from(healthQuestions)
    .orderBy(asc(healthQuestions.sortOrder));

  const questionFields = [
    { name: 'prompt', label: 'Question', type: 'textarea' as const, required: true, wide: true },
    { name: 'helpText', label: 'Help text', type: 'textarea' as const, wide: true },
    { name: 'category', label: 'Category', type: 'text' as const, required: true },
    { name: 'answerType', label: 'Answer type', type: 'select' as const, options: ANSWER_TYPE_OPTIONS, required: true },
    { name: 'sortOrder', label: 'Sort order', type: 'number' as const, required: true },
    { name: 'factPath', label: 'Fact path', type: 'text' as const, help: 'What rules reference, e.g. diabetes.treatment. End a gate question with ".present".' },
    { name: 'isRequired', label: 'Required', type: 'checkbox' as const },
    { name: 'isActive', label: 'Active', type: 'checkbox' as const },
    { name: 'options', label: 'Options (JSON)', type: 'json' as const, wide: true, placeholder: '[{"value":"insulin","label":"Insulin"}]' },
    { name: 'showWhen', label: 'Show when (JSON)', type: 'json' as const, wide: true, help: `${CRITERIA_HELP} For branching, "fact" is another question's code.`, placeholder: '{"all":[{"fact":"diabetes_present","op":"eq","value":true}]}' },
  ];

  return (
    <div className="stack-lg">
      <div>
        <h1 style={{ fontSize: '1.5rem' }}>Health interview</h1>
        <p className="muted small" style={{ marginTop: '0.3rem' }}>
          {questions.filter((q) => q.isActive).length} active questions.{' '}
          {questions.filter((q) => q.showWhen != null).length} are conditional follow-ups that only
          appear when their gate is answered a certain way.
        </p>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Type</th>
                <th>Fact path</th>
                <th>Shows when</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => (
                <tr key={question.id} style={{ opacity: question.isActive ? 1 : 0.5 }}>
                  <td className="tiny mono">{question.sortOrder}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{question.prompt}</div>
                    <div className="tiny mono muted">
                      {question.code} · {HEALTH_CATEGORY_LABELS[question.category] ?? question.category} · v
                      {question.version}
                    </div>
                  </td>
                  <td className="tiny">{question.answerType}</td>
                  <td className="tiny mono">{question.factPath ?? '—'}</td>
                  <td className="tiny mono" style={{ maxWidth: '16rem' }}>
                    {question.showWhen ? JSON.stringify(question.showWhen) : 'Always'}
                  </td>
                  <td>
                    <ActionButton
                      url={`/api/admin/questions/${question.id}`}
                      method="PATCH"
                      body={{ isActive: !question.isActive }}
                      label={question.isActive ? 'Deactivate' : 'Activate'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RecordForm
        summary="Add a question"
        endpoint="/api/admin/questions"
        submitLabel="Create question"
        fields={[
          { name: 'code', label: 'Code', type: 'text', required: true, help: 'Stable machine name. Rules and branching conditions reference it.' },
          ...questionFields,
        ]}
      />

      <details className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 650 }}>Edit an existing question</summary>
        <div className="stack" style={{ marginTop: '1rem' }}>
          {questions.map((question) => (
            <details key={question.id} className="card card-tight">
              <summary style={{ cursor: 'pointer' }}>
                <span className="mono tiny">{question.code}</span> — {question.prompt.slice(0, 70)}
              </summary>
              <div style={{ marginTop: '0.75rem' }}>
                <RecordForm
                  alwaysOpen
                  endpoint={`/api/admin/questions/${question.id}`}
                  method="PATCH"
                  submitLabel="Save question"
                  initial={question as unknown as Record<string, unknown>}
                  fields={questionFields}
                />
              </div>
            </details>
          ))}
        </div>
      </details>
    </div>
  );
}
