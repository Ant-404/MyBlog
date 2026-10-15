import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, WrapText } from 'lucide-react'

export default function ArticleEnhancements({ html }: { html: string }) {
  const [blocks, setBlocks] = useState<HTMLElement[]>([])
  const [pictures, setPictures] = useState<{ src: string; alt: string }[]>([])
  const [imageIndex, setImageIndex] = useState<number | null>(null)
  const [zoom, setZoom] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const [copyError, setCopyError] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<number[]>([])
  const [wrapped, setWrapped] = useState<number[]>([])
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const touch = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const image = imageIndex === null ? null : pictures[imageIndex]
  function move(delta: number) {
    setImageIndex((value) =>
      value === null ? null : (value + delta + pictures.length) % pictures.length,
    )
    setZoom(false)
  }
  useEffect(() => {
    const content = document.getElementById('article-content')
    setBlocks([...(content?.querySelectorAll<HTMLElement>('pre') || [])])
    setExpanded([])
    setWrapped([])
    const images = [...(content?.querySelectorAll<HTMLImageElement>('img') || [])].filter(
      (node) => !node.closest('a'),
    )
    setPictures(images.map((node) => ({ src: node.currentSrc || node.src, alt: node.alt })))
    function preview(event: Event) {
      const node = event.target
      if (!(node instanceof HTMLImageElement) || !images.includes(node)) return
      if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return
      event.preventDefault()
      opener.current = node
      setImageIndex(images.indexOf(node))
      setZoom(false)
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
      node.loading = 'lazy'
      node.decoding = 'async'
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
    blocks.forEach((block, index) => {
      const long =
        (block.querySelector('code')?.textContent || '').trimEnd().split('\n').length > 20
      block.parentElement?.classList.toggle('is-collapsed', long && !expanded.includes(index))
      block.parentElement?.classList.toggle('is-wrapped', wrapped.includes(index))
    })
  }, [blocks, expanded, wrapped])
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
      {blocks.map((block, index) => {
        const target = block.parentElement?.querySelector('.code-actions')
        if (!target) return null
        const long =
          (block.querySelector('code')?.textContent || '').trimEnd().split('\n').length > 20
        return createPortal(
          <>
            <button
              className="code-tool"
              type="button"
              aria-label={`代码块 ${index + 1} 自动换行`}
              aria-pressed={wrapped.includes(index)}
              onClick={() =>
                setWrapped((old) =>
                  old.includes(index) ? old.filter((value) => value !== index) : [...old, index],
                )
              }
            >
              <WrapText size={14} />
              换行
            </button>
            {long && (
              <button
                className="code-tool"
                type="button"
                aria-expanded={expanded.includes(index)}
                onClick={() =>
                  setExpanded((old) =>
                    old.includes(index) ? old.filter((value) => value !== index) : [...old, index],
                  )
                }
              >
                {expanded.includes(index) ? '收起代码' : '展开代码'}
              </button>
            )}
            <button
              className="code-copy code-tool"
              type="button"
              aria-label={`复制代码块 ${index + 1}`}
              onClick={() => void copy(block, index)}
            >
              {copied === index ? <Check size={14} /> : <Copy size={14} />}
              <span aria-live="polite">
                {copyError === index ? '请手动选择复制' : copied === index ? '已复制' : '复制'}
              </span>
            </button>
          </>,
          target,
          String(index),
        )
      })}
      <dialog
        ref={dialog}
        className={`image-lightbox ${zoom ? 'is-zoomed' : ''}`}
        aria-label="图片预览"
        onClose={() => {
          setImageIndex(null)
          opener.current?.focus()
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close()
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            move(-1)
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            move(1)
          }
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
          <figure
            onTouchStart={(event) => {
              touch.current = event.touches[0].clientX
            }}
            onTouchEnd={(event) => {
              if (touch.current !== null && !zoom && event.changedTouches.length) {
                const delta = event.changedTouches[0].clientX - touch.current
                if (Math.abs(delta) > 60) move(delta > 0 ? -1 : 1)
              }
              touch.current = null
            }}
          >
            <img src={image.src} alt={image.alt} />
            <figcaption>
              {image.alt || '正文插图'}
              <span>Esc 关闭 · ← → 切换</span>
            </figcaption>
          </figure>
        )}
        <div className="lightbox-tools">
          <button
            type="button"
            aria-label="上一张图片"
            disabled={pictures.length < 2}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <span aria-live="polite">
            {(imageIndex ?? 0) + 1} / {pictures.length}
          </span>
          <button
            type="button"
            aria-label={zoom ? '适应窗口' : '查看原始尺寸'}
            aria-pressed={zoom}
            onClick={() => setZoom(!zoom)}
          >
            {zoom ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
          </button>
          <button
            type="button"
            aria-label="下一张图片"
            disabled={pictures.length < 2}
            onClick={() => move(1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </dialog>
    </>
  )
}
