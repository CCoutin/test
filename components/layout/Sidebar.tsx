import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { Page } from '../../App';
import { 
    ChartBarIcon, BoxIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, WrenchScrewdriverIcon, 
    BuildingStorefrontIcon, DocumentTextIcon, UsersIcon, CurrencyDollarIcon,
    ClipboardDocumentCheckIcon, ShieldCheckIcon, ChatBubbleLeftRightIcon, DocumentChartBarIcon
} from '../icons/HeroIcons';
import LogoIcon from '../icons/LogoIcon';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
  const { user } = useAuth();

  // FIX: Cannot find namespace 'JSX'. Using React.ReactElement instead.
  // Refactored NavLink to return only the `<a>` tag.
  // FIX: Correctly type the icon prop to allow className to be passed via React.cloneElement.
  const NavLink = ({ page, icon, label }: { page: Page; icon: React.ReactElement<{ className?: string }>; label: string }) => (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        setActivePage(page);
      }}
      className={`flex items-center p-2 text-base font-normal rounded-lg transition-colors duration-150 ${
        activePage === page 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-slate-200 hover:bg-blue-800'
      }`}
    >
      {React.cloneElement(icon, { className: "w-6 h-6" })}
      <span className="ml-3">{label}</span>
    </a>
  );

  // FIX: Explicitly type `navLinks` to ensure `page` is of type `Page` and not inferred as `string`.
  // FIX: Update icon type to match NavLink's icon prop type.
  const navLinks: { page: Page; icon: React.ReactElement<{ className?: string }>; label: string; roles: UserRole[] }[] = [
    { page: 'dashboard', icon: <ChartBarIcon />, label: 'Dashboard', roles: [UserRole.GERENTE, UserRole.DIRETOR] },
    { page: 'chat-ia', icon: <ChatBubbleLeftRightIcon />, label: 'Chat IA', roles: [UserRole.GERENTE, UserRole.DIRETOR] },
    { page: 'materiais', icon: <BoxIcon />, label: 'Materiais', roles: [UserRole.GERENTE, UserRole.DIRETOR] },
    { page: 'entradas', icon: <ArrowUpTrayIcon />, label: 'Entradas', roles: [UserRole.OPERADOR, UserRole.GERENTE, UserRole.DIRETOR] },
    { page: 'saidas', icon: <ArrowDownTrayIcon />, label: 'Saídas', roles: [UserRole.OPERADOR, UserRole.GERENTE, UserRole.DIRETOR] },
    { page: 'consumo', icon: <WrenchScrewdriverIcon />, label: 'Consumo', roles: [UserRole.OPERADOR, UserRole.GERENTE, UserRole.DIRETOR] },
    { page: 'inventario', icon: <ClipboardDocumentCheckIcon />, label: 'Inventário', roles: [UserRole.OPERADOR, UserRole.GERENTE, UserRole.DIRETOR] },
    { page: 'parceiros', icon: <BuildingStorefrontIcon />, label: 'Parceiros', roles: [UserRole.GERENTE, UserRole.DIRETOR] },
    { page: 'colaboradores', icon: <UsersIcon />, label: 'Colaboradores', roles: [UserRole.DIRETOR] },
    { page: 'relatorios', icon: <DocumentChartBarIcon />, label: 'Relatórios', roles: [UserRole.GERENTE, UserRole.DIRETOR] },
    { page: 'gerenciar-acessos', icon: <ShieldCheckIcon />, label: 'Gerenciar Acessos', roles: [UserRole.DIRETOR] },
    { page: 'notas', icon: <DocumentTextIcon />, label: 'Notas Fiscais', roles: [UserRole.DIRETOR] },
    { page: 'faturamento', icon: <CurrencyDollarIcon />, label: 'Faturamento', roles: [UserRole.DIRETOR] },
  ];
  
  return (
    <aside className="w-64 bg-blue-900 text-white flex-shrink-0 flex flex-col" aria-label="Sidebar">
        <div className="px-6 py-4 flex items-center">
            <LogoIcon className="w-10 h-10 mr-1 text-blue-300"/>
            <h1 className="text-2xl font-bold tracking-tight">Gestor <span className="font-light">One</span></h1>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-2">
            {navLinks.map(link => user && link.roles.includes(user.role) && (
                // FIX: Add key to the list item and refactor NavLink to not render the `li`.
                <li key={link.page}>
                    <NavLink page={link.page} icon={link.icon} label={link.label} />
                </li>
            ))}
            </ul>
        </div>
        <div className="p-4 text-center text-xs text-blue-400">
            <p>&copy; 2023 Gestor One</p>
        </div>
    </aside>
  );
};

export default Sidebar;
