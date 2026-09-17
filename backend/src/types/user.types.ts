export type UserPlan = 'free' | 'premium' | 'vip';
export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  plan: UserPlan;
  role: UserRole;
  banned: boolean;
  bannedAt?: Date | null;
  banReason?: string | null;
  subscription_id?: string;
  log_messages: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Subscription {
  id: string;
  user_id: string;
  provider?: 'fedapay' | 'stripe';
  provider_transaction_id?: string;
  stripe_subscription_id?: string;
  plan: UserPlan;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired';
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Quota {
  id: string;
  user_id: string;
  view_once_count: number;
  deleted_messages_count: number;
  scheduled_statuses_count: number;
  reset_date: Date;
  created_at: Date;
  updated_at: Date;
}

