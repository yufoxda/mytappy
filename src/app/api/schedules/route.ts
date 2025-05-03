import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';

const filePath = path.join(process.cwd(), 'public', 'data.json');

export async function GET() {
  try {
    const data = await readFile(filePath, 'utf8');
    const schedules = JSON.parse(data);
    return NextResponse.json(Array.isArray(schedules) ? schedules : []);
  } catch {
    // ファイルがない場合は空配列
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const newSchedule = await req.json();
  let schedules = [];
  try {
    const data = await readFile(filePath, 'utf8');
    schedules = JSON.parse(data);
    if (!Array.isArray(schedules)) schedules = [];
  } catch {
    schedules = [];
  }
  schedules.push(newSchedule);
  await writeFile(filePath, JSON.stringify(schedules, null, 2), 'utf8');
  return NextResponse.json({ status: 'ok' });
}