import XLSX from "xlsx";
import path from "path";

const workbook = XLSX.readFile(
  path.join(process.cwd(), "data", "papers.xlsx")
);

const papers = XLSX.utils.sheet_to_json<any>(
  workbook.Sheets["papers"],
  { defval: null }
);

console.log("Sample author strings:\n");

for (let i = 0; i < 10; i++) {
  console.log(papers[i].authors);
}