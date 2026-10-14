import { useMemo, useRef, useState } from 'react'
import { renderMarkdown } from '../../utils/markdown'

type Mode = 'edit' | 'split' | 'preview'
const formats = [
  { label: '标题', before: '## ', after: '', sample: '标题' },
  { label: '加粗', before: '**', after: '**', sample: '粗体文字' },
  { label: '斜体', before: '*', after: '*', sample: '斜体文字' },
  { label: '引用', before: '> ', after: '', sample: '引用内容' },
  { label: '列表', before: '- ', after: '', sample: '列表项目' },
  { label: '链接', before: '[', after: '](https://example.com)', sample: '链接文字' },
  { label: '图片', before: '![', after: '](/images/landscape.svg)', sample: '图片说明' },
  { label: '代码块', before: '```text\n', after: '\n```', sample: '在这里输入代码' },
]

export default function MarkdownEditor({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  const [mode, setMode] = useState<Mode>('split')
  const input = useRef<HTMLTextAreaElement>(null)
  const html = useMemo(() => renderMarkdown(value), [value])
  function insert(format: (typeof formats)[number]) {
    const start = input.current?.selectionStart ?? value.length
    const end = input.current?.selectionEnd ?? value.length
    const selected = value.slice(start, end) || format.sample
    const block = ['标题', '引用', '列表', '代码块'].includes(format.label)
    const prefix = block && start > 0 && value[start - 1] !== '\n' ? '\n' : ''
    const suffix = block && end < value.length && value[end] !== '\n' ? '\n' : ''
    const replacement = prefix + format.before + selected + format.after + suffix
    if (value.length - (end - start) + replacement.length > 200000) return
    onChange(value.slice(0, start) + replacement + value.slice(end))
    requestAnimationFrame(() => {
      input.current?.focus()
      const selection = start + prefix.length + format.before.length
      input.current?.setSelectionRange(selection, selection + selected.length)
    })
  }
  return (
    <div className={`markdown-editor mode-${mode}`}>
      <div className="markdown-toolbar">
        <div className="markdown-formats" role="group" aria-label="Markdown 格式工具">
          {formats.map((format) => (
            <button
              type="button"
              key={format.label}
              disabled={disabled || mode === 'preview'}
              onClick={() => insert(format)}
              aria-label={`插入${format.label}`}
            >
              {format.label}
            </button>
          ))}
        </div>
        <div className="markdown-modes" role="group" aria-label="编辑器显示模式">
          {(
            [
              ['edit', '编辑'],
              ['split', '分栏'],
              ['preview', '预览'],
            ] as const
          ).map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={mode === key}
              onClick={() => setMode(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="markdown-panes">
        <textarea
          ref={input}
          id="post-content"
          className="markdown-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={'## 从这里开始\n\n写下你的想法…'}
          maxLength={200000}
          rows={22}
          disabled={disabled}
          hidden={mode === 'preview'}
        />
        {mode !== 'edit' && (
          <section className="markdown-preview" aria-label="Markdown 实时预览">
            <span className="preview-caption">实时预览</span>
            {value.trim() ? (
              <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <p className="muted preview-empty">写下正文，预览会显示在这里。</p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
