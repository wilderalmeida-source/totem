exports.summarize = function summarize(samples) {
  const completed = samples.filter(s => s.kind === 'completed');
  const times = completed.map(s => s.ms).sort((a, b) => a - b);
  return { completed: completed.length, networkFailures: samples.filter(s => s.kind === 'failed').length,
    httpErrors: completed.filter(s => s.status >= 400).length,
    averageMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
    p95Ms: times.length ? times[Math.ceil(times.length * .95) - 1] : null };
};
