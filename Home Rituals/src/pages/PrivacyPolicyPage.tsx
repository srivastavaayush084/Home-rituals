import MarkdownPage from '../components/MarkdownPage';
import md from '../content/policies/privacy-policy.md?raw';

export function PrivacyPolicyPage() {
  return <MarkdownPage md={md} />;
}

export default PrivacyPolicyPage;
