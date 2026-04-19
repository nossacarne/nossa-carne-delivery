const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const crypto = require('crypto');
const path = require('path'); // Ferramenta para ler pastas

const app = express();
app.use(cors());
app.use(express.json());

// 1. MÁGICA: Ensina o servidor a exibir o seu site que está na pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// COLE O SEU ACCESS TOKEN DO MERCADO PAGO AQUI:
const client = new MercadoPagoConfig({ accessToken: 'APP_USR-7463754427993645-041909-65dc8b9e14c46eaad67076562b1178ec-656782665', options: { timeout: 5000 } });

// 2. Rota de geração de PIX
app.post('/gerar-pix', async (req, res) => {
    console.log("👉 Iniciando pedido de PIX. Valor: R$", req.body.valorTotal);

    try {
        const valorTotal = Number(req.body.valorTotal);
        const payment = new Payment(client);

        const resultado = await payment.create({
            body: {
                transaction_amount: valorTotal,
                description: 'Pedido Nossa Carne',
                payment_method_id: 'pix',
                payer: {
                    email: 'testevip@nossacarne.com.br',
                    first_name: 'Cliente',
                    last_name: 'Teste',
                    identification: { type: 'CPF', number: '19119119100' }
                }
            },
            requestOptions: { idempotencyKey: crypto.randomUUID() }
        });

        console.log(`✅ PIX gerado no Mercado Pago com sucesso! ID: ${resultado.id}`);

        // CORREÇÃO AQUI: Garantindo que a "foto" do QR Code (base64) seja enviada ao site
        res.json({
            qr_code_copia_cola: resultado.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: resultado.point_of_interaction.transaction_data.qr_code_base64,
            id_transacao: resultado.id
        });

    } catch (error) {
        console.error("⚠️ Erro ao gerar PIX no Mercado Pago:", error);
        res.status(500).json({ erro: "Falha ao gerar o pagamento." });
    }
});

// ========================================================
// 3. NOVA ROTA: O "Vigia" do Pagamento
// ========================================================
app.get('/consultar-pix/:id', async (req, res) => {
    const pagamentoId = req.params.id;

    try {
        const payment = new Payment(client);
        const resultado = await payment.get({ id: pagamentoId });

        // O GRANDE DETETIVE: Agora o servidor vai "gritar" no log qual é o status exato!
        console.log(`🔍 O status real do PIX ${pagamentoId} é: ${resultado.status}`);

        res.json({ status: resultado.status });

    } catch (error) {
        console.error("❌ Erro ao consultar o Mercado Pago:", error);
        res.status(500).json({ erro: "Erro ao consultar o status do pagamento." });
    }
});

// 4. Adaptador de Nuvem: Usa a porta da nuvem ou a 3001 no seu PC
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`✅ Servidor da Nossa Carne rodando perfeitamente na porta ${PORT}!`);
});
