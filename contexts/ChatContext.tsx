import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useDatabase } from './DatabaseContext';
import { sendMessageToChat, sendFunctionResultToChat } from '../services/geminiService';
// FIX: Alias the imported API-specific ChatMessage and define a local one for the UI to resolve the name collision and type mismatch.
import { AIActionConfirmation, ChatMessage as ApiChatMessage } from '../types';

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
  const { materials, movements, collaborators, partners, invoices, addMovement } = useDatabase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<AIActionConfirmation | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const getFullContext = useCallback(() => {
    return { materials, movements, collaborators, partners, invoices };
  }, [materials, movements, collaborators, partners, invoices]);

  const initializeChat = useCallback(() => {
    if (isInitialized) return;
    setIsInitialized(true); 
    setChatError(null);
    setMessages([initialMessage]);
  }, [isInitialized]);

  const sendMessage = async (input: string) => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { sender: 'user', text: input };
    
    // Build history from state *before* adding the new user message.
    const historyForApi = messages
      .slice(1) // Remove the initial welcome message
      .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
      })) as ApiChatMessage[];

    setMessages(prev => [...prev, userMessage]); // Update UI with user message
    setIsLoading(true);
    // setChatError(null); // Don't clear global error here to avoid flashing, just try anyway.

    try {
      const aiResponse = await sendMessageToChat(historyForApi, input, getFullContext());

      if (aiResponse && aiResponse.functionCall) {
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
      } else if (aiResponse && aiResponse.text) {
        setMessages(prev => [...prev, { sender: 'ai', text: aiResponse.text }]);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: "Desculpe, não consegui processar sua solicitação no momento. Tente novamente." }]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      // Don't lock the UI with setChatError, just show the message.
      // setChatError(errorMessage); 
      setMessages(prev => [...prev, { sender: 'ai', text: `Erro de comunicação: ${errorMessage}. Verifique sua conexão ou chave de API e tente novamente.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const findObjectIdByName = (collection: { id: string, nome: string }[], name: string): string | undefined => {
    const item = collection.find(i => i.nome.toLowerCase() === name.toLowerCase());
    return item?.id;
  }

  const confirmAction = async () => {
    if (!pendingAction) return;

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
      
      const historyForApi = messages
        .slice(1, -1) // Correctly build history up to the user's prompt
        .map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        })) as ApiChatMessage[];

      const finalAiResponse = await sendFunctionResultToChat(historyForApi, pendingAction, resultMessage, getFullContext());

      if (finalAiResponse && finalAiResponse.text) {
        setMessages(prev => [...prev, { sender: 'ai', text: finalAiResponse.text }]);
      } else {
         setMessages(prev => [...prev, { sender: 'ai', text: "Ação confirmada." }]);
      }
    } catch (e: any) {
        const errorMessage = e instanceof Error ? e.message : "Ocorreu um erro desconhecido.";
        // Don't lock UI
        // setChatError(errorMessage);
        setMessages(prev => [...prev, { sender: 'ai', text: `Falha na execução: ${errorMessage}` }]);
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