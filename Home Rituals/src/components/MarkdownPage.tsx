import { marked } from 'marked';

type Props = {
  md: string;
  className?: string;
};

export function MarkdownPage({ md, className = '' }: Props) {
  const cleanMd = md.replace(/^---[\s\S]*?---\s*/, '');
  const html = marked.parse(cleanMd);

  return (
    <div className={`mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 ${className}`}>
      <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export default MarkdownPage;
