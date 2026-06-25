"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import LinkExtension from "@tiptap/extension-link"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code2,
  Minus,
  CornerDownLeft,
  Pilcrow,
} from "lucide-react"
import type { Editor } from "@tiptap/core"

type NotionEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

type Command = {
  id: string
  label: string
  icon: React.ReactNode
  action: (editor: Editor) => void
}

const COMMANDS: Command[] = [
  { id: "h1", label: "Heading 1", icon: <Heading1 className="h-4 w-4" />, action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { id: "h2", label: "Heading 2", icon: <Heading2 className="h-4 w-4" />, action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: "h3", label: "Heading 3", icon: <Heading3 className="h-4 w-4" />, action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { id: "bullet", label: "Bullet List", icon: <List className="h-4 w-4" />, action: (e) => e.chain().focus().toggleBulletList().run() },
  { id: "ordered", label: "Numbered List", icon: <ListOrdered className="h-4 w-4" />, action: (e) => e.chain().focus().toggleOrderedList().run() },
  { id: "task", label: "Checklist", icon: <CheckSquare className="h-4 w-4" />, action: (e) => e.chain().focus().toggleTaskList().run() },
  { id: "quote", label: "Quote", icon: <Quote className="h-4 w-4" />, action: (e) => e.chain().focus().toggleBlockquote().run() },
  { id: "code", label: "Code Block", icon: <Code2 className="h-4 w-4" />, action: (e) => e.chain().focus().toggleCodeBlock().run() },
  { id: "divider", label: "Divider", icon: <Minus className="h-4 w-4" />, action: (e) => e.chain().focus().setHorizontalRule().run() },
]

function BubbleMenuBar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const linkRef = useRef<HTMLInputElement>(null)

  const handleLink = () => {
    const href = editor.getAttributes("link").href
    if (href) {
      editor.chain().focus().unsetLink().run()
    } else {
      setLinkUrl("")
      setLinkOpen(true)
      setTimeout(() => linkRef.current?.focus(), 50)
    }
  }

  const applyLink = () => {
    if (linkUrl.trim()) {
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run()
    }
    setLinkOpen(false)
  }

  const hasHeading = editor.isActive("heading")
  const inList = editor.isActive("bulletList") || editor.isActive("orderedList")

  return (
    <div className="notion-bubble-menu">
      <div className="notion-bubble-buttons">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive("bold") ? "active" : ""} title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive("italic") ? "active" : ""} title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive("strike") ? "active" : ""} title="Strikethrough">
          <Strikethrough className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={editor.isActive("code") ? "active" : ""} title="Inline code">
          <Code className="h-3.5 w-3.5" />
        </button>
        <span className="notion-bubble-sep" />
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive("heading", { level: 1 }) ? "active" : ""} title="Heading 1">
          <Heading1 className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive("heading", { level: 2 }) ? "active" : ""} title="Heading 2">
          <Heading2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive("heading", { level: 3 }) ? "active" : ""} title="Heading 3">
          <Heading3 className="h-3.5 w-3.5" />
        </button>
        <span className="notion-bubble-sep" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive("bulletList") ? "active" : ""} title="Bullet list">
          <List className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive("orderedList") ? "active" : ""} title="Numbered list">
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
      </div>

      {linkOpen && (
        <div className="notion-bubble-link">
          <input
            ref={linkRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyLink() }
              if (e.key === "Escape") setLinkOpen(false)
            }}
            placeholder="Masukkan URL..."
            className="notion-bubble-link-input"
          />
          <button type="button" onClick={applyLink} className="notion-bubble-link-apply" title="Apply link">
            <CornerDownLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function NotionEditor({ value, onChange, placeholder = "Ketik '/' untuk perintah, atau tulis deskripsi..." }: NotionEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashQuery, setSlashQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const slashPosRef = useRef<{ from: number; to: number } | null>(null)
  const showSlashRef = useRef(false)
  const selectedIdxRef = useRef(0)
  const slashQueryRef = useRef("")
  const menuRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor | null>(null)

  const updateSlashMenuPosition = useCallback(() => {
    const ed = editorRef.current
    if (!ed || !slashPosRef.current) return

    const coords = ed.view.coordsAtPos(slashPosRef.current.from)
    const editorRect = ed.view.dom.getBoundingClientRect()

    setMenuPosition({
      top: coords.bottom - editorRect.top + 4,
      left: Math.max(0, coords.left - editorRect.left),
    })
  }, [])

  const checkSlashCommand = useCallback((ed: Editor) => {
    const { selection } = ed.state
    const { $anchor } = selection
    const parent = $anchor.parent

    if (parent.type.name !== "paragraph") {
      setShowSlashMenu(false)
      showSlashRef.current = false
      return
    }

    const textBefore = parent.textBetween(0, $anchor.parentOffset)
    const slashIndex = textBefore.lastIndexOf("/")

    if (slashIndex === -1) {
      if (showSlashRef.current) {
        setShowSlashMenu(false)
        showSlashRef.current = false
      }
      return
    }

    if (slashIndex > 0 && textBefore[slashIndex - 1] !== " ") {
      return
    }

    const query = textBefore.slice(slashIndex + 1)
    const from = $anchor.pos - (textBefore.length - slashIndex)
    const to = $anchor.pos

    slashPosRef.current = { from, to }
    setSlashQuery(query)
    slashQueryRef.current = query
    setShowSlashMenu(true)
    showSlashRef.current = true
    setSelectedIndex(0)
    selectedIdxRef.current = 0

    updateSlashMenuPosition()
  }, [updateSlashMenuPosition])

  const executeCommand = useCallback((command: Command) => {
    const ed = editorRef.current
    if (!ed || !slashPosRef.current) return

    const { from, to } = slashPosRef.current
    ed
      .chain()
      .focus()
      .deleteRange({ from, to })
      .run()

    command.action(ed)

    setShowSlashMenu(false)
    showSlashRef.current = false
    setSlashQuery("")
    slashPosRef.current = null
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
      }),
      Placeholder.configure({ placeholder }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer", class: "notion-link" },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: value || "",
    editorProps: {
      handleKeyDown: (view, event) => {
        if (!showSlashRef.current) return false

        const query = slashQueryRef.current
        const filtered = COMMANDS.filter((c) =>
          c.label.toLowerCase().includes(query.toLowerCase())
        )

        if (event.key === "Escape") {
          event.preventDefault()
          setShowSlashMenu(false)
          showSlashRef.current = false
          setSlashQuery("")
          slashPosRef.current = null
          return true
        }

        if (event.key === "ArrowDown") {
          event.preventDefault()
          const next = Math.min(selectedIdxRef.current + 1, filtered.length - 1)
          selectedIdxRef.current = next
          setSelectedIndex(next)
          return true
        }

        if (event.key === "ArrowUp") {
          event.preventDefault()
          const next = Math.max(selectedIdxRef.current - 1, 0)
          selectedIdxRef.current = next
          setSelectedIndex(next)
          return true
        }

        if (event.key === "Enter" && filtered.length > 0) {
          event.preventDefault()
          executeCommand(filtered[selectedIdxRef.current])
          return true
        }

        selectedIdxRef.current = 0
        setSelectedIndex(0)
        return false
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
      checkSlashCommand(ed)
    },
    onSelectionUpdate: ({ editor: ed }) => {
      checkSlashCommand(ed)
    },
  })

  editorRef.current = editor

  useEffect(() => {
    if (!editor) return
    const next = value || ""
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [editor, value])

  useEffect(() => {
    if (!showSlashMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowSlashMenu(false)
        showSlashRef.current = false
        setSlashQuery("")
        slashPosRef.current = null
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showSlashMenu])

  const filteredCommands = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(slashQuery.toLowerCase())
  )

  return (
    <div className="notion-editor-wrapper">
      {editor && (
        <BubbleMenu
          editor={editor}
          options={{ placement: "top" }}
        >
          <BubbleMenuBar editor={editor} />
        </BubbleMenu>
      )}

      <EditorContent editor={editor} className="notion-editor-content" />

      {showSlashMenu && filteredCommands.length > 0 && (
        <div
          ref={menuRef}
          className="notion-slash-menu"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {filteredCommands.map((cmd, i) => (
            <button
              key={cmd.id}
              type="button"
              className={`notion-slash-item${i === selectedIndex ? " selected" : ""}`}
              onClick={() => executeCommand(cmd)}
              onMouseEnter={() => {
                selectedIdxRef.current = i
                setSelectedIndex(i)
              }}
            >
              <span className="notion-slash-icon">{cmd.icon}</span>
              <span className="notion-slash-label">{cmd.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
