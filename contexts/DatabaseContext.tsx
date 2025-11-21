import React, { createContext, useState, useContext, ReactNode } from 'react';
import { 
    mockMateriais, 
    mockMovimentacoes, 
    mockColaboradores, 
    mockParceiros, 
    mockNotasFiscais 
} from '../data/mockDatabase';
import { Material, Movimentacao, Colaborador, Parceiro, NotaFiscal, MovimentacaoTipo, UserRole } from '../types';

interface DatabaseContextType {
  materials: Material[];
  movements: Movimentacao[];
  collaborators: Colaborador[];
  partners: Parceiro[];
  invoices: NotaFiscal[];
  addMovement: (movement: Omit<Movimentacao, 'id' | 'tipo'>, type: MovimentacaoTipo) => void;
  updateMovement: (updatedMovement: Movimentacao) => void;
  deleteMovement: (movementId: string) => void;
  addMaterial: (material: Omit<Material, 'id' | 'entradas'>) => void;
  updateMaterial: (updatedMaterial: Material) => void;
  deleteMaterial: (materialId: string) => void;
  updateMaterialStock: (materialId: string, newQuantity: number) => void;
  updateCollaboratorRole: (collaboratorId: string, newRole: UserRole) => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [materials, setMaterials] = useState<Material[]>(mockMateriais);
  const [movements, setMovements] = useState<Movimentacao[]>(mockMovimentacoes);
  const [collaborators, setCollaborators] = useState<Colaborador[]>(mockColaboradores);
  const [partners, setPartners] = useState<Parceiro[]>(mockParceiros);
  const [invoices, setInvoices] = useState<NotaFiscal[]>(mockNotasFiscais);

  // Movement Functions
  const addMovement = (movement: Omit<Movimentacao, 'id' | 'tipo'>, type: MovimentacaoTipo) => {
    // Find material and collaborator by name to ensure data integrity
    const material = materials.find(m => m.nome.toLowerCase() === movement.material.toLowerCase());
    const collaborator = collaborators.find(c => c.nome.toLowerCase() === movement.colaborador.toLowerCase());

    if (!material) {
        console.error(`Material "${movement.material}" não encontrado.`);
        // In a real app, you'd throw an error or handle it more gracefully
        return;
    }
    if (!collaborator) {
        console.error(`Colaborador "${movement.colaborador}" não encontrado.`);
        return;
    }

    const newMovement: Movimentacao = { 
        ...movement, 
        material: material.nome, // Use the canonical name
        colaborador: collaborator.nome, // Use the canonical name
        id: `MOV${Date.now()}`, 
        tipo: type,
        notaFiscal: type === 'entrada' ? movement.notaFiscal : undefined,
    };
    
    setMovements(prev => [newMovement, ...prev].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));

    // Automatically update stock
    const quantityChange = type === 'entrada' ? movement.quantidade : -movement.quantidade;
    const newQuantity = material.quantidade + quantityChange;
    updateMaterialStock(material.id, newQuantity);
  };

  const updateMovement = (updatedMovement: Movimentacao) => {
    setMovements(prev => prev.map(m => m.id === updatedMovement.id ? updatedMovement : m));
  };

  const deleteMovement = (movementId: string) => {
    setMovements(prev => prev.filter(m => m.id !== movementId));
  };

  // Material Functions
  const addMaterial = (material: Omit<Material, 'id' | 'entradas'>) => {
    const newMaterial: Material = { 
        ...material, 
        id: `MAT${Date.now()}`, 
        entradas: material.quantidade, // Initial entries equals current quantity
    };
    setMaterials(prev => [newMaterial, ...prev]);
  };

  const updateMaterial = (updatedMaterial: Material) => {
    setMaterials(prev => prev.map(m => m.id === updatedMaterial.id ? updatedMaterial : m));
  };

  const deleteMaterial = (materialId: string) => {
    setMaterials(prev => prev.filter(m => m.id !== materialId));
  };

  const updateMaterialStock = (materialId: string, newQuantity: number) => {
    setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, quantidade: newQuantity } : m));
  };
  
  const updateCollaboratorRole = (collaboratorId: string, newRole: UserRole) => {
    setCollaborators(prev => 
        prev.map(c => 
            c.id === collaboratorId ? { ...c, role: newRole } : c
        )
    );
  };


  const value = {
    materials,
    movements,
    collaborators,
    partners,
    invoices,
    addMovement,
    updateMovement,
    deleteMovement,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    updateMaterialStock,
    updateCollaboratorRole,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
