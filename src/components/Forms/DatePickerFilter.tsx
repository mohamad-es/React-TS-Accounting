import { useState, useEffect, type MouseEvent } from "react";
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian_en from "react-date-object/locales/gregorian_en";
import CalenderIcon from "../icons/CalenderIcon";
import { useQuery } from "@tanstack/react-query";
import { TSingleBusiness } from "src/types/Business.type";
import { DataProps } from "src/data/fa";
import { useAppSelector } from "src/store/store";

type Props = {
  label: string;
  setGregorianDate: Function;
  calendarType?: string;
  initialData?: any;
  calendarPosition?: string;
};

const DatePickerFilter = ({
  label,
  setGregorianDate,
  calendarType,
  initialData,
  calendarPosition,
}: Props) => {
  const [value, setValue] = useState(new Date());

  const data: DataProps = useAppSelector((state) => state.dataReducer);

  useEffect(() => {
    if (initialData) {
      setValue(initialData);
      setGregorianDate(formatDateTime(initialData));
    }
  }, []);

  const handleDateChange = (selectedDate: any) => {
    setValue(selectedDate);
    console.log(selectedDate);

    if (selectedDate) {
      const formattedDate = formatDateTime(selectedDate.toDate());
      setGregorianDate(formattedDate);
    } else {
      setGregorianDate(null);
    }
  };

  const formatDateTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const { data: business } = useQuery<TSingleBusiness>({
    queryKey: ["business"],
    staleTime: Infinity,
  });

  return (
    <div>
      <div className="text-xs family-regular mb-2 block">{label}</div>
      <div
        className={`flex items-center`}
      >
        <DatePicker
          value={value}
          onChange={handleDateChange}
          calendar={
            calendarType
              ? calendarType === "solar"
                ? persian
                : gregorian
              : business?.calendar_type === "solar"
              ? persian
              : gregorian
          }
          locale={
            calendarType
              ? calendarType === "solar"
                ? persian_fa
                : gregorian_en
              : business?.calendar_type === "solar"
              ? persian_fa
              : gregorian_en
          }
          calendarPosition={`${
            calendarPosition ? calendarPosition : "bottom-start"
          }`}
          format="YYYY/MM/DD"
          render={(value, openCalendar) => {
            return (
              <button
                className="btn btn-primary rounded-md h-8 text-xs family-light py-0"
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  openCalendar();
                }}
              >
                {value || data.word.selectData}
                <CalenderIcon size={16} color="white" />
              </button>
            );
          }}
        />
      </div>
    </div>
  );
};

export default DatePickerFilter;
