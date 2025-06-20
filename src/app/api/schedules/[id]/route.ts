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

// 特定のIDのスケジュールを取得
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  let schedules = [];
  try {
    const data = await readFile(filePath, 'utf8');
    schedules = JSON.parse(data);
    if (!Array.isArray(schedules)) schedules = [];
  } catch {
    schedules = [];
  }
  const schedule = schedules.find((s: any) => s.id === id);
  if (schedule) {
    return NextResponse.json(schedule);
  } else {
    return NextResponse.json({ message: 'Schedule not found' }, { status: 404 });
  }
}

// 特定のIDのスケジュールにエントリを追加 (PATCH)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const newEntry = await request.json();
  let schedules = [];
  try {
    const data = await readFile(filePath, 'utf8');
    schedules = JSON.parse(data);
    if (!Array.isArray(schedules)) schedules = [];
  } catch {
    schedules = [];
  }
  const scheduleIndex = schedules.findIndex((s: any) => s.id === id);
  if (scheduleIndex === -1) {
    return NextResponse.json({ message: 'Schedule not found' }, { status: 404 });
  }
  schedules[scheduleIndex].entries.push(newEntry);
  await writeFile(filePath, JSON.stringify(schedules, null, 2), 'utf8');
  return NextResponse.json({ message: 'Entry added' }, { status: 200 });
}
