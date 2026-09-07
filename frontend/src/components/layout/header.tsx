import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "./dark-mode/mode-toggle";
import { LanguageSwitcher } from "./language-switcher";

const Header = () => {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 lg:px-6">
      <SidebarTrigger className="rounded-md border p-1" />

      <div className="flex items-center gap-2">
        <ModeToggle />
        <LanguageSwitcher />
      </div>
    </header>
  );
};

export default Header;
