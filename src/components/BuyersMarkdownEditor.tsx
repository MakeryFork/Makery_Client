import { useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  onChange: (v: string) => void,
) {
  const { selectionStart: s, selectionEnd: e, value } = textarea;
  const selected = value.slice(s, e) || "text";
  onChange(value.slice(0, s) + before + selected + after + value.slice(e));
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(s + before.length, s + before.length + selected.length);
  }, 0);
}

function prependToLine(
  textarea: HTMLTextAreaElement,
  prefix: string,
  onChange: (v: string) => void,
) {
  const { selectionStart, selectionEnd, value } = textarea;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  onChange(next);
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(
      selectionStart + prefix.length,
      selectionEnd + prefix.length,
    );
  }, 0);
}

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  text: string,
  onChange: (v: string) => void,
) {
  const { selectionStart: s, value } = textarea;
  const next = value.slice(0, s) + text + value.slice(s);
  onChange(next);
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(s + text.length, s + text.length);
  }, 0);
}

const ICON_BTN =
  "flex items-center justify-center h-9 rounded hover:bg-[#F0F0F0] transition-colors text-[#333] select-none px-2.5";

function Divider() {
  return <div className="w-px h-5 bg-[#D8D8D8] mx-1 self-center" />;
}

export default function BuyersMarkdownEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrap = (b: string, a: string) => ref.current && wrapSelection(ref.current, b, a, onChange);
  const prepend = (p: string) => ref.current && prependToLine(ref.current, p, onChange);
  const insert = (t: string) => ref.current && insertAtCursor(ref.current, t, onChange);

  const handleImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = ev.target?.result as string;
        if (ref.current) insertAtCursor(ref.current, `![image](${url})\n`, onChange);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-0.5 border-t border-b border-[#E8E8E8] px-4 py-2">
        {/* Headings */}
        {(["# ", "## ", "### ", "#### "] as const).map((prefix, i) => (
          <button
            key={prefix}
            type="button"
            onClick={() => prepend(prefix)}
            className={ICON_BTN + " font-paperlogy text-sm font-semibold"}
          >
            h{i + 1}
          </button>
        ))}

        <Divider />

        {/* B I U S */}
        <button type="button" onClick={() => wrap("**", "**")} className={ICON_BTN + " font-bold text-sm"} title="Bold">B</button>
        <button type="button" onClick={() => wrap("*", "*")} className={ICON_BTN + " italic text-sm"} title="Italic">I</button>
        <button type="button" onClick={() => wrap("<u>", "</u>")} className={ICON_BTN + " underline text-sm"} title="Underline">U</button>
        <button type="button" onClick={() => wrap("~~", "~~")} className={ICON_BTN + " line-through text-sm"} title="Strikethrough">S</button>

        <Divider />

        {/* Image */}
        <button type="button" onClick={handleImage} className={ICON_BTN} title="Insert image">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </button>

        <button type="button" onClick={() => insert("\n\n---\n\n")} className={ICON_BTN + " text-sm"} title="Horizontal rule">hr</button>
        <button type="button" onClick={() => wrap("```\n", "\n```")} className={ICON_BTN + " font-mono text-sm"} title="Code block">{"< >"}</button>
        <button type="button" onClick={() => insert("[PDF](url)")} className={ICON_BTN + " text-sm font-semibold"} title="PDF link">PDF</button>
      </div>

      {/* Content area */}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter a description."
        className="flex-1 w-full resize-none outline-none font-paperlogy text-base leading-relaxed text-black placeholder:text-[#BDBDBD] px-8 py-5 overflow-y-auto"
      />
    </div>
  );
}
