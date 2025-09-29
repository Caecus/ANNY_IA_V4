import { Coords, Line, TRAVEL_MODE, TransitDetails } from "../models";

export type SPEECH_CONTEXT =
  | 'CONFIRM_NEED_ASSISTANCE';

export interface RouteSelectedStep {
  title?: string;
  tInstruction?: string;
  instruction: string;
  distance: string;
  duration: string;
  travelMode: TRAVEL_MODE;
  num_stops?: number;
  line?: Line;
  start_location: Coords;
  end_location: Coords;
  transit_details?: TransitDetails;
  hasNextBusStop: boolean;
	polyline: {points: string}
}

export interface RouteSelectedInfo {
  origin: string;
  destination: string;
  originLocation: Coords;
  destinationLocation: Coords;
  duration: string;
  distance: string;
  steps: RouteSelectedStep[];
}

export interface Polylines {
	travelMode: TRAVEL_MODE;
	coords: {latitude: number, longitude: number}[]
}

export interface Favorites {
	_id: string,
	createdAt: string,
	location: {
		lat: string,
		lng: string,
		name: string,
		reference: string
	},
	name: string,
	updatedAt: string
}

export interface Position {
	latitude: number;
	longitude: number;
	accuracy: number;
	altitude: number | null;
	heading: number | null;
	speed: number | null;
}

