'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, Code, Quote,
  Heading1, Heading2, Heading3, Link as LinkIcon, Undo, Redo, Check,
} from 'lucide-react';
import { toPersianDigits } from '@/lib/format';

type Props = {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
};

export default function RichTextEditor({ initialContent = '', onChange, placeholder = 'محتوای یادداشت را اینجا بنویسید...' }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerText = initialContent;
      updateCounts();
    } else if (editorRef.current && !initialContent) {
      editorRef.current.innerText = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContent]);

  const updateCounts = useCallback(() => {
    const text = editorRef.current?.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setCharCount(text.length);
  }, []);

  const updateActiveFormats = useCallback(() => {
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
      });
    } catch {
      // noop
    }
  }, []);

  const exec = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    updateActiveFormats();
    updateCounts();
    setSaved(false);
    if (onChange) onChange(editorRef.current?.innerText || '');
  }, [onChange, updateActiveFormats, updateCounts]);

  const handleInput = useCallback(() => {
    updateCounts();
    setSaved(false);
    if (onChange) onChange(editorRef.current?.innerText || '');
  }, [onChange, updateCounts]);

  const handleKeyUp = useCallback(() => {
    updateActiveFormats();
  }, [updateActiveFormats]);

  const handleMouseUp = useCallback(() => {
    updateActiveFormats();
  }, [updateActiveFormats]);

  const handleLink = useCallback(() => {
    const url = window.prompt('آدرس لینک را وارد کنید:');
    if (url) exec('createLink', url);
  }, [exec]);

  type ToolbarDivider = { divider: true };
  type ToolbarButton = {
    icon: typeof Bold;
    command: string;
    value?: string;
    label: string;
    activeKey?: string;
    custom?: () => void;
  };
  const toolbarButtons: (ToolbarDivider | ToolbarButton)[] = [
    { icon: Heading1, command: 'formatBlock', value: 'h1', label: 'تیتر ۱' },
    { icon: Heading2, command: 'formatBlock', value: 'h2', label: 'تیتر ۲' },
    { icon: Heading3, command: 'formatBlock', value: 'h3', label: 'تیتر ۳' },
    { divider: true },
    { icon: Bold, command: 'bold', label: 'پررنگ', activeKey: 'bold' },
    { icon: Italic, command: 'italic', label: 'کج', activeKey: 'italic' },
    { icon: Underline, command: 'underline', label: 'زیرخط', activeKey: 'underline' },
    { icon: Strikethrough, command: 'strikeThrough', label: 'خط‌خورده', activeKey: 'strikeThrough' },
    { divider: true },
    { icon: List, command: 'insertUnorderedList', label: 'لیست نقطه‌ای', activeKey: 'insertUnorderedList' },
    { icon: ListOrdered, command: 'insertOrderedList', label: 'لیست شماره‌دار', activeKey: 'insertOrderedList' },
    { icon: Quote, command: 'formatBlock', value: 'blockquote', label: 'نقل قول' },
    { icon: Code, command: 'formatBlock', value: 'pre', label: 'کد' },
    { divider: true },
    { icon: LinkIcon, command: 'createLink', label: 'لینک', custom: handleLink },
    { icon: Undo, command: 'undo', label: 'بازگردانی' },
    { icon: Redo, command: 'redo', label: 'تکرار' },
  ];

  return (
    <div className="nb-editor-wrap">
      <div className="nb-editor-toolbar">
        {toolbarButtons.map((btn, i) =>
          'divider' in btn ? (
            <span key={`d-${i}`} className="nb-toolbar-divider" />
          ) : (
            <button
              key={`b-${i}`}
              type="button"
              className={`nb-toolbar-btn ${btn.activeKey && activeFormats[btn.activeKey] ? 'is-active' : ''}`}
              onClick={() => {
                if (btn.custom) btn.custom();
                else exec(btn.command, btn.value || '');
              }}
              title={btn.label}
              aria-label={btn.label}
            >
              <btn.icon className="h-4 w-4" />
            </button>
          )
        )}
      </div>
      <div
        ref={editorRef}
        className="nb-editor-content"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyUp={handleKeyUp}
        onMouseUp={handleMouseUp}
        data-placeholder={placeholder}
        dir="rtl"
      />
      <div className="nb-editor-footer">
        <span className="nb-editor-count">
          {toPersianDigits(wordCount)} کلمه · {toPersianDigits(charCount)} کاراکتر
        </span>
        <span className={`nb-editor-saved ${saved ? 'is-saved' : ''}`}>
          <Check className="h-3 w-3" />
          {saved ? 'ذخیره شد' : 'در حال ویرایش...'}
        </span>
      </div>
    </div>
  );
}
