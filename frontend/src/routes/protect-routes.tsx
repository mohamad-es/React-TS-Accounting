import {Navigate,Outlet} from 'react-router';
import {useTranslation} from 'react-i18next';
import {useAuth} from '@/context/auth-context';
export default function ProtectedRoutes(){const {actor,isLoading}=useAuth();const {t}=useTranslation();if(isLoading)return <p className="p-5">{t('finance.loading')}</p>;return actor?<Outlet/>:<Navigate to="/login" replace/>;}
