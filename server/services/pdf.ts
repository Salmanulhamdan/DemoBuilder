import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs/promises";
import path from "node:path";

export interface WebsitePdfInput {
  domain: string;
  title: string;
  description: string;
  content: string;
  knowledgeBase: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureOutputDir(): Promise<string> {
  const outputDir = path.join(process.cwd(), "server", "files");
  await fs.mkdir(outputDir, { recursive: true });
  return outputDir;
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? current + " " + word : word;
    if (candidate.length > maxCharsPerLine) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateWebsitePdf(input: WebsitePdfInput): Promise<string> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  const addPageWithHeader = (titleText: string) => {
    const page = doc.addPage([pageWidth, pageHeight]);
    page.drawText(titleText, {
      x: margin,
      y: pageHeight - margin,
      size: 18,
      font,
      color: rgb(0.15, 0.15, 0.2),
    });
    return page;
  };

  let page = addPageWithHeader(`${input.title} — Website Knowledge Base`);
  let cursorY = page.getHeight() - margin - 30;

  const drawSection = (heading: string, body: string, options?: { maxLines?: number }) => {
    const headingSize = 14;
    const bodySize = 11;
    const lineHeight = 14;
    const maxLines = options?.maxLines ?? 10000;

    // Heading
    page.drawText(heading, { x: margin, y: cursorY, size: headingSize, font, color: rgb(0.1, 0.1, 0.4) });
    cursorY -= headingSize + 6;

    // Body (simple character-based wrapping)
    const approxCharsPerLine = Math.floor((contentWidth / (bodySize * 0.55)));
    const lines = wrapText(body, approxCharsPerLine);
    let printed = 0;
    for (const line of lines) {
      if (printed >= maxLines) break;
      if (cursorY < margin + lineHeight) {
        page = addPageWithHeader(`${input.title} — Website Knowledge Base`);
        cursorY = page.getHeight() - margin - 10;
      }
      page.drawText(line, { x: margin, y: cursorY, size: bodySize, font, color: rgb(0, 0, 0) });
      cursorY -= lineHeight;
      printed++;
    }
    cursorY -= 10;
  };

  drawSection("Domain", input.domain);
  drawSection("Description", input.description);
  drawSection("Content (excerpt)", input.content);
  drawSection("Knowledge Base", input.knowledgeBase);

  const pdfBytes = await doc.save();

  const dir = await ensureOutputDir();
  const fileBase = `knowledge_${slugify(input.domain)}_${Date.now()}`;
  const filePath = path.join(dir, `${fileBase}.pdf`);
  await fs.writeFile(filePath, pdfBytes);
  return filePath;
}


