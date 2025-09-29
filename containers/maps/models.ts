export type TRAVEL_MODE = 'DRIVING' | 'WALKING' | 'TRANSIT';

export interface Coords {
    lat: number;
    lng: number;
}

export interface Place {
    description: string;
    location: Coords;
    placeId?: string;
}

export interface Route {
    id?: number;
    bounds: Bounds;
    copyrights: string;
    legs: Leg[];
    overview_polyline: IPolyline;
    summary: string;
    warnings: string[];
    waypoint_order: any[];
}
export interface Bounds {
    northeast: Coords;
    southwest: Coords;
}

export interface Leg {
    arrival_time: Time;
    departure_time: Time;
    distance: Distance;
    duration: Distance;
    end_address: string;
    end_location: Coords;
    start_address: string;
    start_location: Coords;
    steps: Step[];
    traffic_speed_entry: any[];
    via_waypoint: any[];
}

export interface Time {
    text: string;
    time_zone: string;
    value: number;
}

export interface Distance {
    text: string;
    value: number;
}

export interface Step {
    distance: Distance;
    duration: Distance;
    end_location: Coords;
    polyline: IPolyline;
    start_location: Coords;
    travel_mode: string;
    html_instructions?: string;
    steps?: Step[];
    transit_details?: TransitDetails;
    maneuver?: string;
}

export interface IPolyline {
    points: string;
}

export interface TransitDetails {
    arrival_stop: Stop;
    arrival_time: Time;
    departure_stop: Stop;
    departure_time: Time;
    headsign: string;
    line: Line;
    num_stops: number;
}

export interface Stop {
    location: Coords;
    name: string;
}

export interface Line {
    agencies: Agency[];
    vehicle: Vehicle;
    short_name?: string;
    color?: string;
    text_color?: string;
    name?: string;
}

export interface Agency {
    name: string;
    phone?: string;
    url: string;
}

export interface Vehicle {
    icon: string;
    name: string;
    type: string;
}

