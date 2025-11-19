import React, { useMemo } from 'react';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import { useDatabase } from '../contexts/DatabaseContext';
import { 
    ArchiveBoxIcon, ExclamationTriangleIcon, NoSymbolIcon, ArrowTrendingUpIcon,
    BanknotesIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ScaleIcon
} from '../components/icons/HeroIcons';

const DashboardPage: React.FC = () => {
    const { materials: mockMateriais, movements: mockMovimentacoes } = useDatabase();
    
  const inventoryStats = useMemo(() => {
    const totalItens = mockMateriais.length;
    const estoqueNegativo = mockMateriais.filter(m => m.quantidade < 0).length;
    const estoqueZerado = mockMateriais.filter(m => m.quantidade === 0).length;
    const totalEstoque = mockMateriais.reduce((sum, m) => sum + m.quantidade, 0);
    return { totalItens, estoqueNegativo, estoqueZerado, totalEstoque };
  }, [mockMateriais]);

  const financialStats = useMemo(() => {
    const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const valorTotalEstoque = mockMateriais.reduce((sum, m) => sum + (m.quantidade * m.valorUnitario), 0);

    const materialPrices = new Map(mockMateriais.map(m => [m.nome, m.valorUnitario]));
    
    // Find the latest year and month from the data itself
    const latestYear = Math.max(...mockMovimentacoes.map(m => new Date(m.data).getUTCFullYear()));
    const latestMonthMovements = mockMovimentacoes.filter(m => new Date(m.data).getUTCFullYear() === latestYear);
    const latestMonth = Math.max(...latestMonthMovements.map(m => new Date(m.data).getUTCMonth() + 1));


    const movimentacoesMes = mockMovimentacoes.filter(mov => {
        const movDate = new Date(mov.data);
        return movDate.getUTCMonth() + 1 === latestMonth && movDate.getUTCFullYear() === latestYear;
    });

    const custoEntradasMes = movimentacoesMes
        .filter(m => m.tipo === 'entrada')
        // FIX: Explicitly cast values to Number to prevent type errors in arithmetic operations.
        .reduce((sum, mov) => sum + (Number(mov.quantidade) * (Number(materialPrices.get(mov.material)) || 0)), 0);

    const valorSaidasMes = movimentacoesMes
        .filter(m => m.tipo === 'saida' || m.tipo === 'consumo')
        // FIX: Explicitly cast values to Number to prevent type errors in arithmetic operations.
        .reduce((sum, mov) => sum + (Number(mov.quantidade) * (Number(materialPrices.get(mov.material)) || 0)), 0);
    
    const fluxoDeValor = valorSaidasMes - custoEntradasMes;

    return {
        valorTotalEstoque: formatCurrency(valorTotalEstoque),
        custoEntradasMes: formatCurrency(custoEntradasMes),
        valorSaidasMes: formatCurrency(valorSaidasMes),
        fluxoDeValor: formatCurrency(fluxoDeValor),
    }

  }, [mockMateriais, mockMovimentacoes]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
      
      {/* Inventory Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Itens Totais em Estoque" value={inventoryStats.totalEstoque.toLocaleString('pt-BR')} icon={<ArchiveBoxIcon className="w-6 h-6"/>} color="blue" />
        <StatCard title="Tipos de Itens Cadastrados" value={inventoryStats.totalItens} icon={<ArrowTrendingUpIcon className="w-6 h-6"/>} color="blue" />
        <StatCard title="Itens com Estoque Negativo" value={inventoryStats.estoqueNegativo} icon={<ExclamationTriangleIcon className="w-6 h-6"/>} color="red" />
        <StatCard title="Itens com Estoque Zerado" value={inventoryStats.estoqueZerado} icon={<NoSymbolIcon className="w-6 h-6"/>} color="yellow" />
      </div>

       {/* Financial Summary */}
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-700">Resumo Financeiro (Mês Recente)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Valor Total em Estoque" value={financialStats.valorTotalEstoque} icon={<BanknotesIcon className="w-6 h-6"/>} color="blue" />
                <StatCard title="Custo de Entradas (Mês)" value={financialStats.custoEntradasMes} icon={<ArrowDownTrayIcon className="w-6 h-6"/>} color="red" />
                <StatCard title="Valor de Saídas (Mês)" value={financialStats.valorSaidasMes} icon={<ArrowUpTrayIcon className="w-6 h-6"/>} color="green" />
                <StatCard title="Fluxo de Valor (Mês)" value={financialStats.fluxoDeValor} icon={<ScaleIcon className="w-6 h-6"/>} color="yellow" />
            </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Levels */}
        <Card className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Níveis de Estoque por Material</h2>
            <div className="space-y-4">
                {mockMateriais.slice(0, 5).map(material => (
                    <div key={material.id}>
                        <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700">{material.nome}</span>
                            <span className="text-sm font-medium text-slate-500">{material.quantidade} un.</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div 
                                className={`h-2.5 rounded-full ${material.quantidade > 50 ? 'bg-blue-500' : material.quantidade > 0 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(100, Math.max(0, (material.quantidade / (material.entradas || 1)) * 100))}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
        
        {/* Recent Movements */}
        <Card>
            <h2 className="text-lg font-semibold mb-4">Últimas Movimentações</h2>
            <ul className="divide-y divide-slate-200">
                {mockMovimentacoes.slice(0, 10).map(mov => {
                    const typeClasses = {
                        entrada: 'bg-blue-100 text-blue-800',
                        saida: 'bg-red-100 text-red-800',
                        consumo: 'bg-yellow-100 text-yellow-800'
                    }
                    return (
                         <li key={mov.id} className="py-3">
                            <p className="font-semibold text-sm">{mov.material}</p>
                            <div className="flex justify-between items-center text-xs text-slate-500">
                                <span>{mov.colaborador}</span>
                                <span className={`px-2 py-0.5 rounded-full font-medium ${typeClasses[mov.tipo]}`}>{mov.tipo.toUpperCase()} ({mov.quantidade})</span>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;