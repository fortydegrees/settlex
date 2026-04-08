import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = "force-dynamic";

const SCENARIOS_DIR = path.join(process.cwd(), 'app', 'catana', 'scenarios');

const isScenarioState = (value) =>
  Boolean(
    value &&
      typeof value === 'object' &&
      value.core &&
      Array.isArray(value.core.players)
  );

const extractScenarioState = (value) => {
  if (isScenarioState(value?.state)) return value.state;
  if (isScenarioState(value?.G)) return value.G;
  if (isScenarioState(value)) return value;
  return null;
};

// Ensure directory exists
if (!fs.existsSync(SCENARIOS_DIR)) {
  fs.mkdirSync(SCENARIOS_DIR, { recursive: true });
}

export async function GET() {
  try {
    const files = fs.readdirSync(SCENARIOS_DIR);
    const scenarios = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(SCENARIOS_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        try {
            const data = JSON.parse(content);
            const state = extractScenarioState(data);
            if (!state) {
                return null;
            }
            return {
                id: file, // Use filename as ID
                name: file.replace('.json', ''),
                data: state
            };
        } catch (e) {
            console.error(`Error parsing scenario ${file}`, e);
            return null;
        }
      })
      .filter(Boolean); // Remove nulls

    return NextResponse.json({ scenarios });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list scenarios' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, data } = body;
    const state = extractScenarioState(data);

    if (!name || !state) {
      return NextResponse.json({ error: 'Name and scenario state are required' }, { status: 400 });
    }

    // Sanitize filename roughly
    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '-');
    const filename = `${safeName}.json`;
    const filePath = path.join(SCENARIOS_DIR, filename);

    fs.writeFileSync(filePath, JSON.stringify({ state }, null, 2));

    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save scenario' }, { status: 500 });
  }
}
