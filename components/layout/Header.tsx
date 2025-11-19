import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogoutIcon, UserCircleIcon } from '../icons/HeroIcons';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end items-center h-16">
          <div className="flex items-center space-x-3">
             <div className="flex items-center">
                <UserCircleIcon className="h-8 w-8 text-slate-500" />
                <div className="ml-2 text-right">
                    <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                    <p className="text-xs text-slate-500">{user?.role}</p>
                </div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Sair"
            >
              <LogoutIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;