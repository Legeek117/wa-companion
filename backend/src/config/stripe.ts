import Stripe from 'stripe';
import { env } from './env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const STRIPE_PRICES = {
  MONTHLY: env.STRIPE_PRICE_ID_MONTHLY,
  YEARLY: env.STRIPE_PRICE_ID_YEARLY,
};

export default stripe;

