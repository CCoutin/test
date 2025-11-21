import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DashboardPage from './pages/DashboardPage';
import MaterialsPage from './pages/MaterialsPage';
import CollaboratorsPage from './pages/CollaboratorsPage';
import PartnersPage from './pages/PartnersPage';
import MovementsPage from './pages/MovementsPage';
import InvoicesPage from './pages/InvoicesPage';
import RevenuePage from './pages/RevenuePage';
import InventoryPage from './pages/InventoryPage';
import AccessManagementPage from './pages/AccessManagementPage';
import ChatPage from './pages/ChatPage';
import ReportsPage from './pages/ReportsPage'; // Importar a nova página
import { UserRole } from './types';

export type Page = 'dashboard' | 'materiais' | 'entradas' | 'saidas' | 'consumo' | 'parceiros' | 'notas' | 'colaboradores' | 'faturamento' | 'inventario' | 'gerenciar-acessos' | 'chat-ia' | 'relatorios';

const App: React.FC = () => {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState<Page>('dashboard');

  useEffect(() => {
    if (user) {
      if (user.role === UserRole.OPERADOR) {
        setActivePage('entradas');
      } else {
        setActivePage('dashboard');
      }
    }
  }, [user]);

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'materiais':
        return <MaterialsPage />;
      case 'colaboradores':
        return <CollaboratorsPage />;
      case 'gerenciar-acessos':
        return <AccessManagementPage />;
      case 'parceiros':
          return <PartnersPage />;
      case 'entradas':
        return <MovementsPage type="entrada" />;
      case 'saidas':
        return <MovementsPage type="saida" />;
      case 'consumo':
        return <MovementsPage type="consumo" />;
      case 'notas':
        return <InvoicesPage />;
      case 'faturamento':
        return <RevenuePage />;
      case 'inventario':
        return <InventoryPage />;
      case 'chat-ia':
        return <ChatPage />;
      case 'relatorios':
        return <ReportsPage />; // Adicionar o case para a página de relatórios
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-4 sm:p-6 lg:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;
