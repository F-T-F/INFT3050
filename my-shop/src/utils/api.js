import axios from 'axios';

// 1. NocoDB API — config comes from .env.local (see .env.example), not source.
const BASE_URL = process.env.REACT_APP_NC_BASE_URL || 'http://localhost:8080';
const API_TOKEN = process.env.REACT_APP_NC_TOKEN || '';
const BASE_ID = process.env.REACT_APP_NC_BASE_ID || '';
const TABLE_ID = process.env.REACT_APP_NC_TABLE_ID || '';

// 2. axios
const apiClient = axios.create({
    baseURL: `${BASE_URL}/api/v1/db/data/noco/${BASE_ID}/${TABLE_ID}`,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'xc-token': API_TOKEN,
    },
});

apiClient.interceptors.request.use(
    (config) => {
        console.log('Request:', config.method.toUpperCase(), config.url);
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            console.error('API Error:', error.response.status, error.response.data);
        }
        return Promise.reject(error);
    }
);

export const getProducts = async (keyword = '') => {
    let url = '';
    if (keyword && keyword.trim() !== '') {

        const encodedKeyword = encodeURIComponent(keyword);
        url = `?where=(title,like,%${encodedKeyword}%)~or(description,like,%${encodedKeyword}%)`;
    }
    const response = await apiClient.get(url);
    return response.data.list;
};


export default apiClient;