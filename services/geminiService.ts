import { GoogleGenAI, Type } from "@google/genai";
import { Parceiro, Movimentacao, NotaFiscal, Material, Colaborador } from '../types';

// Helper para inicializar o cliente apenas quando necessário
const getAiClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

export interface AISuggestion {
    recommendedPartnerId: string;
    justification: string;
}

export interface AIRevenueForecast {
    forecastValue: number;
    justification: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

const forecastRevenueSchema = {
    type: Type.OBJECT,
    properties: {
        forecastValue: {
            type: Type.NUMBER,
            description: 'O valor numérico previsto para o faturamento do próximo mês.',
        },
        justification: {
            type: Type.STRING,
            description: 'Uma análise concisa explicando a previsão com base nos dados históricos, tendências ou sazonalidades observadas.',
        },
    },
    required: ['forecastValue', 'justification'],
};

export const suggestSupplier = async (materialName: string, partners: Parceiro[], movements: Movimentacao[], invoices: NotaFiscal[]): Promise<AISuggestion> => {
    
    const ai = getAiClient();

    // 1. Build a map for quick invoice lookup
    const invoiceMap = new Map(invoices.map(inv => [inv.numero, inv]));

    // 2. Aggregate historical purchase data for the specific material
    const purchaseHistory: { [partnerId: string]: { totalQuantity: number; totalValue: number; purchaseCount: number; lastPurchaseDate: string } } = {};

    movements
        .filter(mov => mov.tipo === 'entrada' && mov.material === materialName && mov.notaFiscal)
        .forEach(mov => {
            const invoice = invoiceMap.get(mov.notaFiscal!);
            if (invoice) {
                const item = invoice.itens.find(i => i.materialId === (mov as any).materialId || i.nome === materialName); // Fallback to name if id not on mov
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

    // 3. Format partner and historical data for the prompt
    const partnerInfo = partners.map(p => {
        const history = purchaseHistory[p.id];
        let historyString = "Sem histórico de compra para este item.";
        if (history) {
            const avgPrice = history.totalValue / history.totalQuantity;
            historyString = `Comprado ${history.purchaseCount} vez(es). Total de ${history.totalQuantity} unidades. Preço médio: R$ ${avgPrice.toFixed(2)}. Última compra: ${new Date(history.lastPurchaseDate).toLocaleDateString('pt-BR')}.`;
        }
        return `ID: ${p.id}, Nome: ${p.nome}, Cidade: ${p.cidade}, UF: ${p.uf}. Histórico: ${historyString}`;
    }).join('\n');


    const partnerIds = partners.map(p => p.id);

    const suggestSupplierSchemaWithEnum = {
        type: Type.OBJECT,
        properties: {
            recommendedPartnerId: {
                type: Type.STRING,
                description: 'O ID do parceiro recomendado. Deve ser estritamente um dos IDs fornecidos na lista.',
                enum: partnerIds,
            },
            justification: {
                type: Type.STRING,
                description: 'Uma explicação concisa do porquê este parceiro é a melhor escolha, considerando preço, histórico de compras e logística.',
            },
        },
        required: ['recommendedPartnerId', 'justification'],
    };


    const prompt = `
        Você é um analista de compras sênior. Sua tarefa é recomendar o melhor fornecedor para comprar o item "${materialName}".

        Analise a lista de fornecedores disponíveis e seus respectivos históricos de compra para este item específico:
        ${partnerInfo}

        Com base em todos os dados fornecidos (preço médio, histórico de relacionamento/confiabilidade e logística/proximidade), qual é a melhor opção de fornecedor?
        
        Forneça o ID do parceiro recomendado e uma justificativa clara e objetiva para sua escolha, mencionando os fatores que mais pesaram na sua decisão.
        O ID do parceiro deve ser estritamente um dos seguintes: ${partnerIds.join(', ')}.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: suggestSupplierSchemaWithEnum,
                systemInstruction: "Você é um especialista em otimização da cadeia de suprimentos. Sua função é analisar dados históricos e geográficos para recomendar o fornecedor mais vantajoso, equilibrando custo, confiança e eficiência logística. Responda apenas com o JSON estruturado."
            },
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        
        return parsedJson as AISuggestion;

    } catch (error) {
        console.error("Erro ao chamar a API Gemini:", error);
        throw new Error("Não foi possível obter uma sugestão da IA. Tente novamente.");
    }
};


export const forecastNextMonthRevenue = async (monthlyRevenue: { month: string; revenue: number }[]): Promise<AIRevenueForecast> => {
    
    const ai = getAiClient();

    const revenueData = monthlyRevenue.map(d => `${d.month}: ${d.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`).join(', ');

    const prompt = `
        Analise os seguintes dados de faturamento mensal de uma empresa de ferramentas:
        ${revenueData}.
        
        Com base nesses dados históricos, preveja o faturamento para o próximo mês. 
        Forneça o valor previsto e uma breve justificativa para sua previsão, considerando tendências e sazonalidades.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: forecastRevenueSchema,
                systemInstruction: "Você é um analista financeiro especialista em previsão de faturamento para empresas de varejo e distribuição."
            },
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        
        return parsedJson as AIRevenueForecast;

    } catch (error) {
        console.error("Erro ao chamar a API Gemini:", error);
        throw new Error("Não foi possível obter uma previsão da IA. Tente novamente.");
    }
};

export const getChatResponse = async (
    currentQuestion: string, 
    history: ChatMessage[], 
    materials: Material[],
    movements: Movimentacao[],
    collaborators: Colaborador[],
    partners: Parceiro[],
    invoices: NotaFiscal[]
): Promise<string> => {

    const ai = getAiClient();

    const systemInstruction = `
        Você é o "Assistente Gestor One", um analista de dados e negócios sênior para uma revendedora de ferramentas.
        Sua principal função é analisar os dados da empresa, fornecidos em formato JSON, para responder a perguntas complexas. Você deve ser capaz de cruzar informações entre diferentes conjuntos de dados (materiais, movimentações, notas fiscais, parceiros, colaboradores).

        Suas capacidades incluem:
        1.  **Cálculos e Agregações:** Calcular totais, médias, encontrar itens mais/menos movimentados, etc.
        2.  **Análise de Tendências:** Identificar padrões nas movimentações de estoque ao longo do tempo.
        3.  **Cross-Referencing:** Conectar uma movimentação de entrada a uma nota fiscal e a um parceiro. Identificar qual colaborador realizou mais saídas de um determinado item.
        4.  **Respostas Detalhadas:** Para perguntas complexas, explique seu raciocínio. Ex: "Para encontrar o fornecedor que mais vendeu 'Parafuso', eu filtrei as movimentações de entrada para 'Parafuso', identifiquei as notas fiscais associadas e somei os valores por parceiro."

        Regras de Resposta:
        - Responda de forma clara, objetiva e profissional, mas amigável.
        - Utilize formatação Markdown (negrito para ênfase, listas para itens) para máxima legibilidade.
        - Baseie-se *exclusivamente* nos dados JSON fornecidos. Se a informação não estiver presente, informe que não possui os dados para responder.
        - A data de hoje é ${new Date().toLocaleDateString('pt-BR')}.
    `;

    // Serialize all data to JSON to provide full context to the AI.
    const dataContext = `
        Abaixo estão os dados completos da empresa em formato JSON. Use-os para responder à pergunta.

        **Materiais em Estoque:**
        ${JSON.stringify(materials, null, 2)}

        **Movimentações de Estoque:**
        ${JSON.stringify(movements, null, 2)}
        
        **Colaboradores:**
        ${JSON.stringify(collaborators, null, 2)}

        **Parceiros (Fornecedores):**
        ${JSON.stringify(partners, null, 2)}

        **Notas Fiscais:**
        ${JSON.stringify(invoices, null, 2)}
    `;
    
    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction,
            },
        });
        
        const response = await chat.sendMessage({
            message: `Com base nos dados abaixo, responda à minha pergunta.\n\n${dataContext}\n\nPergunta: ${currentQuestion}`,
            history: history,
        });

        return response.text;
    } catch (error) {
        console.error("Erro ao chamar a API Gemini no chat:", error);
        throw new Error("Não foi possível obter uma resposta da IA. Verifique a conexão e tente novamente.");
    }
}