// pages/ReportsPage.tsx
import React, { useState, useMemo } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import { ArrowDownTrayIcon, DocumentChartBarIcon } from '../components/icons/HeroIcons';

type ReportType = 'stock_value' | 'consumption_by_collaborator' | 'abc_curve';

const ReportsPage: React.FC = () => {
    const { materials, movements, collaborators } = useDatabase();
    const [activeReport, setActiveReport] = useState<ReportType | null>(null);

    const reportData = useMemo(() => {
        if (!activeReport) return null;

        switch (activeReport) {
            case 'stock_value':
                const stockValueData = materials.map(m => ({
                    'ID': m.id,
                    'Material': m.nome,
                    'Quantidade': m.quantidade,
                    'Valor Unitário': m.valorUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    'Valor Total': (m.quantidade * m.valorUnitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                }));
                const totalValue = materials.reduce((sum, m) => sum + m.quantidade * m.valorUnitario, 0);
                return {
                    title: 'Relatório de Valor de Estoque',
                    headers: ['ID', 'Material', 'Quantidade', 'Valor Unitário', 'Valor Total'],
                    data: stockValueData,
                    summary: `Valor Total do Estoque: ${totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                };

            case 'consumption_by_collaborator':
                const consumptionMap = new Map<string, { [material: string]: number }>();
                movements
                    .filter(m => m.tipo === 'consumo' || m.tipo === 'saida')
                    .forEach(mov => {
                        if (!consumptionMap.has(mov.colaborador)) {
                            // FIX: Corrected typo from `colaborator` to `colaborador`.
                            consumptionMap.set(mov.colaborador, {});
                        }
                        const currentData = consumptionMap.get(mov.colaborador)!;
                        currentData[mov.material] = (currentData[mov.material] || 0) + mov.quantidade;
                    });
                
                const consumptionData = Array.from(consumptionMap.entries()).map(([colaborador, items]) => ({
                    'Colaborador': colaborador,
                    'Itens Consumidos (Total)': Object.values(items).reduce((sum, qty) => sum + qty, 0),
                    'Detalhes': Object.entries(items).map(([name, qty]) => `${qty}x ${name}`).join(', '),
                }));
                return {
                    title: 'Relatório de Consumo por Colaborador',
                    headers: ['Colaborador', 'Itens Consumidos (Total)', 'Detalhes'],
                    data: consumptionData,
                };

            case 'abc_curve':
                const materialValue = materials.map(m => ({
                    ...m,
                    totalValue: m.quantidade * m.valorUnitario
                }));
                const totalInventoryValue = materialValue.reduce((sum, m) => sum + m.totalValue, 0);
                
                const sortedMaterials = materialValue
                    .sort((a, b) => b.totalValue - a.totalValue)
                    .map(m => ({
                        ...m,
                        percentageOfTotal: totalInventoryValue > 0 ? (m.totalValue / totalInventoryValue) * 100 : 0
                    }));
                
                let cumulativePercentage = 0;
                const abcData = sortedMaterials.map(m => {
                    cumulativePercentage += m.percentageOfTotal;
                    let classification = 'C';
                    if (cumulativePercentage <= 80) {
                        classification = 'A';
                    } else if (cumulativePercentage <= 95) {
                        classification = 'B';
                    }
                    return {
                        'Classificação': classification,
                        'Material': m.nome,
                        'Valor em Estoque': m.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                        '% do Valor Total': `${m.percentageOfTotal.toFixed(2)}%`,
                        '% Acumulada': `${cumulativePercentage.toFixed(2)}%`,
                    }
                });
                return {
                    title: 'Relatório Curva ABC de Materiais',
                    headers: ['Classificação', 'Material', 'Valor em Estoque', '% do Valor Total', '% Acumulada'],
                    data: abcData,
                    summary: "Classe A: 80% do valor. Classe B: 15% do valor. Classe C: 5% do valor."
                };
            
            default:
                return null;
        }
    }, [activeReport, materials, movements]);
    
    const exportToCSV = () => {
        if (!reportData) return;
        
        const { headers, data, title } = reportData;
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if(link.href) {
            URL.revokeObjectURL(link.href);
        }
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${title.replace(/ /g, '_').toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderReport = () => {
        if (!reportData) {
            return (
                <div className="text-center py-16">
                    <DocumentChartBarIcon className="w-20 h-20 mx-auto text-slate-300" />
                    <h2 className="mt-4 text-xl font-semibold text-slate-600">Selecione um Relatório</h2>
                    <p className="mt-1 text-slate-500">Escolha uma das opções acima para gerar e visualizar os dados.</p>
                </div>
            )
        }
        
        return (
            <div>
                 <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{reportData.title}</h2>
                        {reportData.summary && <p className="text-sm text-slate-500">{reportData.summary}</p>}
                    </div>
                    <button onClick={exportToCSV} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                        <ArrowDownTrayIcon className="w-5 h-5 mr-2"/>
                        Exportar CSV
                    </button>
                </div>
                <Table headers={reportData.headers}>
                    {reportData.data.map((row, index) => (
                        <tr key={index} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50">
                            {reportData.headers.map(header => (
                                <td key={header} className="p-4 text-slate-700">{row[header]}</td>
                            ))}
                        </tr>
                    ))}
                </Table>
            </div>
        )
    };
    
    const ReportButton = ({ reportType, label }: { reportType: ReportType, label: string }) => (
        <button
            onClick={() => setActiveReport(reportType)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeReport === reportType ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
        >
            {label}
        </button>
    )

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800">Relatórios</h1>

            <Card className="flex flex-wrap gap-4">
                <ReportButton reportType="stock_value" label="Valor do Estoque" />
                <ReportButton reportType="consumption_by_collaborator" label="Consumo por Colaborador" />
                <ReportButton reportType="abc_curve" label="Curva ABC" />
            </Card>

            <Card>
                {renderReport()}
            </Card>
        </div>
    );
};

export default ReportsPage;