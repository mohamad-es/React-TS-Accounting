import {useTranslation} from 'react-i18next';
import {useAuth} from '@/context/auth-context';
import {RecordForm} from '../ui/forms/record-form';
import {useSettings} from '../hooks/use-finance';
import {canCreate,sectionTitle} from './list-page';
import type {Section} from '../model/types';
export default function CreatePage({section}:{section:Section}){const {t}=useTranslation();const {actor}=useAuth();if(!canCreate(section,actor?.roles??[]))return <p className="p-5">{t('finance.forbidden')}</p>;return <div className="p-5 flex flex-col"><div><h1 className="text-2xl">{section==='settings'?t('finance.settings'):`${t('finance.create')} · ${t(`finance.${sectionTitle(section)}`)}`}</h1><p className="mt-2 text-sm text-muted-foreground">{t('finance.title')}</p></div><div className="mt-5">{section==='settings'?<SellerForm/>:<RecordForm section={section}/>}</div></div>;}
function SellerForm(){const query=useSettings();const {t}=useTranslation();if(query.isPending)return <p>{t('finance.loading')}</p>;if(query.error)return <p role="alert">{query.error.message}</p>;return <RecordForm section="settings" initial={query.data?.seller??undefined}/>;}
