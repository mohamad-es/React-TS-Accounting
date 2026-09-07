import { Outlet } from "react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./sidebar/app-sidebar";
import Header from "./header";

const Layout = () => {
  return (
    <SidebarProvider >
      <AppSidebar variant="inset" />
      <SidebarInset className="bg-background dark:bg-background">
        <Header />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
