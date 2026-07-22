export function formatarDataNascimento(data?: string | null): string {
    if (!data) return '';

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
        return data;
    }

    const dataSemHorario = data.substring(0, 10);
    const [ano, mes, dia] = dataSemHorario.split('-');

    if (!ano || !mes || !dia) {
        return data;
    }

    return `${dia}/${mes}/${ano}`;
}