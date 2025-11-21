import React, { useEffect, useState, useRef } from 'react';
import Card from '../components/ui/Card';
import { useDatabase } from '../contexts/DatabaseContext';
import { UserIcon } from '../components/icons/HeroIcons';

// Declara a variável global L do Leaflet para o TypeScript
declare var L: any;

interface Position {
    coords: {
        latitude: number;
        longitude: number;
    }
}

const CollaboratorsPage: React.FC = () => {
    const { collaborators } = useDatabase();
    const [userLocation, setUserLocation] = useState<Position | null>(null);
    const [error, setError] = useState<string | null>(null);
    const mapRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const userMarkerRef = useRef<any>(null);
    const collaboratorMarkersRef = useRef<any[]>([]);

    useEffect(() => {
        if (navigator.geolocation) {
            const handleGeoError = (err: GeolocationPositionError) => {
                let message = 'Não foi possível obter sua localização.';
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        message = 'Permissão de localização negada. O mapa funcionará, mas sua posição não será exibida.';
                        break;
                    case err.POSITION_UNAVAILABLE:
                        message = 'Informações de localização indisponíveis no momento.';
                        break;
                    case err.TIMEOUT:
                        message = 'A solicitação de localização expirou.';
                        break;
                }
                setError(message);
            };

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation(pos);
                    setError(null);
                },
                handleGeoError,
                {
                    timeout: 10000,
                    maximumAge: 60000,
                    enableHighAccuracy: false,
                }
            );
        } else {
            setError('Geolocalização não é suportada por este navegador.');
        }
    }, []);

    // Inicializa o mapa (apenas uma vez)
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const map = L.map(mapContainerRef.current, {
                center: [-20.315, -40.312],
                zoom: 12,
            });
            mapRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
        }

        // Função de limpeza para desmontar o mapa
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []); // Array de dependência vazio para rodar apenas no mount/unmount

    // Adiciona/atualiza marcadores dos colaboradores
    useEffect(() => {
        if (!mapRef.current || collaborators.length === 0) return;

        // Limpa marcadores antigos
        collaboratorMarkersRef.current.forEach(marker => marker.remove());
        collaboratorMarkersRef.current = [];

        const redIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        const markers = collaborators.map(col => {
            return L.marker([col.latitude, col.longitude], { icon: redIcon })
                .addTo(mapRef.current)
                .bindPopup(`<b>${col.nome}</b>`);
        });
        collaboratorMarkersRef.current = markers;
        
    }, [collaborators]); // Re-executa se os colaboradores mudarem


    // Adiciona ou atualiza o marcador do usuário
    useEffect(() => {
        if (!mapRef.current || !userLocation) return;

        const blueIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        const userLatLng: [number, number] = [userLocation.coords.latitude, userLocation.coords.longitude];
        
        if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng(userLatLng);
        } else {
            userMarkerRef.current = L.marker(userLatLng, { icon: blueIcon })
                .addTo(mapRef.current)
                .bindPopup('<b>Você</b>');
        }
        
        mapRef.current.setView(userLatLng, 13);
        
    }, [userLocation]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Colaboradores</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4">Lista de Colaboradores</h2>
             <ul className="divide-y divide-slate-200 h-[32rem] overflow-y-auto">
                {collaborators.map(col => (
                    <li key={col.id} className="py-3 flex items-center">
                        <UserIcon className="w-6 h-6 mr-3 text-slate-400"/>
                        <span className="font-medium text-slate-700">{col.nome}</span>
                    </li>
                ))}
            </ul>
        </Card>
        
        <Card className="lg:col-span-2">
             <h2 className="text-lg font-semibold mb-4">Localização em Tempo Real</h2>
             {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
             <div ref={mapContainerRef} className="w-full h-[32rem] bg-slate-200 rounded-lg z-0">
                {/* O mapa será renderizado aqui pelo Leaflet */}
             </div>
        </Card>
      </div>
    </div>
  );
};

export default CollaboratorsPage;