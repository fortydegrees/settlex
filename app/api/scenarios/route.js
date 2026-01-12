import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SCENARIOS_DIR = path.join(process.cwd(), 'app', 'catana', 'scenarios');

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
            return {
                id: file, // Use filename as ID
                name: file.replace('.json', ''),
                data: data
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

    if (!name || !data) {
      return NextResponse.json({ error: 'Name and data are required' }, { status: 400 });
    }

    // Sanitize filename roughly
    const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '-');
    const filename = `${safeName}.json`;
    const filePath = path.join(SCENARIOS_DIR, filename);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true, filename });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save scenario' }, { status: 500 });
  }
}
