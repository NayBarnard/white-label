export type PdfReportSection = { title: string; lines: string[] };

export async function downloadPdfReport(
  filename: string,
  brand: string,
  reportTitle: string,
  sections: PdfReportSection[],
  disclosure: string,
) {
  const escapePdfText = (text: string) =>
    text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)").replace(/[^\x20-\x7E]/g, "-").slice(0, 180);

  const commands: string[] = ["0.08 0.12 0.20 rg"];
  let y = 780;
  const text = (value: string, size: number, bold = false) => {
    commands.push(`BT /F${bold ? 2 : 1} ${size} Tf 48 ${y} Td (${escapePdfText(value)}) Tj ET`);
    y -= size * 1.45;
  };
  text(brand, 12, true);
  y -= 10;
  text(reportTitle, 20, true);
  y -= 4;
  text(`Prepared ${new Date().toLocaleDateString("en-ZA")}`, 9);
  y -= 18;
  for (const section of sections) {
    text(section.title, 12, true);
    y -= 3;
    for (const line of section.lines) {
      const wrapped = line.match(/.{1,88}(?:\s|$)/g) ?? [line];
      for (const part of wrapped) text(part.trim(), 9);
    }
    y -= 12;
  }
  y = 34;
  text(disclosure, 7);
  text("1 / 1", 7);

  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [4 0 R] /Count 1 >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
