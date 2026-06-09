import { VivaSession, VIVA_DISCIPLINE_LABELS } from './viva-types';

export function buildVivaMarkdown(session: VivaSession): string {
  const { config, turns, verdict, rubricScores } = session;
  const date = new Date(session.createdAt).toLocaleString();
  const discipline = VIVA_DISCIPLINE_LABELS[config.discipline] ?? config.discipline;

  const header = [
    '# Viva Exam Transcript',
    '',
    `**Date:** ${date}`,
    `**Discipline:** ${discipline}`,
    `**Topic:** ${config.topic}`,
    `**Difficulty:** ${config.difficulty}`,
    config.candidateName ? `**Candidate:** ${config.candidateName}` : '',
    config.examinerName  ? `**Examiner:** ${config.examinerName}`   : '',
    '',
    '---',
    '',
    '## Transcript',
    '',
  ].filter((l) => l !== undefined).join('\n');

  const transcript = turns
    .filter((t) => t.role !== 'system')
    .map((t) => {
      const label = t.role === 'examiner' ? '**[EXAMINER]**' : '**[CANDIDATE]**';
      const interrupted = t.interrupted ? ' *(interrupted)*' : '';
      return `${label} ${t.text}${interrupted}`;
    })
    .join('\n\n');

  const verdictSection = verdict
    ? `\n\n---\n\n## Verdict\n\n${verdict}`
    : '';

  const rubricSection = rubricScores
    ? [
        '',
        '',
        '---',
        '',
        '## Rubric Scores',
        '',
        '| Dimension | Score |',
        '|---|---|',
        `| Clarity | ${rubricScores.clarity}/10 |`,
        `| Depth | ${rubricScores.depth}/10 |`,
        `| Defensibility | ${rubricScores.defensibility}/10 |`,
        `| Composure | ${rubricScores.composure}/10 |`,
        `| Time Management | ${rubricScores.timeManagement}/10 |`,
        `| **Overall Average** | **${(Object.values(rubricScores).reduce((a, b) => a + b, 0) / 5).toFixed(1)}/10** |`,
      ].join('\n')
    : '';

  return header + transcript + verdictSection + rubricSection;
}

export function downloadVivaTranscript(session: VivaSession): void {
  const md = buildVivaMarkdown(session);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `viva-${session.id}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
