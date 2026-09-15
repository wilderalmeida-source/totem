export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { auditOutbox } = await import('./lib/persistent-audit')
    auditOutbox.start()
  }
}
