import MarkdownPage from '../components/MarkdownPage';
import md from '../content/policies/terms.md?raw';

export function TermsPage() {
  return <MarkdownPage md={md} />;
}

export default TermsPage;
