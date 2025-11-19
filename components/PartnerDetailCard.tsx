import React from 'react';
import { Parceiro } from '../types';
import XMarkIcon from './icons/XMarkIcon';

interface PartnerDetailCardProps {
    partner: Parceiro;
    onClose: () => void;
}

const PartnerDetailCard: React.FC<PartnerDetailCardProps> = ({ partner, onClose }) => {
    return (
        <div className="absolute top-6 right-6 bottom-6 w-72 bg-white/80 backdrop-blur-sm rounded-lg shadow-2xl animate-fade-in-right">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800">{partner.nome}</h3>
                <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-200">
                    <XMarkIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
                <div>
                    <p className="font-semibold text-slate-600">CNPJ</p>
                    <p className="text-slate-800 font-mono">{partner.cnpj}</p>
                </div>
                 <div>
                    <p className="font-semibold text-slate-600">Endereço</p>
                    <p className="text-slate-800">{`${partner.endereco}, ${partner.cidade} - ${partner.uf}`}</p>
                </div>
                 <div>
                    <p className="font-semibold text-slate-600">Telefone</p>
                    <p className="text-slate-800">{partner.telefone}</p>
                </div>
            </div>
             <style>{`
                @keyframes fade-in-right {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-fade-in-right {
                    animation: fade-in-right 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    )
}

export default PartnerDetailCard;