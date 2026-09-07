import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {toast} from 'sonner';
import {createRecord,getSettings,listRecords,runAction} from '../api/finance-api';
import type {Section} from '../model/types';
export function useRecords(section:Section){const {i18n}=useTranslation();return useQuery({queryKey:['finance',section,i18n.language],queryFn:()=>listRecords(section,i18n.language),enabled:section!=='settings'});}
export function useSettings(){const {i18n}=useTranslation();return useQuery({queryKey:['finance','settings'],queryFn:()=>getSettings(i18n.language)});}
export function useCreateRecord(section:Section){const cache=useQueryClient();const {i18n,t}=useTranslation();return useMutation({mutationFn:(values:unknown)=>createRecord(section,i18n.language,values),onSuccess:async()=>{await cache.invalidateQueries({queryKey:['finance']});toast.success(t('finance.saved'));}});}
export function useAction(){const cache=useQueryClient();const {i18n}=useTranslation();return useMutation({mutationFn:(path:string)=>runAction(path,i18n.language),onSuccess:()=>cache.invalidateQueries({queryKey:['finance']})});}
