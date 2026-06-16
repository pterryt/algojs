import {
  distance_data, location_data, packages_data, get_location_by_index
} from './data_importer.js';

import {time_to_minutes, minutes_to_time} from './helpers.js';

const PackageStatus = {
  AT_THE_HUB: "AT_THE_HUB", EN_ROUTE: "EN_ROUTE", DELIVERED: "DELIVERED"
};

const DeliveryConstraintType = {
  NO_CONSTRAINT: 0, SPECIFIED_TRUCK: 1, GROUPED_DELIVERY: 2, DELAYED: 3
};

export class DeliveryConstraint {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }
}

export class Location {
  constructor(index, name, address, zip) {
    this.index = index;
    this.name = name;
    this.address = address;
    this.zip = zip;
  }

  static from_address(address) {
    return new Location(location_data[address].index,
        location_data[address].name, location_data[address].address,
        location_data[address].zip)
  }

  distance_from_hub() {
    return this.distance(Location.from_address("4001 South 700 East"));
  }

  distance(target_location) {
    if (this.address === target_location.address) {
      return 0.0;
    }
    const currentIndex = location_data[this.address]?.index;
    const targetIndex = location_data[target_location.address]?.index;

    if (currentIndex === undefined || targetIndex === undefined) {
      throw new Error("Location data not found for one or both locations");
    }

    return currentIndex > targetIndex
        ? distance_data[currentIndex][targetIndex]
        : distance_data[targetIndex][currentIndex];
  }
}

export class Package {
  constructor(id, weight, delivery_location, delivery_deadline,
      delivery_constraint) {
    this.id = id;
    this.weight = weight;
    this.delivery_location = delivery_location;
    this.delivery_deadline = delivery_deadline;
    this.delivery_constraint = delivery_constraint;
    this.delivery_status = PackageStatus.AT_THE_HUB;
    this.delivery_time = null;
    this.earliest_departure = null;
  }

  static from_data(id, data) {
    return new Package(id, data.weight, Location.from_address(data.address),
        (() => {
          if (data.deadline === "EOD") {
            return time_to_minutes("23:59");
          }
          return time_to_minutes(data.deadline);
        })(), new DeliveryConstraint(data.constraint_type, data.constraint))
  }

  print_status() {
    const delivery_message = this.delivery_time
        ? `Delivered at ${minutes_to_time(this.delivery_time)}`
        : `Not yet delivered`;

    console.log(
        `Package# ${this.id} | ${this.delivery_location.address} | ${this.delivery_status} | ${delivery_message}`);
  }

  distance_from_hub() {
    return this.delivery_location.distance_from_hub();
  }

  distance(target_package) {
    return this.delivery_location.distance(target_package.delivery_location);
  }

}

export class Driver {
  constructor(id) {
    this.id = id;
    this.inTruck = false;
  }
}

export class Truck {
  constructor(id, current_location, current_time = 0, end_time = 99999) {
    this.id = id;
    this.driver = null;
    this.load_capacity = 16
    this.speed = 18
    this.load = [];
    this.delivered_packages = []
    this.current_location = current_location
    this.current_time = current_time
    this.start_time = current_time
    this.end_time = end_time
    this.accumulated_time = 0
    this.accumulated_miles = 0
  }

  get_max_delay() {
    let max_delay = 0;

    for (const pkg of this.load) {
      if (pkg.delivery_constraint?.type === DeliveryConstraintType.DELAYED
          && pkg.delivery_constraint.value != null) {
        max_delay = Math.max(max_delay, pkg.delivery_constraint.value);
      }
    }

    return max_delay;
  }

  get_expected_distance(target_package) {
    if (this.current_location.address === target_package.delivery_location.address) {
      return 0.0;
    }
    const currentIndex = location_data[this.current_location.address]?.index;
    const targetIndex = location_data[target_package.delivery_location.address]?.index;

    if (currentIndex === undefined || targetIndex === undefined) {
      throw new Error("Location data not found for one or both locations");
    }

    return currentIndex > targetIndex
        ? distance_data[currentIndex][targetIndex]
        : distance_data[targetIndex][currentIndex];
  }

  get_expected_delivery_time(target_package) {
    const distance = this.get_expected_distance(target_package);
    return (distance / this.speed) * 60;
  }

  deliver_next_scheduled_package() {
    if (this.load.length === 0) {
      return;
    }

    const next_package = this.load.shift();
    const target_loc = next_package.delivery_location;

    if (target_loc.address !== this.current_location.address) {
      this.accumulated_time += this.get_expected_delivery_time(next_package)
      this.accumulated_miles += this.get_expected_distance(next_package);
    }

    next_package.delivery_time = this.current_time;
    next_package.delivery_status = PackageStatus.DELIVERED;
    this.delivered_packages.push(next_package);
    this.current_location = next_package.delivery_location;
    this.current_time = this.accumulated_time + this.start_time;
  }

  deliver_all() {
    if (!this.load.length) {
      return;
    }

    for (const pkg of this.load) {
      pkg.status = PackageStatus.EN_ROUTE;
    }

    while (this.load.length > 0) {
      const np = this.load[0];
      let we_got_time = this.get_expected_delivery_time(np) + this.current_time
          <= this.end_time;
      if (we_got_time) {
        this.deliver_next_scheduled_package();
      } else {
        return;
      }
    }
  }
}

