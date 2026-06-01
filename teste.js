const net = require("net");

// ─── Configurações ───────────────────────────────────────────────
const HOST = "127.0.0.1";
const PORT = 2345;
const DELAY_ENTRE_LOTES = 500; // ms entre lotes
const CONCORRENTES_POR_LOTE = 3; // simultâneos por lote

// ─── Mensagens de teste ──────────────────────────────────────────
const mensagens = [
    "D-FN-0001-06-TOTEM                           -WILDER LUIS BARBOZA                                             -TOTEM                           -GUICHE",
    "D-FN-0002-01-TOTEM                           -MARIA DA SILVA                                                   -TOTEM                           -GUICHE",
    "D-FN-0003-02-TOTEM                           -JOAO PEDRO SANTOS                                               -TOTEM                           -GUICHE",
    "D-FN-0004-03-TOTEM                           -ANA PAULA FERREIRA                                              -TOTEM                           -GUICHE",
    "D-FN-0005-00-TOTEM                           -CARLOS EDUARDO LIMA                                             -TOTEM                           -GUICHE",
    "D-FN-9155-04-TOTEM                           -                                                                 -TOTEM                           -GUICHE",
    "D-FN-9156-05-TOTEM                           -                                                                 -TOTEM                           -GUICHE",
    "D-FN-9157-07-TOTEM                           -TESTE SIMULTANEO A                                              -TOTEM                           -GUICHE",
    "D-FN-9158-08-TOTEM                           -TESTE SIMULTANEO B                                              -TOTEM                           -GUICHE",
    "D-FN-9159-09-TOTEM                           -TESTE SIMULTANEO C                                              -TOTEM                           -GUICHE",
    // Mensagem malformada (sem hífens suficientes — testa o fallback)
    "MALFORMADA SEM HIFENS",
    // Campo tail vazio
    "D-FN--04-TOTEM-NOME-TOTEM-GUICHE",
];

// ─── Estatísticas ────────────────────────────────────────────────
const stats = { ok: 0, erro: 0, total: 0 };

// ─── Função: envia uma mensagem TCP ─────────────────────────────
function enviarMensagem(msg, index) {
    return new Promise((resolve) => {
        const client = new net.Socket();
        const inicio = Date.now();

        client.connect(PORT, HOST, () => {
            console.log(`[${index}] ✅ Conectado → enviando: "${msg.slice(0, 60).trim()}..."`);
            client.write(msg, "utf8");
        });

        client.on("data", (data) => {
            console.log(`[${index}] 📥 Resposta: ${data.toString().slice(0, 80)}`);
        });

        client.on("close", () => {
            const ms = Date.now() - inicio;
            stats.ok++;
            console.log(`[${index}] 🔒 Conexão fechada (${ms}ms)`);
            resolve({ index, status: "ok", ms });
        });

        client.on("error", (err) => {
            stats.erro++;
            console.error(`[${index}] ❌ Erro: ${err.message}`);
            resolve({ index, status: "erro", msg: err.message });
        });

        // Fecha após envio (simula cliente que só envia)
        setTimeout(() => client.destroy(), 3000);
    });
}

// ─── Função: lote simultâneo ─────────────────────────────────────
async function executarLote(lote, numLote) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`🚀 LOTE ${numLote} — ${lote.length} conexões SIMULTÂNEAS`);
    console.log(`${"─".repeat(60)}`);
    const promises = lote.map(({ msg, index }) => enviarMensagem(msg, index));
    return Promise.all(promises);
}

// ─── Main ────────────────────────────────────────────────────────
async function main() {
    console.log(`\n🧪 TCP STRESS TEST → ${HOST}:${PORT}`);
    console.log(`📦 Total de mensagens: ${mensagens.length}`);
    console.log(`⚡ Simultâneas por lote: ${CONCORRENTES_POR_LOTE}`);
    console.log(`⏱  Delay entre lotes: ${DELAY_ENTRE_LOTES}ms\n`);

    stats.total = mensagens.length;

    // Divide em lotes
    const lotes = [];
    for (let i = 0; i < mensagens.length; i += CONCORRENTES_POR_LOTE) {
        lotes.push(
            mensagens.slice(i, i + CONCORRENTES_POR_LOTE).map((msg, j) => ({
                msg,
                index: i + j + 1,
            }))
        );
    }

    for (let i = 0; i < lotes.length; i++) {
        await executarLote(lotes[i], i + 1);
        if (i < lotes.length - 1) {
            console.log(`\n⏳ Aguardando ${DELAY_ENTRE_LOTES}ms antes do próximo lote...`);
            await new Promise((r) => setTimeout(r, DELAY_ENTRE_LOTES));
        }
    }

    console.log(`\n${"═".repeat(60)}`);
    console.log(`📊 RESULTADO FINAL`);
    console.log(`   Total enviados : ${stats.total}`);
    console.log(`   ✅ Sucesso      : ${stats.ok}`);
    console.log(`   ❌ Erros        : ${stats.erro}`);
    console.log(`${"═".repeat(60)}\n`);
}

main().catch(console.error);