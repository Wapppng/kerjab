"use client";

import { useEffect, useReducer, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import CharacterCount from "@tiptap/extension-character-count";
import Youtube from "@tiptap/extension-youtube";
import MediaImagePickerDialog from "@/components/admin/media/MediaImagePickerDialog";
import type { ImageInsertOptions } from "@/components/admin/media/picker-utils";
import { LinkedImage } from "@/components/admin/tiptap/linked-image";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  entityType?: "article" | "service" | "portfolio";
  entityId?: string;
  onMediaSelected?: (mediaId: string) => void;
};

export const hasRichTextContent = (html: string) => {
  if (/<(?:iframe|img|video|div[^>]*data-youtube-video)/i.test(html)) return true;
  const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
  return text.length > 0;
};

const btn = (active?: boolean, disabled?: boolean) => {
  const base = "inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100";
  const a = active ? " bg-slate-900 text-white hover:bg-slate-900 hover:text-white" : "";
  const d = disabled ? " cursor-not-allowed opacity-40" : "";
  return `${base}${a}${d}`;
};

const Sep = () => <span className="mx-0.5 h-5 w-px self-center bg-slate-200" aria-hidden="true" />;

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Tulis konten lengkap artikel di sini...",
  onMediaSelected,
}: RichTextEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── link dialog state ──────────────────────────────────────────────────────
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkNewTab, setLinkNewTab] = useState(true);

  // ── youtube dialog state ───────────────────────────────────────────────────
  const [ytOpen, setYtOpen] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [, rerenderToolbar] = useReducer((n: number) => n + 1, 0);

  // ── editor ─────────────────────────────────────────────────────────────────
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // StarterKit v3 includes Underline; do not register @tiptap/extension-underline again.
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      LinkedImage,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        protocols: ["http", "https", "mailto", "tel"],
        HTMLAttributes: { rel: "noopener noreferrer", class: "tiptap-link" },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CharacterCount,
      Youtube.configure({ width: 800, height: 450, nocookie: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    onSelectionUpdate: () => rerenderToolbar(),
    onTransaction: () => rerenderToolbar(),
  });

  // ── sync external value ────────────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    const next = value || "<p></p>";
    if (editor.getHTML() !== next) editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  // ── Cmd/Ctrl+K shortcut ────────────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (!editor.isFocused) return;
        e.preventDefault();
        const href = (editor.getAttributes("link") as { href?: string })?.href ?? "";
        const target = (editor.getAttributes("link") as { target?: string })?.target;
        const { from, to, empty } = editor.state.selection;
        setLinkUrl(href);
        setLinkText(empty ? "" : editor.state.doc.textBetween(from, to, " "));
        setLinkNewTab(target !== "_self");
        setLinkOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor]);

  const insertImage = (options: ImageInsertOptions) => {
    if (!editor) return;
    const { src, alt, linkHref, linkNewTab = true, mediaId } = options;
    const trimmedHref = linkHref?.trim();
    editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: {
          src,
          alt: alt ?? "",
          href: trimmedHref || null,
          linkTarget: linkNewTab ? "_blank" : "_self",
          linkRel: linkNewTab ? "noopener noreferrer" : "noopener",
        },
      })
      .run();
    if (mediaId) onMediaSelected?.(mediaId);
    setPickerOpen(false);
  };

  const openLinkDialog = () => {
    if (!editor) return;
    const href = (editor.getAttributes("link") as { href?: string })?.href ?? "";
    const target = (editor.getAttributes("link") as { target?: string })?.target;
    const { from, to, empty } = editor.state.selection;
    setLinkUrl(href);
    setLinkText(empty ? "" : editor.state.doc.textBetween(from, to, " "));
    setLinkNewTab(target !== "_self");
    setLinkOpen(true);
  };

  const applyLink = () => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkOpen(false);
      return;
    }
    const target = linkNewTab ? "_blank" : "_self";
    const rel = linkNewTab ? "noopener noreferrer" : "noopener";
    if (editor.state.selection.empty && linkText.trim()) {
      editor.chain().focus().insertContent({ type: "text", text: linkText.trim(), marks: [{ type: "link", attrs: { href: url, target, rel } }] }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url, target, rel }).run();
    }
    setLinkOpen(false);
    setLinkUrl("");
    setLinkText("");
  };

  const removeLink = () => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  };

  const applyYoutube = () => {
    if (!editor || !ytUrl.trim()) return;
    editor.chain().focus().setYoutubeVideo({ src: ytUrl.trim() }).run();
    setYtOpen(false);
    setYtUrl("");
  };

  const inTable = editor?.isActive("table") ?? false;

  const insertTable = () => {
    if (!editor || inTable) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  // ── char/word count ────────────────────────────────────────────────────────
  const charCount = editor?.storage.characterCount?.characters() ?? 0;
  const wordCount = editor?.storage.characterCount?.words() ?? 0;
  const readTime = Math.max(1, Math.round(wordCount / 220));

  return (
    <div className="mt-2 rounded-lg border border-slate-200">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">

        {/* Format group */}
        <button type="button" className={btn(editor?.isActive("bold"))} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M7 4h7a4 4 0 010 8H7V4Zm0 8h8a4 4 0 010 8H7v-8Z" /></svg>
        </button>
        <button type="button" className={btn(editor?.isActive("italic"))} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M10 4h8M6 20h8M14 4l-4 16" /></svg>
        </button>
        <button type="button" className={btn(editor?.isActive("underline"))} onClick={() => editor?.chain().focus().toggleUnderline().run()} title="Underline">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M6 4v7a6 6 0 0012 0V4M4 20h16" /></svg>
        </button>
        <button type="button" className={btn(editor?.isActive("strike"))} onClick={() => editor?.chain().focus().toggleStrike().run()} title="Strikethrough">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M4 12h16M7 7a4 4 0 017-1M17 17a4 4 0 01-7 1" /></svg>
        </button>
        <button type="button" className={btn(editor?.isActive("highlight"))} onClick={() => editor?.chain().focus().toggleHighlight().run()} title="Highlight">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M9 3l10 10-6 2-6-6 2-6zM3 21l4-4" /></svg>
        </button>

        <Sep />

        {/* Heading group */}
        <button type="button" className={btn(editor?.isActive("heading", { level: 1 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M4 6v12M4 12h8M12 6v12M17 8h3v8" /></svg>
        </button>
        <button type="button" className={btn(editor?.isActive("heading", { level: 2 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M4 6v12M4 12h8M12 6v12M17 9a3 3 0 015 2c0 3-5 5-5 5h5" /></svg>
        </button>
        <button type="button" className={btn(editor?.isActive("heading", { level: 3 }))} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M4 6v12M4 12h8M12 6v12M18 9h3l-3 3 3 3h-3" /></svg>
        </button>

        <Sep />

        {/* Align group */}
        <button type="button" className={btn(editor?.isActive({ textAlign: "left" }))} onClick={() => editor?.chain().focus().setTextAlign("left").run()} title="Align left">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M3 6h18M3 12h12M3 18h15" /></svg>
        </button>
        <button type="button" className={btn(editor?.isActive({ textAlign: "center" }))} onClick={() => editor?.chain().focus().setTextAlign("center").run()} title="Align center">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M3 6h18M6 12h12M4 18h16" /></svg>
        </button>
        <button type="button" className={btn(editor?.isActive({ textAlign: "right" }))} onClick={() => editor?.chain().focus().setTextAlign("right").run()} title="Align right">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M3 6h18M9 12h12M6 18h15" /></svg>
        </button>

        <Sep />

        {/* List / block group */}
        <button type="button" className={btn(editor?.isActive("bulletList"))} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Bullet list">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4">
            <path d="M9 6h11M9 12h11M9 18h11" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="5" cy="6" r="1.5" fill="currentColor" />
            <circle cx="5" cy="12" r="1.5" fill="currentColor" />
            <circle cx="5" cy="18" r="1.5" fill="currentColor" />
          </svg>
        </button>
        <button type="button" className={btn(editor?.isActive("orderedList"))} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Ordered list">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M10 6h10M10 12h10M10 18h10" /><path d="M5 6h1v4M5 12h2M5 18h2" /></svg>
        </button>
        <button type="button" className={btn(editor?.isActive("blockquote"))} onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="Blockquote">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M7 7h4v6H7zM13 7h4v6h-4z" /></svg>
        </button>
        <button type="button" className={btn(editor?.isActive("codeBlock"))} onClick={() => editor?.chain().focus().toggleCodeBlock().run()} title="Code block">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M8 6l-4 6 4 6M16 6l4 6-4 6" /></svg>
        </button>

        <Sep />

        {/* Insert group */}
        <button type="button" className={btn(editor?.isActive("link"))} onClick={openLinkDialog} title="Insert link (Cmd/Ctrl+K)">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
            <path d="M10 14a3.5 3.5 0 005 0l3-3a3.5 3.5 0 00-5-5l-1 1" />
            <path d="M14 10a3.5 3.5 0 00-5 0l-3 3a3.5 3.5 0 005 5l1-1" />
          </svg>
        </button>
        <button type="button" className={btn()} onClick={() => setPickerOpen(true)} title="Insert image">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M4 5h16v14H4z" /><path d="M8 11l3 3 5-5 4 4" /><circle cx="9" cy="9" r="1.5" /></svg>
        </button>
        <button
          type="button"
          className={btn(inTable, inTable)}
          onClick={insertTable}
          disabled={inTable}
          title={inTable ? "Tabel sudah ada — gunakan kontrol di bawah" : "Sisipkan tabel (3×3)"}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></svg>
        </button>
        <button type="button" className={btn()} onClick={() => setYtOpen(true)} title="Embed YouTube video">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M10 9l6 3-6 3V9z" /></svg>
        </button>
        <button type="button" className={btn()} onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Divider">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M4 12h16" /></svg>
        </button>

        <Sep />

        {/* History */}
        <button type="button" className={btn(false, !editor?.can().undo())} onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} title="Undo">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M7 8l-4 4 4 4M3 12h10a6 6 0 010 12" /></svg>
        </button>
        <button type="button" className={btn(false, !editor?.can().redo())} onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} title="Redo">
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M17 8l4 4-4 4M21 12H11a6 6 0 000 12" /></svg>
        </button>
      </div>

      {inTable && (
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-100/80 px-2 py-1.5">
          <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Tabel</span>
          <button type="button" className={btn()} onClick={() => editor?.chain().focus().addRowBefore().run()} title="Tambah baris di atas">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M4 10h16M12 4v16" /></svg>
          </button>
          <button type="button" className={btn()} onClick={() => editor?.chain().focus().addRowAfter().run()} title="Tambah baris di bawah">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M4 14h16M12 4v16" /></svg>
          </button>
          <button type="button" className={btn()} onClick={() => editor?.chain().focus().deleteRow().run()} title="Hapus baris">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M4 12h16M8 8v8M16 8v8" /></svg>
          </button>
          <Sep />
          <button type="button" className={btn()} onClick={() => editor?.chain().focus().addColumnBefore().run()} title="Tambah kolom di kiri">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M10 4v16M4 12h16" /></svg>
          </button>
          <button type="button" className={btn()} onClick={() => editor?.chain().focus().addColumnAfter().run()} title="Tambah kolom di kanan">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M14 4v16M4 12h16" /></svg>
          </button>
          <button type="button" className={btn()} onClick={() => editor?.chain().focus().deleteColumn().run()} title="Hapus kolom">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M12 4v16M8 8v8M16 8v8" /></svg>
          </button>
          <Sep />
          <button type="button" className={btn()} onClick={() => editor?.chain().focus().toggleHeaderRow().run()} title="Toggle baris header">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M3 9h18" strokeWidth="2.5" /></svg>
          </button>
          <button type="button" className={btn()} onClick={() => editor?.chain().focus().mergeOrSplit().run()} title="Gabung atau pisah sel">
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M8 6h8v12H8zM12 6v12" /></svg>
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center justify-center rounded px-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
            onClick={() => editor?.chain().focus().deleteTable().run()}
            title="Hapus tabel"
          >
            Hapus tabel
          </button>
        </div>
      )}

      {/* ── Editor area ─────────────────────────────────────────────────── */}
      <EditorContent editor={editor} className="tiptap-content max-w-none px-3 py-3 text-slate-700" />

      {/* ── Word/char counter ────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-4 border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
        <span>{wordCount} kata</span>
        <span>{charCount} karakter</span>
        <span>~{readTime} mnt baca</span>
      </div>

      {/* ── Link dialog ──────────────────────────────────────────────────── */}
      {linkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Sisipkan / Edit Tautan</p>
              <button type="button" className="rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100" onClick={() => setLinkOpen(false)}>Tutup</button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">URL</label>
                <input
                  type="url" autoFocus
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  placeholder="https://contoh.com/halaman"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } }}
                />
                <p className="mt-1 text-[11px] text-slate-400">Boleh https://, mailto:, atau tel:.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Teks tautan {editor && !editor.state.selection.empty && <span className="text-slate-400">(dari teks terpilih)</span>}
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  placeholder="Misal: baca panduan lengkap"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  disabled={Boolean(editor && !editor.state.selection.empty)}
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={linkNewTab} onChange={(e) => setLinkNewTab(e.target.checked)} />
                Buka di tab baru
              </label>
            </div>
            <div className="mt-5 flex items-center justify-between gap-2">
              <button type="button" className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50" onClick={removeLink} disabled={!editor?.isActive("link")}>Hapus tautan</button>
              <div className="flex gap-2">
                <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => setLinkOpen(false)}>Batal</button>
                <button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800" onClick={applyLink}>Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── YouTube dialog ───────────────────────────────────────────────── */}
      {ytOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Embed YouTube</p>
              <button type="button" className="rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-100" onClick={() => setYtOpen(false)}>Tutup</button>
            </div>
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-600">URL Video YouTube</label>
              <input
                type="url" autoFocus
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                placeholder="https://www.youtube.com/watch?v=..."
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyYoutube(); } }}
              />
              <p className="mt-1 text-[11px] text-slate-400">Mendukung link youtube.com dan youtu.be.</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => setYtOpen(false)}>Batal</button>
              <button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50" onClick={applyYoutube} disabled={!ytUrl.trim()}>Sisipkan</button>
            </div>
          </div>
        </div>
      )}

      <MediaImagePickerDialog
        open={pickerOpen}
        title="Sisipkan Gambar"
        description="Pilih dari media library, upload file baru, atau gunakan URL web eksternal."
        autoPickUploaded="first"
        confirmBeforePick
        allowLinkTarget
        allowExternalImageUrl
        closeOnPick={false}
        onClose={() => setPickerOpen(false)}
        onPick={(_item, options) => {
          if (options) insertImage(options);
        }}
        onExternalInsert={(options) => insertImage(options)}
      />
    </div>
  );
}
