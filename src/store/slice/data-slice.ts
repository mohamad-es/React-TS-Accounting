import { createSlice } from "@reduxjs/toolkit";
import { DataProps, faData } from "src/data/fa";
import { enData } from "src/data/en";
import { arData } from "src/data/ar";
import { trData } from "src/data/tr";

const getInitialLanguage = () => {
  const language = localStorage.getItem("locale") || navigator.language.split("-")[0]
  return language === "en"
    ? enData
    : language === "fa"
    ? faData
    : language === "ar"
    ? arData
    : language === "tr"
    ? trData
    : enData;
};

const initialState: DataProps = getInitialLanguage();

const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {},
});

export default dataSlice.reducer;
