import {request,getDocument} from '@/services/api';
import type {FinanceRecord,Section,Settings} from '../model/types';
export const listRecords=(section:Section,locale:string):Promise<FinanceRecord[]>=>request(section,locale);
export const getSettings=(locale:string):Promise<Settings>=>request('settings',locale);
export const createRecord=(section:Section,locale:string,data:unknown)=>request(section==='settings'?'settings/seller':section,locale,data);
export const runAction=(path:string,locale:string)=>request(path,locale,{});
export const readDocument=(id:string,customer:boolean,format:'html'|'xml',locale:string)=>getDocument(`${customer?'customer/':''}invoices/${id}/document?format=${format}`,locale);
