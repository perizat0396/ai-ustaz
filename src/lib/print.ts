/**
 * Печать одного блока страницы как документа: открывает отдельное светлое окно
 * только с этим блоком (без интерфейса сайта) и вызывает диалог печати —
 * там же можно выбрать «Сохранить как PDF».
 */
export function printElement(el: HTMLElement, title: string): void {
  const w = window.open('', '_blank')
  if (!w) {
    alert('Браузер заблокировал окно печати. Разрешите всплывающие окна для этого сайта.')
    return
  }

  // Переносим стили страницы (Tailwind) — в новом окне без класса "dark" будет светлая тема.
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((n) => n.outerHTML)
    .join('\n')

  const safeTitle = title.replace(/[<>&]/g, '')
  w.document.open()
  w.document.write(`<!doctype html>
<html lang="${document.documentElement.lang || 'ru'}">
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
${styles}
<style>
  @page { size: A4; margin: 12mm; }
  html, body { background: #fff !important; color: #000; margin: 0; }
  body { padding: 8px; font-family: 'Times New Roman', Times, serif; }
  .card { box-shadow: none !important; border: 0 !important; background: #fff !important; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
</head>
<body>${el.outerHTML}</body>
</html>`)
  w.document.close()

  let printed = false
  const doPrint = () => {
    if (printed) return
    printed = true
    w.focus()
    w.print()
  }
  w.onload = () => setTimeout(doPrint, 300)
  setTimeout(doPrint, 1500)
}
