/* --------------------------------------------------------------------------
 *  Извлечение текста из загруженных файлов прямо в браузере.
 *  Модуль тяжёлый (pdf.js / mammoth) — импортируется динамически из
 *  SourcePicker, поэтому попадает в отдельный чанк.
 * ----------------------------------------------------------------------- */
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const MAX_CHARS = 12_000

export async function extractPdf(file: File): Promise<string> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({ data })
  const doc = await loadingTask.promise
  const parts: string[] = []
  const pages = Math.min(doc.numPages, 40)
  for (let p = 1; p <= pages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const text = content.items
      .map((it) => ('str' in it ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (text) parts.push(text)
    if (parts.join('\n').length > MAX_CHARS) break
  }
  await loadingTask.destroy()
  return parts.join('\n\n').slice(0, MAX_CHARS)
}

export async function extractDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const { value } = await mammoth.extractRawText({ arrayBuffer })
  return value.replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_CHARS)
}
