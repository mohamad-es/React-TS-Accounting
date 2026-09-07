
import { ChevronRight, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type NavItem = {
  translationKey: string;
  url: string;
  icon?: LucideIcon;
  items?: { translationKey: string; url: string }[];
};

export type { NavItem };

export function DynamicNav({ items }: { items: NavItem[] }) {
  const location = useLocation();
  const { t } = useTranslation();

  const isActiveRoute = (url: string) => {
    if (url === "/") return location.pathname === url;
    return location.pathname === url || location.pathname.startsWith(`${url}/`);
  };

  const isParentActive = (item: NavItem) => item.items?.some((subItem) => isActiveRoute(subItem.url)) ?? false;

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          const label = t(item.translationKey);

          return item.items ? (
            <Collapsible key={item.translationKey} asChild defaultOpen={isParentActive(item)} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger className="cursor-pointer" asChild>
                  <SidebarMenuButton
                    tooltip={label}
                    className={isParentActive(item) ? "bg-gray-100 text-dark dark:bg-accent dark:text-white" : "dark:text-white"}
                  >
                    {item.icon && <item.icon className="h-10 w-10 text-primary dark:text-white" />}
                    <span>{label}</span>
                    <ChevronRight className="ms-auto transition-transform duration-200 dark:text-white rtl:rotate-180 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.translationKey}>
                        <SidebarMenuSubButton
                          asChild
                          className={isActiveRoute(subItem.url) ? "bg-gray-100 text-dark dark:bg-accent dark:text-white" : "dark:text-white"}
                        >
                          <Link to={subItem.url}>
                            <span>{t(subItem.translationKey)}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.translationKey}>
              <SidebarMenuButton
                asChild
                tooltip={label}
                className={isActiveRoute(item.url) ? "bg-gray-100 text-dark dark:bg-accent dark:text-white" : "dark:text-white"}
              >
                <Link to={item.url}>
                  {item.icon && <item.icon className="h-10 w-10 text-primary dark:text-white" />}
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
