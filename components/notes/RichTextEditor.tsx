'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { toPersianDigits } from '@/lib/format';

type Props = {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
};

function plainTextFromContent(content: string): string {
  return content.includes('<') ? content.replace(/<[^>]*>/g, '') : content;
}

export default function RichTextEditor({ initialContent = '', onChange, placeholder = 'محتوای یادداشت را اینجا بنویسید...' }: Props) {
  const [content, setContent] = useState(() => plainTextFromContent(initialContent));
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    const nextContent = plainTextFromContent(initialContent);
    if (content !== nextContent) {
      setContent(nextContent);
      setSaved(true);
    }
  }, [initialContent, content]);

  const handleChange = (value: string) => {
    setContent(value);
    setSaved(false);
    onChange?.(value);
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="nb-editor-wrap">
      <textarea
        className="nb-editor-content"
        value={content}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        dir="rtl"
        lang="fa"
        spellCheck
        aria-label="محتوای یادداشت"
      />
      <div className="nb-editor-footer">
        <span className="nb-editor-count">
          {toPersianDigits(wordCount)} کلمه · {toPersianDigits(content.length)} کاراکتر
        </span>
        <span className={`nb-editor-saved ${saved ? 'is-saved' : ''}`}>
          <Check className="h-3 w-3" />
          {saved ? 'ذخیره شد' : 'در حال ویرایش...'}
        </span>
      </div>
    </div>
  );
}
