import { NavigationContainerRef } from '@react-navigation/native';
import * as React from 'react';
import { BackHandler } from 'react-native';

export const navigationRef = React.createRef<NavigationContainerRef<any>>();

export function navigate(name: string, params?: object) {
    if (navigationRef.current?.isReady()) {
        navigationRef.current?.navigate(name, params);
    }
}

export function dispatch(action: any) {
    if (navigationRef.current?.isReady()) {
        navigationRef.current?.dispatch(action);
    }
}

export function reset(state: any) {
    if (navigationRef.current?.isReady()) {
        navigationRef.current?.resetRoot(state);
    }
}


export function addNavigationListener(event: string, callback: () => void) {
    //@ts-ignore
    return navigationRef.current?.addListener(event, callback);
}



export function addBackHandlerListener(callback: () => boolean) {
    return BackHandler.addEventListener('hardwareBackPress', callback);
}


