// pages/ChatPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { PaperAirplaneIcon, SparklesIcon } from '../components/icons/HeroIcons';
import TrashIcon from '../components/icons/TrashIcon';

const ChatPage: React.FC = () => {
    const { 
        messages, 
        isLoading, 
        pendingAction, 
        sendMessage, 
        confirmAction, 
        cancelAction, 
        resetChat 
    } = useChat();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        
        await sendMessage(input);
        setInput('');
    };

    const handleConfirmAction = async () => {
        await confirmAction();
    }


    return (
        <div className="flex flex-col h-full max-h-[calc(100vh-8rem)] bg-white rounded-lg shadow-md">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                 <div className="flex items-center">
                    <SparklesIcon className="w-7 h-7 text-blue-600 mr-3" />
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Chat IA - Assistente de Estoque</h1>
                        <p className="text-sm text-slate-500">Faça perguntas ou execute ações de estoque</p>
                    </div>
                </div>
                <button
                    onClick={resetChat}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
                    title="Resetar conversa"
                >
                    <TrashIcon className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-lg px-4 py-2 rounded-2xl shadow ${
                            msg.sender === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 text-slate-800'
                        }`}>
                            <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
                        </div>
                    </div>
                ))}
                {pendingAction && (
                     <div className="flex justify-start">
                        <div className="max-w-lg p-2 rounded-2xl bg-slate-100">
                           <div className="flex space-x-2">
                                <button onClick={handleConfirmAction} className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700">Confirmar</button>
                                <button onClick={cancelAction} className="px-4 py-2 text-sm font-semibold bg-slate-300 text-slate-800 rounded-lg hover:bg-slate-400">Cancelar</button>
                           </div>
                        </div>
                    </div>
                )}
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
                        placeholder={pendingAction ? "Aguardando confirmação..." : "Digite sua pergunta ou comando..."}
                        className="flex-1 block w-full rounded-lg border-2 border-transparent bg-slate-800 text-white py-2 px-3 focus:border-blue-500 focus:outline-none sm:text-sm placeholder-slate-400 disabled:bg-slate-700 disabled:cursor-not-allowed"
                        disabled={isLoading || !!pendingAction}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading || !!pendingAction}
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