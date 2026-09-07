import type { ReactNode } from "react";

type props = {
  title: string;
  description: string;
  children: ReactNode;
  create?: ReactNode;
};

export default function TableWrapper({ children, create, description, title }: props) {
  return (
    <div className="p-5 flex flex-col">
      <div className="flex items-center gap-1 justify-between mb-5">
        <div>
          <h1 className="alibaba-bold text-base sm:text-2xl">{title}</h1>
          <p className="text-xs sm:text-sm mt-2">{description}</p>
        </div>
        {create}
      </div>

      {children}
    </div>
  );
}
