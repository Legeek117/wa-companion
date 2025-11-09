export type UserPlan = 'free' | 'premium';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  plan: UserPlan;
  subscription_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  plan: UserPlan;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: Date;
  current_period_end: Date;
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

