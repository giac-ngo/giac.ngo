import { PricingTable } from "@/components/PricingTable";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function TokenPricing() {
  useDocumentTitle("Token Pricing", "Merit token pricing and packages for Buddhist community platforms.");
  return (
    <div className="max-w-6xl mx-auto px-8 py-16">
      <PricingTable />
    </div>
  );
}
