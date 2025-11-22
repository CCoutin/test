
import { GoogleGenAI, Type, FunctionDeclaration, Content, Part, GenerateContentResponse } from "@google/genai";
import { Parceiro, Movimentacao, NotaFiscal, Material, Colaborador, AIActionConfirmation, ChatMessage, FunctionCall } from '../types';

// Inicializa o cliente da IA
// A chave é obtida diretamente do ambiente conforme instrução.
const getAiClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY não encontrada. Configure a variável de ambiente 'API_KEY'.");
    }
    return new GoogleGenAI({ apiKey });
};

// Definição da ferramenta para registrar movimentação
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

// Gera as instruções do sistema com base no contexto atual
const getSystemInstruction = (context: { materials: Material[], collaborators: Colaborador[] }) => {
    const dataContext = `
        **Materiais em Estoque:**
        ${JSON.stringify(context.materials.map(m => ({ id: m.id, nome: m.nome, quantidade: m.quantidade })), null, 2)}

        **Colaboradores:**
        ${JSON.stringify(context.collaborators.map(c => ({ id: c.id, nome: c.nome })), null, 2)}
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

export interface AISuggestion {
    recommendedPartnerId: string;
    justification: string;
}

export interface AIRevenueForecast {
    forecastValue: number;
    justification: string;
}

export interface AIChatResponse {
    text?: string;
    functionCall?: FunctionCall;
}

// --- Funções Exportadas ---

export const suggestSupplier = async (materialName: string, partners: Parceiro[], movements: Movimentacao[], invoices: NotaFiscal[]): Promise<AISuggestion> => {
    const ai = getAiClient();
    
    // Processa histórico de compras localmente
    const invoiceMap = new Map(invoices.map(inv => [inv.numero, inv]));
    const purchaseHistory: { [partnerId: string]: { totalQuantity: number; totalValue: number; purchaseCount: number; lastPurchaseDate: string } } = {};

    movements
        .filter(mov => mov.tipo === 'entrada' && mov.material === materialName && mov.notaFiscal)
        .forEach(mov => {
            const invoice = invoiceMap.get(mov.notaFiscal!);
            if (invoice) {
                // Tenta encontrar o valor unitário no item da nota, ou assume proporcional
                const item = invoice.itens.find(i => i.nome === materialName) || invoice.itens[0]; // fallback simples
                const unitValue = item ? item.valorUnitario : 0;
                const value = mov.quantidade * unitValue;

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

    const partnerInfo = partners.map(p => {
        const history = purchaseHistory[p.id];
        let historyString = "Sem histórico de compra para este item.";
        if (history) {
            const avgPrice = history.totalQuantity > 0 ? history.totalValue / history.totalQuantity : 0;
            historyString = `Comprado ${history.purchaseCount} vez(es). Total de ${history.totalQuantity} unidades. Preço médio: R$ ${avgPrice.toFixed(2)}. Última compra: ${new Date(history.lastPurchaseDate).toLocaleDateString('pt-BR')}.`;
        }
        return `ID: ${p.id}, Nome: ${p.nome}, Cidade: ${p.cidade}, UF: ${p.uf}. Histórico: ${historyString}`;
    }).join('\n');

    const partnerIds = partners.map(p => p.id);
    
    const prompt = `Analise os fornecedores para o item "${materialName}":\n${partnerInfo}\n\nRecomende o melhor fornecedor, considerando preço, histórico e logística. O ID deve ser um de: ${partnerIds.join(', ')}.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    recommendedPartnerId: { type: Type.STRING, description: 'O ID do parceiro recomendado.', enum: partnerIds },
                    justification: { type: Type.STRING, description: 'Explicação detalhada da recomendação.' },
                },
                required: ['recommendedPartnerId', 'justification'],
            }
        }
    });

    return JSON.parse(response.text);
};

export const forecastRevenue = async (monthlyRevenue: { month: string; revenue: number }[]): Promise<AIRevenueForecast> => {
    return forecastNextMonthRevenue(monthlyRevenue);
};

export const forecastNextMonthRevenue = async (monthlyRevenue: { month: string; revenue: number }[]): Promise<AIRevenueForecast> => {
    const ai = getAiClient();
    const revenueData = monthlyRevenue.map(d => `${d.month}: ${d.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`).join(', ');
    const prompt = `Analise os dados de faturamento: ${revenueData}. Preveja o faturamento para o próximo mês.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    forecastValue: { type: Type.NUMBER, description: 'O valor numérico previsto.' },
                    justification: { type: Type.STRING, description: 'A justificativa e análise para a previsão.' },
                },
                required: ['forecastValue', 'justification'],
            }
        }
    });

    return JSON.parse(response.text);
};

export const sendMessageToChat = async (
    history: ChatMessage[],
    message: string,
    context: {
        materials: Material[],
        movements: Movimentacao[],
        collaborators: Colaborador[],
        partners: Parceiro[],
        invoices: NotaFiscal[],
    }
): Promise<AIChatResponse> => {
    const ai = getAiClient();
    
    // Converte o histórico do app para o formato do SDK
    const chatHistory: Content[] = history.map(h => ({
        role: h.role,
        parts: h.parts.map(p => ({ text: p.text } as Part))
    }));

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: getSystemInstruction(context),
            tools: [{ functionDeclarations: [registerStockMovement] }]
        },
        history: chatHistory,
    });

    const response = await chat.sendMessage({ message });
    
    // Verifica se houve chamada de função
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        return {
            functionCall: {
                name: call.name,
                args: call.args
            }
        };
    }

    return { text: response.text };
};

export const sendFunctionResultToChat = async (
    history: ChatMessage[],
    pendingAction: AIActionConfirmation,
    functionResponse: string,
    context: {
        materials: Material[],
        movements: Movimentacao[],
        collaborators: Colaborador[],
        partners: Parceiro[],
        invoices: NotaFiscal[],
    }
): Promise<AIChatResponse> => {
    const ai = getAiClient();
    const { functionCall } = pendingAction;

    // Reconstrói o histórico incluindo a chamada da função (role: model) que disparou a ação
    const chatHistory: Content[] = [
        ...history.map(h => ({
            role: h.role,
            parts: h.parts.map(p => ({ text: p.text } as Part))
        })),
        {
            role: 'model',
            parts: [{
                functionCall: {
                    name: functionCall.name,
                    args: functionCall.args
                }
            }]
        }
    ];

    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: getSystemInstruction(context),
            tools: [{ functionDeclarations: [registerStockMovement] }]
        },
        history: chatHistory,
    });

    // Envia a resposta da função
    const response = await chat.sendMessage({
        message: [{
            functionResponse: {
                name: functionCall.name,
                response: { result: functionResponse }
            }
        }]
    });

    return { text: response.text };
};
