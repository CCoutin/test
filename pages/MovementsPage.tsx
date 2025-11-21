import React, { useState, useMemo } from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, MovimentacaoTipo, Movimentacao } from '../types';
import PlusIcon from '../components/icons/PlusIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import Modal from '../components/ui/Modal';
import { BoxIcon, HashtagIcon, UserIcon, CalendarDaysIcon, DocumentTextIcon } from '../components/icons/HeroIcons';

interface MovementsPageProps {
  type: MovimentacaoTipo;
}

const pageConfig = {
    entrada: {
        title: 'Registro de Entradas',
        buttonText: 'Nova Entrada',
        modalTitle: 'Registrar Nova Entrada',
        headers: ['Material', 'Quantidade', 'Colaborador', 'Data', 'Nota Fiscal']
    },
    saida: {
        title: 'Registro de Saídas',
        buttonText: 'Nova Saída',
        modalTitle: 'Registrar Nova Saída',
        headers: ['Material', 'Quantidade', 'Colaborador', 'Data']
    },
    consumo: {
        title: 'Registro de Consumo',
        buttonText: 'Novo Consumo',
        modalTitle: 'Registrar Novo Consumo',
        headers: ['Material', 'Quantidade', 'Colaborador', 'Data']
    }
}

const MovementsPage: React.FC<MovementsPageProps> = ({ type }) => {
  const { user } = useAuth();
  const { 
    movements: allMovements, 
    addMovement, 
    updateMovement, 
    deleteMovement,
    materials: mockMateriais,
    collaborators: mockColaboradores
  } = useDatabase();
  
  const { title, buttonText, modalTitle, headers } = pageConfig[type];

  const canAdd = user?.role === UserRole.OPERADOR || user?.role === UserRole.GERENTE || user?.role === UserRole.DIRETOR;
  const canEdit = user?.role === UserRole.OPERADOR || user?.role === UserRole.GERENTE || user?.role === UserRole.DIRETOR;
  const canDelete = user?.role === UserRole.DIRETOR;
  
  const movements = useMemo(() => allMovements.filter(m => m.tipo === type), [allMovements, type]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const initialFormState = {
    material: '',
    quantidade: 0,
    colaborador: '',
    data: new Date().toISOString().split('T')[0],
    notaFiscal: '',
  };
  
  const [currentMovement, setCurrentMovement] = useState(initialFormState);
  const [movementToEdit, setMovementToEdit] = useState<Movimentacao | null>(null);
  const [movementToDelete, setMovementToDelete] = useState<Movimentacao | null>(null);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentMovement(prev => ({ ...prev, [name]: name === 'quantidade' ? parseInt(value, 10) || 0 : value }));
  };

  const isFormValid = currentMovement.material && currentMovement.colaborador && currentMovement.quantidade > 0 && currentMovement.data;

  const handleOpenAddModal = () => {
    setMovementToEdit(null);
    setCurrentMovement(initialFormState);
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = (movement: Movimentacao) => {
    setMovementToEdit(movement);
    setCurrentMovement({
      material: movement.material,
      quantidade: movement.quantidade,
      colaborador: movement.colaborador,
      data: movement.data,
      notaFiscal: movement.notaFiscal || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (movement: Movimentacao) => {
    setMovementToDelete(movement);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!movementToDelete) return;
    deleteMovement(movementToDelete.id);
    setIsDeleteModalOpen(false);
    setMovementToDelete(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setMovementToEdit(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    if (movementToEdit) {
        updateMovement({ ...movementToEdit, ...currentMovement });
    } else {
        addMovement(currentMovement, type);
    }
    
    closeModal();
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  const currentModalTitle = movementToEdit ? `Editar Movimentação` : modalTitle;
  const submitText = movementToEdit ? 'Salvar Alterações' : 'Registrar';
  const tableHeaders = [...headers, 'Ações'];

  return (
    <>
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">{title}</h1>
                {canAdd && (
                    <button 
                        onClick={handleOpenAddModal}
                        className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        {buttonText}
                    </button>
                )}
            </div>
            
            <Card>
                <Table headers={tableHeaders}>
                {movements.map(mov => (
                    <tr key={mov.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">{mov.material}</td>
                    <td className="p-4 text-slate-600">{mov.quantidade}</td>
                    <td className="p-4 text-slate-600">{mov.colaborador}</td>
                    <td className="p-4 text-slate-600">{formatDate(mov.data)}</td>
                    {type === 'entrada' && (
                        <td className="p-4 text-blue-600 font-mono hover:underline cursor-pointer">{mov.notaFiscal || 'N/A'}</td>
                    )}
                    <td className="p-4">
                        <div className="flex items-center space-x-2">
                            {canEdit && (
                                <button onClick={() => handleOpenEditModal(mov)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="Editar">
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                            )}
                            {(canDelete || (canEdit && mov.id.startsWith('MOV1'))) && (
                                <button onClick={() => handleOpenDeleteModal(mov)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors" title="Excluir">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            )}
                        </div>
                    </td>
                    </tr>
                ))}
                </Table>
            </Card>
        </div>

        <Modal isOpen={isModalOpen} onClose={closeModal} title={currentModalTitle}>
            <form onSubmit={handleSubmit} className="space-y-4">
                 {/* Material */}
                <div>
                    <label htmlFor="material" className="block text-sm font-medium text-slate-700">Material</label>
                    <div className="mt-1 relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <BoxIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <select 
                            id="material" 
                            name="material" 
                            value={currentMovement.material} 
                            onChange={handleInputChange}
                            className="block w-full rounded-md border-2 border-transparent bg-slate-800 text-white p-2 pl-10 focus:border-blue-500 focus:outline-none sm:text-sm"
                            required
                        >
                            <option value="">Selecione um material</option>
                            {mockMateriais.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                        </select>
                    </div>
                </div>

                {/* Quantidade */}
                 <div>
                    <label htmlFor="quantidade" className="block text-sm font-medium text-slate-700">Quantidade</label>
                    <div className="mt-1 relative">
                         <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <HashtagIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input 
                            type="number" 
                            id="quantidade" 
                            name="quantidade" 
                            value={currentMovement.quantidade} 
                            onChange={handleInputChange}
                            className="block w-full rounded-md border-2 border-transparent bg-slate-800 text-white p-2 pl-10 focus:border-blue-500 focus:outline-none sm:text-sm placeholder-slate-400"
                            min="1"
                            required
                        />
                    </div>
                </div>

                 {/* Colaborador */}
                 <div>
                    <label htmlFor="colaborador" className="block text-sm font-medium text-slate-700">Colaborador</label>
                    <div className="mt-1 relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <UserIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <select 
                            id="colaborador" 
                            name="colaborador" 
                            value={currentMovement.colaborador} 
                            onChange={handleInputChange}
                            className="block w-full rounded-md border-2 border-transparent bg-slate-800 text-white p-2 pl-10 focus:border-blue-500 focus:outline-none sm:text-sm"
                            required
                        >
                            <option value="">Selecione um colaborador</option>
                            {mockColaboradores.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                        </select>
                    </div>
                </div>

                 {/* Data */}
                <div>
                    <label htmlFor="data" className="block text-sm font-medium text-slate-700">Data</label>
                     <div className="mt-1 relative">
                         <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <CalendarDaysIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input 
                            type="date" 
                            id="data" 
                            name="data" 
                            value={currentMovement.data} 
                            onChange={handleInputChange}
                            className="block w-full rounded-md border-2 border-transparent bg-slate-800 text-white p-2 pl-10 focus:border-blue-500 focus:outline-none sm:text-sm"
                            style={{ colorScheme: 'dark' }}
                            required
                        />
                    </div>
                </div>

                 {/* Nota Fiscal (conditional) */}
                {type === 'entrada' && (
                    <div>
                        <label htmlFor="notaFiscal" className="block text-sm font-medium text-slate-700">Número da Nota Fiscal (Opcional)</label>
                         <div className="mt-1 relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <DocumentTextIcon className="h-5 w-5 text-slate-400" />
                            </div>
                            <input 
                                type="text" 
                                id="notaFiscal" 
                                name="notaFiscal" 
                                value={currentMovement.notaFiscal} 
                                onChange={handleInputChange}
                                className="block w-full rounded-md border-2 border-transparent bg-slate-800 text-white p-2 pl-10 focus:border-blue-500 focus:outline-none sm:text-sm placeholder-slate-400"
                                placeholder="Ex: 20250009"
                            />
                        </div>
                    </div>
                )}
                
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={!isFormValid}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                        {submitText}
                    </button>
                </div>
            </form>
        </Modal>

        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Exclusão">
            <div className="space-y-4">
                <p>Tem certeza de que deseja excluir este lançamento? Esta ação não pode ser desfeita.</p>
                <div className="flex justify-end space-x-3 pt-4">
                    <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">
                        Cancelar
                    </button>
                    <button onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                        Excluir
                    </button>
                </div>
            </div>
        </Modal>
    </>
  );
};

export default MovementsPage;