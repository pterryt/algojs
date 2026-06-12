import fs from 'fs';

export const distance_data = JSON.parse(fs.readFileSync('json_data/distances.json', 'utf8'));
export const location_data = JSON.parse(fs.readFileSync('json_data/locations.json', 'utf8'));
export const packages_data = JSON.parse(fs.readFileSync('json_data/packages.json', 'utf8'));

// for (const distance in distance_data) {
//   console.log(distance);
// }

for (const row of distance_data) {
  console.log(row);
}

console.log('----'
)

for (const row in distance_data) {
  console.log(row);
}