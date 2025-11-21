import React, { createContext, useState, useContext, ReactNode } from 'react';
import { User, UserRole } from '../types';

// Hardcoded credentials for simulation - now supports multiple credentials per role
const credentials = {
  [UserRole.OPERADOR]: [{ code: 'OP01', password: 'operador123' }],
  [UserRole.GERENTE]: [{ code: 'GE01', password: 'gerente456' }],
  [UserRole.DIRETOR]: [
    { code: 'DI01', password: 'diretor789' },
    { code: '1', password: '1' }, // Added new director credentials
  ],
};

interface AuthContextType {
  user: User | null;
  login: (role: UserRole, code: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (role: UserRole, code: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Simulate API call delay
      setTimeout(() => {
        const expectedCredentialsArray = credentials[role];
        const isValid = expectedCredentialsArray.some(cred => cred.code === code && cred.password === password);

        if (isValid) {
          const userName = role === UserRole.DIRETOR ? 'Alice' : role === UserRole.GERENTE ? 'Beto' : 'Carlos';
          setUser({ name: `${userName} (${role})`, role });
          resolve();
        } else {
          reject(new Error('Código ou senha inválidos.'));
        }
      }, 500);
    });
  };


  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};