// Stub: replaces autumn-js/react useCustomer hook
// bodhi-lab pages use: const { attach } = useCustomer()
// We redirect to donation page instead

export function useCustomer() {
  const attach = async ({ productId: _pid, productIds: _pids, successUrl }: { productId?: string; productIds?: string[]; successUrl?: string }) => {
    // In GiacNgoVN, redirect to the pricing/contact section
    window.location.href = successUrl || '/#pricing';
  };

  const openBillingPortal = async ({ returnUrl }: { returnUrl?: string } = {}) => {
    // In GiacNgoVN, redirect to the donation/billing section
    window.location.href = returnUrl || '/donation';
  };

  return { attach, openBillingPortal, isLoading: false, customer: null };
}
