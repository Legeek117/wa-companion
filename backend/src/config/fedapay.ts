import { env } from './env';

export const FEDAPAY_API_VERSION = 'v1';

export const FEDAPAY_BASE_URLS = {
  sandbox: 'https://sandbox-api.fedapay.com',
  live: 'https://api.fedapay.com',
  development: 'https://dev-api.fedapay.com',
} as const;

export type FedaPayEnvironment = keyof typeof FEDAPAY_BASE_URLS;

export interface FedaPayTransaction {
  id: number;
  transaction_key?: string;
  reference?: string;
  amount?: number;
  description?: string;
  callback_url?: string;
  status?: string;
  mode?: string;
  customer_id?: number;
  currency_id?: number;
  created_at?: string;
  updated_at?: string;
  paid_at?: string;
  url?: string;
}

export interface FedaPayToken {
  token: string;
  url: string;
}

export function getFedaPayBaseUrl(): string {
  const environment: FedaPayEnvironment = env.FEDAPAY_ENV === 'live' ? 'live' : 'sandbox';
  return FEDAPAY_BASE_URLS[environment];
}

export interface FedaPayPlanConfig {
  amountXof: number;
  intervalMonths: number;
  description: string;
}

export const FEDAPAY_PLAN_CONFIG: Record<'monthly' | 'yearly', FedaPayPlanConfig> = {
  monthly: {
    amountXof: env.FEDAPAY_PRICE_MONTHLY_XOF,
    intervalMonths: 1,
    description: 'Abonnement mensuel AMDA Premium',
  },
  yearly: {
    amountXof: env.FEDAPAY_PRICE_YEARLY_XOF,
    intervalMonths: 12,
    description: 'Abonnement annuel AMDA Premium',
  },
};