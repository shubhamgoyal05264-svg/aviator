
export enum GameStatus {
  BETTING = 'BETTING',
  FLYING = 'FLYING',
  CRASHED = 'CRASHED'
}

export type CurrencyMode = 'REAL' | 'DEMO';

export interface User {
  id: string;
  username: string;
  email: string;
  realBalance: number;
  demoBalance: number;
  kycStatus: 'PENDING' | 'VERIFIED' | 'NONE';
}

export interface Bet {
  id: string;
  userId: string;
  user: string;
  amount: number;
  currency: CurrencyMode;
  autoCashout?: number;
  multiplier?: number;
  cashoutAmount?: number;
  isBot: boolean;
  timestamp: number;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  method: string;
  timestamp: number;
}

export interface Round {
  id: string;
  crashPoint: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  startTime: number;
}
