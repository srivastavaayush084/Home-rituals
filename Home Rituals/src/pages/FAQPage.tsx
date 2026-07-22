import MarkdownPage from '../components/MarkdownPage';
import md from '../content/policies/faq.md?raw';

export function FAQPage() {
  return <MarkdownPage md={md} />;
}

export default FAQPage;
