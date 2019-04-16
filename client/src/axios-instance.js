import axios from 'axios';
import {API_ROOT} from 'constants/api-constants';

const axiosInstance = axios.create({
    baseURL: API_ROOT,
    withCredentials: true
  });
  
 export default axiosInstance;