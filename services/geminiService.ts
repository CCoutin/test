import { GoogleGenAI, Type, FunctionDeclaration, FunctionCall, Chat, Part } from "@google/genai";
import { Parceiro, Movimentacao, NotaFiscal, Material, Colaborador } from '../types';

// Helper para inicializar o cliente apenas quando necessário
const getAiClient = () => {
    // A chave de API deve ser obtida exclusivamente de process.env.API_KEY.
    // A verificação anterior e o fallback para VITE_API_KEY causavam uma falha na inicialização
    // se a variável de ambiente não estivesse configurada, impedindo a aplicação de abrir.
    // Esta implementação assume que a chave está disponível, conforme as diretrizes.
    const apiKey = process.env.API_KEY;
    return new GoogleGenAI({ apiKey: apiKey as string });
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

export interface AIChatResponse {
    text?: string;
    functionCall?: FunctionCall;
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
        throw new Error("Não foi possível obter uma sugestão da IA. Verifique a chave de API.");
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
        throw new Error("Não foi possível obter uma previsão da IA. Verifique a chave de API.");
    }
};

const registerStockMovement: FunctionDeclaration = {
    name: 'registerStockMovement',
    description: 'Registra uma nova movimentação de estoque: entrada, saída ou consumo de material.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            materialName: {
                type: Type.STRING,
                description: 'O nome exato do material a ser movimentado. Deve corresponder a um item da lista de materiais.',
            },
            quantity: {
                type: Type.NUMBER,
                description: 'A quantidade de itens a ser movimentada. Deve ser um número inteiro positivo.',
            },
            collaboratorName: {
                type: Type.STRING,
                description: 'O nome exato do colaborador que está realizando a movimentação. Deve corresponder a um colaborador da lista.',
            },
            type: {
                type: Type.STRING,
                description: 'O tipo de movimentação. Deve ser "entrada", "saida" ou "consumo".',
                enum: ['entrada', 'saida', 'consumo'],
            },
            invoiceNumber: {
                type: Type.STRING,
                description: 'O número da nota fiscal associada à entrada. Opcional e usado apenas para o tipo "entrada".',
            }
        },
        required: ['materialName', 'quantity', 'collaboratorName', 'type'],
    },
};

export const startChat = (
    materials: Material[],
    movements: Movimentacao[],
    collaborators: Colaborador[],
    partners: Parceiro[],
    invoices: NotaFiscal[],
): Chat => {
    const ai = getAiClient();

    const dataContext = `
        **Materiais em Estoque:**
        ${JSON.stringify(materials.map(m => ({ id: m.id, nome: m.nome, quantidade: m.quantidade })), null, 2)}

        **Colaboradores:**
        ${JSON.stringify(collaborators.map(c => ({ id: c.id, nome: c.nome })), null, 2)}
        
        **Movimentações de Estoque (Histórico):**
        ${JSON.stringify(movements, null, 2)}

        **Parceiros (Fornecedores):**
        ${JSON.stringify(partners, null, 2)}

        **Notas Fiscais:**
        ${JSON.stringify(invoices, null, 2)}
    `;

    const systemInstruction = `
        Você é o "Assistente Gestor One", um analista de dados e negócios sênior para uma revendedora de ferramentas.
        Sua principal função é analisar os dados da empresa para responder a perguntas e EXECUTAR AÇÕES.

        Suas capacidades são:
        1.  **Análise de Dados:** Responder perguntas complexas cruzando informações de materiais, movimentações, notas fiscais, parceiros e colaboradores.
        2.  **Execução de Ações:** Você pode registrar novas movimentações de estoque (entradas, saídas e consumos) usando a ferramenta 'registerStockMovement'.
        
        Regras de Interação:
        - Mantenha o contexto da conversa. Se você precisar de mais informações para completar uma ação (ex: nome do colaborador), peça ao usuário e aguarde a resposta na próxima mensagem para continuar a tarefa original.
        - Ao receber um pedido para registrar uma movimentação (ex: "fazer entrada", "dar baixa", "registrar consumo", "anotar saída"), utilize a ferramenta 'registerStockMovement'.
        - Para ENTRADAS, se o colaborador não for especificado, assuma que foi 'Carlos' (o estoquista). Pergunte sobre a nota fiscal se for relevante.
        - Use OS NOMES EXATOS dos materiais e colaboradores disponíveis nos dados. Seja preciso.
        - Se um nome for ambíguo ou não existir, peça ao usuário para esclarecer.
        - **Nunca invente informações.** Baseie-se apenas nos dados fornecidos.

        Regras de Resposta:
        - Responda de forma clara, objetiva e profissional, mas amigável.
        - Utilize formatação Markdown (negrito, listas) para melhor legibilidade.
        - A data de hoje é ${new Date().toLocaleDateString('pt-BR')}.

        --- DADOS DA EMPRESA (Use como contexto principal) ---
        ${dataContext}
        --- FIM DOS DADOS ---
    `;
    
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
            tools: [{ functionDeclarations: [registerStockMovement] }]
        },
    });
    
    return chat;
};

export const sendMessageToChat = async (
    chat: Chat,
    message: string,
): Promise<AIChatResponse> => {
    try {
        const response = await chat.sendMessage({ message });
        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
            return { functionCall: functionCalls[0] };
        }
        return { text: response.text };
    } catch (error) {
        console.error("Erro ao enviar mensagem para a IA:", error);
        throw new Error("Falha ao comunicar com o assistente.");
    }
};

export const sendFunctionResultToChat = async (
    chat: Chat,
    functionCall: FunctionCall,
    functionResponse: string
): Promise<AIChatResponse> => {
     try {
        const functionResponsePart: Part = {
            functionResponse: {
                name: functionCall.name,
                response: {
                    result: functionResponse,
                },
            },
        };

        const response = await chat.sendMessage({ message: [functionResponsePart] });
        
        return { text: response.text };
    } catch (error) {
        console.error("Erro ao enviar resultado da função para a IA:", error);
        throw new Error("Falha ao comunicar com o assistente após executar a ação.");
    }
}