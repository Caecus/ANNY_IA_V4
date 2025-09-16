import axios from 'axios';
import Config from 'react-native-config';
import firebaseSdk from './firebaseSdk';

const apiUrl = `${Config.APP_API_URL}/api`;

export default {
    async login(payload: any) {
        try {
            await firebaseSdk.createAccount(payload);
            await firebaseSdk.login(
                payload,
                () => console.log('login firebase'),
                () => console.log('error login firebase'),
            );
            const { data } = await axios.post(
                `${Config.APP_API_URL_PORT}/auth/signin`,
                payload,
            );
            return data;
        } catch (error) {
            console.log('error login', error);
        }
    },

    async register(payload: any) {
        firebaseSdk.createAccount(payload);
        return await axios.post(`${apiUrl}/auth/signup`, payload);
    },

    async getOnboarding(payload: any) {
        try {
            const { data } = await axios.get(`${apiUrl}/onboarding`, {
                params: { payload },
            });
            return data;
        } catch (error) {
            console.log('error getOnboarding', error);
        }
    },

    async sendResetPassword(payload: any) {
        try {
            const { data } = await axios.post(`${apiUrl}/auth/forgot-password`, payload);
            return data;
        } catch (error) {
            console.log('error sendResetPassword', error);
        }
    },
};
