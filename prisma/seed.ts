import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import fs from 'fs';
import csv from 'csv-parser';

config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const results: any[] = [];
  console.log('Reading papers.csv...');


    fs.createReadStream('./papers.csv')
    .pipe(csv())
    .on('data', (data: any) => results.push(data))
    .on('end', async () => {
      console.log(`Found ${results.length} papers. Starting database insertion...`);

      for (const row of results) {
        try {
          const safeSlug = row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

          await prisma.paper.create({
            data: {
              title: row.title,
              slug: safeSlug,
              arxivId: row.arxiv_id || null,
            },
          });
          console.log(`✅ Inserted: ${row.title}`);
        } catch (error: any) {
          console.error(`❌ Failed to insert ${row.title}: ${error.message}`);
        }
      }
      await prisma.$disconnect();
    });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});