import axios from 'axios';

const api = axios.create({
  baseURL: 'https://your-api-endpoint.com',
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
});

export default api;
