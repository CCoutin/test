import { Parceiro, Movimentacao, NotaFiscal, Material, Colaborador, AIActionConfirmation, ChatMessage, FunctionCall } from '../types';

const API_URL = '/.netlify/functions/gemini';

// Helper to handle fetch errors
const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    return response.json();
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

export const suggestSupplier = async (materialName: string, partners: Parceiro[], movements: Movimentacao[], invoices: NotaFiscal[]): Promise<AISuggestion> => {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'suggestSupplier', materialName, partners, movements, invoices })
    });
    return handleResponse(response);
};

export const forecastNextMonthRevenue = async (monthlyRevenue: { month: string; revenue: number }[]): Promise<AIRevenueForecast> => {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'forecastRevenue', monthlyRevenue })
    });
    return handleResponse(response);
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
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'chat', history, message, context })
    });
    return handleResponse(response);
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
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'chat_function_result', history, pendingAction, functionResponse, context })
    });
    return handleResponse(response);
};
