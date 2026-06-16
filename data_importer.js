import fs from 'fs';
import path from 'path';
import {find_project_root} from './helpers.js';

const project_root = find_project_root();

export const distance_data = JSON.parse(
    fs.readFileSync(path.join(project_root, 'json_data/distances.json'),
        'utf8'));
export const location_data = JSON.parse(
    fs.readFileSync(path.join(project_root, 'json_data/locations.json'),
        'utf8'));

export function get_location_by_index(index) {
    return Object.values(location_data).find(loc => loc.index === index);
}

export const packages_data = JSON.parse(
    fs.readFileSync(path.join(project_root, 'json_data/packages.json'),
        'utf8'));



