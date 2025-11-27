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
import { useEffect, useMemo } from "react";

export const DeploymentList = () => {
  const theme = useMantineTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = useParams();
  const { data, isLoading } = useGetDeploymentsForApp();

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
      // Use the existing modal pattern like organization deletion
      navigate(`/dashboard/delete?type=deployment&name=${encodeURIComponent(currentDeployment)}&id=${encodeURIComponent(currentDeployment)}&appId=${encodeURIComponent(params.app ?? "")}&tenant=${encodeURIComponent(params.org ?? "")}`);
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
                background: `linear-gradient(135deg, ${theme.other.backgrounds.secondary} 0%, ${theme.other.backgrounds.primary} 100%)`,
                borderColor: theme.other.borders.primary,
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
                styles={{
                  input: {
                    borderColor: theme.other.borders.primary,
                    backgroundColor: theme.other.backgrounds.primary,
                    "&:focus": {
                      borderColor: theme.other.brand.primary,
                    },
                  },
                }}
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
                  backgroundColor: theme.other.backgrounds.primary,
                  borderColor: theme.other.brand.primary,
                }}
              >
                <Group justify="space-between" align="center" wrap="nowrap">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs" mb={4}>
                      <Text size="sm" fw={theme.other.typography.fontWeight.semibold} c={theme.other.text.secondary}>
                        Key:
                      </Text>
                      <Text
                        size="sm"
                        fw={theme.other.typography.fontWeight.bold}
                        c={theme.other.brand.primaryDark}
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
                              transition: theme.other.transitions.fast,
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
                    {/* Temporarily hidden - Delete Deployment functionality */}
                    {/* <Tooltip label="Delete Deployment" withArrow position="top">
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={handleDelete}
                        size="lg"
                        style={{
                          transition: theme.other.transitions.fast,
                        }}
                      >
                        <IconTrash style={{ width: rem(18) }} />
                      </ActionIcon>
                    </Tooltip> */}
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
              backgroundColor: theme.other.backgrounds.secondary,
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
              backgroundColor: theme.other.backgrounds.secondary,
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
    </>
  );
};
