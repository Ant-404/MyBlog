import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, X, ZoomIn } from 'lucide-react'

export default function ArticleEnhancements({ html }: { html: string }) {
  const [blocks, setBlocks] = useState<HTMLElement[]>([])
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const [copyError, setCopyError] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    const content = document.getElementById('article-content')
    setBlocks([...(content?.querySelectorAll<HTMLElement>('pre') || [])])
    const images = [...(content?.querySelectorAll<HTMLImageElement>('img') || [])].filter(
      (node) => !node.closest('a'),
    )
    function preview(event: Event) {
      const node = event.target
      if (!(node instanceof HTMLImageElement) || !images.includes(node)) return
      if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return
      event.preventDefault()
      opener.current = node
      setImage({ src: node.currentSrc || node.src, alt: node.alt })
    }
    const originals = images.map((node) => ({
      node,
      role: node.getAttribute('role'),
      tabIndex: node.getAttribute('tabindex'),
      label: node.getAttribute('aria-label'),
    }))
    images.forEach((node) => {
      node.setAttribute('role', 'button')
      node.setAttribute('tabindex', '0')
      node.setAttribute('aria-label', `放大图片：${node.alt || '正文插图'}`)
      node.classList.add('zoomable-image')
    })
    content?.addEventListener('click', preview)
    content?.addEventListener('keydown', preview)
    return () => {
      content?.removeEventListener('click', preview)
      content?.removeEventListener('keydown', preview)
      originals.forEach(({ node, role, tabIndex, label }) => {
        for (const [name, value] of [
          ['role', role],
          ['tabindex', tabIndex],
          ['aria-label', label],
        ]) {
          if (value === null) node.removeAttribute(name!)
          else node.setAttribute(name!, value!)
        }
        node.classList.remove('zoomable-image')
      })
      clearTimeout(timer.current)
    }
  }, [html])
  useEffect(() => {
    if (image && !dialog.current?.open) dialog.current?.showModal()
  }, [image])
  async function copy(block: HTMLElement, index: number) {
    clearTimeout(timer.current)
    try {
      await navigator.clipboard.writeText(block.querySelector('code')?.textContent || '')
      setCopied(index)
      setCopyError(null)
    } catch {
      setCopyError(index)
    }
    timer.current = setTimeout(() => {
      setCopied(null)
      setCopyError(null)
    }, 2200)
  }
  return (
    <>
      {blocks.map((block, index) =>
        createPortal(
          <button
            className="code-copy"
            type="button"
            aria-label={`复制代码块 ${index + 1}`}
            onClick={() => void copy(block, index)}
          >
            {copied === index ? <Check size={14} /> : <Copy size={14} />}
            <span aria-live="polite">
              {copyError === index ? '请手动选择复制' : copied === index ? '已复制' : '复制'}
            </span>
          </button>,
          block,
          String(index),
        ),
      )}
      <dialog
        ref={dialog}
        className="image-lightbox"
        aria-label="图片预览"
        onClose={() => {
          setImage(null)
          opener.current?.focus()
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close()
        }}
      >
        <button
          className="lightbox-close"
          aria-label="关闭图片预览"
          onClick={() => dialog.current?.close()}
        >
          <X size={22} />
        </button>
        {image && (
          <figure>
            <img src={image.src} alt={image.alt} />
            <figcaption>
              <ZoomIn size={14} />
              {image.alt || '正文插图'}
              <span>Esc 关闭</span>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  )
}
