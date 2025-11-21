import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/ui/Card';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, Parceiro } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import { BuildingStorefrontIcon } from '../components/icons/HeroIcons';
import PartnerDetailCard from '../components/PartnerDetailCard';

// Declara a variável global L do Leaflet para o TypeScript
declare var L: any;

interface Position {
    coords: {
        latitude: number;
        longitude: number;
    }
}

const PartnersPage: React.FC = () => {
    const { user } = useAuth();
    const { partners: mockParceiros } = useDatabase();
    const [selectedPartner, setSelectedPartner] = useState<Parceiro | null>(null);
    const canEdit = user?.role === UserRole.DIRETOR;

    const [userLocation, setUserLocation] = useState<Position | null>(null);
    const [error, setError] = useState<string | null>(null);
    const mapRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const partnerMarkersRef = useRef<any[]>([]);
    const userMarkerRef = useRef<any>(null);

    // Get user location
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

    // Initialize map
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const map = L.map(mapContainerRef.current, {
                center: [-20.25, -40.35], // Center of the greater Vitória area
                zoom: 11,
            });
            mapRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
        }
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Add partner markers
    useEffect(() => {
        if (!mapRef.current || mockParceiros.length === 0) return;

        partnerMarkersRef.current.forEach(marker => marker.remove());

        const redIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        });

        const markers = mockParceiros.map(partner => {
            const marker = L.marker([partner.latitude, partner.longitude], { 
                icon: redIcon,
                partnerId: partner.id // Custom property to identify marker
            })
            .addTo(mapRef.current)
            .bindPopup(`<b>${partner.nome}</b>`);
            
            marker.on('click', () => {
                setSelectedPartner(partner);
            });
            return marker;
        });
        partnerMarkersRef.current = markers;
        
    }, [mockParceiros]);

    // Add user location marker
    useEffect(() => {
        if (!mapRef.current || !userLocation) return;
        
        const blueIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        });
        
        const userLatLng: [number, number] = [userLocation.coords.latitude, userLocation.coords.longitude];

        if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng(userLatLng);
        } else {
            userMarkerRef.current = L.marker(userLatLng, { icon: blueIcon })
                .addTo(mapRef.current)
                .bindPopup('<b>Você</b>');
        }
    }, [userLocation]);
    
    // Highlight selected partner marker
    useEffect(() => {
        if (partnerMarkersRef.current.length === 0) return;

        const redIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        });

        const yellowIcon = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        });

        partnerMarkersRef.current.forEach(marker => {
            const isSelected = selectedPartner && marker.options.partnerId === selectedPartner.id;
            marker.setIcon(isSelected ? yellowIcon : redIcon);
            if (isSelected) {
                marker.openPopup();
                if (mapRef.current) {
                    mapRef.current.setView(marker.getLatLng(), 14);
                }
            }
        });
    }, [selectedPartner]);
    
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
                {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                <div ref={mapContainerRef} className="w-full h-[32rem] bg-slate-200 rounded-lg z-0">
                    {/* O mapa será renderizado aqui pelo Leaflet */}
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