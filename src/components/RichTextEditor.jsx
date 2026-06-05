"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import { getMarkRange } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import ImageResize from 'tiptap-extension-resize-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, Heading4, Type,
  Image as ImageIcon, Link as LinkIcon, Unlink,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  ImageUp, List, ListOrdered, Quote, Minus, Loader2,
  Upload, X, ExternalLink, Pencil, Check
} from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useToast, ToastContainer } from '@/components/useToast';

function LinkPopover({ editor, toast, wrapperRef }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [href, setHref] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [draftText, setDraftText] = useState('');
  const [linkRange, setLinkRange] = useState(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const isLink = editor.isActive('link');
      if (!isLink) { setShow(false); return; }

      const currentHref = editor.getAttributes('link').href || '';
      setHref(currentHref);
      setDraft(currentHref);

      const { from } = editor.state.selection;
      const domNode = editor.view.domAtPos(from)?.node;
      if (!domNode) { setShow(false); return; }

      let el = domNode.nodeType === 3 ? domNode.parentElement : domNode;
      while (el && el.tagName !== 'A') el = el.parentElement;

      if (!el || !wrapperRef.current) { setShow(false); return; }

      const wrapRect = wrapperRef.current.getBoundingClientRect();
      const linkRect = el.getBoundingClientRect();
      const markType = editor.schema.marks.link;
      const range = markType ? getMarkRange(editor.state.selection.$from, markType) : null;
      setLinkRange(range);
      setDisplayText(el.textContent || '');
      setDraftText(el.textContent || '');
      setPos({
        top: linkRect.bottom - wrapRect.top + 6,
        left: Math.min(linkRect.left - wrapRect.left, wrapRect.width - 360),
      });
      setShow(true);
    };

    const updateFromHover = (event) => {
      const link = event.target.closest?.('.ProseMirror a');
      if (!link || !wrapperRef.current) return;

      const textNode = Array.from(link.childNodes).find(node => node.nodeType === 3 && node.textContent?.length) || link.firstChild;
      if (!textNode) return;

      const markType = editor.schema.marks.link;
      const pos = editor.view.posAtDOM(textNode, Math.min(1, textNode.textContent?.length || 0));
      const range = markType ? getMarkRange(editor.state.doc.resolve(pos), markType) : null;
      const wrapRect = wrapperRef.current.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();

      setHref(link.getAttribute('href') || '');
      setDraft(link.getAttribute('href') || '');
      setDisplayText(link.textContent || '');
      setDraftText(link.textContent || '');
      setLinkRange(range);
      setPos({
        top: linkRect.bottom - wrapRect.top + 6,
        left: Math.min(linkRect.left - wrapRect.left, wrapRect.width - 360),
      });
      setShow(true);
    };

    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    editor.view.dom.addEventListener('mouseover', updateFromHover);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      editor.view.dom.removeEventListener('mouseover', updateFromHover);
    };
  }, [editor, wrapperRef]);

  const autoSaveHandler = useRef(null);

  autoSaveHandler.current = () => {
    if (draft !== href || draftText !== displayText) {
      applyUrl(true);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        autoSaveHandler.current();
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!show) return null;

  const applyUrl = (isAutoSave = false) => {
    const trimmed = draft.trim();
    const newText = draftText.trim() || 'Link';
    let chain = editor.chain();
    if (!isAutoSave) chain = chain.focus();
    
    if (linkRange) chain.setTextSelection(linkRange);

    if (!trimmed) {
      chain.extendMarkRange('link').unsetLink().run();
      if (!isAutoSave) toast.info('Link removed.');
    } else {
      if (newText !== displayText && linkRange) {
        chain.insertContent(`<a href="${trimmed}">${newText}</a>`).run();
      } else {
        chain.extendMarkRange('link').setLink({ href: trimmed }).run();
      }
      if (!isAutoSave) toast.success('Link updated.');
    }
  };

  const removeLink = () => {
    const chain = editor.chain().focus();
    if (linkRange) chain.setTextSelection(linkRange);
    chain.extendMarkRange('link').unsetLink().run();
    toast.info('Link removed.');
    setShow(false);
  };

  return (
    <div
      ref={popoverRef}
      className="link-popover"
      style={{ top: pos.top, left: Math.max(0, pos.left) }}
      onMouseDown={e => {
        if (e.target.tagName !== 'INPUT') {
          e.preventDefault();
        }
      }}
    >
      <div className="lp-card">
        <div className="lp-row">
          <input
            className="lp-input"
            value={draftText}
            onChange={e => setDraftText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') applyUrl();
              if (e.key === 'Escape') setShow(false);
            }}
            placeholder="Text to display"
            title="Display Text"
          />
        </div>
        <div className="lp-row">
          <input
            ref={inputRef}
            className="lp-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') applyUrl();
              if (e.key === 'Escape') setShow(false);
            }}
            placeholder="https://…"
            title="Link URL"
          />
          <button type="button" className="lp-btn lp-confirm" onClick={applyUrl} title="Apply"><Check size={13} /></button>
          <button type="button" className="lp-btn lp-open" onClick={() => window.open(href, '_blank')} title="Open link"><ExternalLink size={13} /></button>
          <button type="button" className="lp-btn lp-remove" onClick={removeLink} title="Remove link"><Unlink size={13} /></button>
        </div>
      </div>
    </div>
  );
}

