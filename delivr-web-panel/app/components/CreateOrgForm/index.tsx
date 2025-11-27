import { Card, Center, TextInput, Box, useMantineTheme } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconSitemap } from "@tabler/icons-react";
import { CTAButton } from "~/components/CTAButton";

export function CreateOrgForm() {
  const theme = useMantineTheme();
  const form = useForm<{ name: string }>({
    mode: "uncontrolled",
    initialValues: { name: "Enter Name" },
    validateInputOnChange: true,
    validate: {
      name: (value) => {
        return value.length ? null : "Name  Can't be Empty";
      },
    },
  });
  return (
    <Center>
      <Box w={"300px"}>
        <Card shadow="sm" padding="xl" radius="md">
          <Card.Section component="a">
            <Center>
              <IconSitemap height={160} size={"xl"} />
            </Center>
          </Card.Section>

          <TextInput
            label="Enter Organization Name"
            placeholder="Organization Name"
            key={form.key("name")}
            {...form.getInputProps("name")}
            styles={{
              input: {
                "&:focus": {
                  borderColor: theme.other.brand.primary,
                },
              },
            }}
          />

          <CTAButton
            fullWidth
            mt="md"
            disabled={!!Object.keys(form.errors).length}
          >
            Create Organization
          </CTAButton>
        </Card>
      </Box>
    </Center>
  );
}
