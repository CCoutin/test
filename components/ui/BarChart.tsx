import React from 'react';

interface ChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: ChartData[];
  height?: number;
}

const BarChart: React.FC<BarChartProps> = ({ data, height = 300 }) => {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  const chartPadding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = 500; // Fixed width for SVG viewport
  const chartHeight = height;

  const barWidth = (chartWidth - chartPadding.left - chartPadding.right) / data.length * 0.8;
  const barSpacing = (chartWidth - chartPadding.left - chartPadding.right) / data.length * 0.2;

  const yScale = (value: number) => {
    return chartHeight - chartPadding.bottom - (value / maxValue) * (chartHeight - chartPadding.top - chartPadding.bottom);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
  };
  
  return (
    <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="min-w-[500px]" aria-labelledby="chart-title" role="img">
            <title id="chart-title">Gráfico de Faturamento Mensal</title>
            {/* Y-Axis */}
            <line x1={chartPadding.left} y1={chartPadding.top} x2={chartPadding.left} y2={chartHeight - chartPadding.bottom} stroke="#d1d5db" />
            
            {/* Y-Axis Labels */}
            {[...Array(5)].map((_, i) => {
                const value = (maxValue / 4) * i;
                const y = yScale(value);
                return(
                    <g key={i}>
                        <text x={chartPadding.left - 8} y={y} textAnchor="end" alignmentBaseline="middle" className="text-xs fill-slate-500">
                           {formatCurrency(value).replace('R$', '').trim()}
                        </text>
                        { i > 0 && <line x1={chartPadding.left} y1={y} x2={chartWidth - chartPadding.right} y2={y} stroke="#e5e7eb" strokeDasharray="2,2" />}
                    </g>
                );
            })}
            
            {/* X-Axis */}
            <line x1={chartPadding.left} y1={chartHeight - chartPadding.bottom} x2={chartWidth - chartPadding.right} y2={chartHeight - chartPadding.bottom} stroke="#d1d5db" />

            {/* Bars and X-Axis Labels */}
            {data.map((item, index) => {
                const x = chartPadding.left + index * (barWidth + barSpacing) + barSpacing / 2;
                const y = yScale(item.value);
                const barHeight = chartHeight - chartPadding.bottom - y;

                return (
                    <g key={item.label} className="group">
                        <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight > 0 ? barHeight : 0}
                            className="fill-blue-500 hover:fill-blue-600 transition-colors"
                        />
                        <text x={x + barWidth / 2} y={chartHeight - chartPadding.bottom + 15} textAnchor="middle" className="text-xs fill-slate-600 font-medium">
                            {item.label}
                        </text>
                         <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <rect x={x - 10} y={y - 30} width={barWidth + 20} height="25" rx="5" className="fill-slate-800" />
                            <text x={x + barWidth / 2} y={y - 17} textAnchor="middle" className="text-xs fill-white font-bold">
                                {formatCurrency(item.value)}
                            </text>
                        </g>
                    </g>
                );
            })}
        </svg>
    </div>
  );
};

export default BarChart;