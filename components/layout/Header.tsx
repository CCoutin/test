import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDatabase } from '../../contexts/DatabaseContext';
import useNotifications from '../../hooks/useNotifications';
import { LogoutIcon, UserCircleIcon, BellIcon, ExclamationTriangleIcon } from '../icons/HeroIcons';
import { NotificationType } from '../../types';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { materials, movements } = useDatabase();
  const notifications = useNotifications(materials, movements);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const getNotificationIcon = (type: NotificationType) => {
    switch(type) {
      case 'low_stock': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'zero_stock': return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'stale_stock': return <ExclamationTriangleIcon className="w-5 h-5 text-blue-500" />;
      default: return null;
    }
  }

  return (
    <header className="bg-white shadow-sm z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-label="Notificações"
              >
                <BellIcon className="h-6 w-6" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                    {notifications.length}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200" onMouseLeave={() => setIsNotificationsOpen(false)}>
                  <div className="p-3 font-bold text-slate-700 border-b">Notificações</div>
                  <ul className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map(notification => (
                        <li key={notification.id} className="p-3 hover:bg-slate-50 border-b last:border-0">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                            <div>
                                <p className="text-sm text-slate-700">{notification.message}</p>
                                <p className="text-xs text-slate-400">{new Date(notification.date).toLocaleDateString('pt-BR')}</p>
                            </div>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="p-4 text-center text-sm text-slate-500">Nenhuma notificação nova.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

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
