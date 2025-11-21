import React from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { ShieldCheckIcon } from '../components/icons/HeroIcons';

const AccessManagementPage: React.FC = () => {
    const { user: loggedInUser } = useAuth();
    const { collaborators, updateCollaboratorRole } = useDatabase();

    const headers = ['Colaborador', 'Cargo Atual', 'Alterar Cargo'];

    const roleColorMap: { [key in UserRole]: string } = {
        [UserRole.DIRETOR]: 'bg-red-100 text-red-800',
        [UserRole.GERENTE]: 'bg-blue-100 text-blue-800',
        [UserRole.OPERADOR]: 'bg-slate-100 text-slate-800',
    };

    const handleRoleChange = (collaboratorId: string, newRole: UserRole) => {
        updateCollaboratorRole(collaboratorId, newRole);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                     <ShieldCheckIcon className="w-12 h-12 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Gerenciamento de Acessos</h1>
                    <p className="mt-1 text-slate-500">Promova ou rebaixe colaboradores alterando seus cargos no sistema. As alterações são aplicadas imediatamente.</p>
                </div>
            </div>

            <Card>
                <Table headers={headers}>
                    {collaborators.map(colaborador => {
                        // A simple heuristic to prevent the director from locking themselves out.
                        // Based on the mock data where 'Luiz' is the director.
                        // A real app would use user IDs.
                        const isSelf = loggedInUser?.role === UserRole.DIRETOR && colaborador.nome === 'Luiz';
                        
                        return (
                            <tr key={colaborador.id} className="border-b border-slate-200 last:border-b-0">
                                <td className="p-4 font-medium text-slate-800">{colaborador.nome}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 text-sm font-semibold rounded-full ${roleColorMap[colaborador.role]}`}>
                                        {colaborador.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <select
                                        value={colaborador.role}
                                        onChange={(e) => handleRoleChange(colaborador.id, e.target.value as UserRole)}
                                        disabled={isSelf}
                                        className="rounded-md border-2 border-transparent bg-slate-800 text-white p-2 focus:border-blue-500 focus:outline-none sm:text-sm disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                                    >
                                        <option value={UserRole.OPERADOR}>Operador</option>
                                        <option value={UserRole.GERENTE}>Gerente</option>
                                        <option value={UserRole.DIRETOR}>Diretor</option>
                                    </select>
                                </td>
                            </tr>
                        );
                    })}
                </Table>
            </Card>
             {loggedInUser?.role === UserRole.DIRETOR && (
                <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-r-md">
                    <p className="font-bold">Aviso de Segurança</p>
                    <p className="text-sm">Para sua segurança, não é possível alterar o seu próprio cargo de Diretor através desta interface.</p>
                </div>
            )}
        </div>
    );
};

export default AccessManagementPage;