import * as types from "./types.js";
import {packages_data} from "./data_importer.js";

const package_list = (() => {
  const packages = [];
  for (const [key, value] of Object.entries(packages_data)) {
    const pkg = types.Package.from_data(key, value);
    packages.push(pkg)
  }
  return packages;
})()

export default package_list;
