
// types.ts

// Removed direct import from @google/genai to prevent load errors if the module export is missing or incompatible in this environment.
// Define a local compatible interface instead.
export interface FunctionCall {
    name: string;
    args: any;
}

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

// Tipos para novas funcionalidades

export type NotificationType = 'low_stock' | 'zero_stock' | 'stale_stock';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  date: string;
  materialId: string;
}

export interface AIActionConfirmation {
  functionCall: FunctionCall;
  userPrompt: string;
}

// FIX: Add ChatMessage type for API communication.
export interface ChatMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}
