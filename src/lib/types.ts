export interface AudienceListItem {
  id: number
  name: string
  columns: string[]
  createdAt: string
  rowCount: number
}

export interface AudienceRow {
  id: number
  [key: string]: string | number
}

export interface AudienceFull {
  id: number
  name: string
  columns: string[]
  rows: AudienceRow[]
  createdAt: string
}

export interface TemplateComponent {
  type: string
  text?: string
  buttons?: Array<{ type: string; text: string }>
}

export interface Template {
  name: string
  status: string
  language: string
  category?: string
  components: TemplateComponent[]
}

export interface TemplateMeta {
  name: string
  category?: string
  body?: string
  headerFormat?: string
  mediaId?: string | null
  buttons?: Array<{ type: string; text: string; phone_number?: string; url?: string }>
}

export interface MessageItem {
  id: number
  waId: string
  direction: 'in' | 'out'
  text: string | null
  type: string
  timestamp: number | null
  metadata?: string
}

export interface Conversation {
  contact: string
  contactName: string
  photoUrl?: string
  messages: MessageItem[]
  lastAt: number
}

export interface Settings {
  meta_token?: string
  waba_id?: string
  phone_id?: string
}

export interface BulkSendResult {
  phone: string
  status: 'sent' | 'failed' | 'skipped'
  error?: string
}
