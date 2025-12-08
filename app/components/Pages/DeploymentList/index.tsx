import {
  ActionIcon,
  Card,
  CopyButton,
  Flex,
  rem,
  Skeleton,
  Text,
  Tooltip,
  Group,
  Select,
  useMantineTheme,
} from "@mantine/core";
import { useNavigate, useSearchParams, useParams } from "@remix-run/react";
import { useGetDeploymentsForApp } from "./hooks/getDeploymentsForApp";
import { IconCheck, IconCopy, IconTrash, IconKey } from "@tabler/icons-react";
import { ReleaseListForDeploymentTable } from "../components/ReleaseListForDeploymentTable";
import { ReleaseDeatilCardModal } from "../components/ReleaseDetailCardModal";
import { useEffect, useMemo, useState } from "react";
import { DeleteModal, type DeleteModalData } from "~/components/Common/DeleteModal";

export const DeploymentList = () => {
  const theme = useMantineTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams();
  const { data, isLoading, refetch: refetchDeployments } = useGetDeploymentsForApp();
  const [deleteModalData, setDeleteModalData] = useState<DeleteModalData | null>(null);

  const details = data?.find(
    (item) => item.name === searchParams.get("deployment")
  );

  // Create select options from deployments
  const deploymentOptions = useMemo(() => {
    return data?.map(deployment => ({
      value: deployment.name,
      label: deployment.name,
    })) ?? [];
  }, [data]);

  const handleDeploymentChange = (value: string | null) => {
    if (value) {
      setSearchParams((prev) => {
        prev.set("deployment", value);
        return prev;
      });
    }
  };

  const handleDelete = () => {
    const currentDeployment = searchParams.get("deployment");
    if (currentDeployment) {
      setDeleteModalData({
        type: 'deployment',
        deploymentName: currentDeployment,
        appIdForDeployment: params.app ?? '',
        tenantForDeployment: params.org ?? '',
      });
    }
  };

  useEffect(() => {
    if (!searchParams.get("deployment") && data && data.length > 0) {
      setSearchParams((p) => {
        p.set("deployment", data[0].name);
        return p;
      });
    }
  }, [data, searchParams, setSearchParams]);

  return (
    <>
      <Flex direction="column" gap="md">
        {/* Deployment Key Selector and Details in One Row */}
        {isLoading ? (
          <Skeleton h={80} />
        ) : details ? (
          <Card
            withBorder
            radius="md"
            padding="lg"
            styles={{
              root: {
                background: `linear-gradient(135deg, ${theme.colors.slate[0]} 0%, #ffffff 100%)`,
                borderColor: theme.colors.slate[2],
              },
            }}
          >
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              {/* Left: Selector */}
              <Select
                label="Select Deployment Key"
                placeholder="Choose a deployment..."
                data={deploymentOptions}
                value={searchParams.get("deployment")}
                onChange={handleDeploymentChange}
                searchable
                leftSection={<IconKey style={{ width: rem(18), height: rem(18) }} />}
                style={{ flex: 1, maxWidth: 350 }}
                comboboxProps={{ shadow: "md" }}
                disabled={!data || data.length === 0}
              />

              {/* Right: Deployment Details */}
              <Card
                withBorder
                radius="md"
                padding="md"
                style={{
                  flex: 1,
                  maxWidth: 500,
                  backgroundColor: "#ffffff",
                  borderColor: theme.colors.brand[5],
                }}
              >
                <Group justify="space-between" align="center" wrap="nowrap">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs" mb={4}>
                      <Text size="sm" fw={600} c={theme.colors.slate[6]}>
                        Key:
                      </Text>
                      <Text
                        size="sm"
                        fw={700}
                        c={theme.colors.brand[7]}
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {details.deploymentKey}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {details.name} deployment key
                    </Text>
                  </div>

                  <Group gap="xs" wrap="nowrap">
                    <CopyButton value={details.deploymentKey} timeout={2000}>
                      {({ copied, copy }) => (
                        <Tooltip
                          label={copied ? "Copied!" : "Copy Key"}
                          withArrow
                          position="top"
                        >
                          <ActionIcon
                            color={copied ? "teal" : "gray"}
                            variant="light"
                            onClick={copy}
                            size="lg"
                            style={{
                              transition: "all 0.15s ease",
                            }}
                          >
                            {copied ? (
                              <IconCheck style={{ width: rem(18) }} />
                            ) : (
                              <IconCopy style={{ width: rem(18) }} />
                            )}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                    <Tooltip label="Delete Deployment" withArrow position="top">
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={handleDelete}
                        size="lg"
                        style={{
                          transition: "all 0.15s ease",
                        }}
                      >
                        <IconTrash style={{ width: rem(18) }} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Card>
            </Group>
          </Card>
        ) : data?.length ? (
          <Card
            withBorder
            radius="md"
            padding="lg"
            style={{
              textAlign: "center",
              backgroundColor: theme.colors.slate[0],
            }}
          >
            <Text c="dimmed">Select a deployment key from the dropdown to view releases</Text>
          </Card>
        ) : (
          <Card
            withBorder
            radius="md"
            padding="lg"
            style={{
              textAlign: "center",
              backgroundColor: theme.colors.slate[0],
            }}
          >
            <Text c="dimmed">No deployments found. Create your first deployment key!</Text>
          </Card>
        )}
      </Flex>

      <ReleaseListForDeploymentTable />

      {/* Modals */}
      <ReleaseDeatilCardModal
        id={searchParams.get("releaseId")}
        opened={!!searchParams.get("releaseId")}
        close={() => {
          navigate(-1);
        }}
        deploymentName={details?.name}
      />

      {/* Delete Deployment Modal */}
      <DeleteModal
        opened={!!deleteModalData}
        onClose={() => setDeleteModalData(null)}
        data={deleteModalData}
        onSuccess={() => {
          refetchDeployments();
          // Navigate to first deployment or clear selection if none left
          const remainingDeployments = data?.filter(d => d.name !== deleteModalData?.deploymentName) ?? [];
          if (remainingDeployments.length > 0) {
            setSearchParams({ deployment: remainingDeployments[0].name });
          } else {
            setSearchParams({});
          }
        }}
      />
    </>
  );
};
