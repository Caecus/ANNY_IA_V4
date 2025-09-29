import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type DeviceType = 'wifi' | 'bluetooth';
export interface Device {
    id: string;
    name?: string;
    SSID?: string;
    type: DeviceType;
    connected: boolean;
}

interface DevicesState {
    connected: {
        wifi: Device | null;
        bluetooth: Device | null;
    };
}

const initialState: DevicesState = {
    connected: {
        wifi: null,
        bluetooth: null,
    },
};

export const devicesSlice = createSlice({
    name: 'devices',
    initialState,
    reducers: {
    connectDevice: (state, action: PayloadAction<Device>) => {
        const device = action.payload;
        if (device.type === 'wifi') {
            state.connected.wifi = device;
        } else if (device.type === 'bluetooth') {
            state.connected.bluetooth = device;
        }
    },
    disconnectDevice: (state, action: PayloadAction<DeviceType>) => {
        if (action.payload === 'wifi') {
            state.connected.wifi = null;
        } else if (action.payload === 'bluetooth') {
            state.connected.bluetooth = null;
        }
    },
    },
});

export const { connectDevice, disconnectDevice } = devicesSlice.actions;
export default devicesSlice.reducer;
