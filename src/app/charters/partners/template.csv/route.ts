import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-static";

export async function GET() {
  const csv = await readFile(join(process.cwd(), "data/charters/templates/charter-partner-pilot-template.csv"));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=charter-partner-pilot-template.csv",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
