import { marked } from 'marked';
import DOMPurify from 'dompurify';

type Props = {
  md: string;
  className?: string;
};

export function MarkdownPage({ md, className = '' }: Props) {
  const cleanMd = md.replace(/^---[\s\S]*?---\s*/, '');
  const rawHtml = marked.parse(cleanMd);
  const sanitizedHtml = typeof rawHtml === 'string' ? DOMPurify.sanitize(rawHtml) : '';

  return (
    <div className={`mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 ${className}`}>
      <div className="markdown" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
    </div>
  );
}

export default MarkdownPage;
