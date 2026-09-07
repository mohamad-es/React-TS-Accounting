import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {request,logout as endSession} from '@/services/api';
import i18n from '@/i18n';
export type Actor={userId:number;roles:string[]};
const AuthContext=createContext<{actor:Actor|null;isLoading:boolean;reload:()=>Promise<void>;logout:()=>Promise<void>}>({actor:null,isLoading:true,reload:async()=>{},logout:async()=>{}});
export function AuthProvider({children}:{children:ReactNode}){const [actor,setActor]=useState<Actor|null>(null);const [isLoading,setLoading]=useState(true);const cache=useQueryClient();async function reload(){setActor(await request('me',i18n.language));}useEffect(()=>{reload().catch(()=>setActor(null)).finally(()=>setLoading(false));},[]);async function logout(){try{await endSession();}finally{setActor(null);cache.clear();}}return <AuthContext.Provider value={{actor,isLoading,reload,logout}}>{children}</AuthContext.Provider>;}
export const useAuth=()=>useContext(AuthContext);
