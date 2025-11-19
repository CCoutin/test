// pages/ChatPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { getChatResponse, ChatMessage } from '../services/geminiService';
import { PaperAirplaneIcon, SparklesIcon } from '../components/icons/HeroIcons';

const ChatPage: React.FC = () => {
    const { materials, movements, collaborators, partners, invoices } = useDatabase();
    const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMessages([
            {
                sender: 'ai',
                text: 'Olá! Sou o Assistente Gestor One. Agora tenho acesso a todos os dados do sistema. Pergunte-me sobre estoque, colaboradores, fornecedores, notas fiscais e muito mais!'
            }
        ]);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { sender: 'user' as const, text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const history: ChatMessage[] = messages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));

        try {
            const aiResponse = await getChatResponse(input, history, materials, movements, collaborators, partners, invoices);
            setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
            setMessages(prev => [...prev, { sender: 'ai', text: `Desculpe, ocorreu um erro: ${errorMessage}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full max-h-[calc(100vh-8rem)] bg-white rounded-lg shadow-md">
            <div className="p-4 border-b border-slate-200 flex items-center">
                 <SparklesIcon className="w-7 h-7 text-blue-600 mr-3" />
                 <div>
                    <h1 className="text-xl font-bold text-slate-800">Chat IA - Assistente de Estoque</h1>
                    <p className="text-sm text-slate-500">Faça perguntas sobre o seu inventário</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-lg px-4 py-2 rounded-2xl shadow ${
                            msg.sender === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 text-slate-800'
                        }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex justify-start">
                        <div className="max-w-lg px-4 py-3 rounded-2xl shadow bg-slate-200 text-slate-800">
                            <div className="flex items-center space-x-1">
                                <span className="h-2 w-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="h-2 w-2 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="h-2 w-2 bg-slate-500 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-200">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Digite sua pergunta aqui..."
                        className="flex-1 block w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="p-2.5 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                        aria-label="Enviar mensagem"
                    >
                        <PaperAirplaneIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatPage;