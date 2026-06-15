import { useLayoutEffect, useState } from "react";
import MDEditor, { commands, type ICommand } from "@uiw/react-md-editor";
import MarkdownPreview from "@uiw/react-markdown-preview";

interface Props {
  title: string;
  value: string;
  onChange: (v: string) => void;
  height?: number;
}

const underlineCmd: ICommand = {
  name: "underline",
  keyCommand: "underline",
  buttonProps: { "aria-label": "Underline", title: "Underline" },
  icon: <span style={{ fontWeight: 600, textDecoration: "underline", fontSize: 14 }}>U</span>,
  execute(state, api) {
    const selectedText = state.selectedText || "text";
    api.replaceSelection(`<u>${selectedText}</u>`);
  },
};

const imageUploadCmd: ICommand = {
  name: "image-upload",
  keyCommand: "image-upload",
  buttonProps: { "aria-label": "Insert image", title: "Insert image" },
  icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  execute(_state, api) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        api.replaceSelection(`![image](${dataUrl})`);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  },
};

export default function BuyersMarkdownEditor({ title, value, onChange, height }: Props) {
  const [editorHeight, setEditorHeight] = useState(height ?? 500);

  useLayoutEffect(() => {
    if (!height) {
      const h = Math.min(Math.max(window.innerHeight - 168, 420), 900);
      setEditorHeight(h);
    }
  }, [height]);

  const toolbarCommands = [
    commands.title1,
    commands.title2,
    commands.title3,
    commands.title4,
    commands.divider,
    commands.bold,
    commands.italic,
    underlineCmd,
    commands.strikethrough,
    commands.divider,
    imageUploadCmd,
    commands.hr,
    commands.code,
  ];

  return (
    <div className="buyers-md-editor">
      <h3 className="font-paperlogy font-semibold text-base text-black mb-3">{title}</h3>
      <div className="lg:grid lg:grid-cols-2 gap-4">
        <div data-color-mode="light">
          <MDEditor
            value={value}
            onChange={(v) => onChange(v ?? "")}
            height={editorHeight}
            commands={toolbarCommands}
            extraCommands={[]}
            preview="edit"
          />
        </div>
        <div
          className="hidden lg:block border border-[#D8D8D8] rounded-md p-4 overflow-auto bg-white"
          style={{ height: editorHeight }}
          data-color-mode="light"
        >
          <p className="text-xs text-[#9E9E9E] mb-3 font-paperlogy">Preview</p>
          <MarkdownPreview source={value} style={{ background: "transparent" }} />
        </div>
      </div>
    </div>
  );
}
