import { Flex, Button, Text } from "@mantine/core";
import { BaseDeleteProps } from "..";
import { useSearchParams, useNavigate } from "@remix-run/react";
import { useDeleteDeployment } from "../../DeploymentsSearch/hooks/useDeleteDeployment";

type DeleteDeploymentProps = BaseDeleteProps;

export const DeleteDeployment = ({ onSuccess }: DeleteDeploymentProps) => {
  const { mutate, isLoading } = useDeleteDeployment();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const deploymentName = searchParams.get("name") ?? "";
  const appId = searchParams.get("appId") ?? "";
  const tenant = searchParams.get("tenant") ?? "";

  const onDeleteClick = () => {
    mutate(
      {
        appId,
        tenant,
        deploymentName,
      },
      {
        onSuccess: () => {
          // Close the modal first
          onSuccess();
          // Then navigate back to avoid staying on deleted deployment page
          navigate(-1);
        },
      }
    );
  };

  return (
    <>
      <Text>
        Are you sure you want to delete the <strong>{deploymentName}</strong> deployment?
      </Text>
      <Text size="sm" c="dimmed" mt="xs">
        This action cannot be undone. The deployment will be removed, but existing releases will remain in storage.
      </Text>
      <Flex justify={"flex-end"} mt={"lg"}>
        <Button color="red" onClick={onDeleteClick} loading={isLoading}>
          Delete
        </Button>
      </Flex>
    </>
  );
};
