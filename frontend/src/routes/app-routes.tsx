import {createBrowserRouter,Navigate} from 'react-router';
import {useAuth} from '@/context/auth-context';
import {useTranslation} from 'react-i18next';
import Layout from '@/components/layout';
import LoginPage from '@/app/auth/pages/login-page';
import ListPage from '@/app/finance/pages/list-page';
import CreatePage from '@/app/finance/pages/create-page';
import SettingsPage from '@/app/finance/pages/settings-page';
import {sections,type Section} from '@/app/finance/model/types';
import ProtectedRoutes from './protect-routes';
function Home(){const {actor}=useAuth();return <Navigate replace to={actor?.roles.some(r=>['admin','accountant','viewer'].includes(r))?'/finance/projects':'/finance/customer/invoices'}/>;}
function Scope({children,section}:{children:React.ReactNode;section:Section}){const {actor}=useAuth();const {t}=useTranslation();return section.startsWith('customer/')||actor?.roles.some(r=>['admin','accountant','viewer'].includes(r))?children:<p className="p-5">{t('finance.forbidden')}</p>;}
export const app_routes=createBrowserRouter([{path:'/login',element:<LoginPage/>},{element:<ProtectedRoutes/>,children:[{element:<Layout/>,children:[{path:'/',element:<Home/>},{path:'/finance',element:<Home/>},...sections.flatMap(section=>[{path:`/finance/${section}`,element:<Scope section={section}>{section==='settings'?<SettingsPage/>:<ListPage key={section} section={section}/>}</Scope>},{path:`/finance/${section}/create`,element:<Scope section={section}><CreatePage key={section} section={section}/></Scope>}])]}]},{path:'*',element:<Navigate to="/finance" replace/>}]);