const MenuBar = ({ editor, onSetHeaderImage, toast, articleSlug, editionSlug }) => {
  const [isUploading, setIsUploading] = useState(false);

  if (!editor) return null;

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const presignRes = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fileName: file.name, 
          fileType: file.type || "application/octet-stream",
          articleSlug,
          editionSlug
        })
      });
      const presignData = await presignRes.json();
      if (presignData.success) {
        const uploadRes = await fetch(presignData.presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file
        });
        if (uploadRes.ok) {
          editor.chain().focus().setImage({ src: presignData.url, width: '40%' }).run();
          toast.success('Image inserted.');
        } else {
          toast.error('Upload to storage failed.');
        }
      } else {
        toast.error('Upload failed: ' + presignData.error);
      }
    } catch {
      toast.error('Upload error — please try again.');
    }
    setIsUploading(false);
    e.target.value = '';
  };

  const handleSetHeader = () => {
    const src = editor.getAttributes('image').src || editor.getAttributes('imageResize').src;
    if (src && onSetHeaderImage) {
      onSetHeaderImage(src);
      toast.success('Header image updated.');
    } else {
      toast.info('Select an image in the editor first.');
    }
  };

  const handleAddLink = () => {
    const existing = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL:', existing);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const isImageActive = editor.isActive('image') || editor.isActive('imageResize');



  const btn = (onClick, active, title, icon, disabled = false) => (
    <button type="button" onClick={onClick}
      className={active ? 'menu-btn is-active' : 'menu-btn'}
      title={title} disabled={disabled}>
      {icon}
    </button>
  );

  return (
    <div className="editor-menu">
      {btn(() => editor.chain().focus().toggleBold().run(),      editor.isActive('bold'),      'Bold',          <Bold size={15} />)}
      {btn(() => editor.chain().focus().toggleItalic().run(),    editor.isActive('italic'),    'Italic',        <Italic size={15} />)}
      {btn(() => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), 'Underline',     <UnderlineIcon size={15} />)}
      {btn(() => editor.chain().focus().toggleStrike().run(),    editor.isActive('strike'),    'Strikethrough', <Strikethrough size={15} />)}
      <span className="menu-divider" />
      {btn(() => editor.chain().focus().setParagraph().run(),                              editor.isActive('paragraph'),           'Paragraph', <Type size={15} />)}
      {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(),                 editor.isActive('heading', { level: 1 }), 'H1',      <Heading1 size={15} />)}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(),                 editor.isActive('heading', { level: 2 }), 'H2',      <Heading2 size={15} />)}
      {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(),                 editor.isActive('heading', { level: 3 }), 'H3',      <Heading3 size={15} />)}
      {btn(() => editor.chain().focus().toggleHeading({ level: 4 }).run(),                 editor.isActive('heading', { level: 4 }), 'H4',      <Heading4 size={15} />)}
      <span className="menu-divider" />
      {btn(() => editor.chain().focus().setTextAlign('left').run(),    editor.isActive({ textAlign: 'left' }),    'Align Left',   <AlignLeft size={15} />)}
      {btn(() => editor.chain().focus().setTextAlign('center').run(),  editor.isActive({ textAlign: 'center' }),  'Align Center', <AlignCenter size={15} />)}
      {btn(() => editor.chain().focus().setTextAlign('right').run(),   editor.isActive({ textAlign: 'right' }),   'Align Right',  <AlignRight size={15} />)}
      {btn(() => editor.chain().focus().setTextAlign('justify').run(), editor.isActive({ textAlign: 'justify' }), 'Justify',      <AlignJustify size={15} />)}
      <span className="menu-divider" />
      {btn(() => editor.chain().focus().toggleBulletList().run(),  editor.isActive('bulletList'),  'Bullet List',    <List size={15} />)}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Ordered List',   <ListOrdered size={15} />)}
      {btn(() => editor.chain().focus().toggleBlockquote().run(),  editor.isActive('blockquote'),  'Blockquote',     <Quote size={15} />)}
      {btn(() => editor.chain().focus().setHorizontalRule().run(), false,                          'Horizontal Rule', <Minus size={15} />)}
      <span className="menu-divider" />
      {btn(handleAddLink, editor.isActive('link'), 'Add / Edit Link', <LinkIcon size={15} />)}
      {btn(() => editor.chain().focus().unsetLink().run(), false, 'Remove Link', <Unlink size={15} />, !editor.isActive('link'))}
      <span className="menu-divider" />
      <input id="body-image-upload" type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} style={{ display: 'none' }} />
      <label
        htmlFor="body-image-upload"
        className="menu-btn"
        title="Upload Image to Body"
        aria-disabled={isUploading}
      >
        {isUploading ? <Loader2 size={15} className="spin" /> : <ImageIcon size={15} />}
      </label>
      <span className="menu-divider" />
      <button type="button"
        className={`menu-btn set-header-btn${isImageActive ? ' image-active' : ''}`}
        onClick={handleSetHeader} disabled={!isImageActive} title="Set Selected Image as Header">
        <ImageUp size={15} /> Set as Header
      </button>
    </div>
  );
};

