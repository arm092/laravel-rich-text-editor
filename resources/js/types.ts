export type CodeViewOptions = {
  enabled?: boolean
  line_numbers?: boolean
  line_wrapping?: boolean
  folding?: boolean
  autocomplete?: boolean
  diagnostics?: boolean
  format_button?: boolean
  fullscreen?: boolean
  tab_size?: number
}

export type EditorOptions = {
  profile?: string
  placeholder?: string | null
  readonly?: boolean
  disabled?: boolean
  minHeight?: string
  toolbar?: string[]
  headings?: number[]
  fontSizes?: Record<string, string>
  links?: { schemes?: string[]; allow_relative?: boolean }
  images?: {
    schemes?: string[]
    alignments?: string[]
    resize?: { enabled?: boolean; min?: number; max?: number; step?: number }
  }
  tables?: {
    enabled?: boolean
    horizontal_alignments?: string[]
    vertical_alignments?: string[]
    scopes?: string[]
    max_span?: number
    palette?: string[]
  }
  codeView?: CodeViewOptions
  theme?: Record<string, string>
}

export type SourceDiagnostic = {
  message: string
  severity: 'error' | 'warning'
  from?: number
  to?: number
}

export type CodeViewAdapter = {
  element: HTMLElement
  getValue(): string
  setValue(value: string): void
  focus(): void
  setDiagnostics(diagnostics: SourceDiagnostic[]): void
  format?(): void
  destroy(): void
}

export type CodeViewFactory = (
  parent: HTMLElement,
  value: string,
  options: CodeViewOptions,
  onChange: (value: string) => void,
) => CodeViewAdapter

export type PublicEditor = {
  getHTML(): string
  setHTML(html: string): void
  focus(): void
  setReadOnly(readonly: boolean): void
  destroy(): void
}
