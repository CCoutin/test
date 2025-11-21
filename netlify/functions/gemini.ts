import { Handler } from "@netlify/functions";
import { GoogleGenAI, Type, FunctionDeclaration, Chat, Part, Content } from "@google/genai";
import { Parceiro, Movimentacao, NotaFiscal, Material, Colaborador, AIActionConfirmation } from '../../types';

// Helper para inicializar o cliente
const getAiClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API key not valid. Please set the API_KEY environment variable in Netlify.");
    }
    return new GoogleGenAI({ apiKey });
};

const registerStockMovement: FunctionDeclaration = {
    name: 'registerStockMovement',
    description: 'Registra uma nova movimentação de estoque: entrada, saída ou consumo de material.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            materialName: { type: Type.STRING, description: 'O nome exato do material a ser movimentado.' },
            quantity: { type: Type.NUMBER, description: 'A quantidade de itens a ser movimentada.' },
            collaboratorName: { type: Type.STRING, description: 'O nome exato do colaborador que está realizando a movimentação.' },
            type: { type: Type.STRING, description: 'O tipo de movimentação.', enum: ['entrada', 'saida', 'consumo'] },
            invoiceNumber: { type: Type.STRING, description: 'O número da nota fiscal associada à entrada. Opcional.' }
        },
        required: ['materialName', 'quantity', 'collaboratorName', 'type'],
    },
};

const getSystemInstruction = (context: any) => {
    const dataContext = `
        **Materiais em Estoque:**
        ${JSON.stringify(context.materials.map((m: Material) => ({ id: m.id, nome: m.nome, quantidade: m.quantidade })), null, 2)}

        **Colaboradores:**
        ${JSON.stringify(context.collaborators.map((c: Colaborador) => ({ id: c.id, nome: c.nome })), null, 2)}
    `;

    return `
        Você é o "Assistente Gestor One", um analista de dados e negócios sênior para uma revendedora de ferramentas.
        Sua principal função é analisar os dados da empresa para responder a perguntas e EXECUTAR AÇÕES.

        Suas capacidades são:
        1.  **Análise de Dados:** Responder perguntas complexas cruzando informações de materiais, movimentações, notas fiscais, parceiros e colaboradores.
        2.  **Execução de Ações:** Você pode registrar novas movimentações de estoque (entradas, saídas e consumos) usando a ferramenta 'registerStockMovement'.
        
        Regras de Interação:
        - Mantenha o contexto da conversa. Se você precisar de mais informações para completar uma ação, peça ao usuário.
        - Ao receber um pedido para registrar uma movimentação, utilize a ferramenta 'registerStockMovement'.
        - Use OS NOMES EXATOS dos materiais e colaboradores disponíveis nos dados. Seja preciso.
        - Se um nome for ambíguo ou não existir, peça para esclarecer.
        - **Nunca invente informações.** Baseie-se apenas nos dados fornecidos.

        Regras de Resposta:
        - Responda de forma clara, objetiva e profissional, mas amigável.
        - Utilize formatação Markdown (negrito, listas).
        - A data de hoje é ${new Date().toLocaleDateString('pt-BR')}.

        --- DADOS DA EMPRESA (Use como contexto principal) ---
        ${dataContext}
        --- FIM DOS DADOS ---
    `;
};


