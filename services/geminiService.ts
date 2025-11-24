import { GoogleGenAI, Chat, Type, FunctionDeclaration, GenerateContentResponse, FunctionCall } from "@google/genai";
import { Parceiro, Movimentacao, NotaFiscal, Material, Colaborador } from '../types';

// FIX: Add missing type definitions for AI suggestions to be used in components.
export interface AISuggestion {
    recommendedPartnerId: string;
    justification: string;
}

export interface AIRevenueForecast {
    forecastValue: number;
    justification: string;
}

// Singleton instance of the AI client
let ai: GoogleGenAI | null = null;
const getAiClient = () => {
    if (!ai) {
        // This will only be called once.
        // FIX: API key must be retrieved from process.env.API_KEY per coding guidelines. This also resolves the TypeScript error with `import.meta.env`.
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};


// --- Tool/Function Declaration for the AI ---
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

// --- System Instruction for the AI ---
const getSystemInstruction = (context: { materials: Material[], collaborators: Colaborador[] }) => {
    const dataContext = `
        **Materiais em Estoque (Nome e Quantidade):**
        ${JSON.stringify(context.materials.map((m: Material) => ({ nome: m.nome, quantidade: m.quantidade })), null, 2)}

        **Colaboradores (Nomes):**
        ${JSON.stringify(context.collaborators.map((c: Colaborador) => c.nome), null, 2)}
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


// --- Chat Functionality ---
export const startChat = (context: { materials: Material[], collaborators: Colaborador[] }): Chat => {
    const aiClient = getAiClient();
    const chat = aiClient.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: getSystemInstruction(context),
            tools: [{ functionDeclarations: [registerStockMovement] }]
        },
        history: [], // Start with empty history
    });
    return chat;
};

export const sendMessage = async (chat: Chat, message: string): Promise<GenerateContentResponse> => {
    const response = await chat.sendMessage({ message });
    return response;
};

export const sendFunctionResult = async (chat: Chat, functionCall: FunctionCall, result: any): Promise<GenerateContentResponse> => {
    const functionResponsePart = {
        functionResponse: { name: functionCall.name, response: { result } },
    };
    const response = await chat.sendMessage({ message: [functionResponsePart] });
    return response;
};


// --- Other AI Functionalities (non-chat) ---
export const suggestSupplier = async (materialName: string, partners: Parceiro[], movements: Movimentacao[], invoices: NotaFiscal[]): Promise<AISuggestion> => {
    const aiClient = getAiClient();
    
    const invoiceMap = new Map(invoices.map(inv => [inv.numero, inv]));
    const purchaseHistory: { [partnerId: string]: { totalQuantity: number; totalValue: number; purchaseCount: number; lastPurchaseDate: string } } = {};

    movements
        .filter(mov => mov.tipo === 'entrada' && mov.material === materialName && mov.notaFiscal)
        .forEach(mov => {
            const invoice = invoiceMap.get(mov.notaFiscal!);
            if (invoice) {
                const item = invoice.itens.find(i => i.nome === materialName);
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
    const suggestSupplierSchemaWithEnum = {
        type: Type.OBJECT,
        properties: {
            recommendedPartnerId: { type: Type.STRING, description: 'O ID do parceiro recomendado.', enum: partnerIds },
            justification: { type: Type.STRING, description: 'Explicação concisa da recomendação.' },
        },
        required: ['recommendedPartnerId', 'justification'],
    };
    const prompt = `Analise os fornecedores para o item "${materialName}":\n${partnerInfo}\n\nRecomende o melhor fornecedor, considerando preço, histórico e logística. O ID deve ser um de: ${partnerIds.join(', ')}.`;
    
    const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: suggestSupplierSchemaWithEnum }
    });

    return JSON.parse(response.text.trim());
};

export const forecastNextMonthRevenue = async (monthlyRevenue: { month: string; revenue: number }[]): Promise<AIRevenueForecast> => {
    const aiClient = getAiClient();
    const revenueData = monthlyRevenue.map(d => `${d.month}: ${d.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`).join(', ');
    const prompt = `Analise os dados de faturamento: ${revenueData}. Preveja o faturamento para o próximo mês. Forneça uma justificativa curta e direta.`;
    const forecastRevenueSchema = {
        type: Type.OBJECT,
        properties: {
            forecastValue: { type: Type.NUMBER, description: 'O valor numérico previsto.' },
            justification: { type: Type.STRING, description: 'A justificativa para a previsão.' },
        },
        required: ['forecastValue', 'justification'],
    };

    const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: forecastRevenueSchema }
    });
    
    return JSON.parse(response.text.trim());
};