// utils/safeHtml.ts
// Notification texts come from the backend as small HTML snippets (<b>, <br>) that embed
// user-controlled values (customer names, company names, ...). Rendering them with v-html
// directly is a stored-XSS sink, so everything is decoded, escaped, and only <b>/<br> without
// attributes are allowed back in.
export function safeNotificationHtml(input: unknown): string {
  const decoded = String(input ?? '')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;|&#39;/gi, "'")
    .replace(/&amp;/gi, '&')

  const escaped = decoded
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  return escaped
    .replace(/&lt;(\/?)(b|strong)&gt;/gi, '<$1$2>')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
    .replace(/&lt;span(?:\s+class=(?:&quot;|&#39;)([a-z0-9\s\-_:]+)(?:&quot;|&#39;))?&gt;/gi, (_m, cls) =>
      cls ? `<span class="${cls}">` : '<span>'
    )
    .replace(/&lt;\/span&gt;/gi, '</span>')
}