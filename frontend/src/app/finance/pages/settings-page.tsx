import {Link} from 'react-router';
import {useTranslation} from 'react-i18next';
import {useAuth} from '@/context/auth-context';
import {Button} from '@/components/ui/button';
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/card';
import TableWrapper from '@/components/providers/table-wrapper';
import {useSettings} from '../hooks/use-finance';
export default function SettingsPage(){const query=useSettings();const {t}=useTranslation();const {actor}=useAuth();return <TableWrapper title={t('finance.settings')} description={t('finance.validation')} create={actor?.roles.includes('admin')?<Button asChild><Link to="/finance/settings/create">{t('finance.settings')}</Link></Button>:undefined}>{query.isPending?<p>{t('finance.loading')}</p>:query.error?<p role="alert">{query.error.message}</p>:<Card><CardHeader><CardTitle>{t('finance.configuration')}</CardTitle></CardHeader><CardContent className="space-y-3"><p>{t('finance.legalName')}: {String(query.data?.seller?.legalName??t('finance.missing'))}</p><p>{t('finance.validator')}: {t(query.data?.validatorConfigured?'finance.ready':'finance.missing')}</p><p>{t('finance.mollie')}: {t(query.data?.mollieConfigured?'finance.ready':'finance.missing')}</p></CardContent></Card>}</TableWrapper>;}
