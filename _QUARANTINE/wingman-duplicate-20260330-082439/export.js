export function generateProposalHtml(context, proposalText, bom, validation) {
  const bomRows = bom.map(row => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`).join("");
  const validationRows = validation.map(v => `<li><strong>${v.title}</strong>: ${v.detail}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Wingman Proposal Export</title>
<style>
body{font-family:Arial,sans-serif;margin:40px;color:#142033}
h1,h2{color:#17345f}
table{width:100%;border-collapse:collapse;margin-top:16px}
th,td{border:1px solid #c9d6ee;padding:10px;text-align:left}
th{background:#eef4ff}
section{margin-bottom:28px}
ul{padding-left:20px}
.meta{color:#51627c}
</style>
</head>
<body>
<section>
<h1>Wingman Design Proposal</h1>
<div class="meta">Topology: ${context.topology || "AVoIP"} â€¢ Competitor context: ${context.competitor || "Blustream"} â€¢ Room: ${context.roomName || "Primary Room"}</div>
</section>
<section>
<h2>Proposal Narrative</h2>
<p>${proposalText.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>
</section>
<section>
<h2>Validation Notes</h2>
<ul>${validationRows}</ul>
</section>
<section>
<h2>Bill of Materials</h2>
<table>
<thead><tr><th>Item</th><th>Model</th><th>Qty</th></tr></thead>
<tbody>${bomRows}</tbody>
</table>
</section>
</body>
</html>`;
}