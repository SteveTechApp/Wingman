/** Self-contained browser code shipped only inside the exported document. */
export function proposalPrintPaginationHtml() {
  return `<style>
    .wm-schedule-print-page { display: none; }
    @media print {
      .wm-schedule-print-page { display: block; width: 178mm; break-before: page; page-break-before: always; }
      .wm-schedule-print-page table { width: 100%; margin-bottom: 0; table-layout: fixed; }
      .wm-schedule-print-page thead, .wm-schedule-print-page tfoot { break-inside: avoid; }
      .wm-schedule-print-page tr { break-inside: avoid; }
    }
  </style><script>
  (() => {
    const hidden = new Map();
    const pages = [];
    const restore = () => {
      pages.splice(0).forEach(page => page.remove());
      hidden.forEach((display, element) => { element.style.display = display; });
      hidden.clear();
    };
    const hide = element => { hidden.set(element, element.style.display); element.style.display = 'none'; };
    const paginate = () => {
      restore();
      for (const original of document.querySelectorAll('table[data-priced-schedule]')) {
        const sourceRows = [...original.tBodies[0].rows];
        if (!sourceRows.length) continue;
        const lead = [];
        let sibling = original.previousElementSibling;
        while (sibling && /^(P|H2|H3)$/.test(sibling.tagName)) {
          lead.unshift(sibling);
          if (/^H[23]$/.test(sibling.tagName)) break;
          sibling = sibling.previousElementSibling;
        }
        const anchor = lead[0] || original;
        const title = lead.find(element => /^H[23]$/.test(element.tagName))?.textContent || 'Schedule';
        const measure = document.createElement('section');
        measure.style.cssText = 'position:absolute;left:-100000px;top:0;width:178mm;visibility:hidden;display:block';
        original.parentNode.append(measure);
        const ruler = document.createElement('div');
        ruler.style.height = '255mm';
        measure.append(ruler);
        const available = ruler.getBoundingClientRect().height - 2;
        ruler.remove();
        const widthProbe = original.cloneNode(true);
        widthProbe.style.width = '100%';
        measure.append(widthProbe);
        const widths = [...widthProbe.tHead.rows[0].cells].map(cell => cell.getBoundingClientRect().width);
        widthProbe.remove();
        let offset = 0;
        while (offset < sourceRows.length) {
          const chunk = document.createElement('section');
          chunk.className = 'wm-schedule-print-page';
          chunk.style.display = 'block';
          if (offset === 0) lead.forEach(element => chunk.append(element.cloneNode(true)));
          else { const heading = document.createElement('h3'); heading.textContent = title + ' — continued'; chunk.append(heading); }
          const table = original.cloneNode(true);
          table.removeAttribute('data-priced-schedule');
          table.style.cssText = 'width:100%;table-layout:fixed;margin-bottom:0';
          const group = document.createElement('colgroup');
          widths.forEach(width => { const col = document.createElement('col'); col.style.width = width + 'px'; group.append(col); });
          table.prepend(group);
          table.tBodies[0].replaceChildren();
          chunk.append(table);
          measure.append(chunk);
          const start = offset;
          while (offset < sourceRows.length) {
            const row = sourceRows[offset].cloneNode(true);
            table.tBodies[0].append(row);
            table.tFoot.rows[0].cells[0].textContent = offset === sourceRows.length - 1
              ? original.tFoot.rows[0].cells[0].textContent : row.dataset.runningFooter;
            if (chunk.getBoundingClientRect().height > available && offset > start) { row.remove(); break; }
            offset += 1;
          }
          const last = table.tBodies[0].rows[table.tBodies[0].rows.length - 1];
          table.tFoot.rows[0].cells[0].textContent = offset === sourceRows.length
            ? original.tFoot.rows[0].cells[0].textContent : last.dataset.runningFooter;
          chunk.remove();
          original.parentNode.insertBefore(chunk, anchor);
          pages.push(chunk);
        }
        measure.remove();
        [...lead, original].forEach(hide);
      }
    };
    addEventListener('beforeprint', paginate);
    addEventListener('afterprint', restore);
  })();
  </script>`;
}
