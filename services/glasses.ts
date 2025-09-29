import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosResponse } from 'axios';
import { BtnResponse } from '../types/glassesWifi';

const parseData = (data: any) => {
    const json_data = data
        .replace(/(\w+):/g, '"$1":') // Add quotes around keys
        .replace(/:\s*([\w-]+)/g, ': "$1"'); // Add quotes around values      
    return JSON.parse(json_data)
}

const formatReturn = (res: AxiosResponse) => {
    console.log("formatReturn -> ", res.data)
    return {
        data: parseData(res.data), 
        status: res.status
    }
}


export default {
    async setApiUrl(apiUrl: string){
        await AsyncStorage.setItem("apiURL", apiUrl)
    },
    async getApiUrl(){
        return await AsyncStorage.getItem("apiURL")
    },
    async removeApiUrl(){
        await AsyncStorage.removeItem("apiURL")
    },
    async getGlasses() {
        const apiUrl = await this.getApiUrl();
        const res = await axios.post(`${apiUrl}`);
        return formatReturn(res)
    },
    async connectGlasses(payload: unknown) {
        const apiUrl = await this.getApiUrl();
        const res = await axios.post(`${apiUrl}/connect`, payload);
        return formatReturn(res)
    },
    async disconnetGlasses() {
        const apiUrl = await this.getApiUrl();
        const res = await axios.post(`${apiUrl}/disconnect`);
        return formatReturn(res)
    },
    async postResolution(payload: unknown) {
        const apiUrl = await this.getApiUrl();
        const res = await axios.post(`${apiUrl}/resolution`, payload);
        return formatReturn(res)
    },
    async postStartStream(payload: unknown) {
        const apiUrl = await this.getApiUrl();
        const res = await axios.post(`${apiUrl}/start_stream`,payload);
        return formatReturn(res)
    },
    async stopStream() {
        const apiUrl = await this.getApiUrl();
        const res = await axios.post(`${apiUrl}/stop_stream`);
        return formatReturn(res)
    },
    async postStartRanging() {
        const apiUrl = await this.getApiUrl();
        const res = await axios.post(`${apiUrl}/start_ranging`);
        return formatReturn(res)
    },
    async stopRanging() {
        const apiUrl = await this.getApiUrl();
        const res = await axios.post(`${apiUrl}/stop_ranging`);
        return formatReturn(res)
    },
    async btn(): Promise<BtnResponse>{
        const apiUrl = await this.getApiUrl();
        const res = await fetch(
        `${apiUrl}/btn`,
        {
            method: 'GET',
        }
        )
        const data = await res.json()
        if (data.time) {
            return { time: Number(data.time) }
        }
        return { time: -1 }
    }
};
