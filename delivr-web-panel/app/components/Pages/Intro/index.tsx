import {
  Image,
  Container,
  Title,
  Button,
  Group,
  Text,
  List,
  ThemeIcon,
  rem,
  Modal,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import image from "./image.svg";
import classes from "./index.module.css";
import { useState } from "react";
import { useNavigate } from "@remix-run/react";
import { route } from "routes-gen";
import { CreateOrgModal } from "../components/OrgsPage/components/CreateOrgModal";
import { ACTION_EVENTS, actions } from "~/utils/event-emitter";

export function Intro() {
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <Container size="md">
      <div className={classes.inner}>
        <div className={classes.content}>
          <Title className={classes.title}>
            Welcome to the{" "}
            <span className={classes.highlight}>Delivr</span> Dashboard <br />{" "}
          </Title>
          <Text c="dimmed" mt="md">
            Instantly update your mobile apps with ease – Delivr
            lets you deploy real-time updates for React Native with support for
            code, images, and assets to keep your app agile and up-to-date in
            any scenario.
          </Text>

          <List
            mt={30}
            spacing="sm"
            size="sm"
            icon={
              <ThemeIcon size={20} radius="xl">
                <IconCheck
                  style={{ width: rem(12), height: rem(12) }}
                  stroke={1.5}
                />
              </ThemeIcon>
            }
          >
            <List.Item>
              <b>Instant updates</b> – push real-time updates directly to users
              without needing app store approval.
            </List.Item>
            <List.Item>
              <b>Supports React Native</b> – seamlessly deploy updates for
              JavaScript-based mobile apps.
            </List.Item>
            <List.Item>
              <b>Asset management</b> – update not just code, but also images
              and other assets instantly.
            </List.Item>
          </List>

          <Group mt={30}>
            <Button
              radius="xl"
              size="md"
              className={classes.control}
              onClick={() => setCreateOrgOpen(true)}
            >
              Create Organization
            </Button>
          </Group>
        </div>
        <Image src={image} className={classes.image} />
      </div>

      {/* Create Organization Modal */}
      <Modal
        opened={createOrgOpen}
        onClose={() => setCreateOrgOpen(false)}
        title="Create Organization"
        centered
      >
        <CreateOrgModal
          onSuccess={() => {
            actions.trigger(ACTION_EVENTS.REFETCH_ORGS);
            setCreateOrgOpen(false);
            // Navigate to dashboard to show the new organization
            navigate(route("/dashboard"));
          }}
        />
      </Modal>
    </Container>
  );
}
