import FinanceRedirect from "../components/FinanceRedirect";
import { createBrowserRouter } from "react-router-dom";
import Layout from "../layout";
import ProtectRoute from "src/hooks/ProtectedRoute";
import Login from "src/pages/Auth/Login";
import Register from "src/pages/Auth/Register";
import ConfirmCode from "src/pages/Auth/ConfirmCode";
import ErrorPage from "src/pages/ErrorPage";
import ProtectAuth from "src/hooks/ProtectAuth";
import { permissionsRouters } from "./permissions.routes";

const router = createBrowserRouter([
  { path: "/finance", element: <FinanceRedirect /> },
  {
    path: "",
    element: <ProtectAuth />,
    errorElement: <ErrorPage />,
    children: [
      { element: <Login />, path: "/login" },
      { element: <Register />, path: "/register" },
      { element: <ConfirmCode />, path: "/confirm-code" },
    ],
  },
  {
    element: <ProtectRoute />,
    children: [
      {
        element: <Layout />,
        children: permissionsRouters,
      },
    ],
  },
]);

export default router;