export default function RichTextEditor({ content, onChange, onSetHeaderImage, imageBank, setImageBank, toast: externalToast, articleSlug, editionSlug }) {
  const { toasts, toast: internalToast } = useToast();
  const toast = externalToast || internalToast;

  const bankUploadRef = useRef(null);
  const wrapperRef = useRef(null);
  const [bankUploading, setBankUploading] = useState(false);
  const [imgErrors, setImgErrors] = useState({});
  const openBankUpload = () => bankUploadRef.current?.click();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      ImageResize,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph', 'image', 'imageResize'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      handleDrop: (view, event) => {
        const url = event.dataTransfer?.getData('text/plain');
        if (!url || !url.startsWith('/api/uploads')) return false;
        event.preventDefault();
        const coords = { left: event.clientX, top: event.clientY };
        const pos = view.posAtCoords(coords);
        const insertAt = pos?.pos ?? view.state.selection.anchor;
        const schema = view.state.schema;
        const imgNode = (schema.nodes.imageResize ?? schema.nodes.image)?.create({ src: url, width: '40%' });
        if (!imgNode) return false;
        view.dispatch(view.state.tr.insert(insertAt, imgNode));
        return true;
      },
    },
  });

  const handleBankUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBankUploading(true);
    try {
      const presignRes = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fileName: file.name, 
          fileType: file.type || "application/octet-stream",
          articleSlug,
          editionSlug
        })
      });
      const presignData = await presignRes.json();
      if (presignData.success) {
        const uploadRes = await fetch(presignData.presignedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file
        });
        if (uploadRes.ok) {
          setImageBank(prev => [...prev, presignData.url]);
          toast.success('Image added to bank.');
        } else {
          toast.error('Upload to storage failed.');
        }
      } else {
        toast.error('Upload failed: ' + presignData.error);
      }
    } catch {
      toast.error('Upload error — please try again.');
    }
    setBankUploading(false);
    e.target.value = '';
  };

  const showImageBank = imageBank !== undefined && setImageBank !== undefined;

  return (
    <>
      {!externalToast && <ToastContainer toasts={toasts} />}
      <style>{`
        .editor-wrapper { border: 1px solid var(--border); background: #fff; display: flex; flex-direction: column; min-height: 600px; position: relative; }
        .editor-menu {
          display: flex; flex-wrap: wrap; align-items: center; gap: 0.15rem;
          padding: 0.5rem 0.75rem; border-bottom: 2px solid var(--border); background: #fff;
          position: sticky; top: 0; z-index: 20; box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
        .menu-btn { padding: 0.3rem 0.4rem; border: none; background: transparent; color: #333; cursor: pointer; border-radius: 4px; display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; transition: background 0.15s; }
        .menu-btn:hover:not(:disabled) { background: #f0f0f0; }
        .menu-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .menu-btn.is-active { background: #e8eef7; color: var(--primary); }
        .set-header-btn { color: #888; font-size: 0.78rem; }
        .set-header-btn.image-active { color: var(--primary); }
        .menu-divider { width: 1px; height: 18px; background: var(--border); margin: 0 0.25rem; flex-shrink: 0; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .editor-body { display: flex; flex: 1; min-height: 0; }
        .editor-content-area { flex: 1 1 auto; min-width: 0; overflow-y: auto; }
        .editor-content-area .ProseMirror { padding: 2.5rem 2rem 2rem; min-height: 500px; outline: none; color: #111; font-size: 1rem; line-height: 1.7; }
        .editor-content-area .ProseMirror > * + * { margin-top: 0.75em; }
        .editor-content-area .ProseMirror p { margin-bottom: 0.75em; line-height: 1.7; }
        .editor-content-area .ProseMirror h1 { font-family: var(--font-serif); font-size: 2.2rem; font-weight: 700; margin-top: 1.5em; margin-bottom: 0.5em; color: var(--primary); }
        .editor-content-area .ProseMirror h2 { font-family: var(--font-serif); font-size: 1.8rem; font-weight: 700; margin-top: 1.5em; margin-bottom: 0.5em; color: var(--primary); }
        .editor-content-area .ProseMirror h3 { font-family: var(--font-serif); font-size: 1.4rem; font-weight: 600; margin-top: 1.2em; margin-bottom: 0.4em; }
        .editor-content-area .ProseMirror h4 { font-family: var(--font-serif); font-size: 1.15rem; font-weight: 600; margin-top: 1em; margin-bottom: 0.4em; }
        .editor-content-area .ProseMirror strong { font-weight: 700; }
        .editor-content-area .ProseMirror em { font-style: italic; }
        .editor-content-area .ProseMirror u { text-decoration: underline; }
        .editor-content-area .ProseMirror s { text-decoration: line-through; }
        .editor-content-area .ProseMirror a { color: var(--primary); text-decoration: underline; text-underline-offset: 2px; font-weight: 600; cursor: pointer; }
        .editor-content-area .ProseMirror a:hover { background: var(--accent-yellow); }
        .editor-content-area .ProseMirror blockquote { border-left: 4px solid var(--primary); padding-left: 1rem; margin: 1rem 0; font-style: italic; color: #555; }
        .editor-content-area .ProseMirror ul { list-style-type: disc; padding-left: 2rem; margin-bottom: 1rem; }
        .editor-content-area .ProseMirror ol { list-style-type: decimal; padding-left: 2rem; margin-bottom: 1rem; }
        .editor-content-area .ProseMirror hr { border: 0; border-top: 1px solid var(--border); margin: 1.5rem 0; }
        .editor-content-area .ProseMirror img { max-width: 100%; height: auto; border: 1px solid var(--border); margin: 1rem auto; display: block; }
        .editor-content-area .ProseMirror img.ProseMirror-selectednode { outline: 3px solid var(--primary); }

        /* Link popover */
        .link-popover {
          position: absolute; z-index: 50;
          background: #fff; border: 1px solid var(--border);
          padding: 0.65rem;
          max-width: 360px; min-width: 240px;
        }
        .lp-row { display: flex; align-items: center; gap: 0.3rem; }
        .lp-card { display: flex; flex-direction: column; gap: 0.5rem; }
        .lp-field { display: grid; grid-template-columns: 3rem minmax(0, 1fr); gap: 0.5rem; align-items: baseline; font-size: 0.82rem; }
        .lp-field span { color: #666; font-weight: 600; }
        .lp-field strong,
        .lp-field a { color: #111; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
        .lp-field a { color: var(--primary); text-decoration: underline; text-underline-offset: 2px; }
        .lp-actions { display: flex; flex-wrap: wrap; gap: 0.35rem; padding-top: 0.25rem; border-top: 1px solid var(--border); }
        .lp-action-btn { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.4rem; border: 1px solid var(--border); color: #111; background: #fff; font-size: 0.8rem; }
        .lp-action-btn:hover { background: var(--accent-yellow); }
        .lp-unlink { color: #b91c1c; }
        .lp-btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.25rem; border: none; background: transparent; cursor: pointer; border-radius: 3px; color: #555; transition: background 0.12s, color 0.12s; flex-shrink: 0; }
        .lp-btn:hover { background: #f0f0f0; }
        .lp-edit:hover { color: var(--primary); }
        .lp-open:hover { color: #0066cc; }
        .lp-confirm:hover { color: #16a34a; }
        .lp-remove:hover { color: #dc2626; }
        .lp-input { border: 1px solid var(--border); padding: 0.2rem 0.4rem; font-size: 0.82rem; outline: none; flex: 1; min-width: 0; color: #111; }
        .lp-input:focus { border-color: var(--primary); }

        /* Image bank */
        .image-bank-sidebar {
          width: 230px; flex-shrink: 0;
          border-left: 1px solid var(--border); background: #fafafa;
          display: flex; flex-direction: column;
          position: sticky; top: 0;
          align-self: flex-start;
          max-height: calc(100vh - 60px);
          overflow: hidden;
        }
        .image-bank-header { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: #fff; flex-shrink: 0; }
        .image-bank-header h3 { margin: 0; font-size: 0.85rem; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; }
        .bank-upload-btn { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.6rem; background: var(--primary); color: #fff; border: none; cursor: pointer; font-size: 0.78rem; font-weight: 600; border-radius: 3px; transition: background 0.15s; }
        .bank-upload-btn:hover { background: #003370; }
        .bank-upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .image-bank-list { flex: 1; overflow-y: auto; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .bank-item { border: 1px solid var(--border); background: #fff; cursor: grab; transition: border-color 0.15s, box-shadow 0.15s; }
        .bank-item:hover { border-color: var(--primary); box-shadow: 0 2px 8px rgba(0,73,144,0.12); }
        .bank-item:active { cursor: grabbing; }
        .bank-img-wrap { width: 100%; aspect-ratio: 16/10; background: #e8e8e8; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .bank-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
        .bank-img-error { font-size: 0.72rem; color: #888; padding: 0.5rem; text-align: center; word-break: break-all; }
        .bank-item-actions { display: flex; flex-wrap: wrap; gap: 0.3rem; padding: 0.4rem; background: #fff; }
        .bank-insert-btn { flex: 1; padding: 0.25rem; font-size: 0.76rem; background: var(--primary); color: #fff; border: none; cursor: pointer; font-weight: 600; border-radius: 2px; min-width: 0; }
        .bank-insert-btn:hover { background: #003370; }
        .bank-set-header-btn { flex: 1; padding: 0.25rem; font-size: 0.76rem; background: #fff; color: var(--primary); border: 1px solid var(--primary); cursor: pointer; font-weight: 600; border-radius: 2px; min-width: 0; }
        .bank-set-header-btn:hover { background: var(--primary); color: #fff; }
        .bank-delete-btn { padding: 0.25rem 0.4rem; font-size: 0.76rem; background: transparent; color: #cc0000; border: 1px solid #cc0000; cursor: pointer; border-radius: 2px; }
        .bank-delete-btn:hover { background: #cc0000; color: #fff; }
        .bank-empty { padding: 1.5rem 1rem; text-align: center; color: #888; font-size: 0.85rem; font-style: italic; line-height: 1.5; }
      `}</style>

      <div className="editor-wrapper" ref={wrapperRef}>
        <MenuBar editor={editor} onSetHeaderImage={onSetHeaderImage} toast={toast} articleSlug={articleSlug} editionSlug={editionSlug} />
        <LinkPopover editor={editor} toast={toast} wrapperRef={wrapperRef} />

        <div className="editor-body">
          <EditorContent editor={editor} className="editor-content-area" />

          {showImageBank && (
            <div className="image-bank-sidebar">
              <div className="image-bank-header">
                <h3>Image Bank</h3>
                <input type="file" accept="image/*" ref={bankUploadRef} onChange={handleBankUpload} style={{ display: 'none' }} />
                <button type="button" className="bank-upload-btn" onClick={openBankUpload} disabled={bankUploading}>
                  {bankUploading ? <Loader2 size={12} className="spin" /> : <Upload size={12} />}
                  {bankUploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>

              <div className="image-bank-list">
                {imageBank.length === 0 ? (
                  <p className="bank-empty">No images yet.<br />Upload or import an EPUB to populate this panel.</p>
                ) : (
                  imageBank.map((url, idx) => (
                    <div
                      key={`${url}-${idx}`}
                      className="bank-item"
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.effectAllowed = 'copy';
                        e.dataTransfer.setData('text/plain', url);
                        e.dataTransfer.setData('text/uri-list', url);
                      }}
                    >
                      <div className="bank-img-wrap">
                        {imgErrors[url] ? (
                          <span className="bank-img-error">⚠ {url.split('/').pop()}</span>
                        ) : (
                          <img
                            src={url}
                            alt={`Bank image ${idx + 1}`}
                            onError={() => setImgErrors(prev => ({ ...prev, [url]: true }))}
                          />
                        )}
                      </div>
                      <div className="bank-item-actions">
                        <button type="button" className="bank-insert-btn"
                          onClick={() => {
                            if (editor) { editor.chain().focus().setImage({ src: url, width: '40%' }).run(); toast.success('Image inserted.'); }
                          }} title="Insert at cursor">
                          Insert
                        </button>
                        <button type="button" className="bank-set-header-btn"
                          onClick={() => {
                            if (onSetHeaderImage) { onSetHeaderImage(url); toast.success('Header image set.'); }
                          }} title="Set as article header image">
                          Header
                        </button>
                        <button type="button" className="bank-delete-btn"
                          onClick={() => { setImageBank(prev => prev.filter(u => u !== url)); toast.info('Removed from bank.'); }}
                          title="Remove from bank">
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
