
import { Parceiro, Movimentacao, NotaFiscal, Material, Colaborador, AIActionConfirmation, ChatMessage, FunctionCall } from '../types';

// Definição das interfaces de resposta
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

// Função auxiliar para chamar o backend com timeout
const callNetlifyFunction = async (type: string, payload: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 segundos de timeout

    try {
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type, ...payload }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Se for erro de autenticação ou erro interno, lança msg específica
            throw new Error(errorData.error || `Erro no servidor (${response.status}). Verifique os logs ou a API Key.`);
        }

        return await response.json();
    } catch (error: any) {
        clearTimeout(timeoutId);
        console.error("Erro ao chamar IA:", error);
        
        if (error.name === 'AbortError') {
            throw new Error("A IA demorou muito para responder. Tente novamente.");
        }
        
        // Repassa a mensagem de erro para ser tratada no ChatContext
        throw new Error(error.message || "Falha na comunicação com o assistente.");
    }
};

export const suggestSupplier = async (materialName: string, partners: Parceiro[], movements: Movimentacao[], invoices: NotaFiscal[]): Promise<AISuggestion> => {
    return callNetlifyFunction('suggestSupplier', { materialName, partners, movements, invoices });
};

export const forecastRevenue = async (monthlyRevenue: { month: string; revenue: number }[]): Promise<AIRevenueForecast> => {
    return forecastNextMonthRevenue(monthlyRevenue);
};

export const forecastNextMonthRevenue = async (monthlyRevenue: { month: string; revenue: number }[]): Promise<AIRevenueForecast> => {
    return callNetlifyFunction('forecastRevenue', { monthlyRevenue });
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
    return callNetlifyFunction('chat', { history, message, context });
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
    return callNetlifyFunction('chat_function_result', { history, pendingAction, functionResponse, context });
};
