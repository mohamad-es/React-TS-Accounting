import axios from 'axios';
import i18n from '@/i18n';
const authBase=import.meta.env.VITE_FONITAS_AUTH_URL?.replace(/\/+$/,'');
export const projectKey=import.meta.env.VITE_FONITAS_PROJECT_KEY||'accounting';
export const axiosInstance=axios.create({baseURL:import.meta.env.VITE_FINANCE_API_URL||'http://127.0.0.1:3100/api/v1'});
const authClient=axios.create({baseURL:authBase,withCredentials:true});
let accessToken:string|undefined;
let refreshPromise:Promise<void>|undefined;
export async function authCall(method:string,body:object={}){if(!authBase)throw new Error('Configure VITE_FONITAS_AUTH_URL');try{const response=await authClient.post(`/Auth/${method}`,body);const data=response.data.data??response.data;if(data.access_token)accessToken=data.access_token;return data;}catch(error){if(axios.isAxiosError(error))throw new Error(error.response?.data?.service_message??error.response?.data?.message??error.message);throw error;}}
async function refresh(){if(!refreshPromise)refreshPromise=authCall('refresh',{project_key:projectKey}).then(()=>{if(!accessToken)throw new Error('Authentication failed');}).finally(()=>{refreshPromise=undefined;});return refreshPromise;}
export async function signOut(){try{await authCall('logout');}finally{accessToken=undefined;}}
axiosInstance.interceptors.request.use(async config=>{if(!accessToken)await refresh();config.headers.Authorization=`Bearer ${accessToken}`;config.headers['Accept-Language']=i18n.language;return config;});
axiosInstance.interceptors.response.use(response=>response,async error=>{const config=error.config;if(error.response?.status===401&&config&&!config._retry){config._retry=true;accessToken=undefined;await refresh();return axiosInstance(config);}throw new Error(error.response?.data?.message??error.message);});