const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    try {
        const ai = getAiClient();
        const body = JSON.parse(event.body || '{}');

        switch (body.type) {
            case 'chat': {
                const { history, message, context } = body;
                const chat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: getSystemInstruction(context),
                        tools: [{ functionDeclarations: [registerStockMovement] }]
                    },
                    history: history,
                });
                
                const response = await chat.sendMessage({ message });
                const functionCalls = response.functionCalls;

                if (functionCalls && functionCalls.length > 0) {
                    return { statusCode: 200, body: JSON.stringify({ functionCall: functionCalls[0] }) };
                }
                return { statusCode: 200, body: JSON.stringify({ text: response.text }) };
            }

            case 'chat_function_result': {
                const { history, pendingAction, functionResponse, context } = body;
                const { functionCall } = pendingAction as AIActionConfirmation;

                const chat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                        systemInstruction: getSystemInstruction(context),
                        tools: [{ functionDeclarations: [registerStockMovement] }]
                    },
                     history: [
                        ...history,
                        // Adiciona a chamada de função da IA ao histórico
                        { role: 'model', parts: [{ functionCall: functionCall }] }
                    ] as Content[],
                });
                
                const functionResponsePart: Part = {
                    functionResponse: { name: functionCall.name, response: { result: functionResponse } },
                };

                const response = await chat.sendMessage({ message: [functionResponsePart] });
                return { statusCode: 200, body: JSON.stringify({ text: response.text }) };
            }
            
            case 'suggestSupplier': {
                const { materialName, partners, movements, invoices } = body;
                
                 const invoiceMap = new Map((invoices as NotaFiscal[]).map(inv => [inv.numero, inv]));
                 const purchaseHistory: { [partnerId: string]: { totalQuantity: number; totalValue: number; purchaseCount: number; lastPurchaseDate: string } } = {};

                (movements as Movimentacao[])
                    .filter(mov => mov.tipo === 'entrada' && mov.material === materialName && mov.notaFiscal)
                    .forEach(mov => {
                        const invoice = invoiceMap.get(mov.notaFiscal!);
                        if (invoice) {
                            const item = invoice.itens.find(i => i.materialId === (mov as any).materialId || i.nome === materialName);
                            const value = mov.quantidade * (item?.valorUnitario || 0);

                            if (!purchaseHistory[invoice.parceiroId]) {
                                purchaseHistory[invoice.parceiroId] = { totalQuantity: 0, totalValue: 0, purchaseCount: 0, lastPurchaseDate: '1970-01-01' };
                            }
                            const history = purchaseHistory[invoice.parceiroId];
                            history.totalQuantity += mov.quantidade;
                            history.totalValue += value;
                            history.purchaseCount++;
                            if (new Date(mov.data) > new Date(history.lastPurchaseDate)) {
                                history.lastPurchaseDate = mov.data;
                            }
                        }
                    });

                const partnerInfo = (partners as Parceiro[]).map(p => {
                    const history = purchaseHistory[p.id];
                    let historyString = "Sem histórico de compra para este item.";
                    if (history) {
                        const avgPrice = history.totalValue / history.totalQuantity;
                        historyString = `Comprado ${history.purchaseCount} vez(es). Total de ${history.totalQuantity} unidades. Preço médio: R$ ${avgPrice.toFixed(2)}. Última compra: ${new Date(history.lastPurchaseDate).toLocaleDateString('pt-BR')}.`;
                    }
                    return `ID: ${p.id}, Nome: ${p.nome}, Cidade: ${p.cidade}, UF: ${p.uf}. Histórico: ${historyString}`;
                }).join('\n');

                const partnerIds = (partners as Parceiro[]).map(p => p.id);
                const suggestSupplierSchemaWithEnum = {
                    type: Type.OBJECT,
                    properties: {
                        recommendedPartnerId: { type: Type.STRING, description: 'O ID do parceiro recomendado.', enum: partnerIds },
                        justification: { type: Type.STRING, description: 'Explicação da recomendação.' },
                    },
                    required: ['recommendedPartnerId', 'justification'],
                };
                const prompt = `Analise os fornecedores para o item "${materialName}":\n${partnerInfo}\n\nRecomende o melhor fornecedor, considerando preço, histórico e logística. O ID deve ser um de: ${partnerIds.join(', ')}.`;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: "application/json", responseSchema: suggestSupplierSchemaWithEnum }
                });

                return { statusCode: 200, body: response.text };
            }

            case 'forecastRevenue': {
                const { monthlyRevenue } = body;
                const revenueData = (monthlyRevenue as { month: string; revenue: number }[]).map(d => `${d.month}: ${d.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`).join(', ');
                const prompt = `Analise os dados de faturamento: ${revenueData}. Preveja o faturamento para o próximo mês.`;
                const forecastRevenueSchema = {
                    type: Type.OBJECT,
                    properties: {
                        forecastValue: { type: Type.NUMBER, description: 'O valor numérico previsto.' },
                        justification: { type: Type.STRING, description: 'A justificativa para a previsão.' },
                    },
                    required: ['forecastValue', 'justification'],
                };

                 const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: "application/json", responseSchema: forecastRevenueSchema }
                });

                return { statusCode: 200, body: response.text };
            }

            default:
                return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request type' }) };
        }
    } catch (error: any) {
        console.error('Error in Netlify function:', error);
        // Return a 500 error with a JSON body so the client can handle it gracefully
        return { statusCode: 500, body: JSON.stringify({ error: error.message || 'Internal Server Error' }) };
    }
};

export { handler };