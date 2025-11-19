import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, Material } from '../types';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PlusIcon from '../components/icons/PlusIcon';
import { SparklesIcon, BoxIcon, ExclamationTriangleIcon } from '../components/icons/HeroIcons';
import Modal from '../components/ui/Modal';
import { suggestSupplier, AISuggestion } from '../services/geminiService';

const MaterialsPage: React.FC = () => {
  const { user } = useAuth();
  const { 
    materials, 
    addMaterial, 
    updateMaterial, 
    deleteMaterial,
    partners,
    movements,
    invoices
  } = useDatabase();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);

  // State for Add/Edit Form
  const initialFormState: Omit<Material, 'id' | 'entradas' | 'foto'> & { foto?: string } = {
    nome: '',
    codigoFabricante: '',
    quantidade: 0,
    armazenamento: '',
    valorUnitario: 0,
    foto: ''
  };
  const [currentMaterial, setCurrentMaterial] = useState(initialFormState);
  const [materialToEdit, setMaterialToEdit] = useState<Material | null>(null);
  
  // State for Delete
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  // State for AI Suggestion
  const [suggestionMaterial, setSuggestionMaterial] = useState<Material | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const canEdit = user?.role === UserRole.GERENTE || user?.role === UserRole.DIRETOR;
  const canDelete = user?.role === UserRole.DIRETOR;
  
  const headers = ['Produto', 'Cód. Fabricante', 'Em Estoque', 'Local', 'Ações'];

  // CRUD Modal Handlers
  const handleOpenAddModal = () => {
    setMaterialToEdit(null);
    setCurrentMaterial(initialFormState);
    setIsModalOpen(true);
  };
  
  const handleOpenEditModal = (material: Material) => {
    setMaterialToEdit(material);
    setCurrentMaterial(material);
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (material: Material) => {
    setMaterialToDelete(material);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!materialToDelete) return;
    deleteMaterial(materialToDelete.id);
    setIsDeleteModalOpen(false);
    setMaterialToDelete(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentMaterial(prev => ({ 
      ...prev, 
      [name]: (name === 'quantidade' || name === 'valorUnitario') ? parseFloat(value) || 0 : value 
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            setCurrentMaterial(prev => ({
                ...prev,
                foto: reader.result as string
            }));
        };
        reader.readAsDataURL(file);
    }
  };
  
  const isFormValid = currentMaterial.nome && currentMaterial.codigoFabricante && currentMaterial.armazenamento && currentMaterial.valorUnitario > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    if (materialToEdit) {
      updateMaterial({ ...materialToEdit, ...currentMaterial });
    } else {
      addMaterial(currentMaterial);
    }
    
    setIsModalOpen(false);
  };

  // AI Suggestion Handlers
  const handleSuggestClick = async (material: Material) => {
    setSuggestionMaterial(material);
    setIsSuggestionModalOpen(true);
    setIsLoading(true);
    setError(null);
    setAiSuggestion(null);

    try {
        const suggestion = await suggestSupplier(material.nome, partners, movements, invoices);
        setAiSuggestion(suggestion);
    } catch (err: any) {
        setError(err.message || 'Ocorreu um erro.');
    } finally {
        setIsLoading(false);
    }
  };

  const closeSuggestionModal = () => {
    setIsSuggestionModalOpen(false);
    setSuggestionMaterial(null);
  }

  const getSuggestedPartnerName = () => {
      if(!aiSuggestion) return 'N/A';
      return partners.find(p => p.id === aiSuggestion.recommendedPartnerId)?.nome || 'Desconhecido';
  }
  
  const modalTitle = materialToEdit ? 'Editar Material' : 'Adicionar Novo Material';
  const submitText = materialToEdit ? 'Salvar Alterações' : 'Adicionar Material';

  return (
    <>
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-800">Cadastro de Materiais</h1>
                {canEdit && (
                    <button onClick={handleOpenAddModal} className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Novo Material
                    </button>
                )}
            </div>
            
            <Card>
                <Table headers={headers}>
                {materials.map(material => {
                    const isNegativeStock = material.quantidade < 0;
                    const isOutOfStock = material.quantidade === 0;
                    const isLowStock = material.quantidade > 0 && material.quantidade < 20;

                    const rowClasses = `border-b border-slate-200 last:border-b-0 transition-colors ${
                        isNegativeStock ? 'bg-red-100 hover:bg-red-200' :
                        isOutOfStock ? 'bg-red-50 hover:bg-red-100' :
                        isLowStock ? 'bg-yellow-50 hover:bg-yellow-100' :
                        'hover:bg-slate-50'
                    }`;

                    const badgeClasses = `px-2 py-1 text-sm font-semibold rounded-full ${
                        isNegativeStock ? 'bg-red-200 text-red-900' :
                        isOutOfStock ? 'bg-red-100 text-red-800' :
                        isLowStock ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                    }`;
                    
                    return (
                        <tr key={material.id} className={rowClasses}>
                        <td className="p-4">
                            <div className="flex items-center space-x-4">
                            <img src={material.foto} alt={material.nome} className="w-12 h-12 rounded-md object-cover"/>
                            <div>
                                <p className="font-semibold text-slate-800">{material.nome}</p>
                                <p className="text-sm text-slate-500">{material.id}</p>
                            </div>
                            </div>
                        </td>
                        <td className="p-4 text-sm text-slate-600 font-mono">{material.codigoFabricante}</td>
                        <td className="p-4">
                            <span className={badgeClasses}>
                                {material.quantidade} un.
                            </span>
                            {isNegativeStock && (
                                <div className="flex items-center mt-1 text-red-700">
                                    <ExclamationTriangleIcon className="w-4 h-4 mr-1"/>
                                    <p className="text-xs font-bold">
                                        Estoque negativo! Realize um novo pedido com urgência.
                                    </p>
                                </div>
                            )}
                        </td>
                        <td className="p-4 text-slate-600">{material.armazenamento}</td>
                        <td className="p-4">
                            <div className="flex items-center space-x-2">
                            {canEdit && (
                                <button onClick={() => handleOpenEditModal(material)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors" title="Editar">
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                            )}
                            {canDelete && (
                                <button onClick={() => handleOpenDeleteModal(material)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors" title="Excluir">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            )}
                            <button onClick={() => handleSuggestClick(material)} className="p-2 text-slate-500 hover:text-yellow-600 hover:bg-yellow-100 rounded-full transition-colors" title="Sugerir Fornecedor">
                                <SparklesIcon className="w-5 h-5"/>
                            </button>
                            </div>
                        </td>
                        </tr>
                    )
                })}
                </Table>
            </Card>
        </div>

        {/* Add/Edit Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalTitle}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="nome" className="block text-sm font-medium text-slate-700">Nome do Material</label>
                    <input type="text" name="nome" value={currentMaterial.nome} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="codigoFabricante" className="block text-sm font-medium text-slate-700">Cód. Fabricante</label>
                        <input type="text" name="codigoFabricante" value={currentMaterial.codigoFabricante} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required />
                    </div>
                     <div>
                        <label htmlFor="quantidade" className="block text-sm font-medium text-slate-700">Quantidade</label>
                        <input type="number" name="quantidade" value={currentMaterial.quantidade} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="armazenamento" className="block text-sm font-medium text-slate-700">Local</label>
                        <input type="text" name="armazenamento" value={currentMaterial.armazenamento} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" required />
                    </div>
                     <div>
                        <label htmlFor="valorUnitario" className="block text-sm font-medium text-slate-700">Valor Unitário (R$)</label>
                        <input type="number" name="valorUnitario" value={currentMaterial.valorUnitario} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" min="0.01" step="0.01" required />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700">Foto do Material</label>
                    <div className="mt-2 flex items-center space-x-6">
                        <div className="shrink-0">
                            {currentMaterial.foto ? (
                                <img src={currentMaterial.foto} alt="Pré-visualização" className="h-20 w-20 rounded-md object-cover" />
                            ) : (
                                <div className="h-20 w-20 rounded-md bg-slate-100 flex items-center justify-center">
                                    <BoxIcon className="w-10 h-10 text-slate-400" />
                                </div>
                            )}
                        </div>
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <span>Carregar um arquivo</span>
                            <input id="file-upload" name="foto" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                        </label>
                    </div>
                </div>
                <div className="pt-4">
                     <button type="submit" disabled={!isFormValid} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed">
                       {submitText}
                    </button>
                </div>
            </form>
        </Modal>

        {/* Delete Modal */}
         <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Exclusão">
            <div className="space-y-4">
                <p>Tem certeza de que deseja excluir o material <span className="font-bold">{materialToDelete?.nome}</span>? Esta ação não pode ser desfeita.</p>
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

        {/* Suggestion Modal */}
        <Modal 
            isOpen={isSuggestionModalOpen} 
            onClose={closeSuggestionModal} 
            title={`Sugestão de Fornecedor para ${suggestionMaterial?.nome}`}
        >
            {isLoading && (
                <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600">A IA está analisando os melhores fornecedores...</p>
                </div>
            )}
            {error && <p className="text-sm text-center text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
            {aiSuggestion && !isLoading && (
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-slate-500">Fornecedor Recomendado:</p>
                        <p className="text-xl font-bold text-blue-700">{getSuggestedPartnerName()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Justificativa da IA:</p>
                        <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-700 bg-slate-50 p-3 rounded-r-md">
                            {aiSuggestion.justification}
                        </blockquote>
                    </div>
                </div>
            )}
        </Modal>
    </>
  );
};

export default MaterialsPage;