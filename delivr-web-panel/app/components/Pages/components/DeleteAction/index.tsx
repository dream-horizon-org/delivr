import { useSearchParams } from "@remix-run/react";
import { DeleteApp } from "./components/DeleteApp";
import { DeleteOrg } from "./components/DeleteOrg";
import { DeleteUser } from "./components/DeleteUser";
import { DeleteDeployment } from "./components/DeleteDeployment";

export type BaseDeleteProps = {
  onSuccess: () => void;
};

export const DeleteAction = ({ onSuccess }: BaseDeleteProps) => {
  const [searchParams] = useSearchParams();

  const type = searchParams.get("type") ?? "";

  if (type === "app") {
    return <DeleteApp onSuccess={onSuccess} />;
  }

  if (type === "org") {
    return <DeleteOrg onSuccess={onSuccess} />;
  }

  if (type === "deployment") {
    return <DeleteDeployment onSuccess={onSuccess} />;
  }

  return <DeleteUser onSuccess={onSuccess} />;
};
