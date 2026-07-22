import MarkdownPage from '../components/MarkdownPage';
import md from '../content/policies/shipping-policy.md?raw';

export function ShippingPolicyPage() {
  return <MarkdownPage md={md} />;
}

export default ShippingPolicyPage;
