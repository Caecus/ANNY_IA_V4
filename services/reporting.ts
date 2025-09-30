import axios from 'axios';
import { ReportPayload } from '../types/report';
import { getEnvVar } from '../utils/env';

const apiUrl = `${getEnvVar('APP_API_URL_TWO')}`;

export default {
    async insertReport(payload: ReportPayload) {
        try {
            console.log(`${apiUrl}/reports/add`);
            const {data} = await axios.post(`${apiUrl}/reports/add`, {
                functionality: payload.functionality,
                userId: payload.userId,
                email: payload.email,
                name: payload.name,
                role: payload.role,
            });
            return data;
        } catch (error) {
            console.log(error);
        }
    },
    async getAll() {
        try {
            console.log(`${apiUrl}/reports/get-all`);
            const {data} = await axios.get(`${apiUrl}/reports/get-all`);
            return data;
        } catch (error) {
            console.log(error);
        }
    },
};
