const axios = require("axios");

class MapService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = "https://maps.googleapis.com/maps/api";
  }

  /**
   * Get coordinates from address (Geocoding)
   */
  async geocodeAddress(address) {
    try {
      if (!this.apiKey) {
        throw new Error("Google Maps API key not configured");
      }

      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          address: address,
          key: this.apiKey,
        },
      });

      if (response.data.status === "OK" && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng,
          formattedAddress: response.data.results[0].formatted_address,
        };
      } else {
        throw new Error(`Geocoding failed: ${response.data.status}`);
      }
    } catch (error) {
      console.error("Geocoding error:", error.message);
      // Fallback: Return mock coordinates (Delhi)
      return {
        lat: 28.6139,
        lng: 77.209,
        formattedAddress: address,
        isFallback: true,
      };
    }
  }

  /**
   * Get directions between two points
   */
  async getDirections(origin, destination, mode = "driving") {
    try {
      if (!this.apiKey) {
        throw new Error("Google Maps API key not configured");
      }

      const response = await axios.get(`${this.baseUrl}/directions/json`, {
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          mode: mode,
          key: this.apiKey,
        },
      });

      if (response.data.status === "OK" && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const leg = route.legs[0];

        return {
          distance: {
            text: leg.distance.text,
            value: leg.distance.value, // in meters
          },
          duration: {
            text: leg.duration.text,
            value: leg.duration.value, // in seconds
          },
          polyline: route.overview_polyline.points,
          steps: leg.steps.map((step) => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ""),
            distance: step.distance.text,
            duration: step.duration.text,
            polyline: step.polyline.points,
          })),
        };
      } else {
        throw new Error(`Directions failed: ${response.data.status}`);
      }
    } catch (error) {
      console.error("Directions error:", error.message);

      // Fallback: Calculate straight-line distance
      const distance = this.calculateStraightDistance(origin, destination);
      const duration = Math.round((distance / 25) * 60); // Assuming 25 km/h average

      return {
        distance: {
          text: `${distance.toFixed(1)} km`,
          value: distance * 1000,
        },
        duration: {
          text: `${duration} mins`,
          value: duration * 60,
        },
        polyline: "",
        steps: [],
        isFallback: true,
      };
    }
  }

  /**
   * Calculate straight-line distance (Haversine formula)
   */
  calculateStraightDistance(origin, destination) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(destination.lat - origin.lat);
    const dLon = this.toRad(destination.lng - origin.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(origin.lat)) *
        Math.cos(this.toRad(destination.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get optimized route for multiple destinations
   */
  async getOptimizedRoute(origin, destinations) {
    try {
      if (!this.apiKey) {
        throw new Error("Google Maps API key not configured");
      }

      // For multiple destinations, we would use Distance Matrix API
      // This is a simplified version

      const waypoints = destinations.map((d) => `${d.lat},${d.lng}`).join("|");

      const response = await axios.get(`${this.baseUrl}/directions/json`, {
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destinations[destinations.length - 1].lat},${
            destinations[destinations.length - 1].lng
          }`,
          waypoints: `optimize:true|${waypoints}`,
          mode: "driving",
          key: this.apiKey,
        },
      });

      if (response.data.status === "OK") {
        return {
          optimizedOrder: response.data.routes[0].waypoint_order,
          routes: response.data.routes,
        };
      }

      throw new Error(`Route optimization failed: ${response.data.status}`);
    } catch (error) {
      console.error("Route optimization error:", error.message);

      // Fallback: Nearest neighbor algorithm
      return {
        optimizedOrder: this.nearestNeighborAlgorithm(origin, destinations),
        isFallback: true,
      };
    }
  }

  /**
   * Simple nearest neighbor algorithm for route optimization
   */
  nearestNeighborAlgorithm(origin, destinations) {
    const unvisited = [...destinations];
    const route = [];
    let current = origin;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const distance = this.calculateStraightDistance(current, unvisited[i]);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      route.push(nearestIndex);
      current = unvisited[nearestIndex];
      unvisited.splice(nearestIndex, 1);
    }

    return route;
  }

  /**
   * Get place details (for restaurant/customer addresses)
   */
  async getPlaceDetails(placeId) {
    try {
      if (!this.apiKey) {
        throw new Error("Google Maps API key not configured");
      }

      const response = await axios.get(`${this.baseUrl}/place/details/json`, {
        params: {
          place_id: placeId,
          fields: "name,formatted_address,geometry,formatted_phone_number",
          key: this.apiKey,
        },
      });

      if (response.data.status === "OK") {
        return response.data.result;
      }

      throw new Error(`Place details failed: ${response.data.status}`);
    } catch (error) {
      console.error("Place details error:", error.message);
      return null;
    }
  }
}

module.exports = new MapService();
