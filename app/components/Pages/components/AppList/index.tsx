import { Text, Skeleton, Grid, Center, rem } from "@mantine/core";
import { useGetAppListForOrg } from "./hooks/useGetAppListForOrg";
import { useNavigate, useParams } from "@remix-run/react";
import { AppCard, AppCardProps } from "~/components/AppCard";
import { route } from "routes-gen";
import { Spotlight, SpotlightActionData } from "@mantine/spotlight";
import { IconApps, IconSearch } from "@tabler/icons-react";
import { User } from '~/.server/services/Auth/auth.interface';
import { useState } from "react";
import { DeleteModal, type DeleteModalData } from "~/components/Common/DeleteModal";

type AppListForOrgProps = {
  user: User;
};

export function AppListForOrg({ user }: AppListForOrgProps) {
  const params = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useGetAppListForOrg({
    orgId: params.org ?? "",
    userEmail: user.user.email,
  });
  const [deleteModalData, setDeleteModalData] = useState<DeleteModalData | null>(null);

  const _modData: AppCardProps[] =
    data?.map((item) => ({
      ...item,
      link: route("/dashboard/:org/:app", {
        org: params.org ?? "",
        app: item.id,
      }),
      onDelete: () => {
        setDeleteModalData({
          type: 'app',
          appId: item.id,
          appName: item.name,
          tenant: params.org ?? '',
        });
      },
    })) ?? [];

  if (isLoading) {
    return (
      <Center>
        <Grid justify="center">
          {Array(12)
            .fill("s")
            .map((_, index) => (
              <Grid.Col key={index} span="content">
                <Skeleton key={index} width={300} height={400} my={"md"} />
              </Grid.Col>
            ))}
        </Grid>
      </Center>
    );
  }

  if (isError) {
    return <Text>Something Went Wrong!</Text>;
  }

  if (!data?.length) {
    return <Text>No Apps yet</Text>;
  }

  const actions: SpotlightActionData[] = _modData.map((item) => {
    return {
      id: item.id,
      label: item.name,
      description: "",
      onClick: () => {
        navigate(item.link);
      },
      leftSection: (
        <IconApps style={{ width: rem(24), height: rem(24) }} stroke={1.5} />
      ),
    };
  });

  return (
    <>
    <Grid ml={30} mt={30}>
      <Spotlight
        actions={actions}
        nothingFound="Nothing found..."
        highlightQuery
        searchProps={{
          leftSection: (
            <IconSearch
              style={{ width: rem(20), height: rem(20) }}
              stroke={1.5}
            />
          ),
          placeholder: "Search...",
        }}
      />
      <Grid gutter={{ base: 5, xs: 'md', md: 'xl', xl: 50 }}>
        {_modData.map((item) => {
          return (
            <Grid.Col key={item.id} span="content">
              <AppCard {...item} key={item.id} />
            </Grid.Col>
          );
        })}
      </Grid>
    </Grid>

      {/* Delete App Modal */}
      <DeleteModal
        opened={!!deleteModalData}
        onClose={() => setDeleteModalData(null)}
        data={deleteModalData}
        onSuccess={() => {
          refetch();
        }}
      />
    </>
  );
}
