import * as Location from 'expo-location';
import React, { createContext, useEffect, useState } from 'react';
import { RouteSelectedStep } from '../containers/maps/mapScreen/models';
import { Coords } from '../containers/maps/models';

export interface CompassContextProps {
    getCurrentHeading: () => number | null;
    getTargetHeading: (step: RouteSelectedStep) => number;
    calculateOffset: (currentHeading: number, targetHeading: number) => {offset: number, indication: string};
    generateText: (offset: number, indication: string) => string;
    defaultCourse: () => string;
    compassActive: boolean;
    compassStart: () => void;
    compassStop: () => void;
}

interface CompassHeadingData {
    heading: number;
  }

export const CompassContext = createContext({} as CompassContextProps);

export const CompassProvider = ({ children }: any) => {
    const degree_update_rate = 3
    const [currentHeading, setCurrentHeading] = useState<number | null>(null);
    const [compassActive, setCompassActive] = useState<boolean>(false);

    useEffect(() => {
        // monitor compass
    let headingSubscription: Location.LocationSubscription | null = null;
        async function startHeading() {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.warn('Permiso de ubicación denegado para la brújula');
                return;
            }
            headingSubscription = await Location.watchHeadingAsync((headingData) => {
                setCurrentHeading(headingData.trueHeading ?? headingData.magHeading);
            });
            setCompassActive(true);
        }
        if (!compassActive) {
            startHeading();
        }
        return () => {
            if (headingSubscription) {
                headingSubscription.remove();
                setCompassActive(false);
            }
        };
    }, []);

    // useEffect(() => {
    //     // just to log the updates
    //     console.log("heading:", currentHeading)
    // }, [currentHeading])


    const compassStart = async () => {
        if (!compassActive) {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.warn('Permiso de ubicación denegado para la brújula');
                return;
            }
            await Location.watchHeadingAsync((headingData) => {
                setCurrentHeading(headingData.trueHeading ?? headingData.magHeading);
            });
            setCompassActive(true);
        }
    };

    const compassStop = async () => {
        setCompassActive(false);
        // No hay método global para detener todos los listeners, pero el cleanup del useEffect lo hace
    };

    const getCurrentHeading = () => {
        return compassActive ? currentHeading : null; 
    }

    // Calculo trigonometrico para calcular el angulo de direccion entre dos puntos geograficos
    const getTargetHeading = (step: RouteSelectedStep): number => {
        const { start_location, end_location } = step;
        return calculatePolarCoordinates(start_location, end_location).angle
    };

    const toRadians = (degrees: number) => {
        return degrees * (Math.PI / 180);
    }

    const toDegrees = (radians: number) => {
        return radians * (180 / Math.PI);
    }

    const calculatePolarCoordinates = (point1: Coords, point2: Coords) => {
        const R = 6371000; // Earth's radius in meters

        // Convert latitude and longitude from degrees to radians
        const φ1 = toRadians(point1.lat);
        const φ2 = toRadians(point2.lat);
        const Δφ = toRadians(point2.lat - point1.lat);
        const Δλ = toRadians(point2.lng - point1.lng);

        // Haversine formula for distance
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        // Bearing calculation (angle in degrees)
        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        const angle = (toDegrees(Math.atan2(y, x)) + 360) % 360; // Normalize to 0-360 degrees

        return { distance, angle };
    }

    const calculateOffset = (currentHeading: number, targetHeading: number): {offset: number, indication: string} => {
		let offset = targetHeading - currentHeading;
		let indication = '';

		if (offset > 180) { //Giro mas corto
			offset = 360 - offset;
			indication = 'Izquierda';
		} else if (offset < -180) {
			offset = 360 + offset;
			indication = 'Derecha';
		} else if (offset >= 0) {
			indication = 'Derecha';
		} else {
			indication = 'Izquierda';
			offset = Math.abs(offset);
		}

		return { offset: Math.round(Math.abs(offset)), indication };
	};

    const generateText = (offset: number, indication: string): string => {
        if (offset < 20){
            return defaultCourse()
        } else {
            return `Gira ${offset} grados hacia la ${indication}.`
        }
    }

    const defaultCourse = () : string => {
        return "Manten el curso."
    }

    return (
        <CompassContext.Provider
            value={{
                getCurrentHeading,
                getTargetHeading,
                calculateOffset,
                generateText,
                defaultCourse,
                compassActive,
                compassStart,
                compassStop
            }}>
            {children}
        </CompassContext.Provider>
    )
}