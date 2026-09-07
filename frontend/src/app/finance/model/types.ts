export const sections=['projects','customers','contributors','contracts','expenses','invoices','accruals','settings','customer/invoices','customer/payments'] as const;
export type Section=typeof sections[number];
export type FinanceRecord={id:string;name?:string;legalName?:string;number?:string;description?:string;key?:string;email?:string;status?:string;total?:string;amount?:string;currency?:string;rate?:string;projectId?:string;contributor?:{name:string};contractNumber?:string};
export type Settings={seller:Record<string,unknown>|null;validatorConfigured:boolean;mollieConfigured:boolean};
export type FormValues=Record<string,string|{street:string;city:string;country:string;postalCode:string}|string[]|{description:string;quantity:string;unitPrice:string;vatRate:string}[]> & {lines:{description:string;quantity:string;unitPrice:string;vatRate:string}[];contractIds:string[]};