export class DeliveryManager {

  constructor(truck_count, driver_count, init_time, packages) {
    this.packages = packages
    this.package_count = packages.length
    this.init_time = init_time
    this.current_time = init_time
    this.accumulated_miles = 0
    this.available_trucks = []
    this.available_drivers = []
    this.ready_trucks = []
  }

  get_next_available_truck() {
    return this.available_trucks.reduce(
        (min, t) => t.start_time < min.start_time ? t : min);
  }

  load_trucks() {
    for (const truck of this.available_trucks) {
      while (truck.load.length < truck.load_capacity && this.packages.length
      > 0) {
        truck.load.push(this.packages.shift());
      }
    }
  }

  init_deliveries() {

  }

  run_deliveries() {
  }

  print_results() {
    for (const pkg of this.packages) {
      pkg.print_status();
    }
  }
}

export class PackageSorter {
  /**
   * @param packages array of Package
   * @param truck_count number of trucks available to assign into
   */
  constructor(packages, truck_count = 2) {
    this.packages = packages;
    this.truck_count = truck_count;
  }

  /**
   * Returns an array of arrays: trucks[i] = ordered list of packages for truck i.
   */
  sort_packages() {
    const truckBuckets = Array.from({length: this.truck_count}, () => []);
    const unassigned = [...this.packages];

    this._assign_grouped_packages(unassigned, truckBuckets);
    this._assign_specified_truck_packages(unassigned, truckBuckets);
    this._apply_delay_constraints(this.packages);
    this._distribute_remaining(unassigned, truckBuckets);

    for (let i = 0; i < truckBuckets.length; i++) {
      truckBuckets[i] = this._order_by_nearest_neighbor(truckBuckets[i]);
    }

    return truckBuckets;
  }

  // GROUPED_DELIVERY: constraint is a list of other package ids that must
  // ship on the same truck as this one. Merge each group, then place the
  // whole group on a truck (preferring one a member already specifies).
  _assign_grouped_packages(unassigned, truckBuckets) {
    const byId = new Map(this.packages.map(p => [p.id, p]));
    const visited = new Set();

    for (const pkg of this.packages) {
      if (pkg.delivery_constraint?.type !== DeliveryConstraintType.GROUPED_DELIVERY) {
        continue;
      }
      if (visited.has(pkg.id)) {
        continue;
      }

      const groupIds = new Set([pkg.id, ...(pkg.delivery_constraint.value || [])]);
      const groupPackages = [...groupIds].map(id => byId.get(id)).filter(Boolean);
      groupPackages.forEach(p => visited.add(p.id));

      const specified = groupPackages.find(
          p => p.delivery_constraint?.type === DeliveryConstraintType.SPECIFIED_TRUCK);
      const truckIndex = specified
          ? specified.delivery_constraint.value - 1
          : 0;

      truckBuckets[truckIndex].push(...groupPackages);
      for (const p of groupPackages) {
        const idx = unassigned.indexOf(p);
        if (idx !== -1) unassigned.splice(idx, 1);
      }
    }
  }

  // SPECIFIED_TRUCK: constraint value is a 1-indexed truck id.
  _assign_specified_truck_packages(unassigned, truckBuckets) {
    for (let i = unassigned.length - 1; i >= 0; i--) {
      const pkg = unassigned[i];
      if (pkg.delivery_constraint?.type === DeliveryConstraintType.SPECIFIED_TRUCK) {
        const truckIndex = pkg.delivery_constraint.value - 1;
        truckBuckets[truckIndex].push(pkg);
        unassigned.splice(i, 1);
      }
    }
  }

  // DELAYED: constraint value is minutes-of-day the package becomes available.
  // Stamp it onto the package so the truck/manager layer can respect it as
  // an earliest departure / earliest delivery time.
  _apply_delay_constraints(packages) {
    for (const pkg of packages) {
      if (pkg.delivery_constraint?.type === DeliveryConstraintType.DELAYED) {
        pkg.earliest_departure = pkg.delivery_constraint.value;
      }
    }
  }

  // Everything left with no constraint: round-robin onto whichever truck
  // currently has the fewest packages, to balance load before ordering.
  _distribute_remaining(unassigned, truckBuckets) {
    for (const pkg of unassigned) {
      const target = truckBuckets.reduce(
          (min, bucket) => bucket.length < min.length ? bucket : min);
      target.push(pkg);
    }
  }

  // Greedy nearest-neighbor ordering within a single truck's load, to keep
  // accumulated distance down. Starts from the hub.
  _order_by_nearest_neighbor(packages) {
    if (packages.length <= 1) {
      return packages;
    }

    const remaining = [...packages];
    const ordered = [];
    let currentAddress = "4001 South 700 East";

    while (remaining.length > 0) {
      let bestIdx = 0;
      let bestDist = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidateLocation = remaining[i].delivery_location;
        const dist = Location.from_address(currentAddress).distance(candidateLocation);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }

      const [next] = remaining.splice(bestIdx, 1);
      ordered.push(next);
      currentAddress = next.delivery_location.address;
    }

    return ordered;
  }
}

