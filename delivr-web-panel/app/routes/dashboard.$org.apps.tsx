import { useLoaderData } from "@remix-run/react";
import { User } from "~/.server/services/Auth/Auth.interface";
import { AppListPage } from "~/components/Pages/components/AppListPage";
import { authenticateLoaderRequest } from "~/utils/authenticate";

export const loader = authenticateLoaderRequest();

export default function AppsList() {
  const user = useLoaderData<User>();
  return <AppListPage user={user} />;
}
