type GuruContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function isSectionHeading(line: string, index: number, lines: string[]) {
  const text = line.replace(/:$/, "").trim();
  if (!text || text.length > 72) return false;
  if (line.endsWith(":")) return true;
  return index === 0 && lines[index + 1] === "" && !/[.!?]$/.test(line);
}

function buildContentBlocks(content: string): GuruContentBlock[] {
  const lines = content.replace(/\r/g, "").replace(/\s+-\s+(?=(?:Is|What|Which|Where|How|Why|Confirm|Check|Use|Ask|Do|Does)\b)/g, "\n- ").split("\n").map((line) => line.trim());
  const blocks: GuruContentBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: "list", items: [...list] });
    list = [];
  };

  lines.forEach((line, index) => {
    if (!line) { flushParagraph(); flushList(); return; }
    const bullet = line.match(/^[-*\u2022]\s+(.+)$/);
    if (bullet) { flushParagraph(); list.push(bullet[1].trim()); return; }
    flushList();
    if (isSectionHeading(line, index, lines)) {
      flushParagraph();
      blocks.push({ type: "heading", text: line.replace(/:$/, "").trim() });
      return;
    }
    paragraph.push(line);
  });
  flushParagraph();
  flushList();
  return blocks.length ? blocks : [{ type: "paragraph", text: content.trim() }];
}

export function guruMessageTone(content: string) {
  const text = content.toLowerCase();
  if (text.includes("checking guru knowledge")) return "loading";
  if (/do not know|do not have a confirmed|not confirmed|needs verification|wrong tx\/rx|before quoting|before customer issue|confirm:/.test(text)) return "caution";
  if (/recommended answer|why this fits|sales use|practical selection rule|use .* with/.test(text)) return "guidance";
  return "standard";
}

export function GuruMessageContent({ content }: { content: string }) {
  const blocks = buildContentBlocks(content);
  if (guruMessageTone(content) === "loading") {
    return <div className="wingman-guru-loading" role="status"><span className="wingman-guru-loading-dot" /><span>Checking local Guru knowledge...</span></div>;
  }
  return (
    <div className="wingman-guru-rich-content">
      {blocks.map((block, index) => {
        if (block.type === "heading") return <h4 key={`heading-${index}-${block.text}`} className="wingman-guru-rich-heading">{block.text}</h4>;
        if (block.type === "list") return <ul key={`list-${index}`} className="wingman-guru-rich-list">{block.items.map((item) => <li key={`${index}-${item}`}>{item}</li>)}</ul>;
        return <p key={`paragraph-${index}-${block.text.slice(0, 24)}`} className="wingman-guru-rich-paragraph">{block.text}</p>;
      })}
    </div>
  );
}
