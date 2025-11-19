// types.ts

export enum UserRole {
  OPERADOR = 'Operador',
  GERENTE = 'Gerente',
  DIRETOR = 'Diretor',
}

export interface User {
  name: string;
  role: UserRole;
}

export interface Material {
  id: string;
  nome: string;
  foto: string;
  codigoFabricante: string;
  quantidade: number;
  armazenamento: string;
  entradas?: number;
  valorUnitario: number;
}

export type MovimentacaoTipo = 'entrada' | 'saida' | 'consumo';

export interface Movimentacao {
  id: string;
  material: string;
  quantidade: number;
  colaborador: string;
  tipo: MovimentacaoTipo;
  data: string;
  notaFiscal?: string;
}

export interface Colaborador {
    id: string;
    nome: string;
    latitude: number;
    longitude: number;
    role: UserRole;
}

export interface Parceiro {
    id: string;
    nome: string;
    cnpj: string;
    endereco: string;
    cidade: string;
    uf: string;
    telefone: string;
    latitude: number;
    longitude: number;
}

export interface NotaFiscalItem {
    materialId: string;
    nome: string;
    quantidade: number;
    valorUnitario: number;
}

export interface NotaFiscal {
    id: string;
    numero: string;
    parceiroId: string;
    dataEmissao: string;
    valorTotal: number;
    itens: NotaFiscalItem[];
}