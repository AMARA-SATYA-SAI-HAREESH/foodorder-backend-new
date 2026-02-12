/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate estimated delivery time
 * @param {number} distance - Distance in km
 * @param {string} vehicleType - Type of vehicle
 * @returns {number} Estimated time in minutes
 */
function calculateEstimatedTime(distance, vehicleType = "BIKE") {
  const averageSpeeds = {
    BIKE: 30, // km/h
    SCOOTER: 25,
    CAR: 20,
    BICYCLE: 15,
  };

  const speed = averageSpeeds[vehicleType] || 25;
  const timeInHours = distance / speed;
  const timeInMinutes = timeInHours * 60;

  // Add buffer for traffic, pickup, etc.
  const buffer = 15;

  return Math.ceil(timeInMinutes + buffer);
}

/**
 * Calculate earnings for a delivery
 * @param {number} distance - Distance in km
 * @param {number} orderAmount - Order total amount
 * @param {string} vehicleType - Type of vehicle
 * @returns {Object} Earnings breakdown
 */
function calculateEarnings(distance, orderAmount, vehicleType = "BIKE") {
  // Base fare based on vehicle type
  const baseFares = {
    BIKE: 30,
    SCOOTER: 35,
    CAR: 50,
    BICYCLE: 25,
  };

  // Per km rate
  const perKmRates = {
    BIKE: 8,
    SCOOTER: 9,
    CAR: 12,
    BICYCLE: 6,
  };

  const baseFare = baseFares[vehicleType] || 30;
  const perKmRate = perKmRates[vehicleType] || 8;

  // Calculate delivery charge
  const deliveryCharge = baseFare + distance * perKmRate;

  // Platform commission (20% of delivery charge)
  const platformCommission = deliveryCharge * 0.2;

  // Driver's earnings
  const driverEarnings = deliveryCharge - platformCommission;

  // Minimum earnings guarantee
  const minimumEarnings = 25;

  return {
    distance: parseFloat(distance.toFixed(2)),
    baseFare,
    perKmRate,
    deliveryCharge: Math.round(deliveryCharge),
    platformCommission: Math.round(platformCommission),
    driverEarnings: Math.max(Math.round(driverEarnings), minimumEarnings),
    estimatedTime: calculateEstimatedTime(distance, vehicleType),
  };
}

/**
 * Optimize route for multiple deliveries
 * @param {Array} deliveries - Array of delivery locations
 * @param {Object} currentLocation - Driver's current location
 * @returns {Array} Optimized route order
 */
function optimizeRoute(deliveries, currentLocation) {
  if (!deliveries || deliveries.length === 0) return [];

  // Simple nearest neighbor algorithm
  const route = [];
  let unvisited = [...deliveries];
  let current = {
    lat: currentLocation.lat,
    lng: currentLocation.lng,
    address: "Current Location",
  };

  while (unvisited.length > 0) {
    // Find nearest delivery from current location
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const delivery = unvisited[i];
      const distance = calculateDistance(
        current.lat,
        current.lng,
        delivery.coordinates.lat,
        delivery.coordinates.lng
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    // Add nearest to route
    const nearest = unvisited[nearestIndex];
    route.push({
      ...nearest,
      distanceFromPrevious: nearestDistance,
    });

    // Update current location
    current = {
      lat: nearest.coordinates.lat,
      lng: nearest.coordinates.lng,
    };

    // Remove from unvisited
    unvisited.splice(nearestIndex, 1);
  }

  // Calculate total distance
  const totalDistance = route.reduce((sum, point) => {
    return sum + (point.distanceFromPrevious || 0);
  }, 0);

  return {
    route,
    totalDistance: parseFloat(totalDistance.toFixed(2)),
    estimatedTime: calculateEstimatedTime(totalDistance, "BIKE") * 1.5, // Buffer for multiple stops
  };
}

module.exports = {
  calculateDistance,
  calculateEstimatedTime,
  calculateEarnings,
  optimizeRoute,
};
