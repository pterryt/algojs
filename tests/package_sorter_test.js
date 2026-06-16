import package_list from '../package_list.js'
import * as types from '../types.js'
import {
  distance_data, location_data, packages_data, get_location_by_index
} from '../data_importer.js';

const ps = new types.PackageSorter(package_list)
package_list.forEach(p => {
  if (!location_data[p.delivery_location.address]) {
    console.log("BAD ADDRESS:", JSON.stringify(p.delivery_location.address), "pkg id", p.id);
  }
});
const sorted = ps.sort_packages();

console.log(ps.packages.slice(0,16))
console.log("---------------------")
console.log(sorted)