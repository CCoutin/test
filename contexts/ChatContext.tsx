import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { useDatabase } from './DatabaseContext';
import { startChat, sendMessage, sendFunctionResult } from '../services/geminiService';
import { AIActionConfirmation } from '../types';
import { Chat, GenerateContentResponse } from "@google/genai";

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  pendingAction: AIActionConfirmation | null;
  sendMessage: (input: string) => Promise<void>;
  confirmAction: () => Promise<void>;
  cancelAction: () => void;
  resetChat: () => void;
  chatError: string | null;
  initializeChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const initialMessage: ChatMessage = {
  sender: 'ai',
  text: 'Olá! Sou o Assistente Gestor One. Agora posso registrar entradas, saídas e consumos de estoque. Tente dizer: "registrar uma entrada de 50 parafusos com a nota fiscal 12345" ou "dar baixa em 5 martelos para o Jorge".'
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { materials, collaborators, addMovement } = useDatabase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<AIActionConfirmation | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);

  const getChatContext = useCallback(() => {
    return { materials, collaborators };
  }, [materials, collaborators]);

  const initializeChat = useCallback(() => {
    if (isInitialized) return;
    try {
      setChatError(null);
      const session = startChat(getChatContext());
      setChatSession(session);
      setMessages([initialMessage]);
      setIsInitialized(true);
    } catch (error: any) {
        console.error("Failed to initialize AI Chat:", error);
        let errorMessage = "Não foi possível iniciar o assistente de IA. ";
        if (error.message && error.message.includes("API key")) {
            errorMessage += "Verifique se a chave de API (VITE_API_KEY) está configurada corretamente no ambiente do Netlify.";
        } else {
            errorMessage += "Verifique sua conexão e tente novamente.";
        }
        setChatError(errorMessage);
        setMessages([]); // Clear messages on error
    }
  }, [isInitialized, getChatContext]);

  const processResponse = (response: GenerateContentResponse) => {
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const functionCall = functionCalls[0];
      setPendingAction({ functionCall, userPrompt: '' }); // userPrompt is less relevant here
      const { name, args } = functionCall;
      if (name === 'registerStockMovement') {
        let confirmationText = `Você deseja registrar a **${args.type}** de **${args.quantity}** unidade(s) de "**${args.materialName}**" para o colaborador "**${args.collaboratorName}**"`;
        if (args.type === 'entrada' && args.invoiceNumber) {
          confirmationText += `, associada à Nota Fiscal **${args.invoiceNumber}**`;
        }
        confirmationText += '?';
        setMessages(prev => [...prev, { sender: 'ai', text: confirmationText }]);
      }
    } else if (response.text) {
      setMessages(prev => [...prev, { sender: 'ai', text: response.text }]);
    } else {
       setMessages(prev => [...prev, { sender: 'ai', text: "Desculpe, não consegui processar sua solicitação no momento." }]);
    }
  };

  const handleSendMessage = async (input: string) => {
    if (!chatSession) {
      setChatError("A sessão de chat não foi iniciada.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await sendMessage(chatSession, input);
      processResponse(response);
    } catch (error: any) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { sender: 'ai', text: `Erro: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const sendMessageAndDisplay = async (input: string) => {
    if (!input.trim() || isLoading) return;
    const userMessage: ChatMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    await handleSendMessage(input);
  }

  const confirmAction = async () => {
    if (!pendingAction || !chatSession) return;

    setIsLoading(true);
    const { functionCall } = pendingAction;
    const { name, args } = functionCall;
    let resultMessage = "Ação executada com sucesso.";

    try {
      if (name === 'registerStockMovement') {
        const materialExists = materials.some(m => m.nome.toLowerCase() === args.materialName.toLowerCase());
        const collaboratorExists = collaborators.some(c => c.nome.toLowerCase() === args.collaboratorName.toLowerCase());

        if (!materialExists) throw new Error(`Material "${args.materialName}" não encontrado.`);
        if (!collaboratorExists) throw new Error(`Colaborador "${args.collaboratorName}" não encontrado.`);

        addMovement({
          material: args.materialName,
          quantidade: args.quantity,
          colaborador: args.collaboratorName,
          data: new Date().toISOString().split('T')[0],
          notaFiscal: args.invoiceNumber || '',
        }, args.type);

      } else {
        throw new Error("Ação desconhecida.");
      }
      
      const response = await sendFunctionResult(chatSession, functionCall, resultMessage);
      processResponse(response);

    } catch (error: any) {
      setMessages(prev => [...prev, { sender: 'ai', text: `Falha na execução: ${error.message}` }]);
    } finally {
      setPendingAction(null);
      setIsLoading(false);
    }
  };

  const cancelAction = () => {
    setMessages(prev => [...prev, { sender: 'ai', text: 'Ação cancelada.' }]);
    setPendingAction(null);
  };

  const resetChat = () => {
    setMessages([]);
    setPendingAction(null);
    setIsLoading(false);
    setChatError(null);
    setIsInitialized(false);
    setChatSession(null);
    // Re-initialize immediately
    initializeChat();
  };

  const value = {
    messages,
    isLoading,
    pendingAction,
    sendMessage: sendMessageAndDisplay,
    confirmAction,
    cancelAction,
    resetChat,
    chatError,
    initializeChat,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};