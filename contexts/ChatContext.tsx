import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useDatabase } from './DatabaseContext';
import { startChat, sendMessageToChat, sendFunctionResultToChat } from '../services/geminiService';
import { AIActionConfirmation } from '../types';
import { Chat } from '@google/genai';

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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const initialMessage: ChatMessage = {
  sender: 'ai',
  text: 'Olá! Sou o Assistente Gestor One. Agora posso registrar entradas, saídas e consumos de estoque. Tente dizer: "registrar uma entrada de 50 parafusos com a nota fiscal 12345" ou "dar baixa em 5 martelos para o Jorge".'
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { materials, movements, collaborators, partners, invoices, addMovement } = useDatabase();
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<AIActionConfirmation | null>(null);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);

  const initializeChat = useCallback(() => {
    if (materials.length > 0 && collaborators.length > 0) {
        try {
            const session = startChat(materials, movements, collaborators, partners, invoices);
            setChatSession(session);
            setChatError(null);
        } catch (error) {
            console.error("Falha ao inicializar o chat da IA:", error);
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido.";
            setMessages([{ sender: 'ai', text: `Não foi possível iniciar o assistente de IA. Verifique se a chave de API está configurada corretamente no ambiente.`}]);
            setChatError(errorMessage);
            setChatSession(null);
        }
    }
  }, [materials, movements, collaborators, partners, invoices]);
  
  useEffect(() => {
    if (!chatSession && !chatError) {
        initializeChat();
    }
  }, [chatSession, chatError, initializeChat]);


  const sendMessage = async (input: string) => {
    if (chatError) {
        console.warn("Attempted to send message while chat is in error state:", chatError);
        return;
    }
    if (!input.trim() || isLoading || !chatSession) return;

    const userMessage: ChatMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
        const aiResponse = await sendMessageToChat(chatSession, input);

        if (aiResponse.functionCall) {
            setPendingAction({ functionCall: aiResponse.functionCall, userPrompt: input });
            const { name, args } = aiResponse.functionCall;
            if (name === 'registerStockMovement') {
                let confirmationText = `Você deseja registrar a **${args.type}** de **${args.quantity}** unidade(s) de "**${args.materialName}**" para o colaborador "**${args.collaboratorName}**"`;
                if (args.type === 'entrada' && args.invoiceNumber) {
                    confirmationText += `, associada à Nota Fiscal **${args.invoiceNumber}**`;
                }
                confirmationText += '?';
                setMessages(prev => [...prev, { sender: 'ai', text: confirmationText }]);
            }
        } else if (aiResponse.text) {
            setMessages(prev => [...prev, { sender: 'ai', text: aiResponse.text }]);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        setMessages(prev => [...prev, { sender: 'ai', text: `Desculpe, ocorreu um erro: ${errorMessage}` }]);
    } finally {
        setIsLoading(false);
    }
  };

  const findObjectIdByName = (collection: { id: string, nome: string }[], name: string): string | undefined => {
    const item = collection.find(i => i.nome.toLowerCase() === name.toLowerCase());
    return item?.id;
  }

  const confirmAction = async () => {
    if (!pendingAction || !chatSession) return;

    setIsLoading(true);
    const { functionCall } = pendingAction;
    const { name, args } = functionCall;
    let resultMessage = "Ação executada com sucesso.";

    try {
        if (name === 'registerStockMovement') {
            const materialExists = findObjectIdByName(materials, args.materialName);
            const collaboratorExists = findObjectIdByName(collaborators, args.collaboratorName);

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
        
        const finalAiResponse = await sendFunctionResultToChat(chatSession, functionCall, resultMessage);

        if (finalAiResponse.text) {
            setMessages(prev => [...prev, { sender: 'ai', text: finalAiResponse.text }]);
        }
    } catch (e: any) {
        setMessages(prev => [...prev, { sender: 'ai', text: `Falha na execução: ${e.message}` }]);
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
    setMessages([initialMessage]);
    setPendingAction(null);
    setIsLoading(false);
    setChatError(null);
    initializeChat();
  };


  const value = {
    messages,
    isLoading,
    pendingAction,
    sendMessage,
    confirmAction,
    cancelAction,
    resetChat,
    chatError,
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