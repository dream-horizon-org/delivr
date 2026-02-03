import { useForm } from "@mantine/form";
import {
  Button,
  Group,
  TextInput,
  Autocomplete,
  TagsInput,
  Skeleton,
} from "@mantine/core";
import { useGetAppList } from "../OrgListNavbar/hooks/useGetAppList";
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
  const orgs = useGetAppList();
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
      setOrg({ value: "", error: "Project is required" });
      return;
    }

    setOrg({ value, error: "" });
  };

  const shouldShowLoader = orgs.isLoading || orgs.isFetching;

  useEffect(() => {
    // If we have an org in params, use it (coming from app list page)
    const currentApp = orgs.data?.find((o) => o.id === params.org);
    if (currentApp) {
      setOrg({
        value: currentApp?.displayName,
        error: "",
      });
    } else if (!params.org && orgs.data?.length) {
      // Only set default if no org in params
      setOrg({
        value: orgs.data[0].orgName,
        error: "",
      });
    }
  }, [orgs.data, params.org]);

  // Check if we're in an organization context
  const isInOrgContext = !!params.org;

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
      {/* Only show organization selector if NOT in an organization context */}
      {!isInOrgContext && (
        <Skeleton visible={shouldShowLoader} mt={"md"}>
          <Autocomplete
            mt="md"
            label="Select Project"
            withAsterisk
            placeholder="Choose a project"
            onChange={onOrgChange}
            disabled={isLoading}
            value={org.value}
            error={org.error}
            data={orgs.data?.map((item) => item.orgName) ?? []}
          />
        </Skeleton>
      )}

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
            
            // Validate organization (only if not in org context)
            if (!isInOrgContext) {
              if (!org.value || org.value.trim().length === 0) {
                setOrg({ value: org.value, error: "Project is required" });
                return;
              }
              
              if (org.error) {
                return;
              }
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
                name: form.getValues().appName.trim(),
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
            !!Object.keys(form.errors).length || 
            isLoading || 
            (!isInOrgContext && (!!org.error.length || !org.value.trim()))
          }
          loading={isLoading}
        >
          Create
        </Button>
      </Group>
    </>
  );
}
