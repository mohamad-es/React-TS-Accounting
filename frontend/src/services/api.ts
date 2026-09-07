import {axiosInstance,authCall,projectKey,signOut} from './axios';
export {authCall};
export const login=(login:string,password:string)=>authCall('login',{login,password,project_key:projectKey});
export const logout=signOut;
export async function request(path:string,_locale:string,body?:unknown){const response=body===undefined?await axiosInstance.get(path):await axiosInstance.post(path,body);return response.data;}
export async function getDocument(path:string,_locale:string):Promise<string>{const response=await axiosInstance.get(path,{responseType:'text'});return response.data;}
