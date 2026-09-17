import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env';
import {
  FEDAPAY_API_VERSION,
  FEDAPAY_PLAN_CONFIG,
  FedaPayToken,
  FedaPayTransaction,
  getFedaPayBaseUrl,
} from '../config/fedapay';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';

/**
 * FedaPay API client (native fetch, no SDK dependency).
 */

const FEDAPAY_PAID_STATUSES = [
  'approved',
  'transferred',
  'refunded',
  'approved_partially_refunded',
  'transferred_partially_refunded',
];

interface RequestOptions {
  method?: string;
  body?: Record<string, unknown> | null;
}

async function fedapayRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body = null } = options;
  const url = `${getFedaPayBaseUrl()}/${FEDAPAY_API_VERSION}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.FEDAPAY_API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  logger.info(`[FedaPay] ${method} ${url}`);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.message || data?.error?.message || `FedaPay API error (${response.status})`;
    throw new AppError(message, response.status === 401 || response.status === 403 ? 502 : 502);
  }

  return data as T;
}

/**
 * FedaPay wraps single resources as { "v1/transaction": {...} }.
 */
function extractTransaction(payload: any): FedaPayTransaction | null {
  if (!payload) return null;
  if (payload.transaction) return payload.transaction;
  if (payload.data && typeof payload.data === 'object') return payload.data as FedaPayTransaction;
  if (payload['v1/transaction']) return payload['v1/transaction'] as FedaPayTransaction;
  if (!payload.id && !payload.reference && !payload.transaction_key) return null;
  return payload;
}

/**
 * Step 1: create a transaction.
 */
export async function createFedaPayTransaction(options: {
  plan: 'monthly' | 'yearly';
  description: string;
  amountXof: number;
  email: string;
  callbackUrl: string;
}): Promise<FedaPayTransaction> {
  const body = {
    description: options.description,
    amount: options.amountXof,
    currency: { iso: 'XOF' },
    callback_url: options.callbackUrl,
    customer: { email: options.email },
  };

  const payload = await fedapayRequest<{ transaction: FedaPayTransaction }>(
    '/transactions',
    { method: 'POST', body }
  );

  const transaction = extractTransaction(payload);
  if (!transaction || !transaction.id) {
    throw new AppError('FedaPay did not return a transaction ID', 502);
  }
  return transaction;
}

/**
 * Step 2: generate the payment token + redirect URL.
 */
export async function generateFedaPayToken(
  transactionId: number
): Promise<FedaPayToken> {
  const payload = await fedapayRequest<FedaPayToken>(
    `/transactions/${transactionId}/token`,
    { method: 'POST' }
  );

  if (!payload?.url) {
    throw new AppError('FedaPay did not return a payment URL', 502);
  }
  return payload;
}

/**
 * Create a full checkout session: transaction -> token pagado.
 */
export async function createFedaPayCheckout(options: {
  plan: 'monthly' | 'yearly';
  email: string;
}): Promise<{ checkoutUrl: string; transaction: FedaPayTransaction }> {
  const planConfig = FEDAPAY_PLAN_CONFIG[options.plan];
  const transaction = await createFedaPayTransaction({
    plan: options.plan,
    description: planConfig.description,
    amountXof: planConfig.amountXof,
    email: options.email,
    callbackUrl: env.FEDAPAY_CALLBACK_URL,
  });

  const token = await generateFedaPayToken(transaction.id);

  return { checkoutUrl: token.url, transaction };
}

/**
 * Always fetch the real status of a transaction from the API.
 */
export async function getFedaPayTransaction(
  transactionId: number
): Promise<FedaPayTransaction | null> {
  const payload = await fedapayRequest(`/transactions/${transactionId}`);
  return extractTransaction(payload);
}

export function isFedaPayTransactionPaid(transaction: FedaPayTransaction): boolean {
  const status = transaction.status || '';
  return FEDAPAY_PAID_STATUSES.includes(status) || status.includes('partially_refunded');
}

/**
 * Verify the X-FEDAPAY-SIGNATURE header (HMAC-SHA256).
 * Official FedaPay node SDK scheme: t=<timestamp>,s=<hex hmac-sha256(secret, "<ts>.<payload>")>.
 * The legacy webhook headers used `v1=<signature>`; we accept both for compatibility.
 * Example: t=<ts>,s=<sig>  ->  hmac = HMAC-SHA256(secret, "<ts>.<payload>")
 */
export function constructFedaPayEvent(
  payload: string | Buffer,
  sigHeader: string | undefined,
  secret: string,
  tolerance: number = 300
): any {
  const rawPayload = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;
  const header = sigHeader || '';

  let timestamp = -1;
  const signatures: string[] = [];

  for (const part of header.split(',')) {
    const eqIndex = part.indexOf('=');
    if (eqIndex === -1) continue;
    const key = part.slice(0, eqIndex).trim();
    const value = part.slice(eqIndex + 1).trim();
    if (key === 't') timestamp = parseInt(value, 10);
    else if (key === 's' || key === 'v1') signatures.push(value);
  }

  if (timestamp === -1 || signatures.length === 0) {
    throw new AppError('Unable to extract timestamp and signatures from header', 400);
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(`${timestamp}.${rawPayload}`)
    .digest('hex');

  const signatureValid = signatures.some((signature) => {
    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);
    return a.length === b.length && timingSafeEqual(a, b);
  });

  if (!signatureValid) {
    throw new AppError('No signatures found matching the expected signature for payload', 400);
  }

  const currentTime = Math.floor(Date.now() / 1000);
  if (tolerance > 0 && Math.abs(currentTime - timestamp) > tolerance) {
    throw new AppError('Timestamp outside the tolerance zone', 400);
  }

  try {
    return JSON.parse(rawPayload);
  } catch {
    throw new AppError('Invalid JSON payload', 400);
  }
}