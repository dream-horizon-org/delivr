import { useQuery } from "react-query";
import { getAppList } from "../data/getOrgList";

export const useGetAppList = () => {
  return useQuery("apps", getAppList);
};

