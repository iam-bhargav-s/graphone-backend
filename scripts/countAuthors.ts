import XLSX from "xlsx";
import path from "path";

const workbook = XLSX.readFile(
  path.join(process.cwd(), "data", "papers.xlsx")
);

const papers = XLSX.utils.sheet_to_json<any>(
  workbook.Sheets["papers"],
  { defval: null }
);

const authors = new Set<string>();

for (const paper of papers) {
  if (!paper.authors) continue;

  paper.authors
    .split(";")
    .map((a: string) => a.trim())
    .filter(Boolean)
    .forEach((a: string) => authors.add(a));
}

console.log("Unique authors:", authors.size);

console.log();

console.log("First 20:");

console.log([...authors].slice(0, 20));