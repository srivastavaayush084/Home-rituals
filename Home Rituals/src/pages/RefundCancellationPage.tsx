import MarkdownPage from '../components/MarkdownPage';
import md from '../content/policies/refund-cancellation.md?raw';

export function RefundCancellationPage() {
  return <MarkdownPage md={md} />;
}

export default RefundCancellationPage;
