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
  Box,
  Badge,
  Stack,
  ThemeIcon,
} from "@mantine/core";
import { useNavigate, useSearchParams, useParams } from "@remix-run/react";
import { useGetDeploymentsForApp } from "./hooks/getDeploymentsForApp";
import { IconCheck, IconCopy, IconTrash, IconKey, IconServer } from "@tabler/icons-react";
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
      <Box>
        {/* Deployment Key Selector Card */}
        {isLoading ? (
          <Stack gap="md">
            <Skeleton h={88} radius="md" />
            <Skeleton h={160} radius="md" />
          </Stack>
        ) : details ? (
          <Card
            withBorder
            radius="md"
            padding="md"
            mb={20}
            style={{
              backgroundColor: "#ffffff",
              borderColor: theme.colors.slate[2],
            }}
          >
            {/* Labels Row - Aligned */}
            <Flex gap="lg" mb={8}>
              <Box style={{ width: 240 }}>
                <Group gap={8}>
                  <ThemeIcon size={24} radius="sm" variant="light" color="brand">
                    <IconServer size={14} />
                  </ThemeIcon>
                  <Text size="xs" fw={600} c={theme.colors.slate[6]} tt="uppercase">
                    Environment
                  </Text>
                </Group>
              </Box>
              <Box style={{ width: 1 }} /> {/* Spacer for divider */}
              <Box style={{ flex: 1 }}>
                <Group gap={8}>
                  <ThemeIcon size={24} radius="sm" variant="light" color="brand">
                    <IconKey size={14} />
                  </ThemeIcon>
                  <Text size="xs" fw={600} c={theme.colors.slate[6]} tt="uppercase">
                    Deployment Key
                  </Text>
                  <Badge size="xs" variant="filled" color="brand" radius="sm">
                    {details.name}
                  </Badge>
                </Group>
              </Box>
            </Flex>

            {/* Content Row */}
            <Flex gap="lg" align="center">
              {/* Left: Deployment Selector */}
              <Box style={{ width: 240 }}>
                <Select
                  placeholder="Select deployment..."
                  data={deploymentOptions}
                  value={searchParams.get("deployment")}
                  onChange={handleDeploymentChange}
                  searchable
                  size="sm"
                  styles={{
                    input: {
                      backgroundColor: theme.colors.slate[0],
                      borderColor: theme.colors.slate[3],
                      "&:focus": {
                        borderColor: theme.colors.brand[5],
                      },
                    },
                  }}
                  comboboxProps={{ shadow: "sm" }}
                  disabled={!data || data.length === 0}
                />
              </Box>

              {/* Divider */}
              <Box
                style={{
                  width: 1,
                  height: 36,
                  background: theme.colors.slate[2],
                }}
              />

              {/* Right: Deployment Key Details */}
              <Group gap={8} wrap="nowrap" style={{ flex: 1 }}>
                <Box
                  style={{
                    flex: 1,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 13,
                    fontWeight: 500,
                    color: theme.colors.slate[7],
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    background: theme.colors.slate[0],
                    padding: "8px 12px",
                    borderRadius: theme.radius.sm,
                    border: `1px solid ${theme.colors.slate[2]}`,
                  }}
                >
                  {details.deploymentKey}
                </Box>
                <CopyButton value={details.deploymentKey} timeout={2000}>
                  {({ copied, copy }) => (
                    <Tooltip
                      label={copied ? "Copied!" : "Copy Key"}
                      withArrow
                      position="top"
                    >
                      <ActionIcon
                        color={copied ? "teal" : "brand"}
                        variant={copied ? "filled" : "light"}
                        onClick={copy}
                        size="lg"
                        radius="md"
                      >
                        {copied ? (
                          <IconCheck size={18} />
                        ) : (
                          <IconCopy size={18} />
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
                    radius="md"
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Flex>
          </Card>
        ) : data?.length ? (
          <Card
            withBorder
            radius="md"
            padding="lg"
            mb={20}
            style={{
              textAlign: "center",
              backgroundColor: theme.colors.slate[0],
              borderColor: theme.colors.slate[2],
            }}
          >
            <Stack align="center" gap="xs">
              <ThemeIcon size="lg" radius="md" variant="light" color="gray">
                <IconKey size={20} />
              </ThemeIcon>
              <Text size="sm" c={theme.colors.slate[6]} fw={500}>
                Select a deployment key from the dropdown to view releases
              </Text>
            </Stack>
          </Card>
        ) : (
          <Card
            withBorder
            radius="md"
            padding="lg"
            mb={20}
            style={{
              textAlign: "center",
              backgroundColor: theme.colors.slate[0],
              borderColor: theme.colors.slate[2],
            }}
          >
            <Stack align="center" gap="xs">
              <ThemeIcon size="lg" radius="md" variant="light" color="brand">
                <IconKey size={20} />
              </ThemeIcon>
              <Text size="sm" c={theme.colors.slate[7]} fw={500}>
                No deployment keys found
              </Text>
              <Text size="xs" c={theme.colors.slate[5]}>
                Create your first deployment key to start managing releases.
              </Text>
            </Stack>
          </Card>
        )}

        {/* Release List */}
        <ReleaseListForDeploymentTable />
      </Box>

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
