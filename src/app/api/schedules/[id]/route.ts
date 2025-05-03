import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';

const filePath = path.join(process.cwd(), 'public', 'data.json');

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const updatedSchedule = await req.json();
  let schedules = [];
  try {
    const data = await readFile(filePath, 'utf8');
    schedules = JSON.parse(data);
    if (!Array.isArray(schedules)) schedules = [];
  } catch {
    schedules = [];
  }
  // idが一致するものを上書き
  const idx = schedules.findIndex((s: any) => s.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  schedules[idx] = updatedSchedule;
  await writeFile(filePath, JSON.stringify(schedules, null, 2), 'utf8');
  return NextResponse.json({ status: 'ok' });
}
