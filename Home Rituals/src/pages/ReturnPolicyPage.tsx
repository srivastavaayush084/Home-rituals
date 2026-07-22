import MarkdownPage from '../components/MarkdownPage';
import md from '../content/policies/return-policy.md?raw';

export function ReturnPolicyPage() {
  return <MarkdownPage md={md} />;
}

export default ReturnPolicyPage;
