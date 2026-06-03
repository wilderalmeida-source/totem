export function parseBRDate(br: string): string | null { //______________CONVERTE A DATA EM UMA DATA ACEITAVEL PELO CLINUX___________
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = Number(dd),
    mo = Number(mm),
    
    y = Number(yyyy);

  const dt = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
  const ok =
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === mo - 1 &&

    dt.getUTCDate() === d;
  return ok ? dt.toISOString().replace(".000", "") : null;
}
