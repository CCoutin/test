import React, { useState, useMemo } from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { useDatabase } from '../contexts/DatabaseContext';
import { Material } from '../types';

const InventoryPage: React.FC = () => {
    const { materials, updateMaterialStock } = useDatabase();
    const [physicalCounts, setPhysicalCounts] = useState<{ [key: string]: string }>({});
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const headers = ['Material', 'Estoque no Sistema', 'Estoque Físico (Contagem)', 'Diferença'];

    const handleCountChange = (materialId: string, count: string) => {
        const newCount = count.trim() === '' ? '' : String(Math.max(0, parseInt(count, 10) || 0));
        setPhysicalCounts(prev => ({
            ...prev,
            [materialId]: newCount
        }));
    };

    const itemsWithDiscrepancy = useMemo(() => {
        return Object.entries(physicalCounts).filter(([id, physicalCountStr]) => {
            if (physicalCountStr === '' || physicalCountStr === undefined) return false;
            const material = materials.find(m => m.id === id);
            if (!material) return false;
            return parseInt(physicalCountStr as string, 10) !== material.quantidade;
        });
    }, [physicalCounts, materials]);

    const handleSaveChangesClick = () => {
        if (itemsWithDiscrepancy.length > 0) {
            setIsConfirmModalOpen(true);
        }
    };

    const handleConfirmSave = () => {
        itemsWithDiscrepancy.forEach(([id, physicalCountStr]) => {
            updateMaterialStock(id, parseInt(physicalCountStr as string, 10));
        });
        
        setPhysicalCounts({}); // Reset changes
        setIsConfirmModalOpen(false);
        alert(`${itemsWithDiscrepancy.length} item(ns) do estoque foram ajustados com sucesso!`);
    };


    return (
    <>
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Inventário de Estoque</h1>
                <button
                    onClick={handleSaveChangesClick}
                    disabled={itemsWithDiscrepancy.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    Salvar Ajustes
                </button>
            </div>

            <Card>
                <Table headers={headers}>
                    {materials.map(material => {
                        const systemCount = material.quantidade;
                        const physicalCountStr = physicalCounts[material.id];
                        const physicalCount = physicalCountStr === '' || physicalCountStr === undefined 
                            ? systemCount 
                            : parseInt(physicalCountStr, 10);

                        const difference = physicalCount - systemCount;
                        
                        let diffColor = 'text-slate-500';
                        if (difference > 0) diffColor = 'text-blue-600';
                        if (difference < 0) diffColor = 'text-red-600';

                        return (
                            <tr key={material.id} className="border-b border-slate-200 last:border-b-0">
                                <td className="p-4">
                                     <div>
                                        <p className="font-semibold text-slate-800">{material.nome}</p>
                                        <p className="text-sm text-slate-500">{material.id}</p>
                                    </div>
                                </td>
                                <td className="p-4 font-medium text-slate-700">{systemCount}</td>
                                <td className="p-4">
                                    <input
                                        type="number"
                                        value={physicalCountStr ?? ''}
                                        onChange={(e) => handleCountChange(material.id, e.target.value)}
                                        placeholder={String(systemCount)}
                                        className="w-24 rounded-md border-2 border-transparent bg-slate-800 text-white p-2 focus:border-blue-500 focus:outline-none sm:text-sm placeholder-slate-400"
                                        min="0"
                                    />
                                </td>
                                <td className={`p-4 font-bold text-lg ${diffColor}`}>
                                    {difference !== 0 ? (difference > 0 ? `+${difference}` : difference) : '–'}
                                </td>
                            </tr>
                        )
                    })}
                </Table>
            </Card>
        </div>
        
        <Modal 
            isOpen={isConfirmModalOpen}
            onClose={() => setIsConfirmModalOpen(false)}
            title="Confirmar Ajuste de Estoque"
        >
            <div className="space-y-4">
                <p>Você está prestes a ajustar o estoque de <span className="font-bold">{itemsWithDiscrepancy.length}</span> item(ns) com divergência.</p>
                <p className="text-sm text-slate-600">Esta ação irá sobrescrever a quantidade atual no sistema com a contagem física informada. Deseja continuar?</p>
                <div className="flex justify-end space-x-3 pt-4">
                    <button onClick={() => setIsConfirmModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">
                        Cancelar
                    </button>
                    <button onClick={handleConfirmSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Confirmar e Salvar
                    </button>
                </div>
            </div>
        </Modal>
    </>
    );
};

export default InventoryPage;