import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { LockClosedIcon, IdentificationIcon, KeyIcon } from '../components/icons/HeroIcons';
import Modal from '../components/ui/Modal';
import LogoIcon from '../components/icons/LogoIcon';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setCode('');
    setPassword('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleLoginAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !code || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await login(selectedRole, code, password);
      // On success, the AuthProvider will update the state and App.tsx will navigate away.
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao tentar fazer login.');
      setIsLoading(false);
    }
  };
  
  const closeModal = () => {
      if(isLoading) return;
      setIsModalOpen(false);
      setSelectedRole(null);
  }

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="w-full max-w-sm p-8 space-y-8 bg-white shadow-2xl rounded-2xl">
          <div className="text-center">
              <LogoIcon className="w-20 h-20 mx-auto text-blue-600"/>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
              Gestor <span className="font-light">One</span>
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Selecione seu nível de acesso para continuar
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => handleRoleSelect(UserRole.OPERADOR)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-transform hover:scale-105"
            >
              Entrar como Operador
            </button>
            <button
              onClick={() => handleRoleSelect(UserRole.GERENTE)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform hover:scale-105"
            >
              Entrar como Gerente
            </button>
            <button
              onClick={() => handleRoleSelect(UserRole.DIRETOR)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-transform hover:scale-105"
            >
              Entrar como Diretor
            </button>
          </div>
          <div className="text-center text-xs text-slate-500 flex items-center justify-center">
              <LockClosedIcon className="w-4 h-4 mr-1.5"/>
              Acesso seguro e restrito.
          </div>
        </div>
      </div>
      
      <Modal isOpen={isModalOpen} onClose={closeModal} title={`Acesso - ${selectedRole}`}>
        <form onSubmit={handleLoginAttempt} className="space-y-4">
            {error && <p className="text-sm text-center text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
            
            <div>
                <label htmlFor="code" className="block text-sm font-medium text-slate-700">Código</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <IdentificationIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        name="code"
                        id="code"
                        className="block w-full rounded-md border border-slate-300 p-2 pl-10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                        placeholder="Ex: OP01"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                    />
                </div>
            </div>
            
             <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">Senha</label>
                 <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <KeyIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="password"
                        name="password"
                        id="password"
                        className="block w-full rounded-md border border-slate-300 p-2 pl-10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                        placeholder="******"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verificando...' : 'Entrar'}
            </button>
        </form>
      </Modal>
    </>
  );
};

export default LoginPage;