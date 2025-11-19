import React from 'react';
import { WrenchScrewdriverIcon } from '../components/icons/HeroIcons';

interface WIPPageProps {
    pageName: string;
}

const WIPPage: React.FC<WIPPageProps> = ({ pageName }) => {
    const title = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    
  return (
    <div className="flex flex-col items-center justify-center h-full text-center bg-white rounded-lg shadow-md p-8">
      <WrenchScrewdriverIcon className="w-20 h-20 text-slate-400 mb-6"/>
      <h1 className="text-3xl font-bold text-slate-800">Página de <span className="text-blue-600">{title}</span></h1>
      <p className="mt-2 text-slate-500 max-w-md">
        Esta seção está em desenvolvimento. Em breve, você poderá gerenciar todas as {pageName} do seu estoque por aqui.
      </p>
    </div>
  );
};

export default WIPPage;