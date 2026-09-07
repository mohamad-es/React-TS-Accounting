import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {useTranslation} from 'react-i18next';
import {Navigate} from 'react-router';
import {useAuth} from '@/context/auth-context';
import {authCall,login} from '@/services/api';
import {LanguageSwitcher} from '@/components/layout/language-switcher';
import {ModeToggle} from '@/components/layout/dark-mode/mode-toggle';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Field,FieldLabel,FieldGroup} from '@/components/ui/field';
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/card';
export default function LoginPage(){const {actor,isLoading,reload}=useAuth();const {t}=useTranslation();const [mfa,setMfa]=useState('');const [error,setError]=useState('');const form=useForm<{login:string;password:string;code:string}>();if(isLoading)return <p className="p-6">{t('finance.loading')}</p>;if(actor)return <Navigate to="/finance" replace/>;return <div className="relative flex min-h-svh flex-col items-center gap-6 bg-muted px-6"><div className="flex justify-between w-full pt-2"><ModeToggle/><LanguageSwitcher/></div><div className="flex w-full max-w-sm flex-col gap-6"><img src="/images/logo.svg" width={40} height={40} className="self-center" alt="Fonitas"/><Card><CardHeader><CardTitle>{t('finance.login')}</CardTitle></CardHeader><CardContent><form onSubmit={form.handleSubmit(async values=>{setError('');try{const data=mfa?await authCall('verifyTotp',{mfa_token:mfa,code:values.code}):await login(values.login,values.password);if(data.mfa_required)setMfa(data.mfa_token);else await reload();}catch(e){setError((e as Error).message);}})}><FieldGroup>{(mfa?['code']:['login','password']).map(name=><Field key={name}><FieldLabel htmlFor={name}>{t(`finance.${name==='login'?'username':name}`)}</FieldLabel><Input id={name} type={name==='password'?'password':'text'} autoComplete={name==='password'?'current-password':name==='code'?'one-time-code':'username'} required {...form.register(name as 'login')}/></Field>)}{error&&<p role="alert" className="text-destructive text-sm">{error}</p>}<Button disabled={form.formState.isSubmitting}>{t('finance.continue')}</Button></FieldGroup></form></CardContent></Card></div></div>;}
