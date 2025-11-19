// pages/InvoicesPage.tsx
import React from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import PlusIcon from '../components/icons/PlusIcon';

const InvoicesPage: React.FC = () => {
    const { user } = useAuth();
    const { invoices: mockNotasFiscais, partners: mockParceiros } = useDatabase();
    const canAdd = user?.role === UserRole.DIRETOR;

    const headers = ['Número NF', 'Fornecedor', 'Data de Emissão', 'Valor Total', 'Itens'];

    const getPartnerName = (id: string) => {
        return mockParceiros.find(p => p.id === id)?.nome || 'Desconhecido';
    }
    
    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }

    return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Notas Fiscais</h1>
         {canAdd && (
            <button className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                <PlusIcon className="w-5 h-5 mr-2" />
                Nova Nota Fiscal
            </button>
        )}
      </div>

      <Card>
        <Table headers={headers}>
          {mockNotasFiscais.map(nf => (
            <tr key={nf.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors">
              <td className="p-4 font-mono text-blue-600">{nf.numero}</td>
              <td className="p-4 font-medium text-slate-800">{getPartnerName(nf.parceiroId)}</td>
              <td className="p-4 text-slate-600">{formatDate(nf.dataEmissao)}</td>
              <td className="p-4 font-semibold text-slate-800">{formatCurrency(nf.valorTotal)}</td>
              <td className="p-4 text-sm text-slate-600">
                <ul className="list-disc list-inside">
                    {nf.itens.map(item => (
                        <li key={item.materialId}>{item.quantidade}x {item.nome}</li>
                    ))}
                </ul>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
};

export default InvoicesPage;