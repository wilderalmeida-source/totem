"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prefixName = exports.cpf = exports.birthDate = exports.patientName = exports.positiveId = exports.REFINE_SEARCH = exports.SEARCH_LIMIT = void 0;
exports.todayBrazil = todayBrazil;
const zod_1 = require("zod");
exports.SEARCH_LIMIT = 100;
exports.REFINE_SEARCH = 'Muitos resultados. Digite mais informações para refinar a busca.';
exports.positiveId = zod_1.z.string().regex(/^[1-9]\d*$/).transform(Number).refine(Number.isSafeInteger);
exports.patientName = zod_1.z.string().trim().min(1).max(150);
exports.birthDate = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/)
    .refine(value => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value.slice(0, 10);
}, 'Data inválida.')
    .transform(value => new Date(value.slice(0, 10)));
function todayBrazil() {
    return new Date(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10));
}
exports.cpf = zod_1.z.string().regex(/^\d{11}$/);
exports.prefixName = exports.patientName.refine(value => {
    const name = value.toUpperCase();
    return name.length >= 5 && !(name.length <= 7 && ['MARIA', 'JOAO', 'JOSÉ', 'JOSE'].some(common => name.includes(common)));
}, 'Digite mais informações para pesquisar pelo nome.');
