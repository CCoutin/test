import React, { useState } from 'react';
import Card from '../components/ui/Card';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, Parceiro } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import { MapPinIcon, BuildingStorefrontIcon } from '../components/icons/HeroIcons';
import PartnerDetailCard from '../components/PartnerDetailCard';

const PartnersPage: React.FC = () => {
    const { user } = useAuth();
    const { partners: mockParceiros } = useDatabase();
    const [selectedPartner, setSelectedPartner] = useState<Parceiro | null>(null);
    const canEdit = user?.role === UserRole.DIRETOR;

    const bounds = {
        minLat: -21.3, maxLat: -19.5, minLon: -41.9, maxLon: -39.7,
    };

    const getPosition = (lat: number, lon: number) => {
        const top = 100 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
        const left = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 100;
        return { top: `${top}%`, left: `${left}%` };
    };
    
    const handlePartnerSelect = (partner: Parceiro) => {
        setSelectedPartner(partner);
    }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Parceiros e Fornecedores</h1>
         {canEdit && (
            <button className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                <PlusIcon className="w-5 h-5 mr-2" />
                Novo Parceiro
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4">Lista de Parceiros</h2>
            <ul className="divide-y divide-slate-200 h-[32rem] overflow-y-auto">
                {mockParceiros.map(parceiro => (
                    <li 
                        key={parceiro.id} 
                        className={`p-3 flex space-x-4 cursor-pointer rounded-md transition-colors ${selectedPartner?.id === parceiro.id ? 'bg-blue-100' : 'hover:bg-slate-50'}`}
                        onClick={() => handlePartnerSelect(parceiro)}
                    >
                        <div className="flex-shrink-0 mt-1">
                            <BuildingStorefrontIcon className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800">{parceiro.nome}</p>
                            <p className="text-sm text-slate-500">{parceiro.cidade}-{parceiro.uf}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </Card>

        <div className="lg:col-span-2 relative">
             <Card className="h-full">
                <h2 className="text-lg font-semibold mb-4">Localização dos Parceiros</h2>
                <div className="relative w-full h-[32rem] bg-slate-200 rounded-lg overflow-hidden">
                    <img src="https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/-40.8,-20.4,9/1000x800?access_token=pk.eyJ1IjoiZGFuaWVsc2FudG9zMTIzIiwiYSI6ImNseGo0cTNocjAyaHIya3Fvemd2MWpueGIifQ.GGFd-YV2Gv2RssKza_88dg" className="absolute w-full h-full object-cover"/>
                    <div className="absolute inset-0">
                        {mockParceiros.map(parceiro => {
                            const { top, left } = getPosition(parceiro.latitude, parceiro.longitude);
                            const isSelected = selectedPartner?.id === parceiro.id;
                            return (
                                <div 
                                    key={parceiro.id} 
                                    className="absolute transition-transform duration-300" 
                                    style={{ top, left, transform: `translate(-50%, -50%) scale(${isSelected ? 1.2 : 1})` }}
                                    onClick={() => handlePartnerSelect(parceiro)}
                                >
                                    <div className="flex flex-col items-center group cursor-pointer">
                                        <MapPinIcon className={`w-8 h-8 drop-shadow-lg transition-colors ${isSelected ? 'text-yellow-400' : 'text-blue-600'}`} />
                                        {isSelected && <div className="absolute w-4 h-4 bg-yellow-400 rounded-full -z-10 pin-pulse"></div>}
                                        <span className={`hidden group-hover:block text-xs font-bold text-white px-2 py-1 rounded-md whitespace-nowrap shadow-lg mt-1 ${isSelected ? 'bg-yellow-500' : 'bg-blue-600'}`}>
                                            {parceiro.nome}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </Card>
            {selectedPartner && (
                <PartnerDetailCard partner={selectedPartner} onClose={() => setSelectedPartner(null)} />
            )}
        </div>
      </div>
    </div>
  );
};

export default PartnersPage;