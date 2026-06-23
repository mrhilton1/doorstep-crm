#!/usr/bin/env node
import 'dotenv/config';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SOURCE_DATASET = 'ACSST5Y2024.S1901';
const DEFAULT_SURVEY_YEAR = 2024;

const SUMMARY_COLUMNS = {
  households_total: 'S1901_C01_001E',
  households_total_moe: 'S1901_C01_001M',
  household_median_income: 'S1901_C01_012E',
  household_median_income_moe: 'S1901_C01_012M',
  household_mean_income: 'S1901_C01_013E',
  household_mean_income_moe: 'S1901_C01_013M',
  families_total: 'S1901_C02_001E',
  families_total_moe: 'S1901_C02_001M',
  family_median_income: 'S1901_C02_012E',
  family_median_income_moe: 'S1901_C02_012M',
  family_mean_income: 'S1901_C02_013E',
  family_mean_income_moe: 'S1901_C02_013M',
};

const DISTRIBUTION_COLUMNS = {
  under_10000_pct: 'S1901_C01_002E',
  from_10000_to_14999_pct: 'S1901_C01_003E',
  from_15000_to_24999_pct: 'S1901_C01_004E',
  from_25000_to_34999_pct: 'S1901_C01_005E',
  from_35000_to_49999_pct: 'S1901_C01_006E',
  from_50000_to_74999_pct: 'S1901_C01_007E',
  from_75000_to_99999_pct: 'S1901_C01_008E',
  from_100000_to_149999_pct: 'S1901_C01_009E',
  from_150000_to_199999_pct: 'S1901_C01_010E',
  from_200000_plus_pct: 'S1901_C01_011E',
};

function parseArgs(argv) {
  const args = {
    apply: false,
    batchSize: 500,
    dataPath: '',
    limit: null,
    sourceDataset: DEFAULT_SOURCE_DATASET,
    surveyYear: DEFAULT_SURVEY_YEAR,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') {
      args.apply = true;
    } else if (arg === '--data') {
      args.dataPath = argv[++i] ?? '';
    } else if (arg === '--batch-size') {
      args.batchSize = Number(argv[++i]);
    } else if (arg === '--limit') {
      args.limit = Number(argv[++i]);
    } else if (arg === '--source-dataset') {
      args.sourceDataset = argv[++i] ?? DEFAULT_SOURCE_DATASET;
    } else if (arg === '--survey-year') {
      args.surveyYear = Number(argv[++i]);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.dataPath) {
    throw new Error('Missing required --data path');
  }

  if (!Number.isInteger(args.batchSize) || args.batchSize < 1) {
    throw new Error('--batch-size must be a positive integer');
  }

  if (args.limit !== null && (!Number.isInteger(args.limit) || args.limit < 1)) {
    throw new Error('--limit must be a positive integer');
  }

  if (!Number.isInteger(args.surveyYear) || args.surveyYear < 1900) {
    throw new Error('--survey-year must be a four-digit year');
  }

  return args;
}

function printHelp() {
  console.log(`
Import ACS S1901 ZIP income demographics into doorstep.zip_income_demographics.

Dry run:
  node scripts/import-acs-s1901-zip-demographics.mjs --data /path/to/ACSST5Y2024.S1901-Data.csv

Apply with a service role key in the local shell:
  SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-acs-s1901-zip-demographics.mjs --data /path/to/ACSST5Y2024.S1901-Data.csv --apply

Options:
  --data <path>              Required ACS S1901 data CSV path.
  --apply                    Upsert rows into Supabase. Omit for dry-run.
  --batch-size <n>           Upsert batch size. Default: 500.
  --limit <n>                Process only the first n data rows.
  --source-dataset <value>   Default: ACSST5Y2024.S1901.
  --survey-year <year>       Default: 2024.
`);
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function normalizeHeader(value) {
  return value.replace(/^\uFEFF/, '').trim();
}

function nullish(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed === '' || trimmed === 'N' || trimmed === '(X)' || trimmed === '-' || trimmed === '**';
}

function toInteger(value) {
  if (nullish(value)) return null;
  const normalized = String(value).replace(/[$,+]/g, '').trim();
  if (!/^-?\d+(\.0)?$/.test(normalized)) return null;
  return Number.parseInt(normalized, 10);
}

function toNumber(value) {
  if (nullish(value)) return null;
  const normalized = String(value).replace(/[$,+]/g, '').trim();
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

function rowFromValues(headers, values) {
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index] ?? '';
  });
  return row;
}

function mapRow(row, args) {
  const zipMatch = String(row.NAME ?? '').match(/\b(\d{5})\b/);
  if (!zipMatch) {
    return null;
  }

  const householdIncomeDistribution = Object.fromEntries(
    Object.entries(DISTRIBUTION_COLUMNS).map(([key, column]) => [key, toNumber(row[column])]),
  );

  const mapped = {
    zip_code: zipMatch[1],
    geo_id: String(row.GEO_ID ?? '').trim(),
    geographic_name: String(row.NAME ?? '').trim(),
    source_dataset: args.sourceDataset,
    survey_year: args.surveyYear,
    household_income_distribution: householdIncomeDistribution,
    raw_row: row,
  };

  for (const [field, column] of Object.entries(SUMMARY_COLUMNS)) {
    mapped[field] = toInteger(row[column]);
  }

  return mapped;
}

async function flushBatch(client, batch, counters) {
  if (batch.length === 0) return;

  const { error } = await client
    .schema('doorstep')
    .from('zip_income_demographics')
    .upsert(batch, { onConflict: 'source_dataset,zip_code' });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  counters.upserted += batch.length;
  batch.length = 0;
}

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Never put this value in frontend env files or commits.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const client = args.apply ? createSupabaseClient() : null;
  const counters = {
    read: 0,
    mapped: 0,
    skippedNoZip: 0,
    upserted: 0,
  };
  const sample = [];
  const batch = [];

  const lineReader = createInterface({
    input: createReadStream(args.dataPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let headers = null;
  let lineNumber = 0;

  for await (const line of lineReader) {
    lineNumber += 1;

    if (lineNumber === 1) {
      headers = parseCsvLine(line).map(normalizeHeader);
      continue;
    }

    if (lineNumber === 2) {
      continue;
    }

    if (!headers) {
      throw new Error('CSV header row was not found');
    }

    if (args.limit !== null && counters.read >= args.limit) {
      break;
    }

    counters.read += 1;
    const row = rowFromValues(headers, parseCsvLine(line));
    const mapped = mapRow(row, args);

    if (!mapped) {
      counters.skippedNoZip += 1;
      continue;
    }

    counters.mapped += 1;

    if (sample.length < 3) {
      sample.push({
        zip_code: mapped.zip_code,
        household_median_income: mapped.household_median_income,
        household_mean_income: mapped.household_mean_income,
        family_median_income: mapped.family_median_income,
        distribution: mapped.household_income_distribution,
      });
    }

    if (args.apply && client) {
      batch.push(mapped);
      if (batch.length >= args.batchSize) {
        await flushBatch(client, batch, counters);
      }
    }
  }

  if (args.apply && client) {
    await flushBatch(client, batch, counters);
  }

  console.log(JSON.stringify({
    mode: args.apply ? 'apply' : 'dry-run',
    sourceDataset: args.sourceDataset,
    surveyYear: args.surveyYear,
    counters,
    sample,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
