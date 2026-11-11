"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noticeSettings = void 0;
const zod_1 = require("zod");
exports.noticeSettings = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    items: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().uuid(), title: zod_1.z.string().trim().min(1).max(120),
        text: zod_1.z.string().trim().min(1).max(700),
        icon: zod_1.z.enum(['info', 'alert', 'results', 'calendar', 'heart']),
        category: zod_1.z.enum(['informativos', 'avisos', 'orientacoes', 'campanhas']).optional(),
        images: zod_1.z.array(zod_1.z.object({ file: zod_1.z.string().regex(/^notice-[0-9a-f-]{36}\.webp$/), alt: zod_1.z.string().trim().max(160) }).strict()).max(4).optional(),
        durationSeconds: zod_1.z.number().int().min(5).max(300), active: zod_1.z.boolean(),
    }).strict()).max(50),
}).strict().refine(value => new Set(value.items.map(item => item.id)).size === value.items.length, 'Informativos duplicados');
