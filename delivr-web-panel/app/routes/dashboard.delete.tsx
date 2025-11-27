import { Modal } from "@mantine/core";
import { useNavigate, useSearchParams } from "@remix-run/react";
import { DeleteAction } from "~/components/Pages/components/DeleteAction";
import { ACTION_EVENTS, actions } from "~/utils/event-emitter";

export default function Profile() {
  const navigation = useNavigate();
  const [searchParams] = useSearchParams();

  const close = () => {
    actions.trigger(ACTION_EVENTS.REFETCH_ORGS);
    navigation(-1);
  };

  const type = searchParams.get("type");
  const title = type === "org" ? "Delete Organization" : `Delete ${type}`;

  return (
    <Modal
      opened={true}
      onClose={close}
      title={title}
      centered
    >
      <DeleteAction onSuccess={close} />
    </Modal>
  );
}
