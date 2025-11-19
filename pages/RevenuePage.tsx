import React, { useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import BarChart from '../components/ui/BarChart';
import { useDatabase } from '../contexts/DatabaseContext';
import { SparklesIcon, CurrencyDollarIcon } from '../components/icons/HeroIcons';
import { forecastNextMonthRevenue, AIRevenueForecast } from '../services/geminiService';

const RevenuePage: React.FC = () => {
    const { movements: mockMovimentacoes, materials: mockMateriais } = useDatabase();
    const [aiForecast, setAiForecast] = useState<AIRevenueForecast | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const monthlyRevenueData = useMemo(() => {
        const materialPrices = new Map(mockMateriais.map(m => [m.nome, m.valorUnitario]));
        const monthlyTotals = Array(12).fill(0);

        mockMovimentacoes
            .filter(m => (m.tipo === 'saida' || m.tipo === 'consumo'))
            .forEach(mov => {
                const month = new Date(mov.data).getUTCMonth(); // 0-11
                // FIX: Explicitly cast values to Number to avoid type errors during multiplication.
                const value = Number(mov.quantidade) * (Number(materialPrices.get(mov.material)) || 0);
                monthlyTotals[month] += value;
            });
        
        const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        return monthLabels.map((label, index) => ({
            label,
            value: monthlyTotals[index],
        }));

    }, [mockMovimentacoes, mockMateriais]);

    const totalRevenue = useMemo(() => {
        return monthlyRevenueData.reduce((sum, data) => sum + data.value, 0);
    }, [monthlyRevenueData]);
    
    const handleForecastClick = async () => {
        setIsLoading(true);
        setError(null);
        setAiForecast(null);

        const historicData = monthlyRevenueData
            .filter(d => d.value > 0)
            .map(d => ({ month: d.label, revenue: d.value }));
        
        try {
            const forecast = await forecastNextMonthRevenue(historicData);
            setAiForecast(forecast);
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao gerar a previsão.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Faturamento Anual</h1>
        <button 
            onClick={handleForecastClick}
            disabled={isLoading}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
            <SparklesIcon className="w-5 h-5 mr-2" />
            {isLoading ? 'Analisando...' : 'Prever Próximo Mês'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            <Card>
                <h2 className="text-lg font-semibold mb-4">Receita por Mês</h2>
                <BarChart data={monthlyRevenueData} />
            </Card>
        </div>

        <div className="space-y-6">
            <Card>
                <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                       <CurrencyDollarIcon className="w-8 h-8"/>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Faturamento Total do Ano</p>
                        <p className="text-3xl font-bold text-slate-800">{formatCurrency(totalRevenue)}</p>
                    </div>
                </div>
            </Card>

            <Card>
                 <h2 className="text-lg font-semibold mb-2">Previsão da IA</h2>
                 {isLoading && (
                    <div className="text-center p-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-3 text-sm text-slate-600">Analisando dados históricos...</p>
                    </div>
                )}
                {error && <p className="text-sm text-center text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
                {aiForecast && !isLoading && (
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-slate-500">Previsão para o próximo mês:</p>
                            <p className="text-2xl font-bold text-blue-700">{formatCurrency(aiForecast.forecastValue)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Análise da IA:</p>
                            <blockquote className="border-l-4 border-slate-300 pl-3 italic text-sm text-slate-700 bg-slate-50 p-2 rounded-r-md">
                                {aiForecast.justification}
                            </blockquote>
                        </div>
                    </div>
                )}
                {!aiForecast && !isLoading && !error && (
                     <p className="text-sm text-slate-500 text-center py-4">Clique no botão acima para gerar uma previsão de faturamento com a IA.</p>
                )}
            </Card>
        </div>
      </div>
    </div>
  );
};

export default RevenuePage;