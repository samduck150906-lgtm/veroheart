import type { ProductCatalogSource, ProductVerificationStatus } from '../types';

// Public pages present ingredient facts directly. Review/publication metadata
// stays in administrator tools and never becomes a consumer action or badge.
export default function ProductVerificationBadge(_props: {
  catalogSource?: ProductCatalogSource;
  verificationStatus?: ProductVerificationStatus;
}) {
  void _props;
  return null;
}
