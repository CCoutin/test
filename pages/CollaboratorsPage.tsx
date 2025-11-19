import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import { useDatabase } from '../contexts/DatabaseContext';
import { UserIcon, MapPinIcon } from '../components/icons/HeroIcons';

interface Position {
    coords: {
        latitude: number;
        longitude: number;
    }
}

const CollaboratorsPage: React.FC = () => {
    const { collaborators: mockColaboradores } = useDatabase();
    const [userLocation, setUserLocation] = useState<Position | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation(pos);
                    setError(null);
                },
                (err) => {
                    setError(`Erro ao obter localização: ${err.message}`);
                }
            );
        } else {
            setError('Geolocalização não é suportada por este navegador.');
        }
    }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Colaboradores</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4">Lista de Colaboradores</h2>
             <ul className="divide-y divide-slate-200">
                {mockColaboradores.map(col => (
                    <li key={col.id} className="py-3 flex items-center">
                        <UserIcon className="w-6 h-6 mr-3 text-slate-400"/>
                        <span className="font-medium text-slate-700">{col.nome}</span>
                    </li>
                ))}
            </ul>
        </Card>
        
        <Card className="lg:col-span-2">
             <h2 className="text-lg font-semibold mb-4">Localização em Tempo Real</h2>
             {error && <p className="text-red-500 text-sm">{error}</p>}
             <div className="relative w-full h-96 bg-slate-200 rounded-lg overflow-hidden">
                {/* Simulated Map Background */}
                <img src="https://www.mapbox.com/help/img/guides/static-tiles-api/simple-style-light.png" className="absolute w-full h-full object-cover opacity-50"/>
                <div className="absolute inset-0">
                    {/* Render user location */}
                    {userLocation && (
                        <div className="absolute" style={{left: '50%', top: '50%', transform: 'translate(-50%, -50%)'}}>
                           <div className="flex flex-col items-center">
                             <MapPinIcon className="w-8 h-8 text-blue-600" />
                             <span className="text-xs font-bold bg-blue-600 text-white px-2 py-1 rounded-md">Você</span>
                           </div>
                        </div>
                    )}
                    {/* Render collaborators */}
                    {mockColaboradores.map(col => (
                        <div key={col.id} className="absolute" style={{left: `${(col.longitude + 180) % 360 / 3.6}%`, top: `${(-col.latitude + 90) % 180 / 1.8}%`}}>
                            <div className="flex flex-col items-center group cursor-pointer">
                                <MapPinIcon className="w-7 h-7 text-red-500" />
                                <span className="hidden group-hover:block text-xs font-bold bg-red-500 text-white px-2 py-1 rounded-md whitespace-nowrap">{col.nome}</span>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        </Card>
      </div>
    </div>
  );
};

export default CollaboratorsPage;