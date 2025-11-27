import { useForm } from "@mantine/form";
import {
  Button,
  Group,
  TextInput,
  Autocomplete,
  TagsInput,
  Skeleton,
} from "@mantine/core";
import { useGetOrgList } from "../OrgListNavbar/hooks/useGetOrgList";
import { useCreateApp } from "./hooks/useCreateApp";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@remix-run/react";
import { route } from "routes-gen";
import { ACTION_EVENTS, actions } from "~/utils/event-emitter";

type CreateAppFormProps = {
  onSuccess?: () => void;
};

export function CreateAppForm({ onSuccess }: CreateAppFormProps = {}) {
  const { mutate, isLoading } = useCreateApp();
  const navigation = useNavigate();
  const params = useParams();
  const orgs = useGetOrgList();
  const [org, setOrg] = useState({
    value: "",
    error: "",
  });

  const form = useForm<{ appName: string }>({
    mode: "uncontrolled",
    validateInputOnChange: true,
    initialValues: {
      appName: "",
    },

    validate: {
      appName: (value) => {
        if (!value || value.trim().length === 0) {
          return "App name is required";
        }
        if (value.trim().length < 3) {
          return "App name must be at least 3 characters";
        }
        return null;
      },
    },
  });

  const onOrgChange = (value: string) => {
    if (!value?.length) {
      setOrg({ value: "", error: "Organization is required" });
      return;
    }

    setOrg({ value, error: "" });
  };

  const shouldShowLoader = orgs.isLoading || orgs.isFetching;

  useEffect(() => {
    // If we have an org in params, use it (coming from app list page)
    const currentOrg = orgs.data?.find((o) => o.id === params.org);
    if (currentOrg) {
      setOrg({
        value: currentOrg.orgName,
        error: "",
      });
    } else {
      setOrg({
        value: orgs.data?.[0]?.orgName ?? "Select Org",
        error: "",
      });
    }
  }, [orgs.data, params.org]);

  return (
    <>
      <Skeleton visible={shouldShowLoader}>
        <TextInput
          label="App Name"
          placeholder="App Name"
          withAsterisk
          key={form.key("appName")}
          disabled={isLoading}
          {...form.getInputProps("appName")}
        />
      </Skeleton>
      <Skeleton visible={shouldShowLoader} mt={"md"}>
        <Autocomplete
          mt="md"
          label="Select Organization"
          withAsterisk
          placeholder="Choose an organization"
          onChange={onOrgChange}
          disabled={isLoading}
          value={org.value}
          error={org.error}
          data={orgs.data?.map((item) => item.orgName) ?? []}
        />
      </Skeleton>

      {/* <Skeleton visible={shouldShowLoader} mt={"md"}>
        <TagsInput
          mt="md"
          label="Press Enter to submit a tag"
          placeholder="Enter tag"
          data={["Production", "Stage", "Dev", "Load"]}
          clearable
          disabled={isLoading}
        />
      </Skeleton> */}
      <Group justify="flex-end" mt="md">
        <Button
          onClick={() => {
            // Validate form
            if (form.validate().hasErrors) {
              return;
            }
            
            // Validate organization
            if (!org.value || org.value.trim().length === 0) {
              setOrg({ value: org.value, error: "Organization is required" });
              return;
            }
            
            if (org.error) {
              return;
            }
            
            let owner = { orgId: "", orgName: org.value };
            const _org = orgs.data?.filter(
              (item) => item.orgName === org.value
            );
            if (_org?.length) {
              owner = { orgId: _org[0].id, orgName: _org[0].orgName };
            }
            return mutate(
              {
                name: form.getValues().appName,
                ...owner,
              },
              {
                onSuccess: () => {
                  actions.trigger(ACTION_EVENTS.REFETCH_ORGS);
                  form.reset();
                  if (onSuccess) {
                    onSuccess();
                  } else {
                    navigation(route("/dashboard"));
                  }
                },
              }
            );
          }}
          disabled={
            !!Object.keys(form.errors).length || isLoading || !!org.error.length || !org.value.trim()
          }
          loading={isLoading}
        >
          Create
        </Button>
      </Group>
    </>
  );
}
