import { adminWrite } from './supabase';

export interface AdminActivity {
  favoriteCount: number;
  recentCount: number;
  requestCount: number;
  favorites: {
    product_id: string;
    products: { name: string; brand_name: string } | null;
  }[];
  recentViews: {
    product_id: string;
    viewed_at: string;
    products: { name: string; brand_name: string } | null;
  }[];
  requests: {
    id: string;
    requested_name: string;
    status: string;
    created_at: string;
  }[];
}
export interface AdminReview {
  id: string;
  user_id: string;
  product_id: string;
  rating: number;
  is_hidden: boolean;
  created_at: string;
  users: { nickname: string } | null;
  products: { name: string; brand_name: string } | null;
}
export interface AdminAudit {
  id: string;
  actor: string;
  action: string;
  target_table: string;
  target_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}
export const fetchMemberActivity = (id: string) =>
  adminWrite<AdminActivity>('getMemberActivity', { id });
export const correctPet = (
  id: string,
  patch: Record<string, unknown>,
  expected: Record<string, unknown>,
  reason: string,
) => adminWrite('correctPet', { id, patch, expected, reason });
export const correctFeedingLog = (
  id: string,
  patch: Record<string, unknown>,
  expected: Record<string, unknown>,
  reason: string,
) => adminWrite('correctFeedingLog', { id, patch, expected, reason });
export const fetchAdminReviews = (params: {
  page: number;
  pageSize: number;
  query?: string;
  userId?: string;
  hidden?: boolean | null;
}) =>
  adminWrite<{ rows: AdminReview[]; total: number }>(
    'listAdminReviews',
    params,
  );
export const moderateReview = (review: AdminReview, reason: string) =>
  adminWrite('moderateReview', {
    id: review.id,
    patch: { is_hidden: !review.is_hidden },
    expected: { is_hidden: review.is_hidden },
    reason,
  });
export const fetchAdminAudit = (params: {
  page: number;
  pageSize: number;
  table?: string;
  targetId?: string;
}) =>
  adminWrite<{ rows: AdminAudit[]; total: number }>('listAdminAudit', params);
