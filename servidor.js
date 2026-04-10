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
const client = new MercadoPagoConfig({ accessToken: 'TEST-4608088952900793-040517-7206be949252905145f791b8d94f83ee-656782665', options: { timeout: 5000 } });

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
                    identification: {
                        type: 'CPF',
                        number: '19119119100'
                    }
                }
            },
            requestOptions: {
                idempotencyKey: crypto.randomUUID() 
            }
        });

        console.log(`✅ PIX gerado no Mercado Pago com sucesso! ID: ${resultado.id}`);
        
        // MODIFICAÇÃO AQUI: Agora devolvemos o ID da transação junto com o QR Code
        res.json({ 
            qr_code_copia_cola: resultado.point_of_interaction.transaction_data.qr_code,
            id_transacao: resultado.id
        });

    } catch (error) {
        console.log("⚠️ Acionando Modo Salva-Vidas (PIX Simulado)...");
        res.json({
            qr_code_copia_cola: "00020101021126580014br.gov.bcb.pix0136[PIX-SIMULADO-DE-TESTE-NOSSA-CARNE]5204000053039865802BR5911NossaCarne6009SaoPaulo62070503***63041A2B",
            id_transacao: "simulado_123" // ID fake para o teste funcionar
        });
    }
});

// ========================================================
// 3. NOVA ROTA: O "Vigia" do Pagamento
// ========================================================
app.get('/consultar-pix/:id', async (req, res) => {
    const pagamentoId = req.params.id;
    console.log(`🔍 Verificando status do PIX ID: ${pagamentoId}`);

    // Se for o nosso PIX de teste, a gente aprova direto para você testar o fluxo!
    if (pagamentoId === "simulado_123") {
        return res.json({ status: 'approved' });
    }

    try {
        const payment = new Payment(client);
        const resultado = await payment.get({ id: pagamentoId });
        
        // Retorna o status oficial (ex: 'pending', 'approved', 'rejected')
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