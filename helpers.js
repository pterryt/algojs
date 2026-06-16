import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function time_to_minutes(time_str) {
  time_str = time_str.trim();

  let is_pm = time_str.toLowerCase().includes("pm");
  let is_am = time_str.toLowerCase().includes("am");

  time_str = time_str.replace(/am|pm/i, "").trim();

  let [hours, minutes] = time_str.split(":").map(Number);

  if (is_am || is_pm) {
    if (hours === 12) {
      hours = is_am ? 0 : 12;
    } else if (is_pm) {
      hours += 12;
    }
  }

  return hours * 60 + minutes;
}

export function minutes_to_time(total_minutes) {
  total_minutes = Math.round(total_minutes);
  const hours = Math.floor(total_minutes / 60);
  const minutes = total_minutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

export function find_project_root(dir = __dirname) {

  if (fs.existsSync(path.join(dir, 'package.json'))) return dir;

  const parent = path.dirname(dir);
  if (parent === dir) throw new Error('Could not find project root');
  return find_project_root(parent);
}

